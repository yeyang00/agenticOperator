/**
 * Helper to render a Human-actor task template (V4-2 form).
 *
 * Per the action distribution analysis: 9 of the 22 actions have actor=Human,
 * meaning humans (HSM / 招聘专员 / etc.) execute them. The agent does NOT
 * execute these actions — but it may need to recognize them in a workflow
 * to surface a human-handover prompt.
 */

import { applyClientFilter } from "../../compile/filter";

import type { ActionObjectV4, EnrichedAction, RuleInstruction } from "../types";

interface HumanTaskOptions {
  client?: string;
  runtimeInput?: string | Record<string, unknown>;
  /** Optional rule instructions — only the 2 Human actions with rules use these */
  ruleInstructions?: Record<string, RuleInstruction>;
}

export function renderHumanTaskActionObject(
  enriched: EnrichedAction,
  opts: HumanTaskOptions,
): ActionObjectV4 {
  const action = opts.client ? applyClientFilter(enriched.action, { client: opts.client }) : enriched.action;
  const ruleCount = action.actionSteps.reduce((n, s) => n + s.rules.length, 0);
  const hasRules = ruleCount > 0;

  const sections: string[] = [];

  sections.push(
    [
      `## Human-actor action (no agent execution)`,
      ``,
      `Action \`${action.name}\` is performed by a human operator (${action.actor.join(", ")}). The agent does NOT execute this action. If you receive a request to evaluate this action:`,
      `- Acknowledge that the action requires human handover`,
      `- Surface the relevant context and rules (if any) so the human knows what to do`,
      `- Return a stub output with \`{ "status": "human_handover_required", "actor": "${action.actor.join(", ")}" }\``,
    ].join("\n"),
  );

  sections.push(
    [
      `## Action context`,
      ``,
      `- Category: ${action.category || "(unspecified)"}`,
      `- Trigger: ${action.trigger.join(", ") || "(none)"}`,
      ``,
      `Description:`,
      action.description || "(no description)",
    ].join("\n"),
  );

  sections.push(
    [
      `## Inputs`,
      ``,
      `If the runtime supplies input data for this action (for context only, not for agent execution):`,
      ``,
      typeof opts.runtimeInput === "string"
        ? opts.runtimeInput
        : opts.runtimeInput
          ? "```json\n" + JSON.stringify(opts.runtimeInput, null, 2) + "\n```"
          : "{{RUNTIME_INPUT}}",
    ].join("\n"),
  );

  if (hasRules && opts.ruleInstructions) {
    sections.push(`## Rules to surface to the human (no agent execution)`);
    for (const step of action.actionSteps) {
      for (const r of step.rules) {
        const ri = opts.ruleInstructions[r.id];
        if (ri) sections.push(`[Rule ${r.id}]\n\n${ri.instruction}`);
      }
    }
  }

  sections.push(
    [
      `## Output`,
      ``,
      `Return a JSON stub:`,
      "```json",
      JSON.stringify(
        {
          status: "human_handover_required",
          actor: action.actor,
          context: "see Inputs above",
        },
        null,
        2,
      ),
      "```",
    ].join("\n"),
  );

  return {
    prompt: sections.join("\n\n"),
    meta: {
      actionId: action.id,
      actionName: action.name,
      domain: "RAAS-v1",
      client: opts.client,
      compiledAt: new Date().toISOString(),
      templateVersion: "v4",
      promptStrategy: "v4-2",
      validation: {
        driftDetected: false,
        roundTripFailures: Object.values(opts.ruleInstructions ?? {})
          .filter((ri) => ri.meta.roundTripCheck === "failed")
          .map((ri) => ri.id),
        missingInstructions: [],
      },
    },
  };
}
