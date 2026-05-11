#!/usr/bin/env node
/**
 * Fixture-based snapshot verifier (spec §11.2).
 *
 * For every `__fixtures__/actions/*.input.json`:
 *   parseAction(json) → projectActionObject (with compiledAt frozen) → emitActionObjectModule
 *   diff vs sibling `*.expected.ts` byte-exactly.
 *
 * Flags:
 *   --update  Overwrite expected files with fresh emit output (bootstrap / refresh).
 *   --quiet   Suppress per-fixture progress lines.
 *
 * Exit codes: 0 = all pass / all updated; 1 = any mismatch (without --update).
 */

import { readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { emitActionObjectModule, parseAction, projectActionObject } from "../lib/ontology-gen/index";

const FIXED_COMPILED_AT = "1970-01-01T00:00:00.000Z";
const FIXED_DOMAIN = "RAAS-v1";
const TYPES_IMPORT_PATH = "../../generated/v3/action-object.types";

interface CliFlags {
  update: boolean;
  quiet: boolean;
}

main().catch((err: unknown) => {
  process.stderr.write(`verify-snapshots failed: ${err instanceof Error ? err.stack ?? err.message : String(err)}\n`);
  process.exit(1);
});

async function main(): Promise<void> {
  const flags = parseArgv(process.argv.slice(2));
  const here = dirname(fileURLToPath(import.meta.url));
  const fixturesDir = resolve(here, "../__fixtures__/actions");

  const entries = (await readdir(fixturesDir)).filter((f) => f.endsWith(".input.json")).sort();
  if (entries.length === 0) {
    process.stderr.write(`No fixtures found at ${fixturesDir}\n`);
    process.exit(1);
  }

  let mismatches = 0;
  let updated = 0;

  for (const inputFile of entries) {
    const base = inputFile.replace(/\.input\.json$/, "");
    const inputPath = join(fixturesDir, inputFile);
    const expectedPath = join(fixturesDir, `${base}.expected.ts`);

    const inputRaw = await readFile(inputPath, "utf8");
    const json = JSON.parse(inputRaw);
    const action = parseAction(json);
    const obj = projectActionObject(action, {
      templateVersion: "v3",
      domain: FIXED_DOMAIN,
      compiledAtOverride: FIXED_COMPILED_AT,
    });
    const actual = emitActionObjectModule(obj, { typesImportPath: TYPES_IMPORT_PATH });

    if (flags.update) {
      await writeFile(expectedPath, actual, "utf8");
      updated++;
      if (!flags.quiet) process.stderr.write(`[verify:ontology] ↻ updated ${base}.expected.ts\n`);
      continue;
    }

    let expected = "";
    try {
      expected = await readFile(expectedPath, "utf8");
    } catch {
      mismatches++;
      process.stderr.write(`[verify:ontology] ✘ ${base}: expected file is missing (${expectedPath}) — run with --update to bootstrap\n`);
      continue;
    }

    if (expected === actual) {
      if (!flags.quiet) process.stderr.write(`[verify:ontology] ✓ ${base}\n`);
      continue;
    }

    mismatches++;
    process.stderr.write(`[verify:ontology] ✘ ${base}: emit output differs from expected\n`);
    process.stderr.write(formatFirstDiff(expected, actual) + "\n");
  }

  if (flags.update) {
    process.stderr.write(`[verify:ontology] updated ${updated}/${entries.length} fixtures\n`);
    return;
  }

  if (mismatches === 0) {
    process.stderr.write(`[verify:ontology] ${entries.length}/${entries.length} fixtures matched\n`);
    return;
  }

  process.stderr.write(`[verify:ontology] ${mismatches}/${entries.length} fixtures FAILED\n`);
  process.exit(1);
}

function parseArgv(argv: string[]): CliFlags {
  const flags: CliFlags = { update: false, quiet: false };
  for (const arg of argv) {
    switch (arg) {
      case "--update":
        flags.update = true;
        break;
      case "--quiet":
        flags.quiet = true;
        break;
      case "-h":
      case "--help":
        process.stdout.write(`Usage: npm run verify:ontology [-- --update] [--quiet]\n`);
        process.exit(0);
      default:
        process.stderr.write(`error: unknown flag: ${arg}\n`);
        process.exit(2);
    }
  }
  return flags;
}

/** Print up to 10 lines of context around the first diverging line. */
function formatFirstDiff(expected: string, actual: string): string {
  const eLines = expected.split("\n");
  const aLines = actual.split("\n");
  const limit = Math.max(eLines.length, aLines.length);
  for (let i = 0; i < limit; i++) {
    if (eLines[i] !== aLines[i]) {
      const start = Math.max(0, i - 2);
      const end = Math.min(limit, i + 6);
      const out: string[] = [`  first diff at line ${i + 1}:`];
      for (let k = start; k < end; k++) {
        const eL = eLines[k] ?? "<EOF>";
        const aL = aLines[k] ?? "<EOF>";
        if (k === i) {
          out.push(`    - expected: ${eL}`);
          out.push(`    + actual:   ${aL}`);
        } else {
          out.push(`      | ${eL.length > 80 ? eL.slice(0, 80) + "…" : eL}`);
        }
      }
      return out.join("\n");
    }
  }
  return "  (no line-level difference; possible trailing-byte mismatch)";
}
