/**
 * Public surface of `lib/ontology-gen/`.
 *
 * Stable exports — consumed by the CLI scripts in `scripts/`. A future React
 * preview page can import from here too without re-implementing.
 */

import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

import { projectActionObject } from "./compile/index";
import { emitActionObjectModule } from "./emit";
import { fetchAction } from "./fetch";
import type { GenerateOptions } from "./types.internal";
import type { ActionObject } from "./types.public";

export {
  ActionValidationError,
  OntologyAuthError,
  OntologyContractError,
  OntologyGenError,
  OntologyNotFoundError,
  OntologyRequestError,
  OntologyServerError,
  OntologyTimeoutError,
  OntologyUpstreamError,
} from "./errors";
export { fetchAction, parseAction } from "./fetch";
export { projectActionObject, assemblePrompt } from "./compile/index";
export { emitActionObjectModule } from "./emit";
export { resolveActionObject } from "./runtime";
export type { ResolveActionInput } from "./runtime";
export type {
  Action,
  ActionDataChange,
  ActionInput,
  ActionNotification,
  ActionObject,
  ActionOutput,
  ActionRule,
  ActionSideEffects,
  ActionStep,
  ActionStepInput,
  ActionStepOutput,
} from "./types.public";
export type {
  CompileOptions,
  EmitOptions,
  FetchOptions,
  GenerateOptions,
} from "./types.internal";

/**
 * One-shot orchestrator: fetch → project → emit → write. Used by the CLI.
 *
 * Atomicity: write happens last; any earlier failure leaves any pre-existing
 * file at `outputPath` untouched. Per spec §8.6, parent directory is created
 * if missing; concurrent invocations to the same path are not coordinated.
 */
export async function generateActionSnapshot(
  opts: GenerateOptions,
): Promise<{ sourceCode: string; fileName: string; meta: ActionObject["meta"] }> {
  const action = await fetchAction(opts);
  const obj = projectActionObject(action, opts);
  const sourceCode = emitActionObjectModule(obj, opts);

  await mkdir(dirname(opts.outputPath), { recursive: true });
  await writeFile(opts.outputPath, sourceCode, "utf8");

  return {
    sourceCode,
    fileName: opts.outputPath,
    meta: obj.meta,
  };
}
