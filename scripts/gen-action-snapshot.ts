#!/usr/bin/env node
/**
 * CLI: generate one Action's TS object snapshot.
 *
 * Usage:
 *   npm run gen:ontology -- --action-name matchResume --domain RAAS-v1
 *   npm run gen:ontology -- --action-id 10 --domain RAAS-v1 --output generated/match-resume.action-object.ts
 *
 * See spec §9 for the full flag table and exit codes.
 */

import { generateActionSnapshot, OntologyGenError } from "../lib/ontology-gen/index";

interface CliFlags {
  actionName?: string;
  actionId?: string;
  domain?: string;
  output?: string;
  typesImport?: string;
  templateVersion?: string;
  timeoutMs?: number;
  apiBase?: string;
  quiet: boolean;
}

const USAGE = `Usage:
  npm run gen:ontology -- --action-name <name>  --domain <domain> [options]
  npm run gen:ontology -- --action-id   <id>    --domain <domain> [options]

Required (one of): --action-name, --action-id
Required:          --domain

Options:
  --output <path>             Default: generated/<kebab(name)>.action-object.ts
  --types-import <path>       Default: ./action-object.types
  --template-version <v>      Default: v3 (only v3 implemented)
  --timeout-ms <n>            Default: 8000
  --api-base <url>            Default: env ONTOLOGY_API_BASE
  --quiet                     Suppress progress logs

Env (required unless --api-base / no fetch):
  ONTOLOGY_API_BASE           e.g. http://localhost:3500
  ONTOLOGY_API_TOKEN          Bearer token

Exit codes:
  0  success
  1  any failure (auth, fetch, validate, project, emit, write)
  2  CLI usage error`;

main().catch((err: unknown) => {
  if (err instanceof OntologyGenError) {
    const detailsBlock = err.details ? `\n${JSON.stringify(err.details, null, 2)}` : "";
    process.stderr.write(`${err.name}: ${err.message}${detailsBlock}\n`);
    process.exit(1);
  }
  process.stderr.write(`Unexpected error: ${err instanceof Error ? err.stack ?? err.message : String(err)}\n`);
  process.exit(1);
});

async function main(): Promise<void> {
  const flags = parseArgv(process.argv.slice(2));

  if (!flags.actionName && !flags.actionId) {
    usageError("missing --action-name or --action-id");
  }
  if (!flags.domain) {
    usageError("missing --domain");
  }

  // --action-id wins on conflict (matches the server-side resolver's id-then-name precedence).
  const actionRef = flags.actionId ?? flags.actionName!;

  // For --output and the export name we prefer a recognizable name. If only id was passed,
  // we fall back to using the id as the filename component — the server-resolved Action's
  // name is in meta.actionName afterwards.
  const nameForFilename = flags.actionName ?? flags.actionId!;
  const output = flags.output ?? `generated/v3/${toKebab(nameForFilename)}.action-object.ts`;

  const apiToken = process.env["ONTOLOGY_API_TOKEN"] ?? "";
  const apiBase = flags.apiBase ?? process.env["ONTOLOGY_API_BASE"];

  if (!apiToken) {
    usageError(
      "ONTOLOGY_API_TOKEN env var is not set (configure via .env.local — see .env.example)",
    );
  }
  if (!apiBase) {
    usageError(
      "ONTOLOGY_API_BASE env var is not set (or pass --api-base) — see .env.example",
    );
  }

  if (flags.templateVersion && flags.templateVersion !== "v3") {
    usageError(`--template-version: only "v3" is currently implemented (got "${flags.templateVersion}")`);
  }

  if (!flags.quiet) {
    process.stderr.write(`[gen:ontology] fetching ${apiBase}/api/v1/ontology/actions/${actionRef}/rules?domain=${flags.domain}\n`);
  }

  const result = await generateActionSnapshot({
    actionRef,
    domain: flags.domain!,
    apiBase,
    apiToken,
    timeoutMs: flags.timeoutMs,
    templateVersion: "v3",
    typesImportPath: flags.typesImport ?? "./action-object.types",
    outputPath: output,
  });

  if (!flags.quiet) {
    process.stderr.write(
      `[gen:ontology] wrote ${result.fileName} (action=${result.meta.actionName} id=${result.meta.actionId} template=${result.meta.templateVersion})\n`,
    );
  }
}

function parseArgv(argv: string[]): CliFlags {
  const flags: CliFlags = { quiet: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]!;
    switch (arg) {
      case "--action-name":
        flags.actionName = nextValue(argv, i++);
        break;
      case "--action-id":
        flags.actionId = nextValue(argv, i++);
        break;
      case "--domain":
        flags.domain = nextValue(argv, i++);
        break;
      case "--output":
        flags.output = nextValue(argv, i++);
        break;
      case "--types-import":
        flags.typesImport = nextValue(argv, i++);
        break;
      case "--template-version":
        flags.templateVersion = nextValue(argv, i++);
        break;
      case "--timeout-ms": {
        const v = nextValue(argv, i++);
        const n = Number(v);
        if (!Number.isFinite(n) || n <= 0) {
          usageError(`--timeout-ms must be a positive number, got "${v}"`);
        }
        flags.timeoutMs = n;
        break;
      }
      case "--api-base":
        flags.apiBase = nextValue(argv, i++);
        break;
      case "--quiet":
        flags.quiet = true;
        break;
      case "-h":
      case "--help":
        process.stdout.write(`${USAGE}\n`);
        process.exit(0);
      default:
        usageError(`unknown flag: ${arg}`);
    }
  }
  return flags;
}

function nextValue(argv: string[], i: number): string {
  const v = argv[i + 1];
  if (v === undefined || v.startsWith("--")) {
    usageError(`flag ${argv[i]} expects a value`);
  }
  return v!;
}

function usageError(msg: string): never {
  process.stderr.write(`error: ${msg}\n\n${USAGE}\n`);
  process.exit(2);
}

/** §9.5 kebab transform — boundary at lower→Upper, plus split inside acronym runs. */
function toKebab(name: string): string {
  return name
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1-$2")
    .toLowerCase();
}
