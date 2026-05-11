/**
 * Per-rule and per-step LLM-based transformation.
 *
 * Takes a rule (or step) plus the surrounding DataObject + Event schemas,
 * sends to the LLM API with the rule-transform meta-prompt, and parses the
 * 3-section natural-language response into a `RuleInstruction` (or `StepInstruction`).
 */

import type { ActionRule, ActionStep } from "../types.public";

import { runCompletion, getDefaultModel } from "./llm-client";
import { META_RULE_TRANSFORM, META_STEP_TRANSFORM } from "./meta-prompts";
import type {
  DataObjectSchema,
  EnrichedAction,
  EventSchema,
  RuleInstruction,
  StepInstruction,
  TransformOptions,
} from "./types";

const SOURCE_VERSION_FALLBACK = "unknown";

/**
 * Transform one rule's prose into a 3-section actionable instruction.
 * Round-trip verification is the caller's responsibility (see verify.ts).
 */
export async function transformRule(
  rule: ActionRule & { sourceFile?: string; version?: string; relatedEntities?: string[]; businessBackgroundReason?: string; applicableDepartment?: string },
  enriched: EnrichedAction,
  opts?: TransformOptions,
): Promise<RuleInstruction> {
  // Narrow DataObject + Event schemas to those relevant to this rule
  // (use relatedEntities if provided, else pass everything).
  const relatedIds = (rule.relatedEntities ?? []).map(parseEntityId).filter(Boolean) as string[];
  const dataObjs: Record<string, DataObjectSchema> = {};
  if (relatedIds.length > 0) {
    for (const id of relatedIds) {
      if (enriched.dataObjectSchemas[id]) dataObjs[id] = enriched.dataObjectSchemas[id]!;
    }
  } else {
    // No relatedEntities — pass everything (LLM picks what it needs)
    Object.assign(dataObjs, enriched.dataObjectSchemas);
  }
  const events: Record<string, EventSchema> = enriched.eventSchemas;

  const userPayload = JSON.stringify(
    {
      rule: {
        id: rule.id,
        businessLogicRuleName: rule.businessLogicRuleName ?? "",
        severity: rule.severity ?? "advisory",
        executor: rule.executor ?? "Agent",
        applicableClient: rule.applicableClient ?? "通用",
        applicableDepartment: rule.applicableDepartment ?? "N/A",
        submissionCriteria: rule.submissionCriteria ?? "",
        standardizedLogicRule: rule.standardizedLogicRule ?? rule.description ?? "",
        businessBackgroundReason: rule.businessBackgroundReason ?? "",
      },
      dataObjectSchemas: simplifyDataObjects(dataObjs),
      eventSchemas: simplifyEvents(events),
    },
    null,
    2,
  );

  const instruction = await runCompletion({
    systemPrompt: META_RULE_TRANSFORM,
    userPrompt: userPayload,
    model: opts?.model,
  });

  return {
    id: rule.id,
    instruction: instruction.trim(),
    meta: {
      sourceVersion: composeSourceVersion(rule.sourceFile, rule.version),
      transformedAt: new Date().toISOString(),
      transformedBy: opts?.model ?? getDefaultModel(),
      roundTripCheck: "skipped", // caller fills via verify.ts
      originalProse: rule.standardizedLogicRule ?? rule.description ?? "",
    },
  };
}

/**
 * Transform one step's prose into a 3-section actionable description.
 */
export async function transformStep(
  step: ActionStep & { sourceFile?: string; version?: string },
  ruleIds: string[],
  enriched: EnrichedAction,
  opts?: TransformOptions,
): Promise<StepInstruction> {
  const userPayload = JSON.stringify(
    {
      step: {
        order: step.order,
        name: step.name,
        objectType: step.objectType,
        description: step.description ?? "",
        inputs: step.inputs ?? [],
        outputs: step.outputs ?? [],
        ruleIds,
        doneWhen: step.doneWhen,
      },
      dataObjectSchemas: simplifyDataObjects(enriched.dataObjectSchemas),
    },
    null,
    2,
  );

  const description = await runCompletion({
    systemPrompt: META_STEP_TRANSFORM,
    userPrompt: userPayload,
    model: opts?.model,
  });

  return {
    order: step.order,
    description: description.trim(),
    meta: {
      sourceVersion: composeSourceVersion(step.sourceFile, step.version),
      transformedAt: new Date().toISOString(),
      transformedBy: opts?.model ?? getDefaultModel(),
      roundTripCheck: "skipped",
    },
  };
}

// ── helpers ──

function parseEntityId(s: string): string {
  // upstream relatedEntities entries look like "候选人简历 (Resume)" — extract Resume
  const m = s.match(/\(([A-Z][A-Za-z0-9_]*)\)$/);
  return m ? m[1]! : "";
}

function composeSourceVersion(sourceFile?: string, version?: string): string {
  if (sourceFile && version) return `${sourceFile}/${version}`;
  if (sourceFile) return sourceFile;
  if (version) return version;
  return SOURCE_VERSION_FALLBACK;
}

function simplifyDataObjects(map: Record<string, DataObjectSchema>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [id, schema] of Object.entries(map)) {
    out[id] = {
      name: schema.name,
      description: schema.description,
      primaryKey: schema.primaryKey,
      properties: schema.properties.map((p) => ({
        name: p.name,
        type: p.type,
        description: p.description,
        ...(p.isForeignKey ? { isForeignKey: true, references: p.references } : {}),
      })),
    };
  }
  return out;
}

function simplifyEvents(map: Record<string, EventSchema>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [id, schema] of Object.entries(map)) {
    out[id] = {
      name: schema.name,
      description: schema.description,
      sourceAction: schema.sourceAction,
      eventData: schema.eventData,
      stateMutations: schema.stateMutations,
    };
  }
  return out;
}
