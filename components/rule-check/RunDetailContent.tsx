"use client";
/**
 * /rule-check/runs/[runId] — the Prove page.
 *
 * Six vertical layers, each a Card with an anchor id:
 *   1. Verdict hero
 *   2. Why this verdict (RootCauseTimeline)
 *   3. Evidence ledger (EvidenceCard grid + drawer for raw instance JSON)
 *   4. Validation strip (4-light board + failures pills)
 *   5. Prompt + Response receipts (PromptPanel 3-tab + ResponsePanel + LogprobInlineChart)
 *   6. Ask why (AskWhyChat)
 */
import React, { useMemo, useState } from "react";
import Link from "next/link";
import { Badge, Btn, Card, CardHead } from "@/components/shared/atoms";
import { useApp } from "@/lib/i18n";
import { MOCK_RUNS } from "./mock";
import { DecisionBadge } from "./atoms/DecisionBadge";
import { ConfidenceRing } from "./atoms/ConfidenceRing";
import { RootCauseTimeline } from "./atoms/RootCauseTimeline";
import { EvidenceCard } from "./atoms/EvidenceCard";
import { ValidationLight } from "./atoms/ValidationLight";
import { PromptPanel } from "./atoms/PromptPanel";
import { ResponsePanel } from "./atoms/ResponsePanel";
import { LogprobInlineChart } from "./atoms/LogprobInlineChart";
import { AskWhyChat } from "./atoms/AskWhyChat";
import type { Instance } from "@/lib/rule-check";

export interface RunDetailContentProps {
  runId: string;
}

export function RunDetailContent({ runId }: RunDetailContentProps) {
  const { t } = useApp();
  const run = useMemo(() => MOCK_RUNS.find((r) => r.runId === runId), [runId]);
  const [drawer, setDrawer] = useState<Instance | null>(null);

  if (!run) {
    return (
      <div className="p-6">
        <Card>
          <div className="p-6 text-center text-ink-3">
            Run {runId.slice(0, 8)} not found.
            <Link href="/rule-check/runs" className="ml-2 text-accent hover:underline">
              ← back to list
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  const fetchedInstances = run.fetched.instances;
  const evidence = run.llmParsed?.evidence ?? [];

  function resolveSource(idx: number): Instance | undefined {
    return fetchedInstances[idx];
  }

  return (
    <div className="flex flex-col gap-4 p-6 max-w-[1100px] mx-auto">
      {/* ── Layer 1: Verdict hero ───────────────────────────────── */}
      <Card>
        <div id="layer-1" className="p-4 flex items-center gap-6">
          <DecisionBadge
            value={run.finalDecision.decision}
            size="xl"
            overridden={!!run.finalDecision.overrideReason}
          />
          {run.llmParsed && (
            <ConfidenceRing
              value={run.llmParsed.confidence}
              size={80}
              label={t("rc_confidence")}
              breakdown={run.confidenceBreakdown}
            />
          )}
          <div className="flex-1 flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[14px] text-ink-1">
                {run.input.ruleId}
              </span>
              <span className="text-ink-3">·</span>
              <span className="text-[14px] text-ink-2">{run.fetched.rule.name}</span>
              {run.finalDecision.overrideReason && (
                <Badge variant="warn">{t("rc_overridden")}</Badge>
              )}
            </div>
            <div className="text-[12px] text-ink-3">
              <span>
                {t("rc_candidate")}: <span className="font-mono text-ink-2">{run.input.candidateId}</span>
              </span>{" "}
              ·{" "}
              <span>
                {t("rc_job")}: <span className="font-mono text-ink-2">{run.input.jobRef}</span>
              </span>{" "}
              ·{" "}
              <span>
                {t("rc_client")}: <span className="text-ink-2">{run.input.scope.client}{run.input.scope.department ? " / " + run.input.scope.department : ""}</span>
              </span>
            </div>
            <div className="text-[11px] text-ink-3">
              {run.timestamp} · runId {run.runId.slice(0, 12)}…
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Btn variant="ghost" size="sm" onClick={() => navigator.clipboard?.writeText(run.runId)}>
              {t("rc_copy_run_id")}
            </Btn>
            <Link
              href={`/rule-check/candidates/${run.input.candidateId}`}
              className="rounded-md border border-line bg-surface px-2.5 py-1 text-[11.5px] text-ink-1 hover:bg-panel"
            >
              {t("rc_candidates")} →
            </Link>
          </div>
        </div>
        {run.finalDecision.overrideReason && (
          <div className="border-t border-line bg-warn-bg px-4 py-2 text-[11.5px] text-warn">
            ⚠ {run.finalDecision.overrideReason}
          </div>
        )}
      </Card>

      {/* ── Layer 2: Why this verdict ─────────────────────────── */}
      {run.llmParsed?.rootCauseSections && (
        <Card>
          <CardHead>
            <a id="layer-2" />
            <span className="text-[12.5px] font-medium text-ink-1">{t("rc_why")}</span>
          </CardHead>
          <div className="p-4">
            <RootCauseTimeline sections={run.llmParsed.rootCauseSections} />
          </div>
        </Card>
      )}

      {/* ── Layer 3: Evidence ledger ──────────────────────────── */}
      <Card>
        <CardHead>
          <a id="layer-3" />
          <span className="text-[12.5px] font-medium text-ink-1">{t("rc_evidence")}</span>
          <span className="ml-2 text-[11px] text-ink-3">{evidence.length}</span>
        </CardHead>
        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
          {evidence.length === 0 && (
            <div className="col-span-2 text-center text-ink-3 text-[12px] py-6">
              (no evidence emitted)
            </div>
          )}
          {evidence.map((ev, i) => (
            <EvidenceCard
              key={i}
              evidence={ev}
              sourceInstance={resolveSource(ev.fetchedInstanceIndex)}
              onViewSource={(inst) => setDrawer(inst)}
            />
          ))}
        </div>
      </Card>

      {/* ── Layer 4: Validation strip ───────────────────────── */}
      <Card>
        <CardHead>
          <a id="layer-4" />
          <span className="text-[12.5px] font-medium text-ink-1">{t("rc_validation")}</span>
        </CardHead>
        <div className="p-4 flex flex-col gap-3">
          <ValidationLight report={run.validation} variant="full" />
          {run.validation.failures.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {run.validation.failures.map((f, i) => (
                <Badge key={i} variant="err">{f}</Badge>
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* ── Layer 5: Prompt + Response receipts ─────────────── */}
      <Card>
        <CardHead>
          <a id="layer-5" />
          <span className="text-[12.5px] font-medium text-ink-1">{t("rc_prompt")} + {t("rc_response")}</span>
        </CardHead>
        <div className="p-4 grid grid-cols-1 lg:grid-cols-2 gap-3">
          <PromptPanel
            prompt={run.prompt}
            provenance={run.promptProvenance}
            llmRawResponse={run.llmRaw.response}
          />
          <div className="flex flex-col gap-3">
            <ResponsePanel llmRaw={run.llmRaw} parsed={run.llmParsed} />
            {/* Logprob chart if available — confidenceBreakdown.logprobScore != null */}
            {run.confidenceBreakdown.source === "composite_full" && (
              <LogprobInlineChart
                tokens={generateMockLogprobs(run.llmRaw.outputTokens)}
              />
            )}
          </div>
        </div>
      </Card>

      {/* ── Layer 6: Ask why ────────────────────────────────── */}
      <Card>
        <CardHead>
          <a id="layer-6" />
          <span className="text-[12.5px] font-medium text-ink-1">{t("rc_ask_why")}</span>
        </CardHead>
        <div className="p-4">
          <AskWhyChat run={run} />
        </div>
      </Card>

      {/* ── Source drawer (overlay) ──────────────────────────── */}
      {drawer && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-end bg-black/40"
          onClick={() => setDrawer(null)}
        >
          <aside
            className="h-full w-full max-w-2xl bg-surface border-l border-line shadow-sh-2 overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 flex items-center justify-between border-b border-line bg-surface px-4 py-3">
              <div>
                <div className="text-[10.5px] uppercase tracking-wide text-ink-3">
                  {t("rc_drawer_source")}
                </div>
                <div className="font-mono text-[13px] text-ink-1">
                  {drawer.objectType}/{drawer.objectId}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDrawer(null)}
                className="rounded border border-line px-2 py-1 text-[12px] text-ink-2 hover:bg-panel"
              >
                ✕
              </button>
            </div>
            <pre className="p-4 font-mono text-[11px] text-ink-2 whitespace-pre-wrap">
              {JSON.stringify(drawer.data, null, 2)}
            </pre>
          </aside>
        </div>
      )}
    </div>
  );
}

// Mock logprobs for the chart preview when run was made with `composite_full`.
function generateMockLogprobs(outputTokens: number): Array<{ token: string; logprob: number }> {
  const n = Math.min(50, Math.max(10, outputTokens));
  const out: Array<{ token: string; logprob: number }> = [];
  for (let i = 0; i < n; i++) {
    out.push({ token: `t${i}`, logprob: -0.05 - Math.random() * 0.6 });
  }
  return out;
}
