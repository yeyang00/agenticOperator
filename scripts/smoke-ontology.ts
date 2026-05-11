#!/usr/bin/env node
/**
 * Live-API smoke test (spec §11.4 / §18 step 12).
 *
 * Iterates `__fixtures__/known-actions.json` (the 22 currently-known Action
 * names) and runs the full pipeline end-to-end against the live Ontology API.
 * Reports any fetch / validate failure. Does NOT diff against fixtures.
 *
 * Default behavior writes outputs to a tmp directory; pass `--into <dir>` to
 * write to a specific path (e.g. `generated/` to refresh committed snapshots).
 *
 * Env required: ONTOLOGY_API_BASE, ONTOLOGY_API_TOKEN.
 *
 * Used to detect upstream contract drift between actions_v0_1_006.json
 * (committed reference) and the live API.
 */

import { mkdir, mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { generateActionSnapshot, OntologyGenError } from "../lib/ontology-gen/index";

interface CliFlags {
  domain: string;
  into?: string;
  apiBase?: string;
  timeoutMs?: number;
  quiet: boolean;
}

const DEFAULT_DOMAIN = "RAAS-v1";
const KNOWN_LIST_REL = "../__fixtures__/known-actions.json";

main().catch((err: unknown) => {
  process.stderr.write(`smoke-ontology failed: ${err instanceof Error ? err.stack ?? err.message : String(err)}\n`);
  process.exit(1);
});

async function main(): Promise<void> {
  const flags = parseArgv(process.argv.slice(2));

  const apiToken = process.env["ONTOLOGY_API_TOKEN"];
  const apiBase = flags.apiBase ?? process.env["ONTOLOGY_API_BASE"];
  if (!apiToken || !apiBase) {
    process.stderr.write(
      `error: ONTOLOGY_API_BASE and ONTOLOGY_API_TOKEN must be set (env or --api-base)\n`,
    );
    process.exit(2);
  }

  const here = dirname(fileURLToPath(import.meta.url));
  const knownPath = resolve(here, KNOWN_LIST_REL);
  const names = JSON.parse(await readFile(knownPath, "utf8")) as string[];
  if (!Array.isArray(names) || names.length === 0) {
    process.stderr.write(`error: ${knownPath} is empty or invalid\n`);
    process.exit(1);
  }

  const outDir = flags.into
    ? resolve(process.cwd(), flags.into)
    : await mkdtemp(join(tmpdir(), "ontology-smoke-"));
  await mkdir(outDir, { recursive: true });

  if (!flags.quiet) {
    process.stderr.write(
      `[smoke:ontology] running ${names.length} actions against ${apiBase}\n`,
    );
    process.stderr.write(`[smoke:ontology] writing to ${outDir}\n`);
  }

  const failures: { name: string; error: string }[] = [];
  for (const name of names) {
    const outPath = join(outDir, `${toKebab(name)}.action-object.ts`);
    try {
      const result = await generateActionSnapshot({
        actionRef: name,
        domain: flags.domain,
        apiBase,
        apiToken,
        timeoutMs: flags.timeoutMs,
        templateVersion: "v3",
        typesImportPath: "./action-object.types",
        outputPath: outPath,
      });
      if (!flags.quiet) {
        process.stderr.write(
          `[smoke:ontology] ✓ ${name} (id=${result.meta.actionId})\n`,
        );
      }
    } catch (err) {
      const msg =
        err instanceof OntologyGenError
          ? `${err.name}: ${err.message}`
          : err instanceof Error
            ? err.message
            : String(err);
      failures.push({ name, error: msg });
      process.stderr.write(`[smoke:ontology] ✘ ${name}: ${msg}\n`);
    }
  }

  const passed = names.length - failures.length;
  process.stderr.write(
    `[smoke:ontology] ${passed}/${names.length} actions succeeded; outputs in ${outDir}\n`,
  );
  if (failures.length > 0) process.exit(1);
}

function parseArgv(argv: string[]): CliFlags {
  const flags: CliFlags = { domain: DEFAULT_DOMAIN, quiet: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]!;
    switch (arg) {
      case "--domain":
        flags.domain = nextValue(argv, i++);
        break;
      case "--into":
        flags.into = nextValue(argv, i++);
        break;
      case "--api-base":
        flags.apiBase = nextValue(argv, i++);
        break;
      case "--timeout-ms": {
        const v = nextValue(argv, i++);
        const n = Number(v);
        if (!Number.isFinite(n) || n <= 0) {
          process.stderr.write(`error: --timeout-ms must be positive, got "${v}"\n`);
          process.exit(2);
        }
        flags.timeoutMs = n;
        break;
      }
      case "--quiet":
        flags.quiet = true;
        break;
      case "-h":
      case "--help":
        process.stdout.write(
          `Usage: npm run smoke:ontology [-- --domain <d>] [--into <dir>] [--api-base <url>] [--timeout-ms <n>] [--quiet]\n`,
        );
        process.exit(0);
      default:
        process.stderr.write(`error: unknown flag: ${arg}\n`);
        process.exit(2);
    }
  }
  return flags;
}

function nextValue(argv: string[], i: number): string {
  const v = argv[i + 1];
  if (v === undefined || v.startsWith("--")) {
    process.stderr.write(`error: flag ${argv[i]} expects a value\n`);
    process.exit(2);
  }
  return v!;
}

function toKebab(name: string): string {
  return name
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1-$2")
    .toLowerCase();
}
