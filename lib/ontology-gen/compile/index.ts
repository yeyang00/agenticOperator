/**
 * Compile stage — projects an `Action` into an `ActionObject`. The 11 section
 * renderers in `./sections.ts` are pure; this file orchestrates them and
 * derives `prompt` via `assemblePrompt(sections)` (spec §7.2 — single source of
 * truth for prompt assembly).
 */

import type { CompileOptions } from "../types.internal";
import type { Action, ActionObject } from "../types.public";
import { applyClientFilter } from "./filter";
import {
  renderActionSpec,
  renderBeforeReturning,
  renderCompletionCriteria,
  renderErrorPolicy,
  renderInputsSpec,
  renderOutput,
  renderPreconditions,
  renderPurpose,
  renderRuleIndex,
  renderSideEffectBoundary,
  renderSteps,
} from "./sections";

export function assemblePrompt(sections: ActionObject["sections"]): string {
  const order: Array<keyof typeof sections> = [
    "actionSpec",
    "purpose",
    "preconditions",
    "inputsSpec",
    "steps",
    "output",
    "sideEffectBoundary",
    "errorPolicy",
    "completionCriteria",
    "ruleIndex",
    "beforeReturning",
  ];
  return order
    .map((k) => sections[k])
    .filter((s): s is string => s !== null)
    .join("\n\n");
}

export function projectActionObject(action: Action, opts: CompileOptions): ActionObject {
  // Derive a filtered view when the caller scopes by client/department; the
  // filter rewrites only `actionSteps[*].rules` (see ./filter.ts). All other
  // top-level fields pass through unchanged.
  const view = opts.clientFilter ? applyClientFilter(action, opts.clientFilter) : action;

  const sections: ActionObject["sections"] = {
    actionSpec: renderActionSpec(view),
    purpose: renderPurpose(view),
    preconditions: renderPreconditions(view),
    inputsSpec: renderInputsSpec(view),
    steps: renderSteps(view),
    output: renderOutput(view),
    sideEffectBoundary: renderSideEffectBoundary(view),
    errorPolicy: renderErrorPolicy(view),
    completionCriteria: renderCompletionCriteria(view),
    ruleIndex: renderRuleIndex(view),
    beforeReturning: renderBeforeReturning(view),
  };

  const prompt = assemblePrompt(sections);

  const compiledAt = opts.compiledAtOverride ?? new Date().toISOString();

  return {
    id: view.id,
    name: view.name,
    description: view.description,
    submissionCriteria: view.submissionCriteria,
    category: view.category,
    actor: view.actor,
    trigger: view.trigger,
    targetObjects: view.targetObjects,
    inputs: view.inputs,
    outputs: view.outputs,
    actionSteps: view.actionSteps,
    sideEffects: view.sideEffects,
    triggeredEvents: view.triggeredEvents,
    prompt,
    sections,
    meta: {
      actionId: view.id,
      actionName: view.name,
      domain: opts.domain,
      compiledAt,
      templateVersion: "v3",
    },
  };
}
