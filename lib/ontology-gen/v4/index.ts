/**
 * v4 entry point — exports the v4 public API.
 *
 * v3 lives at `lib/ontology-gen/index.ts` (untouched). v4 is a parallel
 * subsystem and consumers opt in by importing from `lib/ontology-gen/v4`.
 */

export { resolveActionObjectV4 } from "./runtime";
export { assembleActionObject, RUNTIME_INPUT_PLACEHOLDER } from "./assemble";
export { enrichAction } from "./enrich";
export { transformRule, transformStep } from "./transform";
export { verifyRoundTrip } from "./verify";
export { runCompletion, getDefaultModel, testConnection } from "./llm-client";
export { cacheClear, cacheStats } from "./cache";

// Canonical v4 entry — `generatePrompt` + `fillRuntimeInput` + typed runtime input.
// Recommended public surface; the strategy router above remains for legacy use.
export { generatePrompt, type GeneratePromptOptions } from "./generate-prompt";
export { fillRuntimeInput } from "./fill-runtime-input";
export {
  PLACEHOLDER_CLIENT,
  PLACEHOLDER_JOB,
  PLACEHOLDER_RESUME,
  MATCH_RESUME_HIERARCHY_SENTINEL,
  isMatchResumeAction,
} from "./placeholders";
export {
  isMatchResumeRuntimeInput,
  type RuntimeClient,
  type RuntimeJob,
  type RuntimeResume,
  type MatchResumeRuntimeInput,
  type RuntimeInputV4,
} from "./runtime-input.types";

export type {
  ActionObjectV4,
  ActionObjectMetaV4,
  PromptStrategy,
  ResolveActionInputV4,
  RuleInstruction,
  RuleInstructionMeta,
  StepInstruction,
  StepInstructionMeta,
  EnrichedAction,
  DataObjectSchema,
  DataObjectProperty,
  EventSchema,
  EventDataField,
  EventStateMutation,
  ValidationReport,
  AssemblePromptInput,
  TransformOptions,
} from "./types";
