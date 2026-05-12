/**
 * Strict batch output schema for the LLM in the full `rule-check` impl.
 *
 * The LLM emits `{ judgments: RuleJudgmentAudited[] }` — one judgment per
 * matchResume rule, in a single call. Both Zod (runtime) and JSON Schema
 * (OpenAI `response_format`) representations are kept side-by-side and MUST
 * stay in sync.
 *
 * Note: `evidence[i].grounded` is intentionally NOT in the LLM-side schema —
 * it is set in-place by post-validation (`validation/evidence-grounded.ts`).
 * Letting the LLM declare itself "grounded" would defeat the validator.
 */

import { z } from "zod";

// ─── Zod (runtime parsing) ────────────────────────────────────────────

export const EvidenceAuditedSchema = z.object({
  sourceType: z.literal("neo4j_instance"),
  objectType: z.string().min(1),
  objectId: z.string().min(1),
  field: z.string().min(1),
  value: z.unknown(),
  fetchedInstanceIndex: z.number().int().min(0),
  decisive: z.boolean(),
});

export const RootCauseSectionsSchema = z.object({
  ruleRequirement: z.string(),
  dataObservation: z.string(),
  contrastReasoning: z.string(),
  conclusion: z.string(),
});

export const CounterfactualSchema = z.object({
  hypotheticalChange: z.string(),
  predictedDecision: z.enum(["not_started", "passed", "blocked", "pending_human"]),
  confidence: z.number().min(0).max(1),
});

export const RuleJudgmentAuditedSchema = z.object({
  ruleId: z.string().min(1),
  decision: z.enum(["not_started", "passed", "blocked", "pending_human"]),
  evidence: z.array(EvidenceAuditedSchema),
  rootCause: z.string(),
  rootCauseSections: RootCauseSectionsSchema,
  confidence: z.number().min(0).max(1),
  nextAction: z.string(),
  counterfactuals: z.array(CounterfactualSchema).optional(),
});

export const BatchJudgmentsSchema = z.object({
  judgments: z.array(RuleJudgmentAuditedSchema),
});

export type BatchJudgmentsZod = z.infer<typeof BatchJudgmentsSchema>;

// ─── JSON Schema (for OpenAI response_format strict mode) ────────────

const DecisionEnumJson = {
  type: "string",
  enum: ["not_started", "passed", "blocked", "pending_human"],
} as const;

const EvidenceAuditedJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "sourceType",
    "objectType",
    "objectId",
    "field",
    "value",
    "fetchedInstanceIndex",
    "decisive",
  ],
  properties: {
    sourceType: { type: "string", enum: ["neo4j_instance"] },
    objectType: { type: "string" },
    objectId: { type: "string" },
    field: { type: "string" },
    value: {},
    fetchedInstanceIndex: { type: "integer", minimum: 0 },
    decisive: { type: "boolean" },
  },
} as const;

const RootCauseSectionsJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "ruleRequirement",
    "dataObservation",
    "contrastReasoning",
    "conclusion",
  ],
  properties: {
    ruleRequirement: { type: "string" },
    dataObservation: { type: "string" },
    contrastReasoning: { type: "string" },
    conclusion: { type: "string" },
  },
} as const;

const CounterfactualJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["hypotheticalChange", "predictedDecision", "confidence"],
  properties: {
    hypotheticalChange: { type: "string" },
    predictedDecision: DecisionEnumJson,
    confidence: { type: "number", minimum: 0, maximum: 1 },
  },
} as const;

const RuleJudgmentAuditedJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "ruleId",
    "decision",
    "evidence",
    "rootCause",
    "rootCauseSections",
    "confidence",
    "nextAction",
  ],
  properties: {
    ruleId: { type: "string" },
    decision: DecisionEnumJson,
    evidence: { type: "array", items: EvidenceAuditedJsonSchema },
    rootCause: { type: "string" },
    rootCauseSections: RootCauseSectionsJsonSchema,
    confidence: { type: "number", minimum: 0, maximum: 1 },
    nextAction: { type: "string" },
    counterfactuals: { type: "array", items: CounterfactualJsonSchema },
  },
} as const;

export const BatchJudgmentsJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["judgments"],
  properties: {
    judgments: {
      type: "array",
      items: RuleJudgmentAuditedJsonSchema,
    },
  },
} as const;
