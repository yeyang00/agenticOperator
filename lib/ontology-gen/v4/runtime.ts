/**
 * v4 runtime — `resolveActionObjectV4` with strategy router.
 *
 * Default strategy is "v4-2". V4-1 does runtime LLM transforms with cache;
 * V4-2/V4-3/V4-4 import committed templates and feed runtime input.
 */

import { fetchAction } from "../fetch";
import { applyClientFilter } from "../compile/filter";

import { assembleActionObject, RUNTIME_INPUT_PLACEHOLDER } from "./assemble";
import { cacheGet, cacheSet, makeCacheKey } from "./cache";
import { enrichAction } from "./enrich";
import { transformRule, transformStep } from "./transform";
import { verifyRoundTrip } from "./verify";
import type {
  ActionObjectV4,
  EnrichedAction,
  ResolveActionInputV4,
  RuleInstruction,
  StepInstruction,
} from "./types";

export async function resolveActionObjectV4(input: ResolveActionInputV4): Promise<ActionObjectV4> {
  const strategy = input.strategy ?? "v4-2";
  switch (strategy) {
    case "v4-1":
      return runV4_1(input);
    case "v4-2":
      return runV4_2(input);
    case "v4-3":
      return runV4_3(input);
    case "v4-4":
      return runV4_4(input);
    default:
      throw new Error(`Unknown v4 strategy: ${strategy}`);
  }
}

// ── V4-1: Runtime LLM transform + in-process cache ──

async function runV4_1(input: ResolveActionInputV4): Promise<ActionObjectV4> {
  const action = await fetchAction({
    actionRef: input.actionRef,
    domain: input.domain,
    apiBase: input.apiBase,
    apiToken: input.apiToken ?? process.env["ONTOLOGY_API_TOKEN"] ?? "",
    timeoutMs: input.timeoutMs,
  });
  const enriched = await enrichAction(action, {
    apiBase: input.apiBase,
    apiToken: input.apiToken,
    timeoutMs: input.timeoutMs,
  });

  // Cache key uses the action data fingerprint (not template files)
  const ruleVersions = collectRuleVersions(enriched);
  const key = makeCacheKey({
    actionRef: input.actionRef,
    domain: input.domain,
    client: input.client,
    ruleVersions,
  });
  let cached = cacheGet(key);
  if (cached) {
    return substituteRuntimeInput(cached, input.runtimeInput);
  }

  // Cache miss — transform every rule + every step in parallel
  const filteredAction = input.client
    ? applyClientFilter(enriched.action, { client: input.client })
    : enriched.action;

  const rulePromises: Promise<RuleInstruction>[] = [];
  const ruleStepMap: Map<string, number> = new Map();
  for (const step of filteredAction.actionSteps) {
    for (const rule of step.rules) {
      ruleStepMap.set(rule.id, step.order);
      rulePromises.push(
        transformRule(rule as never, enriched).then(async (ri) => {
          const v = await verifyRoundTrip(ri.meta.originalProse, ri.instruction);
          return {
            ...ri,
            meta: { ...ri.meta, roundTripCheck: v.status },
          };
        }),
      );
    }
  }

  const stepPromises: Promise<StepInstruction>[] = [];
  for (const step of filteredAction.actionSteps) {
    const ruleIds = step.rules.map((r) => r.id);
    stepPromises.push(transformStep(step as never, ruleIds, enriched));
  }

  const [ruleResults, stepResults] = await Promise.all([
    Promise.all(rulePromises),
    Promise.all(stepPromises),
  ]);

  const ruleInstructions: Record<string, RuleInstruction> = {};
  for (const r of ruleResults) ruleInstructions[r.id] = r;
  const stepInstructions: Record<number, StepInstruction> = {};
  for (const s of stepResults) stepInstructions[s.order] = s;

  cached = assembleActionObject(
    {
      enriched,
      client: input.client,
      ruleInstructions,
      stepInstructions,
    },
    { strategy: "v4-1" },
  );
  cacheSet(key, cached);

  return substituteRuntimeInput(cached, input.runtimeInput);
}

// ── V4-2: dynamic import of committed function template ──

async function runV4_2(input: ResolveActionInputV4): Promise<ActionObjectV4> {
  // Always fetch first so we resolve numeric id → action.name for the template path.
  const action = await fetchAction({
    actionRef: input.actionRef,
    domain: input.domain,
    apiBase: input.apiBase,
    apiToken: input.apiToken ?? process.env["ONTOLOGY_API_TOKEN"] ?? "",
    timeoutMs: input.timeoutMs,
  });

  const kebab = toKebab(action.name);
  const modulePath = `./templates/v4-2/${kebab}.template`;
  let mod: { default?: V4_TemplateFn; [k: string]: unknown };
  try {
    mod = await import(modulePath);
  } catch (err) {
    throw new Error(
      `V4-2 template not found for action "${action.name}" (input ref="${input.actionRef}") at ${modulePath}: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
  const fn = (mod.default ?? findFn(mod, action.name)) as V4_TemplateFn | undefined;
  if (!fn) {
    throw new Error(`V4-2 template module ${modulePath} does not export a callable template`);
  }

  const enriched: EnrichedAction = {
    action,
    dataObjectSchemas: {},
    eventSchemas: {},
  };

  const obj = fn(enriched, { client: input.client, runtimeInput: input.runtimeInput });
  return substituteRuntimeInput(obj, input.runtimeInput);
}

// ── V4-3: dynamic import of static literal template per (action, client) ──

async function runV4_3(input: ResolveActionInputV4): Promise<ActionObjectV4> {
  // If actionRef already looks like a camelCase action name, skip the fetch.
  // Otherwise (numeric id, etc.) fetch to resolve to action.name.
  let actionName = input.actionRef;
  if (!/^[a-zA-Z][a-zA-Z0-9]*$/.test(actionName)) {
    const action = await fetchAction({
      actionRef: input.actionRef,
      domain: input.domain,
      apiBase: input.apiBase,
      apiToken: input.apiToken ?? process.env["ONTOLOGY_API_TOKEN"] ?? "",
      timeoutMs: input.timeoutMs,
    });
    actionName = action.name;
  }

  const kebab = toKebab(actionName);
  const client = input.client ?? "通用";
  const modulePath = `./templates/v4-3/${kebab}.${client}.template`;
  let mod: { default?: ActionObjectV4; [k: string]: unknown };
  try {
    mod = await import(modulePath);
  } catch (err) {
    throw new Error(
      `V4-3 template not found for action="${actionName}" (input ref="${input.actionRef}") client="${client}" at ${modulePath}: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
  const obj = (mod.default ?? findObj(mod)) as ActionObjectV4 | undefined;
  if (!obj) {
    throw new Error(`V4-3 template module ${modulePath} does not export an ActionObject`);
  }
  return substituteRuntimeInput(obj, input.runtimeInput);
}

// ── V4-4: dynamic import of committed Chinese fill-in template ──

async function runV4_4(input: ResolveActionInputV4): Promise<ActionObjectV4> {
  // Same runtime shape as V4-2: fetch first so numeric ids resolve to action.name.
  const action = await fetchAction({
    actionRef: input.actionRef,
    domain: input.domain,
    apiBase: input.apiBase,
    apiToken: input.apiToken ?? process.env["ONTOLOGY_API_TOKEN"] ?? "",
    timeoutMs: input.timeoutMs,
  });

  const kebab = toKebab(action.name);
  const modulePath = `./templates/v4-4/${kebab}.template`;
  let mod: { default?: V4_TemplateFn; [k: string]: unknown };
  try {
    mod = await import(modulePath);
  } catch (err) {
    throw new Error(
      `V4-4 template not found for action "${action.name}" (input ref="${input.actionRef}") at ${modulePath}: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
  const fn = (mod.default ?? findFn(mod, action.name)) as V4_TemplateFn | undefined;
  if (!fn) {
    throw new Error(`V4-4 template module ${modulePath} does not export a callable template`);
  }

  const enriched: EnrichedAction = {
    action,
    dataObjectSchemas: {},
    eventSchemas: {},
  };

  const obj = fn(enriched, {
    client: input.client,
    domain: input.domain,
    runtimeInput: input.runtimeInput,
  });
  return substituteRuntimeInput(obj, input.runtimeInput);
}

// ── helpers ──

type V4_TemplateFn = (
  enriched: EnrichedAction,
  options: { client?: string; domain?: string; runtimeInput?: string | Record<string, unknown> },
) => ActionObjectV4;

function findFn(mod: Record<string, unknown>, actionRef: string): V4_TemplateFn | undefined {
  // try common naming patterns: matchResumeTemplate, etc.
  const camel = actionRef.replace(/[A-Z]/g, (m, i: number) => (i === 0 ? m.toLowerCase() : m));
  const candidates = [
    `${camel}Template`,
    `${actionRef}Template`,
    `${camel}TemplateV4_2`,
  ];
  for (const k of candidates) {
    if (typeof mod[k] === "function") return mod[k] as V4_TemplateFn;
  }
  // fallback: any function export
  for (const v of Object.values(mod)) {
    if (typeof v === "function") return v as V4_TemplateFn;
  }
  return undefined;
}

function findObj(mod: Record<string, unknown>): ActionObjectV4 | undefined {
  for (const v of Object.values(mod)) {
    if (typeof v === "object" && v !== null && "prompt" in (v as object)) {
      return v as ActionObjectV4;
    }
  }
  return undefined;
}

function toKebab(name: string): string {
  return name
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1-$2")
    .toLowerCase();
}

function collectRuleVersions(enriched: EnrichedAction): Record<string, string> {
  const out: Record<string, string> = {};
  for (const step of enriched.action.actionSteps) {
    for (const rule of step.rules as Array<{ id: string; sourceFile?: string; version?: string }>) {
      out[rule.id] = `${rule.sourceFile ?? "?"}/${rule.version ?? "?"}`;
    }
  }
  return out;
}

function substituteRuntimeInput(
  obj: ActionObjectV4,
  runtimeInput: string | Record<string, unknown> | undefined,
): ActionObjectV4 {
  if (runtimeInput === undefined) return obj;
  const body =
    typeof runtimeInput === "string"
      ? runtimeInput
      : "```json\n" + JSON.stringify(runtimeInput, null, 2) + "\n```";
  const replaced = obj.prompt.split(RUNTIME_INPUT_PLACEHOLDER).join(body);
  return { ...obj, prompt: replaced };
}
