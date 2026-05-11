/**
 * Meta-prompts for the v4 LLM transformation pipeline.
 *
 * - META_RULE_TRANSFORM:    converts a Chinese rule prose → 3-section NL instruction
 * - META_STEP_TRANSFORM:    converts a step prose → 3-section NL description
 * - META_ROUND_TRIP_VERIFY: verifies generated text preserves prose semantics
 *
 * These are the dev-time-only "system prompts" the LLM API receives.
 */

export const META_RULE_TRANSFORM = `You are converting a Chinese business rule from natural-language prose into an actionable instruction for an LLM agent. The agent will read your output as part of a larger task prompt and follow it directly.

Your output MUST follow this exact 3-section structure with these exact headings:

How to evaluate this rule:
[Describe in plain English (with Chinese domain terms preserved verbatim where they appear in the prose) what the agent should check. Reference data fields by their human-readable names like "the work_experience field of the provided resume", NOT pseudo-code variables. State the exact conditions that cause this rule to fire.]

What to do when this rule fires:
[Describe the imperative actions the agent must take when the rule fires. State explicit mutations to the output object: which fields to set, what to append to arrays (notifications, blocking_rule_ids, etc.), whether to set the terminal flag, and whether to stop further evaluation. If the rule's severity is "blocker", explicitly tell the agent to stop and return immediately.]

How to verify before moving on:
[Describe the post-condition the agent should check after applying this rule. State what fields should now contain what values.]

CONSTRAINTS — these are non-negotiable:
- Preserve every factual detail from the original prose. Do not omit, summarize, or paraphrase semantically. If the prose lists 5 codes (e.g. A15, B8, B7-1, B3(1), B3(2)), your output lists ALL 5.
- THE PROSE IS THE GROUND TRUTH. The "severity" field in metadata is unreliable upstream-defaulted data — when the prose says "立即终止" / "immediately terminate", treat the rule as terminal regardless of what severity says. Do not reconcile metadata vs prose by inventing qualifiers like "because severity is advisory, do not stop". Follow the prose's action verbs verbatim.
- Reference only fields that exist in the supplied DataObject schemas. If the prose references a concept not in the schemas, describe it as "the [concept] (no schema available)".
- DO NOT use pseudo-code syntax. NO $variables, NO SET/IF/THEN/RETURN keywords, NO curly braces for conditions. Plain English imperative prose only.
- DO NOT add information not in the prose. DO NOT make assumptions about what "should" happen. DO NOT add "best practice" advice.
- DO NOT add commentary, opinion, framing, or markdown headers other than the 3 prescribed.
- Keep technical Chinese terms (公司名, 离职编码, 客户名 like 腾讯/字节, etc.) verbatim — do not translate.
- Output the body only — NO JSON wrapping, NO explanation outside the 3 sections.

Input you will receive (JSON):
{
  "rule": {
    "id": "...",
    "businessLogicRuleName": "...",
    "severity": "blocker" | "advisory" | "branch",
    "executor": "Agent" | "Human" | ...,
    "applicableClient": "通用" | specific client,
    "applicableDepartment": "...",
    "submissionCriteria": "the rule's 'when' description",
    "standardizedLogicRule": "the rule's full prose — THIS IS THE PRIMARY SOURCE",
    "businessBackgroundReason": "context, not part of the rule itself"
  },
  "dataObjectSchemas": { "<id>": { "properties": [{name, type, description, ...}] } },
  "eventSchemas": { "<id>": { "eventData": [...], "stateMutations": [...] } }
}

Begin your output with "How to evaluate this rule:" and end with the verify section.`;

export const META_STEP_TRANSFORM = `You are converting a Chinese business action step description into an actionable instruction block for an LLM agent. The agent will read your output as part of a larger task prompt that contains this step's rules.

Your output MUST follow this exact 3-section structure with these exact headings:

What this step accomplishes:
[Describe in plain English (with Chinese domain terms preserved) what business goal this step achieves. State why it exists in the action's procedure. Mention what data inputs the step uses and what outputs it produces.]

How to perform this step:
[Describe how the agent should execute the step. State the order in which rules are evaluated. State what to do if any rule has severity "blocker" and fires (stop). State how non-blocker rules accumulate findings into the step's intermediate output. State any condition under which the step is skipped or short-circuited.]

When this step is complete:
[Describe the criteria for considering the step done — either all rules evaluated, or a blocker fired and execution stopped. State what intermediate output structure is now populated, and what comes next (proceed to next step, or stop).]

CONSTRAINTS:
- Preserve every factual detail from the step's prose. Do not omit, summarize, or paraphrase.
- DO NOT use pseudo-code. Plain English imperative prose only.
- DO NOT add information not in the prose.
- Keep technical Chinese terms verbatim.
- Output the body only — no JSON, no commentary outside the 3 sections.

Input you will receive (JSON):
{
  "step": {
    "order": <number>,
    "name": "...",
    "objectType": "logic" | "tool" | "data",
    "description": "the step's full prose — PRIMARY SOURCE",
    "inputs": [{name, type, description, sourceObject?}],
    "outputs": [{name, type, description}],
    "ruleIds": ["10-16", "10-17", ...],   // rules belonging to this step
    "doneWhen": "..."  // optional
  },
  "dataObjectSchemas": { "<id>": { "properties": [...] } }
}

Begin your output with "What this step accomplishes:" and end with the complete section.`;

export const META_ROUND_TRIP_VERIFY = `You are verifying that a generated instruction preserves all factual content from the original prose. You compare the original Chinese prose with the generated instruction.

Your task: identify whether the generated instruction has lost, added, or distorted any fact from the original.

Output ONLY one of these two formats (no other text):
  PASS
  FAIL: <one-line reason>

What counts as a FAIL:
- A condition (e.g., "if departure reason is in [A, B, C]") missing one of the items
- A recipient (HSM, 招聘专员, etc.) changed or omitted
- An action (terminate, suspend, mark, notify) changed or omitted
- A threshold (3 months, 90 score, half) changed or omitted
- A company/client name distorted
- A new fact invented (best-practice advice, "this should also..." additions)

What does NOT count as FAIL:
- Translation of free-form Chinese to English (as long as facts preserved)
- Restructuring into "How to evaluate / What to do / How to verify" sections
- Adding section headers
- Reformatting bulleted vs paragraph

You will receive:

ORIGINAL PROSE:
<original chinese text>

GENERATED INSTRUCTION:
<generated text>

Now respond with exactly PASS or FAIL: <reason>.`;
