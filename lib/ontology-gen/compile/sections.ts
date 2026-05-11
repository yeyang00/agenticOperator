/**
 * Section renderers — spec §7.5.
 *
 * Eleven pure functions, each `(action: Action) => string | null`. Four always
 * return a string (`actionSpec`, `errorPolicy`, `completionCriteria`,
 * `beforeReturning`); the rest return `null` when their source data is empty.
 *
 * Renderers must NEVER return `""` — empty string would break the assemble
 * filter in §7.2.
 */

import type {
  Action,
  ActionRule,
  ActionStep,
} from "../types.public";

// ───── shared formatting helpers ─────

const HEADER_PREFIX = "## ";
const ITEM_BULLET = "- ";
const STEP_INDENT = "   ";
const RULE_INDENT = "   - ";

/** Strip trailing whitespace; CJK-aware (handles ideographic space U+3000). */
const trimEnd = (s: string): string => s.replace(/[\s　]+$/u, "");
const isBlank = (s: string): boolean => s.trim().length === 0;

const truncOneLine = (s: string, max = 60): string => {
  const firstLine = trimEnd(s).split("\n")[0] ?? "";
  return firstLine.length > max ? `${firstLine.slice(0, max - 1)}…` : firstLine;
};

function dedupeStable<T>(arr: T[]): T[] {
  const seen = new Set<T>();
  const out: T[] = [];
  for (const x of arr) {
    if (!seen.has(x)) {
      seen.add(x);
      out.push(x);
    }
  }
  return out;
}

/**
 * Map a declared type string (e.g. "List<String>", "JSON") to a JSON placeholder
 * suitable for the Output section's skeleton block. Unknown types fall back to
 * `"<Type>"` (a quoted string placeholder).
 */
function jsonPlaceholder(type: string): string {
  const t = type.trim();
  const listMatch = /^List<(.+)>$/i.exec(t);
  if (listMatch) {
    return `["<${listMatch[1]}>", "..."]`;
  }
  if (/^Map<.+>$/i.test(t)) {
    return `{ "<key>": "<value>" }`;
  }
  if (/^(Number|Integer|Float)$/i.test(t)) {
    return `<${t}>`;
  }
  if (/^Boolean$/i.test(t)) {
    return `<Boolean>`;
  }
  return `"<${t}>"`;
}

// ───── 7.5.1 actionSpec (always non-null) ─────

export function renderActionSpec(action: Action): string {
  const meta: string[] = [];
  if (!isBlank(action.category)) {
    meta.push(`${ITEM_BULLET}Category: ${action.category}`);
  }
  if (action.actor.length > 0) {
    meta.push(`${ITEM_BULLET}Actor:    ${action.actor.join(", ")}`);
  }
  if (action.trigger.length > 0) {
    meta.push(`${ITEM_BULLET}Trigger:  ${action.trigger.join(", ")}`);
  }
  const metaBlock = meta.length > 0 ? `\n\n${meta.join("\n")}` : "";

  return `${HEADER_PREFIX}Action specification: ${action.name}

The block below is the formal specification of the action \`${action.name}\`. It is part of a larger user message; the runtime supplies inputs and additional context separately. Treat this block as a binding contract: do not deviate from the declared steps, do not write outside the declared targets, and do not return outputs outside the declared schema. If preconditions are unmet or required inputs are missing, follow Error policy.${metaBlock}`;
}

// ───── 7.5.2 purpose ─────

export function renderPurpose(action: Action): string | null {
  if (isBlank(action.description)) return null;
  return `${HEADER_PREFIX}Purpose\n${trimEnd(action.description)}`;
}

// ───── 7.5.3 preconditions ─────

export function renderPreconditions(action: Action): string | null {
  if (isBlank(action.submissionCriteria)) return null;
  return `${HEADER_PREFIX}Preconditions\n${trimEnd(action.submissionCriteria)}`;
}

// ───── 7.5.4 inputsSpec ─────

export function renderInputsSpec(action: Action): string | null {
  if (action.inputs.length === 0) return null;
  const lines = action.inputs.map((inp) => {
    const required = inp.required ? "required" : "optional";
    const desc = isBlank(inp.description) ? "(no description)" : trimEnd(inp.description);
    const source = inp.sourceObject ? ` ← ${inp.sourceObject}` : "";
    return `${ITEM_BULLET}${inp.name} (${inp.type}, ${required})${source}: ${desc}`;
  });
  return `${HEADER_PREFIX}Inputs
The runtime provides these as a JSON object on the inbound payload; field names match exactly. Validate before proceeding; if a required field is missing, follow Error policy.

${lines.join("\n")}`;
}

// ───── 7.5.5 steps ─────

export function renderSteps(action: Action): string | null {
  if (action.actionSteps.length === 0) return null;

  const stepBlocks = [...action.actionSteps]
    .sort((a, b) => a.order - b.order)
    .map((step) => renderOneStep(step, action));

  return `${HEADER_PREFIX}Steps\n${stepBlocks.join("\n\n")}`;
}

function renderOneStep(step: ActionStep, action: Action): string {
  const stepName = isBlank(step.name) ? "(unnamed)" : step.name;
  // v3: append [objectType] when meaningful (skip "unknown" soft-default and blank).
  const objTypeTag =
    step.objectType && !isBlank(step.objectType) && step.objectType !== "unknown"
      ? ` [${step.objectType}]`
      : "";
  const lines: string[] = [`${step.order}. ${stepName}${objTypeTag}`];

  if (step.condition && !isBlank(step.condition)) {
    lines.push(`${STEP_INDENT}precondition: ${trimEnd(step.condition)}`);
  }

  if (!isBlank(step.description)) {
    lines.push(`${STEP_INDENT}description:  ${trimEnd(step.description)}`);
  }

  if (step.inputs.length > 0) {
    lines.push(`${STEP_INDENT}inputs:`);
    for (const inp of step.inputs) {
      const source = inp.sourceObject ? ` ← ${inp.sourceObject}` : "";
      const desc = isBlank(inp.description) ? "" : ` — ${trimEnd(inp.description)}`;
      lines.push(`${RULE_INDENT}${inp.name} (${inp.type})${source}${desc}`);
    }
  }

  if (step.outputs.length > 0) {
    lines.push(`${STEP_INDENT}outputs:`);
    for (const out of step.outputs) {
      const desc = isBlank(out.description) ? "" : ` — ${trimEnd(out.description)}`;
      lines.push(`${RULE_INDENT}${out.name} (${out.type})${desc}`);
    }
  }

  const matchesStep = (refId: string | undefined): boolean =>
    refId !== undefined && (refId === step.name || refId === String(step.order));

  const writes = action.sideEffects.dataChanges.filter((d) => matchesStep(d.stepRefId));
  if (writes.length > 0) {
    lines.push(`${STEP_INDENT}writes:`);
    for (const w of writes) {
      const props = w.propertyImpacted.length > 0 ? ` {${w.propertyImpacted.join(", ")}}` : "";
      const verb = w.action || "WRITE";
      lines.push(`${RULE_INDENT}${w.objectType}: ${verb}${props}`);
    }
  }

  const notifies = action.sideEffects.notifications.filter((n) => matchesStep(n.stepRefId));
  if (notifies.length > 0) {
    lines.push(`${STEP_INDENT}notifies:`);
    for (const n of notifies) {
      const evt = n.triggeredEvent ? ` (event: ${n.triggeredEvent})` : "";
      const recip = n.recipient || "(unspecified)";
      const chan = n.channel ? ` via ${n.channel}` : "";
      const cond = n.condition ? ` when ${trimEnd(n.condition)}` : "";
      lines.push(`${RULE_INDENT}${recip}${chan}${cond}${evt}`);
    }
  }

  // v3: rules render in 3-row format with `/`-separated metadata, optional
  // businessLogicRuleName label, and explicit `when:` / `do:` keywords.
  if (step.rules.length > 0) {
    lines.push(`${STEP_INDENT}rules:`);
    const sortedRules = [...step.rules].sort((a, b) =>
      a.id < b.id ? -1 : a.id > b.id ? 1 : 0,
    );
    for (const r of sortedRules) {
      lines.push(...renderRuleBlock(r));
    }
  }

  if (step.doneWhen && !isBlank(step.doneWhen)) {
    lines.push(`${STEP_INDENT}done when:    ${trimEnd(step.doneWhen)}`);
  }

  return lines.join("\n");
}

/**
 * Render one rule as a 3-row block (header / when / do):
 *
 *   - (<id> / <severity>[ / <executor>][ / <applicableClient>])[ <businessLogicRuleName>]
 *        when: <submissionCriteria>
 *        do:   <description>
 *
 * Continuation indent is 5 spaces past `RULE_INDENT` so the `when:` / `do:`
 * tokens align under the dash. Skips `when:` if `submissionCriteria` is blank;
 * uses "(no description)" if `description` is blank.
 */
function renderRuleBlock(rule: ActionRule): string[] {
  const sev = rule.severity || "advisory";
  const metaParts = [rule.id, sev];
  if (rule.executor && !isBlank(rule.executor)) metaParts.push(rule.executor);
  if (rule.applicableClient && !isBlank(rule.applicableClient)) {
    metaParts.push(rule.applicableClient);
  }
  const metaTag = `(${metaParts.join(" / ")})`;

  const labelFrag =
    rule.businessLogicRuleName && !isBlank(rule.businessLogicRuleName)
      ? ` ${trimEnd(rule.businessLogicRuleName)}`
      : "";

  const out: string[] = [`${RULE_INDENT}${metaTag}${labelFrag}`];

  // Hanging indent: same width as `RULE_INDENT` ("   - " = 5 chars) but
  // all spaces, so `when:`/`do:` align under the `(` of the metadata.
  const HANG = RULE_INDENT.replace(/[^ ]/g, " ");
  if (!isBlank(rule.submissionCriteria)) {
    out.push(`${HANG}when: ${trimEnd(rule.submissionCriteria)}`);
  }
  const desc = isBlank(rule.description) ? "(no description)" : trimEnd(rule.description);
  out.push(`${HANG}do:   ${desc}`);

  return out;
}

// ───── 7.5.6 output ─────

export function renderOutput(action: Action): string | null {
  if (action.outputs.length === 0) return null;

  const fieldLines = action.outputs.map((out) => {
    const desc = isBlank(out.description) ? "(no description)" : trimEnd(out.description);
    return `${ITEM_BULLET}${out.name} (${out.type}): ${desc}`;
  });

  const skeletonEntries = action.outputs.map(
    (out) => `  ${JSON.stringify(out.name)}: ${jsonPlaceholder(out.type)}`,
  );
  const skeleton = `{\n${skeletonEntries.join(",\n")}\n}`;

  return `${HEADER_PREFIX}Output
Return a JSON object matching this schema. The fields below are required; do not include extra keys.

${fieldLines.join("\n")}

\`\`\`json
${skeleton}
\`\`\``;
}

// ───── 7.5.7 sideEffectBoundary ─────

export function renderSideEffectBoundary(action: Action): string | null {
  const dataChanges = action.sideEffects.dataChanges;
  const notifications = action.sideEffects.notifications;

  // ── writes: one entry per dataChange, full detail ──
  const writeBlocks: string[] = [];
  const writeObjectTypes = new Set<string>();
  for (const dc of dataChanges) {
    if (isBlank(dc.objectType)) continue;
    writeObjectTypes.add(dc.objectType);
    const verb = dc.action && !isBlank(dc.action) ? dc.action : "WRITE";
    const block: string[] = [`- ${dc.objectType} / ${verb}`];
    if (dc.propertyImpacted.length > 0) {
      block.push(`   fields: ${dc.propertyImpacted.join(", ")}`);
    }
    if (!isBlank(dc.description)) {
      // first-line only — avoid multi-line description bleeding into block
      const firstLine = trimEnd(dc.description).split("\n")[0] ?? "";
      if (!isBlank(firstLine)) block.push(`   note:   ${firstLine}`);
    }
    writeBlocks.push(block.join("\n"));
  }

  // ── reads: targetObjects minus the write set ──
  const reads = action.targetObjects.filter((o) => !writeObjectTypes.has(o));

  // ── notifies: one entry per notification (preserve API order) ──
  const notifyBlocks: string[] = [];
  for (const n of notifications) {
    const recip = n.recipient && !isBlank(n.recipient) ? n.recipient : "(unspecified)";
    const chan = n.channel && !isBlank(n.channel) ? n.channel : "(unspecified)";
    const block: string[] = [`- ${recip} / ${chan}`];
    if (!isBlank(n.condition)) {
      block.push(`   when:  ${trimEnd(n.condition)}`);
    }
    const evt = n.triggeredEvent && !isBlank(n.triggeredEvent) ? n.triggeredEvent : "(none)";
    block.push(`   event: ${evt}`);
    notifyBlocks.push(block.join("\n"));
  }

  // ── emits: dedup-stable union of action.triggeredEvents and notifications[].triggeredEvent ──
  const events = dedupeStable([
    ...action.triggeredEvents,
    ...notifications.map((n) => n.triggeredEvent).filter((s) => !isBlank(s)),
  ]);

  if (
    writeBlocks.length === 0 &&
    reads.length === 0 &&
    notifyBlocks.length === 0 &&
    events.length === 0
  ) {
    return null;
  }

  const sections: string[] = [];
  if (writeBlocks.length > 0) {
    sections.push(`### writes\n${writeBlocks.join("\n")}`);
  }
  if (reads.length > 0) {
    sections.push(`### reads\n${reads.join(", ")}`);
  }
  if (notifyBlocks.length > 0) {
    sections.push(`### notifies\n${notifyBlocks.join("\n")}`);
  }
  if (events.length > 0) {
    sections.push(`### emits\n${events.map((e) => `- ${e}`).join("\n")}`);
  }
  sections.push(`Anything outside the above is out of scope; refuse and surface via Error policy.`);

  return `${HEADER_PREFIX}Side-effect boundary\n\n${sections.join("\n\n")}`;
}

// ───── 7.5.8 errorPolicy (always non-null) ─────

export function renderErrorPolicy(action: Action): string {
  const lines: string[] = [
    `${ITEM_BULLET}Missing or invalid required input → return {"status":"failed","reason":"<which field>","retry":false}; do not partially execute.`,
    `${ITEM_BULLET}Upstream resource unreachable or auth failure → return {"status":"failed","reason":"<...>","retry":true}.`,
  ];

  const hasBlocker = action.actionSteps.some((s) => s.rules.some((r) => r.severity === "blocker"));
  if (hasBlocker) {
    lines.push(
      `${ITEM_BULLET}Blocker-severity rule violation → halt the offending step, surface failure, do not proceed to dependent steps.`,
    );
  }

  const alertEvents = dedupeStable(
    action.sideEffects.notifications
      .map((n) => n.triggeredEvent)
      .filter((e) => e.length > 0),
  );
  if (alertEvents.length > 0) {
    lines.push(
      `${ITEM_BULLET}When any condition listed in a step's "notifies:" line is met, emit the corresponding event with details. Alert events: ${alertEvents.join(", ")}.`,
    );
  }

  return `${HEADER_PREFIX}Error policy\n${lines.join("\n")}`;
}

// ───── 7.5.9 completionCriteria (always non-null) ─────

export function renderCompletionCriteria(action: Action): string {
  const items: string[] = [];

  if (action.actionSteps.length > 0) {
    items.push(
      `Each step has run to its declared termination, or its failure has been surfaced per Error policy.`,
    );
  }

  if (action.outputs.length > 0) {
    const required = action.outputs.map((o) => o.name).join(", ");
    items.push(
      `The Output JSON contains all required keys (${required}) and conforms to the schema in Output.`,
    );
  }

  const hasOutboundEvents =
    action.triggeredEvents.length > 0 ||
    action.sideEffects.notifications.some((n) => n.triggeredEvent.length > 0);
  if (hasOutboundEvents) {
    items.push(
      `Any required outbound event has been emitted (success events on success; alert events on failure).`,
    );
  }

  if (items.length === 0) {
    items.push(`The response addresses what was asked.`);
  }

  const numbered = items.map((s, i) => `${i + 1}. ${s}`);
  return `${HEADER_PREFIX}Completion criteria
The action is complete when ALL of:

${numbered.join("\n")}`;
}

// ───── 7.5.10 ruleIndex ─────

export function renderRuleIndex(action: Action): string | null {
  // v3: group by step (in step.order), within each group sort by rule.id.
  // Skip steps with no rules; return null if no rules anywhere.
  const sortedSteps = [...action.actionSteps].sort((a, b) => a.order - b.order);

  const stepBlocks: string[] = [];
  for (const step of sortedSteps) {
    if (step.rules.length === 0) continue;

    const sortedRules = [...step.rules].sort((a, b) =>
      a.id < b.id ? -1 : a.id > b.id ? 1 : 0,
    );

    const lines: string[] = [];
    const stepName = isBlank(step.name) ? "(unnamed)" : step.name;
    lines.push(`### step ${step.order} — ${stepName}`);

    for (const rule of sortedRules) {
      const sev = rule.severity || "advisory";
      const metaParts = [rule.id, sev];
      if (rule.executor && !isBlank(rule.executor)) metaParts.push(rule.executor);
      if (rule.applicableClient && !isBlank(rule.applicableClient)) {
        metaParts.push(rule.applicableClient);
      }
      const metaTag = `(${metaParts.join(" / ")})`;

      // Label preference: businessLogicRuleName → submissionCriteria → description
      const seedLabel =
        (rule.businessLogicRuleName && !isBlank(rule.businessLogicRuleName)
          ? rule.businessLogicRuleName
          : !isBlank(rule.submissionCriteria)
            ? rule.submissionCriteria
            : rule.description) ?? "";
      const label = isBlank(seedLabel) ? "(no description)" : truncOneLine(seedLabel);

      lines.push(`${ITEM_BULLET}${metaTag} ${label}`);
    }

    stepBlocks.push(lines.join("\n"));
  }

  if (stepBlocks.length === 0) return null;

  return `${HEADER_PREFIX}Rule index\n\n${stepBlocks.join("\n\n")}`;
}

// ───── 7.5.11 beforeReturning (always non-null) ─────

export function renderBeforeReturning(action: Action): string {
  const checks: string[] = [];

  if (action.outputs.length > 0) {
    checks.push(`Output JSON conforms to the Output schema (no extra or missing keys).`);
  }
  if (action.sideEffects.dataChanges.length > 0 || action.targetObjects.length > 0) {
    checks.push(`No write occurred outside Side-effect boundary.`);
  }
  if (
    action.sideEffects.notifications.length > 0 ||
    action.triggeredEvents.length > 0
  ) {
    checks.push(`Every required notification or outbound event has been emitted.`);
  }

  const hasBlocker = action.actionSteps.some((s) => s.rules.some((r) => r.severity === "blocker"));
  if (hasBlocker) {
    checks.push(`All blocker-severity rules were respected — no violation went unhandled.`);
  }
  if (checks.length === 0) {
    checks.push(`The response addresses what was asked.`);
  }

  const lines = checks.map((c) => `${ITEM_BULLET}${c}`);
  return `${HEADER_PREFIX}Before returning
Verify all of the following before responding:

${lines.join("\n")}`;
}
