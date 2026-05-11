#!/usr/bin/env node
/**
 * Dev-time orchestrator for v4 template generation.
 *
 * For one or more actions, runs the pipeline:
 *   fetchAction → enrichAction → invokeLlmTransform (per step + per rule)
 *                              → autoVerify (round-trip)
 *                              → writeTemplates (V4-2 function template OR V4-3 static literals per client)
 *
 * Usage:
 *   npm run gen:v4 -- --action matchResume --variant both
 *   npm run gen:v4 -- --action matchResume --variant v4-3 --client 腾讯
 *   npm run gen:v4 -- --all
 *
 * The LLM API endpoint and credentials come from .env.local (OPENAI_*).
 * Ontology API uses ONTOLOGY_API_BASE / ONTOLOGY_API_TOKEN.
 */

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { fetchAction } from "../lib/ontology-gen/fetch";
import { enrichAction } from "../lib/ontology-gen/v4/enrich";
import { transformRule, transformStep } from "../lib/ontology-gen/v4/transform";
import { verifyRoundTrip } from "../lib/ontology-gen/v4/verify";
import { assembleActionObject } from "../lib/ontology-gen/v4/assemble";
import type { RuleInstruction, StepInstruction } from "../lib/ontology-gen/v4/types";

interface CliFlags {
  action?: string;
  all?: boolean;
  variant: "v4-2" | "v4-3" | "both";
  clients: string[];
  domain: string;
  quiet: boolean;
  parallel: number;
}

const KNOWN_CLIENTS = ["通用", "腾讯", "字节"] as const;

main().catch((err) => {
  process.stderr.write(`gen-v4-templates failed: ${err instanceof Error ? err.stack ?? err.message : String(err)}\n`);
  process.exit(1);
});

async function main(): Promise<void> {
  const flags = parseArgv(process.argv.slice(2));
  const here = dirname(fileURLToPath(import.meta.url));
  const v4Dir = resolve(here, "../lib/ontology-gen/v4/templates");

  if (!flags.action && !flags.all) {
    process.stderr.write("error: --action <name> or --all required\n");
    process.exit(2);
  }

  const targets = flags.all ? await loadKnownActions() : [flags.action!];
  process.stderr.write(`[gen:v4] processing ${targets.length} action(s) — variant=${flags.variant}\n`);

  for (const actionName of targets) {
    process.stderr.write(`\n[gen:v4] ── ${actionName} ──\n`);
    try {
      await processAction(actionName, flags, v4Dir);
    } catch (err) {
      process.stderr.write(`[gen:v4] ✘ ${actionName}: ${err instanceof Error ? err.message : String(err)}\n`);
    }
  }
}

async function processAction(actionName: string, flags: CliFlags, v4Dir: string): Promise<void> {
  // 1) fetch
  const action = await fetchAction({
    actionRef: actionName,
    domain: flags.domain,
    apiToken: process.env["ONTOLOGY_API_TOKEN"] ?? "",
  });
  process.stderr.write(`[gen:v4] fetched action with ${action.actionSteps.length} steps, ${countRules(action)} rules\n`);

  // 2) enrich
  const enriched = await enrichAction(action);
  process.stderr.write(`[gen:v4] enriched: ${Object.keys(enriched.dataObjectSchemas).length} DataObjects, ${Object.keys(enriched.eventSchemas).length} Events\n`);

  // 3) transform per-step and per-rule (with bounded concurrency)
  const ruleInstructions: Record<string, RuleInstruction> = {};
  const stepInstructions: Record<number, StepInstruction> = {};

  // Collect tasks
  const ruleTasks: Array<() => Promise<void>> = [];
  for (const step of action.actionSteps) {
    for (const rule of step.rules) {
      ruleTasks.push(async () => {
        const t0 = Date.now();
        const ri = await transformRule(rule as never, enriched);
        const v = await verifyRoundTrip(ri.meta.originalProse, ri.instruction);
        ri.meta.roundTripCheck = v.status;
        ruleInstructions[rule.id] = ri;
        process.stderr.write(`[gen:v4]   rule ${rule.id} ${v.status === "passed" ? "✓" : v.status === "failed" ? "✘" : "?"} (${Date.now() - t0}ms)\n`);
      });
    }
  }
  const stepTasks: Array<() => Promise<void>> = action.actionSteps.map((step) => async () => {
    const t0 = Date.now();
    const ruleIds = step.rules.map((r) => r.id);
    const si = await transformStep(step as never, ruleIds, enriched);
    stepInstructions[step.order] = si;
    process.stderr.write(`[gen:v4]   step ${step.order} ✓ (${Date.now() - t0}ms)\n`);
  });

  await runConcurrent([...ruleTasks, ...stepTasks], flags.parallel);

  // 4) write templates per variant
  if (flags.variant === "v4-2" || flags.variant === "both") {
    await writeV4_2Template({ actionName, action, enriched, ruleInstructions, stepInstructions, v4Dir });
  }
  if (flags.variant === "v4-3" || flags.variant === "both") {
    for (const client of flags.clients) {
      await writeV4_3Template({ actionName, action, enriched, ruleInstructions, stepInstructions, client, v4Dir });
    }
  }
}

async function writeV4_2Template(args: {
  actionName: string;
  action: import("../lib/ontology-gen/types.public").Action;
  enriched: import("../lib/ontology-gen/v4/types").EnrichedAction;
  ruleInstructions: Record<string, RuleInstruction>;
  stepInstructions: Record<number, StepInstruction>;
  v4Dir: string;
}): Promise<void> {
  const kebab = toKebab(args.actionName);
  const camel = toCamelLower(args.actionName);
  const path = resolve(args.v4Dir, "v4-2", `${kebab}.template.ts`);

  // Pre-compute meta versions
  const ruleVersions: Record<string, string> = {};
  const ruleRoundTripFails: string[] = [];
  for (const [id, ri] of Object.entries(args.ruleInstructions)) {
    ruleVersions[id] = ri.meta.sourceVersion;
    if (ri.meta.roundTripCheck === "failed") ruleRoundTripFails.push(id);
  }

  const fnName = `${camel}Template`;

  const content = `// AUTO-GENERATED by scripts/gen-v4-templates.ts at ${new Date().toISOString()}
// Source: action=${args.actionName} domain=${args.enriched.action.id ? "RAAS-v1" : "RAAS-v1"}
// DO NOT EDIT — regenerate via: npm run gen:v4 -- --action ${args.actionName} --variant v4-2

import type { ActionObjectV4, EnrichedAction, RuleInstruction, StepInstruction } from "../../types";
import { assembleActionObject } from "../../assemble";

const ruleInstructions: Record<string, RuleInstruction> = ${JSON.stringify(args.ruleInstructions, null, 2)};

const stepInstructions: Record<number, StepInstruction> = ${JSON.stringify(args.stepInstructions, null, 2)};

export function ${fnName}(
  enriched: EnrichedAction,
  options: { client?: string; runtimeInput?: string | Record<string, unknown> },
): ActionObjectV4 {
  return assembleActionObject(
    {
      enriched,
      client: options.client,
      ruleInstructions,
      stepInstructions,
    },
    { strategy: "v4-2", runtimeInput: options.runtimeInput },
  );
}

export default ${fnName};
`;

  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, content, "utf8");
  process.stderr.write(`[gen:v4]   ✓ wrote ${path}\n`);
  if (ruleRoundTripFails.length > 0) {
    process.stderr.write(`[gen:v4]     ⚠ round-trip failures: ${ruleRoundTripFails.join(", ")}\n`);
  }
}

async function writeV4_3Template(args: {
  actionName: string;
  action: import("../lib/ontology-gen/types.public").Action;
  enriched: import("../lib/ontology-gen/v4/types").EnrichedAction;
  ruleInstructions: Record<string, RuleInstruction>;
  stepInstructions: Record<number, StepInstruction>;
  client: string;
  v4Dir: string;
}): Promise<void> {
  const kebab = toKebab(args.actionName);
  const camel = toCamelLower(args.actionName);
  const path = resolve(args.v4Dir, "v4-3", `${kebab}.${args.client}.template.ts`);

  // Use assemble to get the fully-baked prompt
  const obj = assembleActionObject(
    {
      enriched: args.enriched,
      client: args.client,
      ruleInstructions: args.ruleInstructions,
      stepInstructions: args.stepInstructions,
    },
    { strategy: "v4-3" },
  );

  // Override compiledAt and promptStrategy for the static literal
  obj.meta.compiledAt = new Date().toISOString();
  obj.meta.promptStrategy = "v4-3";
  obj.meta.client = args.client;

  // Fixed export name — file path encodes (action, client) pair already.
  const safeName = `template`;

  const content = `// AUTO-GENERATED by scripts/gen-v4-templates.ts at ${new Date().toISOString()}
// Source: action=${args.actionName} client=${args.client}
// Fully baked — only {{RUNTIME_INPUT}} placeholder remains.
// DO NOT EDIT — regenerate via: npm run gen:v4 -- --action ${args.actionName} --variant v4-3 --client ${args.client}

import type { ActionObjectV4 } from "../../types";

export const ${safeName}: ActionObjectV4 = ${JSON.stringify(obj, null, 2)};

export default ${safeName};
`;

  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, content, "utf8");
  process.stderr.write(`[gen:v4]   ✓ wrote ${path}\n`);
}

// ── helpers ──

function parseArgv(argv: string[]): CliFlags {
  const flags: CliFlags = {
    variant: "both",
    clients: [...KNOWN_CLIENTS],
    domain: "RAAS-v1",
    quiet: false,
    parallel: 4,
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]!;
    switch (arg) {
      case "--action":
        flags.action = argv[++i];
        break;
      case "--all":
        flags.all = true;
        break;
      case "--variant":
        flags.variant = argv[++i] as CliFlags["variant"];
        break;
      case "--client":
        flags.clients = [argv[++i]!];
        break;
      case "--domain":
        flags.domain = argv[++i]!;
        break;
      case "--parallel":
        flags.parallel = parseInt(argv[++i]!, 10);
        break;
      case "--quiet":
        flags.quiet = true;
        break;
      case "-h":
      case "--help":
        process.stdout.write(USAGE);
        process.exit(0);
    }
  }
  return flags;
}

const USAGE = `Usage:
  npm run gen:v4 -- --action <name> [--variant v4-2|v4-3|both] [--client <c>] [--parallel <n>]
  npm run gen:v4 -- --all

Options:
  --action <name>        action name (e.g. matchResume)
  --all                  process all known agent actions
  --variant <v>          v4-2 | v4-3 | both (default: both)
  --client <c>           when v4-3, single client to generate (default: 通用,腾讯,字节)
  --domain <d>           default: RAAS-v1
  --parallel <n>         max concurrent LLM calls (default: 4)
`;

async function loadKnownActions(): Promise<string[]> {
  const here = dirname(fileURLToPath(import.meta.url));
  const path = resolve(here, "../__fixtures__/known-actions.json");
  const text = await import("node:fs").then((fs) => fs.promises.readFile(path, "utf8"));
  const list = JSON.parse(text);
  if (!Array.isArray(list)) throw new Error("known-actions.json must be an array");
  return list as string[];
}

async function runConcurrent(tasks: Array<() => Promise<void>>, parallel: number): Promise<void> {
  let i = 0;
  const workers = Array.from({ length: Math.min(parallel, tasks.length) }, async () => {
    while (i < tasks.length) {
      const idx = i++;
      try {
        await tasks[idx]!();
      } catch (err) {
        process.stderr.write(`[gen:v4]   ✘ task ${idx}: ${err instanceof Error ? err.message : String(err)}\n`);
      }
    }
  });
  await Promise.all(workers);
}

function countRules(action: import("../lib/ontology-gen/types.public").Action): number {
  return action.actionSteps.reduce((n, s) => n + s.rules.length, 0);
}

function toKebab(name: string): string {
  return name.replace(/([a-z0-9])([A-Z])/g, "$1-$2").replace(/([A-Z]+)([A-Z][a-z])/g, "$1-$2").toLowerCase();
}

function toCamelLower(name: string): string {
  return name.replace(/^[A-Z]/, (m) => m.toLowerCase());
}

function sanitizeIdent(s: string): string {
  return s.replace(/[^a-zA-Z0-9_]/g, "_");
}
