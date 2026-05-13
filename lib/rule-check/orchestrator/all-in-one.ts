/**
 * AllInOneOrchestrator — full impl pipeline.
 *
 * Single LLM call evaluates all applicable rules of the action → `RuleJudgment[]`.
 * Each judgment goes through validation + composite confidence independently;
 * one `RuleCheckRunAudited` per rule sharing the same prompt + LLM call +
 * Ontology API trace; aggregated batch decision is computed by `aggregateDecision`.
 *
 *   fetchAllRules → loadMatchResumeRuntimeInput → buildEvalPrompt
 *   → llm.evaluate → split-per-rule → validate + confidence → persist → aggregate
 */

import { v7 as uuidv7 } from "uuid";

import { aggregateDecision } from "../aggregate-decision";
import { compositeCalculator } from "../confidence";
import { rcDebug, rcInfo, rcStopwatch, rcWarn, shortSha } from "../debug";
import { fetchAllRules } from "../fetch-rules";
import { evaluate, LLMUnreachableError } from "../llm-client";
import { buildEvalPrompt } from "../prompt/build";
import { loadMatchResumeRuntimeInput } from "../prompt/runtime-input-loader";
import { filesystemRunStore } from "../store";
import type { TraceCtx } from "../store/ontology-trace-recorder";
import { BatchJudgmentsSchema } from "../output-schema-audited";
import { runValidationAudited } from "../validation";
import type { CheckRulesInput, FetchedRuleClassified, Instance } from "../types";
import type {
  OntologyApiTraceEntry,
  PromptProvenance,
  RuleCheckBatchRunAudited,
  RuleCheckRunAudited,
  RuleJudgmentAudited,
} from "../types-audited";

import type { Orchestrator } from "./index";

const DEFAULT_DOMAIN = "RAAS-v1";

export const allInOneOrchestrator: Orchestrator = {
  name: "all-in-one",
  async run(input: CheckRulesInput): Promise<RuleCheckBatchRunAudited> {
    const apiBase = input.apiBase ?? process.env["ONTOLOGY_API_BASE"];
    if (!apiBase) {
      throw new Error(
        "Missing ONTOLOGY_API_BASE (set in .env.local or pass via input.apiBase)",
      );
    }
    const apiToken = input.apiToken ?? process.env["ONTOLOGY_API_TOKEN"] ?? "";
    const domain = input.domain ?? DEFAULT_DOMAIN;
    const batchId = uuidv7();
    const timestamp = nowBeijingIso();
    const ontologyApiTrace: OntologyApiTraceEntry[] = [];
    const traceCtx: TraceCtx = { trace: ontologyApiTrace };
    const overallTimer = rcStopwatch();

    rcInfo("orchestrator", "batch begin", {
      batchId,
      actionRef: input.actionRef,
      candidate: input.candidateId,
      jobRef: input.jobRef,
      client: input.scope?.client,
      department: input.scope?.department,
      domain,
      ruleIds: input.ruleIds ?? "(all)",
      model: input.llmModel ?? process.env["OPENAI_MODEL"] ?? "(env default)",
      apiBase,
    });

    if (!input.candidateId) {
      throw new Error("AllInOneOrchestrator: input.candidateId is required");
    }
    if (!input.jobRef) {
      throw new Error(
        "AllInOneOrchestrator: input.jobRef is required (matchResume needs a job to evaluate against)",
      );
    }

    // ── Stage 1: fetch all rules (with classification metadata) for the action.
    const t1 = rcStopwatch();
    const { rules: allRules } = await fetchAllRules({
      actionRef: input.actionRef,
      domain,
      client: input.scope.client,
      clientDepartment: input.scope.department,
      apiBase,
      apiToken,
      timeoutMs: input.timeoutMs,
    });
    const targetRuleIds = input.ruleIds && input.ruleIds.length > 0
      ? new Set(input.ruleIds)
      : null;
    const activeRules = targetRuleIds
      ? allRules.filter((r) => targetRuleIds.has(r.id))
      : allRules;
    rcInfo("orchestrator", "stage 1 rules fetched", {
      total: allRules.length,
      active: activeRules.length,
      blockerRules: activeRules.filter((r) => r.canBlock === true).length,
      advisoryRules: activeRules.filter((r) => r.canBlock === false).length,
      unclassifiedRules: activeRules.filter((r) => r.canBlock === undefined).length,
      tookMs: t1(),
    });
    rcDebug("orchestrator", "active rule ids", {
      ids: activeRules.map((r) => r.id),
    });

    // ── Stage 2: load runtime input (Job + Resume), tracing all fetches.
    const t2 = rcStopwatch();
    const runtimeInput = await loadMatchResumeRuntimeInput({
      candidateId: input.candidateId,
      jobRef: input.jobRef,
      ctx: {
        apiBase,
        apiToken,
        domain,
        timeoutMs: input.timeoutMs,
        traceCtx,
      },
    });
    rcInfo("orchestrator", "stage 2 runtime input loaded", {
      jobId: runtimeInput.job?.["job_requisition_id"],
      jobTitle: runtimeInput.job?.["title"] ?? runtimeInput.job?.["job_title"],
      candidateId: runtimeInput.resume?.["candidate_id"],
      resumeId: runtimeInput.resume?.["resume_id"],
      ontologyCalls: ontologyApiTrace.length,
      tookMs: t2(),
    });

    // ── Stage 3: build the eval prompt (consumes generatePrompt verbatim).
    const t3 = rcStopwatch();
    const built = await buildEvalPrompt({
      actionRef: input.actionRef,
      client: input.scope.client,
      clientDepartment: input.scope.department,
      domain,
      runtimeInput,
      apiBase,
      apiToken,
      timeoutMs: input.timeoutMs,
    });
    const promptProvenance: PromptProvenance = built.provenance;
    const fullPrompt = `[system]\n${built.system}\n\n[user]\n${built.user}`;
    rcInfo("orchestrator", "stage 3 prompt built", {
      systemChars: built.system.length,
      userChars: built.user.length,
      promptSha: shortSha(promptProvenance.promptSha256),
      actionObjectSha: shortSha(promptProvenance.actionObjectSha256),
      runtimeInputDigest: shortSha(promptProvenance.generatePromptInput.runtimeInputDigest),
      tookMs: t3(),
    });

    // ── Stage 4: token-count probe.
    const estimatedTokens = estimateTokens(built.system) + estimateTokens(built.user);
    const ctxWindow = inferContextWindow(input.llmModel);
    rcDebug("orchestrator", "token estimate", {
      tokens: estimatedTokens,
      contextWindow: ctxWindow,
      utilization: `${((estimatedTokens / ctxWindow) * 100).toFixed(1)}%`,
    });
    if (estimatedTokens > 0.7 * ctxWindow) {
      rcWarn("orchestrator", "prompt size approaches model context window — consider per-step batching", {
        tokens: estimatedTokens,
        contextWindow: ctxWindow,
      });
    }

    // ── Stage 5: LLM call (one shot for all rules).
    const t5 = rcStopwatch();
    rcInfo("orchestrator", "stage 5 LLM call start", {
      model: input.llmModel ?? process.env["OPENAI_MODEL"] ?? "(default)",
      baseUrl: input.openaiBaseUrl ?? process.env["OPENAI_BASE_URL"] ?? "(default)",
    });
    let llmRaw: RuleCheckBatchRunAudited["llmRaw"];
    let rawContent: unknown;
    let logprobs;
    try {
      const out = await evaluate({
        system: built.system,
        user: built.user,
        apiKey: input.openaiApiKey,
        baseUrl: input.openaiBaseUrl,
        model: input.llmModel,
      });
      llmRaw = {
        model: out.model,
        response: out.response,
        inputTokens: out.inputTokens,
        outputTokens: out.outputTokens,
        latencyMs: out.latencyMs,
      };
      rawContent = out.contentJson;
      logprobs = out.logprobs;
      rcInfo("orchestrator", "stage 5 LLM call ok", {
        model: out.model,
        inTokens: out.inputTokens,
        outTokens: out.outputTokens,
        latencyMs: out.latencyMs,
        logprobsAvailable: logprobs ? logprobs.length : 0,
        tookMs: t5(),
      });
    } catch (err) {
      rcWarn("orchestrator", "stage 5 LLM call FAILED", {
        error: (err as Error).message,
        tookMs: t5(),
      });
      // LLM unreachable: persist a batch with one pending_human result per
      // active rule, so the audit chain is still complete.
      const errMsg = err instanceof LLMUnreachableError
        ? `llm_unreachable:${err.message}`
        : `llm_unknown_error:${(err as Error).message}`;
      const fallbackResults: RuleCheckRunAudited[] = activeRules.map((rule) =>
        buildLLMUnreachableRun({
          rule,
          input,
          batchId,
          timestamp,
          fullPrompt,
          promptProvenance,
          ontologyApiTrace,
          errMsg,
          llmModel: input.llmModel ?? process.env["OPENAI_MODEL"] ?? "unknown",
        }),
      );
      const batch: RuleCheckBatchRunAudited = {
        batchId,
        timestamp,
        input,
        results: fallbackResults,
        aggregateDecision: aggregateDecision(
          fallbackResults.map((r) => ({
            ruleId: r.input.ruleId,
            decision: r.finalDecision.decision,
          })),
        ),
        llmRaw: {
          model: input.llmModel ?? process.env["OPENAI_MODEL"] ?? "unknown",
          response: { error: errMsg },
          inputTokens: 0,
          outputTokens: 0,
          latencyMs: 0,
        },
        promptProvenance,
        ontologyApiTrace,
      };
      const persisted = await persistBatch(batch);
      rcInfo("orchestrator", "batch end (LLM-unreachable fallback)", {
        batchId,
        aggregate: persisted.aggregateDecision.decision,
        results: persisted.results.length,
        tookMs: overallTimer(),
      });
      return persisted;
    }

    // ── Stage 6: parse the batch envelope.
    const envelope = BatchJudgmentsSchema.safeParse(rawContent);
    rcInfo("orchestrator", "stage 6 envelope parse", {
      ok: envelope.success,
      judgmentCount: envelope.success
        ? (rawContent as { judgments?: unknown[] }).judgments?.length ?? 0
        : 0,
    });
    if (!envelope.success) {
      rcWarn("orchestrator", "batch envelope invalid — emitting fallback pending_human runs", {
        error: envelope.error.message.slice(0, 200),
      });
      // Batch envelope corrupt: same fallback as LLM unreachable.
      const errMsg = `batch_envelope_invalid:${envelope.error.message}`;
      const fallbackResults: RuleCheckRunAudited[] = activeRules.map((rule) =>
        buildLLMUnreachableRun({
          rule,
          input,
          batchId,
          timestamp,
          fullPrompt,
          promptProvenance,
          ontologyApiTrace,
          errMsg,
          llmModel: llmRaw.model,
        }),
      );
      const batch: RuleCheckBatchRunAudited = {
        batchId,
        timestamp,
        input,
        results: fallbackResults,
        aggregateDecision: aggregateDecision(
          fallbackResults.map((r) => ({
            ruleId: r.input.ruleId,
            decision: r.finalDecision.decision,
          })),
        ),
        llmRaw,
        promptProvenance,
        ontologyApiTrace,
      };
      const persisted = await persistBatch(batch);
      rcInfo("orchestrator", "batch end (envelope-invalid fallback)", {
        batchId,
        aggregate: persisted.aggregateDecision.decision,
        results: persisted.results.length,
        tookMs: overallTimer(),
      });
      return persisted;
    }

    const judgmentsRaw = (rawContent as { judgments: unknown[] }).judgments;
    const fetchedInstances: Instance[] = [
      // For provenance/grounding the LLM has the matchResume runtime input;
      // we expose those same shapes as pseudo-instances so evidence-grounded
      // validation can resolve them by (objectType, objectId).
      buildInstanceFromRuntimeJob(runtimeInput.job),
      buildInstanceFromRuntimeResume(runtimeInput.resume),
    ];

    // ── Stage 7: split + validate + confidence per-rule.
    const t7 = rcStopwatch();
    const results: RuleCheckRunAudited[] = [];
    for (let i = 0; i < judgmentsRaw.length; i++) {
      const rawJ = judgmentsRaw[i];
      const claimedRuleId = (rawJ as { ruleId?: string }).ruleId ?? "";
      const ruleClassified = activeRules.find((r) => r.id === claimedRuleId);

      const valOut = runValidationAudited({
        rawJudgment: rawJ,
        ruleClassified,
        fetchedInstances,
        fetchedRules: allRules,
      });

      let parsedJudgment: RuleJudgmentAudited | null = valOut.parsedJudgment;
      const confidenceOut = parsedJudgment
        ? compositeCalculator.calculate({
            llmReportedConfidence: parsedJudgment.confidence,
            evidence: parsedJudgment.evidence,
            logprobs: logprobs ?? null,
          })
        : null;
      if (parsedJudgment && confidenceOut) {
        parsedJudgment.confidence = confidenceOut.value;
      }

      const finalDecision = computeFinalDecision(parsedJudgment, valOut.report);
      const ruleId = parsedJudgment?.ruleId ?? claimedRuleId;
      const v = valOut.report;
      const lights = `${v.ruleIdExists ? "✓" : "✗"}${v.evidenceGrounded ? "✓" : "✗"}${v.schemaValid ? "✓" : "✗"}${v.blockSemanticCheck === "ok" ? "✓" : v.blockSemanticCheck === "warning" ? "⚠" : "–"}`;
      rcInfo("orchestrator", "judgment", {
        idx: i,
        ruleId,
        llmDecision: parsedJudgment?.decision ?? "(unparsed)",
        finalDecision: finalDecision.decision,
        validation: lights,
        evidence: parsedJudgment?.evidence?.length ?? 0,
        confidence: confidenceOut ? `${(confidenceOut.value * 100).toFixed(0)}%` : "—",
        confSource: confidenceOut?.breakdown.source ?? "—",
      });
      if (!valOut.report.overallOk) {
        rcDebug("orchestrator", "judgment validation failures", {
          ruleId,
          failures: valOut.report.failures,
        });
      }

      const run: RuleCheckRunAudited = {
        runId: uuidv7(),
        batchId,
        timestamp,
        input: {
          ...input,
          ruleId,
        },
        fetched: {
          rule: ruleClassified
            ? {
                id: ruleClassified.id,
                name: ruleClassified.name,
                sourceText: ruleClassified.sourceText,
                stepOrder: ruleClassified.stepOrder,
                applicableScope: ruleClassified.applicableScope,
              }
            : {
                id: ruleId,
                name: ruleId,
                sourceText: "(rule not found in fetched set)",
                stepOrder: 0,
                applicableScope: "unknown",
              },
          instances: fetchedInstances,
        },
        prompt: fullPrompt,
        promptProvenance,
        ontologyApiTrace,
        llmRaw,
        llmParsed: parsedJudgment,
        validation: valOut.report,
        confidenceBreakdown: confidenceOut?.breakdown ?? {
          evidenceCountFactor: 0,
          consistencyFactor: 0,
          logprobScore: null,
          source: "composite_degraded",
        },
        finalDecision,
      };
      results.push(run);
    }

    rcInfo("orchestrator", "stage 7 per-rule split done", {
      results: results.length,
      tookMs: t7(),
    });

    // ── Stage 8: aggregate + persist.
    const aggregate = aggregateDecision(
      results.map((r) => ({
        ruleId: r.input.ruleId,
        decision: r.finalDecision.decision,
      })),
    );
    rcInfo("orchestrator", "stage 8 aggregate decision", {
      decision: aggregate.decision,
      triggeredRules: aggregate.triggeredRules,
    });

    const batch: RuleCheckBatchRunAudited = {
      batchId,
      timestamp,
      input,
      results,
      aggregateDecision: aggregate,
      llmRaw,
      promptProvenance,
      ontologyApiTrace,
    };
    const persisted = await persistBatch(batch);
    rcInfo("orchestrator", "batch end", {
      batchId,
      aggregate: persisted.aggregateDecision.decision,
      results: persisted.results.length,
      ontologyCalls: ontologyApiTrace.length,
      auditPath: persisted.auditPath,
      tookMs: overallTimer(),
    });
    return persisted;
  },
};

// ─── helpers ───

async function persistBatch(
  batch: RuleCheckBatchRunAudited,
): Promise<RuleCheckBatchRunAudited> {
  const t = rcStopwatch();
  try {
    for (const run of batch.results) {
      const auditPath = await filesystemRunStore.writeRun(run);
      run.auditPath = auditPath;
    }
    const batchPath = await filesystemRunStore.writeBatch(batch);
    batch.auditPath = batchPath;
    rcInfo("store", "persisted batch", {
      batchId: batch.batchId,
      runs: batch.results.length,
      batchPath,
      tookMs: t(),
    });
  } catch (err) {
    rcWarn("store", "filesystem store failed", {
      error: (err as Error).message,
    });
  }
  return batch;
}

function buildLLMUnreachableRun(opts: {
  rule: FetchedRuleClassified;
  input: CheckRulesInput;
  batchId: string;
  timestamp: string;
  fullPrompt: string;
  promptProvenance: PromptProvenance;
  ontologyApiTrace: OntologyApiTraceEntry[];
  errMsg: string;
  llmModel: string;
}): RuleCheckRunAudited {
  return {
    runId: uuidv7(),
    batchId: opts.batchId,
    timestamp: opts.timestamp,
    input: { ...opts.input, ruleId: opts.rule.id },
    fetched: {
      rule: {
        id: opts.rule.id,
        name: opts.rule.name,
        sourceText: opts.rule.sourceText,
        stepOrder: opts.rule.stepOrder,
        applicableScope: opts.rule.applicableScope,
      },
      instances: [],
    },
    prompt: opts.fullPrompt,
    promptProvenance: opts.promptProvenance,
    ontologyApiTrace: opts.ontologyApiTrace,
    llmRaw: {
      model: opts.llmModel,
      response: { error: opts.errMsg },
      inputTokens: 0,
      outputTokens: 0,
      latencyMs: 0,
    },
    llmParsed: null,
    validation: {
      ruleIdExists: false,
      evidenceGrounded: false,
      schemaValid: false,
      blockSemanticCheck: "skipped",
      overallOk: false,
      failures: [opts.errMsg],
    },
    confidenceBreakdown: {
      evidenceCountFactor: 0,
      consistencyFactor: 0,
      logprobScore: null,
      source: "composite_degraded",
    },
    finalDecision: {
      decision: "pending_human",
      overrideReason: opts.errMsg,
    },
  };
}

function computeFinalDecision(
  parsed: RuleJudgmentAudited | null,
  validation: { overallOk: boolean; failures: string[] },
): RuleCheckRunAudited["finalDecision"] {
  if (!parsed) {
    return {
      decision: "pending_human",
      overrideReason: "llm_output_unparseable: " + validation.failures.join("; "),
    };
  }
  if (validation.overallOk) {
    return { decision: parsed.decision };
  }
  return {
    decision: "pending_human",
    overrideReason: "validation_failed: " + validation.failures.join("; "),
  };
}

function buildInstanceFromRuntimeJob(job: Record<string, unknown>): Instance {
  return {
    objectType: "Job_Requisition",
    objectId: String(job["job_requisition_id"] ?? ""),
    data: { ...job },
  };
}

function buildInstanceFromRuntimeResume(resume: Record<string, unknown>): Instance {
  return {
    objectType: "Resume",
    objectId: String(resume["resume_id"] ?? resume["candidate_id"] ?? ""),
    data: { ...resume },
  };
}

function nowBeijingIso(): string {
  const now = new Date();
  const utcMillis = now.getTime() + now.getTimezoneOffset() * 60_000;
  const beijing = new Date(utcMillis + 8 * 60 * 60_000);
  const y = beijing.getUTCFullYear();
  const m = String(beijing.getUTCMonth() + 1).padStart(2, "0");
  const d = String(beijing.getUTCDate()).padStart(2, "0");
  const hh = String(beijing.getUTCHours()).padStart(2, "0");
  const mm = String(beijing.getUTCMinutes()).padStart(2, "0");
  const ss = String(beijing.getUTCSeconds()).padStart(2, "0");
  return `${y}-${m}-${d}T${hh}:${mm}:${ss}+08:00`;
}

function estimateTokens(text: string): number {
  // Rough estimate: 1 token ≈ 4 characters for English/numbers, 1 token ≈ 1 character for Chinese.
  // Mixed text — split conservatively.
  const cjkCount = (text.match(/[一-龥]/gu) ?? []).length;
  const rest = text.length - cjkCount;
  return cjkCount + Math.ceil(rest / 4);
}

function inferContextWindow(model?: string): number {
  // Conservative defaults; override per-model as needed.
  if (!model) return 128_000;
  const m = model.toLowerCase();
  if (m.includes("gpt-4o-mini")) return 128_000;
  if (m.includes("gpt-4o")) return 128_000;
  if (m.includes("kimi")) return 200_000;
  if (m.includes("claude")) return 200_000;
  if (m.includes("gemini")) return 1_000_000;
  return 128_000;
}
