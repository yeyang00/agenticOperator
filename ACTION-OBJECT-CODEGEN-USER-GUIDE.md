# Action Object Codegen — User Guide

In-process module at `lib/ontology-gen/` that turns an Ontology Action into
an `ActionObject` — a structured TS object whose `prompt` field is a
self-contained markdown specification ready to feed an LLM agent.

This guide is for **module consumers** inside this repo (Server Components,
Server Actions, Route Handlers, agent runtime processes, ad-hoc scripts).
For the design rationale and the prompt template's section-by-section rules
see [`docs/2026-05-08-action-object-codegen.spec.md`](./docs/2026-05-08-action-object-codegen.spec.md).
For the upstream API this module talks to, see
[`ONTOLOGY-API-USER-GUIDE-BASED-ON-NEO4J.md`](./ONTOLOGY-API-USER-GUIDE-BASED-ON-NEO4J.md).

---

## At a glance

| Mode | Function / file | When to use | Latency | Filter? |
|---|---|---|---|---|
| **A. Runtime resolve** | `resolveActionObject(…)` | Agent execution paths; per-tenant prompts; UI that previews live data | ~1 fetch (~100ms–1s) | yes (`client`, `clientDepartment?`) |
| **B. Snapshot import** | `import … from "@/generated/<kebab>.action-object"` | PR diff review; fixture tests; deterministic-prompt callers; static UI demos | 0 (compile-time) | no (always full ruleset) |

Both modes return **the same `ActionObject` shape** (modulo `meta.compiledAt`
and the optional rule filter). Mode A wraps Mode B's projection layer plus
a fetch — same renderers, same prompt template (`v3`), same ABI.

- **Module surface**: `lib/ontology-gen/index.ts` re-exports everything.
- **Snapshots**: `generated/*.action-object.ts` (22 known actions, regenerated
  by `npm run gen:ontology` against the live API).
- **Template version**: `v3` only. `v1` / `v2` are superseded.

---

## Setup

### Environment variables (Mode A only — Mode B has no runtime deps)

Set on the host (`.env.local`):

```bash
ONTOLOGY_API_BASE=http://localhost:3500     # the Studio app's host
ONTOLOGY_API_TOKEN=<your-bearer-token>      # shared secret; never to client
```

Both are read from `process.env` by `resolveActionObject` if not passed
explicitly. **The token must never reach the browser bundle** — see
[Where to call from](#where-to-call-from).

### Imports

```ts
// Runtime mode
import {
  resolveActionObject,
  OntologyGenError,           // base — catch this to handle any pipeline error
  OntologyAuthError,          // 401
  OntologyNotFoundError,      // 404
  OntologyRequestError,       // 4xx other than 401/404
  OntologyServerError,        // 5xx
  OntologyTimeoutError,       // fetch exceeded timeoutMs
  OntologyUpstreamError,      // network error reaching the API
  OntologyContractError,      // response shape mismatch
  ActionValidationError,      // Action returned but failed invariant checks
} from "@/lib/ontology-gen";
import type { ActionObject, ResolveActionInput } from "@/lib/ontology-gen";

// Snapshot mode (one example; one import per action)
import { matchResumeActionObject } from "@/generated/match-resume.action-object";
```

The `@/*` alias is configured in `tsconfig.json` and resolves from the repo
root.

---

## Common conventions

### `ActionObject` shape

The same interface for both modes. See
[`lib/ontology-gen/types.public.ts`](./lib/ontology-gen/types.public.ts)
for the canonical type:

```ts
interface ActionObject {
  // ── 1:1 mirror of the Action source-of-truth ──
  id: string;
  name: string;
  description: string;
  submissionCriteria: string;
  category: string;
  actor: string[];
  trigger: string[];
  targetObjects: string[];
  inputs: ActionInput[];
  outputs: ActionOutput[];
  actionSteps: ActionStep[];     // ← per-call clientFilter narrows rules here
  sideEffects: ActionSideEffects;
  triggeredEvents: string[];

  // ── Compilation products ──
  prompt: string;                 // 11 sections joined with "\n\n"
  sections: {
    actionSpec: string;            // always present
    purpose: string | null;
    preconditions: string | null;
    inputsSpec: string | null;
    steps: string | null;
    output: string | null;
    sideEffectBoundary: string | null;
    errorPolicy: string;           // always present
    completionCriteria: string;    // always present
    ruleIndex: string | null;
    beforeReturning: string;       // always present
  };

  // ── Provenance ──
  meta: {
    actionId: string;
    actionName: string;
    domain: string;
    compiledAt: string;            // ISO 8601; real-time in Mode A, frozen in Mode B
    templateVersion: "v3";
  };
}
```

**Three layers of access** to the same data:

1. **`obj.prompt`** — the markdown to feed the LLM as one fragment of its
   user message. Use this if you don't care about composition.
2. **`obj.sections.<key>`** — single-section access. Use this when you want
   to compose the user message yourself (e.g. interleave runtime context
   between sections, or skip the auxiliary `beforeReturning` block).
   Sections that have no source data are `null`; the four always-present
   sections (`actionSpec`, `errorPolicy`, `completionCriteria`,
   `beforeReturning`) are always strings.
3. **`obj.actionSteps` / `obj.inputs` / `obj.outputs` / `obj.sideEffects`** —
   structured TS objects for non-LLM consumers (UI rendering, validation,
   filtering, cross-referencing).

### Domain scoping

Same as the Ontology API: every Action lives inside a `domain` (e.g.
`RAAS-v1`). Mode A requires `domain` on every call; Mode B's snapshot
records its domain in `meta.domain`. There is no cross-domain merging —
call once per domain.

### `clientFilter` semantics (Mode A only)

When you pass `client` (and optionally `clientDepartment` once upstream
ships the field), the resolver narrows `actionSteps[*].rules` as follows:

```
keep rule if and only if:
  rule.applicableClient is empty / undefined / "通用" / equals client
  AND
  (clientDepartment branch is currently a no-op — see Caveats)
```

The filter touches **rules only**. `actionSteps[*]` itself, `inputs`,
`outputs`, `targetObjects`, `sideEffects`, `triggeredEvents` pass through
unchanged — the action's structural skeleton is identical for every client;
only the applicable judgment criteria differ.

`obj.sections.steps` and `obj.sections.ruleIndex` automatically reflect the
filter (they read from `actionSteps[*].rules`).

### Error shape (Mode A only)

All fetch / validate / contract failures throw a typed
`OntologyGenError` subclass. Mode B has no runtime errors.

```ts
class OntologyGenError extends Error {
  name: string;            // subclass name; matches the table below
  message: string;
  details?: unknown;       // structured context, varies by subclass
}
```

| Subclass                   | When                                                  | Caller action |
|----------------------------|-------------------------------------------------------|---------------|
| `OntologyAuthError`        | 401 from API; token missing or invalid                | Surface to ops; do not retry |
| `OntologyNotFoundError`    | 404 from `/actions/{ref}/rules`                       | Surface to user; check ref spelling and domain |
| `OntologyTimeoutError`     | Fetch exceeded `timeoutMs`                            | Retry with backoff |
| `OntologyRequestError`     | 4xx other than 401/404                                | Surface; inspect `details` |
| `OntologyServerError`      | 5xx                                                   | Retry with backoff |
| `OntologyUpstreamError`    | Network error reaching the API host                   | Check API process is running |
| `OntologyContractError`    | Response shape doesn't match expected contract        | Open ticket on upstream API |
| `ActionValidationError`    | API returned an Action but it failed invariant checks | Open ticket on upstream data |

```ts
import { OntologyGenError, OntologyNotFoundError } from "@/lib/ontology-gen";

try {
  const obj = await resolveActionObject({ actionRef, domain });
  // …
} catch (err) {
  if (err instanceof OntologyNotFoundError) {
    return notFound();   // your UI handler
  }
  if (err instanceof OntologyGenError) {
    console.error(`${err.name}: ${err.message}`, err.details);
    throw err;           // or surface a user-facing message
  }
  throw err;             // truly unexpected
}
```

---

## Mode A — runtime resolution

### `resolveActionObject(input): Promise<ActionObject>`

Pipeline:
```
fetch /actions/{ref}/rules?domain=…
  → parse + validate + flatten JSON-stringified properties
  → project (apply optional clientFilter, run 11 renderers, assemble prompt)
  → return ActionObject (in-memory)
```

Single API call. No file IO. No caching. Same `projectActionObject`
projection layer as the CLI uses.

#### Input

```ts
interface ResolveActionInput {
  /** Action name or numeric id; sent verbatim as the URL path segment.
   *  The Ontology API resolves id → action_id → name in that order. */
  actionRef: string;

  /** Required. Scopes the Action match and its steps + rules. */
  domain: string;

  /** Optional. When supplied, drops rules whose `applicableClient` is a
   *  non-"通用" specific client that doesn't equal this value. */
  client?: string;

  /** Reserved. ActionRule has no `applicableClientDepartment` field yet
   *  upstream; passing this is currently a no-op. The slot stays in the
   *  signature so existing callers keep working when upstream ships it. */
  clientDepartment?: string;

  /** Defaults to process.env.ONTOLOGY_API_BASE. */
  apiBase?: string;

  /** Defaults to process.env.ONTOLOGY_API_TOKEN. */
  apiToken?: string;

  /** Default 8000ms (per fetchAction). */
  timeoutMs?: number;
}
```

#### Output

A fully-formed `ActionObject` (see [`ActionObject` shape](#actionobject-shape)).
`meta.compiledAt` is the wall-clock time at projection (typically a few ms
after the API call returned). `meta.templateVersion` is always `"v3"`.

### Where to call from

`resolveActionObject` reads `process.env.ONTOLOGY_API_TOKEN` and forwards
the bearer token in the HTTP request. **It must run server-side.** The
four idiomatic Next.js call sites:

#### 1. Server Component (page.tsx — async)

Direct call, no API plumbing. Best for pages that render once per request.

```tsx
// app/some-route/page.tsx
import { resolveActionObject, OntologyGenError } from "@/lib/ontology-gen";

export default async function Page({
  searchParams,
}: { searchParams: Promise<{ ref?: string; domain?: string }> }) {
  const { ref, domain } = await searchParams;
  if (!ref || !domain) return <FormOnly />;
  try {
    const obj = await resolveActionObject({ actionRef: ref, domain });
    return <PromptViewer obj={obj} />;
  } catch (err) {
    if (err instanceof OntologyGenError) {
      return <ErrorPanel name={err.name} message={err.message} />;
    }
    throw err;
  }
}
```

See [`app/dev/action-preview/page.tsx`](./app/dev/action-preview/page.tsx)
for the canonical reference implementation.

#### 2. Server Action (form submissions, mutations)

```tsx
// app/some-route/resolve.action.ts
"use server";

import { resolveActionObject, OntologyGenError } from "@/lib/ontology-gen";

export async function previewAction(formData: FormData) {
  const ref = formData.get("ref") as string;
  const domain = formData.get("domain") as string;
  try {
    const obj = await resolveActionObject({ actionRef: ref, domain });
    return { ok: true as const, prompt: obj.prompt };
  } catch (err) {
    if (err instanceof OntologyGenError) {
      return { ok: false as const, errorName: err.name, message: err.message };
    }
    throw err;
  }
}
```

#### 3. Route Handler (HTTP API for browser callers — last resort)

Use only if the caller cannot use a Server Component / Server Action (e.g.
a third-party SPA frame).

```ts
// app/api/agent/resolve-action/route.ts
import { resolveActionObject, OntologyGenError } from "@/lib/ontology-gen";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const ref = url.searchParams.get("ref");
  const domain = url.searchParams.get("domain");
  if (!ref || !domain) {
    return Response.json({ error: "missing-params" }, { status: 400 });
  }
  try {
    const obj = await resolveActionObject({
      actionRef: ref,
      domain,
      client: url.searchParams.get("client") ?? undefined,
    });
    return Response.json(obj);
  } catch (err) {
    if (err instanceof OntologyGenError) {
      const status = err.name === "OntologyNotFoundError" ? 404 : 502;
      return Response.json(
        { error: err.name, message: err.message, details: err.details },
        { status },
      );
    }
    throw err;
  }
}
```

#### 4. Standalone Node process (non-Next.js — e.g. a worker service in this repo)

The package is `private`, so import via relative path from the consuming script.
Run with `node --env-file=.env.local --import tsx <script>` to pick up the
token (matches the convention used by `scripts/gen-ontology` etc.).

```ts
// scripts/my-worker.ts
import { resolveActionObject } from "../lib/ontology-gen";

const obj = await resolveActionObject({ actionRef: "matchResume", domain: "RAAS-v1" });
console.log(obj.prompt);
```

### Examples

#### Feed an LLM the prompt as one fragment of a user message

```ts
const obj = await resolveActionObject({
  actionRef: "matchResume",
  domain: "RAAS-v1",
  client: tenantId,
});

const userMessage =
  agentRuntimePrelude +
  "\n\n" +
  obj.prompt +
  "\n\n" +
  "## Runtime input\n\n" + JSON.stringify(payload, null, 2);

await llm.complete({ messages: [{ role: "user", content: userMessage }] });
```

#### Compose only specific sections

```ts
const obj = await resolveActionObject({ actionRef, domain });

// Skip auxiliary self-checks; build a tighter system prompt
const composed = [
  obj.sections.actionSpec,
  obj.sections.purpose,
  obj.sections.steps,
  obj.sections.errorPolicy,
].filter(Boolean).join("\n\n");
```

#### Iterate the structured rules (non-LLM consumer)

```ts
const obj = await resolveActionObject({ actionRef, domain, client });

for (const step of obj.actionSteps) {
  for (const rule of step.rules) {
    // rule.id, rule.severity, rule.executor, rule.applicableClient,
    // rule.businessLogicRuleName, rule.submissionCriteria, rule.description
    db.insert("rule_audit", {
      actionId: obj.meta.actionId,
      stepOrder: step.order,
      ruleId: rule.id,
    });
  }
}
```

---

## Mode B — snapshot import

### When to use

- **PR diff review** — committed snapshots make prompt evolution diff-able.
- **Fixture / unit tests** — deterministic input → deterministic prompt.
- **Static UI demos** — pages that show "what the prompt looks like for
  matchResume" without an API hop.
- **CI offline checks** — anything that must run without an Ontology API
  process.

**Not** for agent execution paths — snapshots are frozen at codegen time
and don't reflect upstream rule changes until regenerated.

### Where snapshots come from

`scripts/gen-action-snapshot.ts` (CLI: `npm run gen:ontology`) writes one
`.ts` file per action under `generated/`:

```
generated/
├── action-object.types.ts          # the ABI types, derived from types.public.ts
├── match-resume.action-object.ts
├── jd-review.action-object.ts
├── … (22 known actions)
```

File naming: kebab-cased action name (`matchResume` → `match-resume.action-object.ts`).
Export naming: camelCased + `ActionObject` suffix (`matchResumeActionObject`).

### Refreshing snapshots

`.env.local` must have `ONTOLOGY_API_BASE` and `ONTOLOGY_API_TOKEN` (the
npm scripts pass `--env-file=.env.local` to Node automatically).

```bash
# Regenerate one action
npm run gen:ontology -- --action-name matchResume --domain RAAS-v1

# Regenerate all 22 known actions (writes into generated/)
npm run smoke:ontology -- --into generated
```

`generated/` is committed to git so PR diffs show prompt evolution.

### Examples

```ts
import { matchResumeActionObject } from "@/generated/match-resume.action-object";
import type { ActionObject } from "@/lib/ontology-gen";

const obj: ActionObject = matchResumeActionObject;
console.log(obj.prompt);                  // identical structure to runtime mode
console.log(obj.meta.compiledAt);         // frozen at codegen time
console.log(obj.meta.templateVersion);    // "v3"
```

---

## CLI tools

Provided for snapshot management and verification, not for runtime use.

| Command                       | Purpose |
|-------------------------------|---------|
| `npm run gen:ontology`        | Generate one snapshot. Flags: `--action-name <n>` / `--action-id <id>` / `--domain <d>` / `--output <path>` / `--types-import <path>` / `--template-version v3` / `--timeout-ms <n>` / `--api-base <url>` / `--quiet`. |
| `npm run gen:ontology:types`  | Refresh `generated/action-object.types.ts` from `lib/ontology-gen/types.public.ts`. Run after type changes. |
| `npm run smoke:ontology`      | Run all 22 known actions through the full pipeline against a live API. Use `-- --into generated` to refresh committed snapshots. |
| `npm run verify:ontology`     | Run the 4 fixture actions (`__fixtures__/actions/*.input.json`) through the projection and byte-compare to `*.expected.ts`. Used in CI. `-- --update` overwrites expecteds. |

All scripts read `ONTOLOGY_API_BASE` / `ONTOLOGY_API_TOKEN` from `.env.local`
(via `node --env-file=.env.local`).

**Note**: CLI snapshots are intentionally **not client-scoped** — they
represent the "all clients" view (full ruleset). Per-client prompts come
from Mode A only. If a per-client offline snapshot is ever needed, add a
`--client` flag to `scripts/gen-action-snapshot.ts` (the projection layer
already accepts it via `CompileOptions.clientFilter`).

---

## Caveats and known limitations

### Token must stay server-side

`resolveActionObject` reads `process.env.ONTOLOGY_API_TOKEN`. Calling it
from a Client Component (`"use client"`) will either fail (the env var
isn't bundled) or — worse — leak the token if you somehow inline it.
**Always wrap with a Server Component, Server Action, or Route Handler.**

The reference page [`app/dev/action-preview/`](./app/dev/action-preview/)
demonstrates the safe pattern: Server Component does the resolve, Client
Component is just the form.

### `clientDepartment` is a wired-but-no-op slot

`ActionRule` doesn't yet carry an `applicableClientDepartment` property
upstream. Passing `clientDepartment` to `resolveActionObject` is accepted
(forward-compat) but does not narrow rules. Once upstream ships the field,
the existing callers light up automatically — no API change.

### No caching

Every `resolveActionObject` call hits the Ontology API. At ~100ms–1s
per call this is fine for agent-task latency budgets but expensive for
high-frequency UI rendering. If you find yourself calling it in a hot
loop, batch the work in a Server Component / Server Action upstream of
the loop.

A future TTL or `unstable_cache` layer is **not** in scope; revisit only
if profiling shows fetch latency in the hot path.

### No multi-API enrichment

This module calls **only** `GET /actions/{ref}/rules?domain=…` (see the
Ontology API guide §4.1). It does **not** call `/objects/{name}` or
`/events/{name}` to inline DataObject schemas / event payloads. The agent's
task is fully specified by the single Action response —
`dataChanges[].propertyImpacted` already carries the field-level write
boundary, and the agent does not construct event payloads (the runtime
fires events; the agent returns outputs).

### Network failures surface clearly, but require the API to be running

When the Studio app at `ONTOLOGY_API_BASE` is down, `resolveActionObject`
throws `OntologyUpstreamError` with `fetch failed`. The page renders the
typed error cleanly (no stack trace leak), but the underlying problem is
infrastructural, not a bug in this module — start the Studio app on the
expected port.

### Domain isolation is a hard rail

There's no cross-domain merge. If you need an action's rules across two
domains, call `resolveActionObject` once per domain and merge in the
caller.

### The 11 sections, four always present

Sections that have no source data return `null` in `obj.sections.*`:
`purpose` / `preconditions` / `inputsSpec` / `steps` / `output` /
`sideEffectBoundary` / `ruleIndex`. The other four (`actionSpec` /
`errorPolicy` / `completionCriteria` / `beforeReturning`) are always
strings — they include auxiliary framing aids that help the LLM interpret
the action's data.

### What's **not** here

- No agent runtime — this module produces the prompt; another module/process
  feeds it to an LLM.
- No retry loop — caller decides retry strategy on `OntologyTimeoutError` /
  `OntologyServerError`.
- No mutation API — read-only fetch + projection. The Ontology API's
  `/actions/matchResume/results` writer is unrelated to this module.
- No tool-use list (`## Tools available`) — owned by the agent runtime, not
  by this fragment (per spec §16).
- No translation — the Chinese-source descriptions render verbatim;
  section headers are English.

---

## Quick reference

```ts
// Mode A — runtime, server-side only
import { resolveActionObject, OntologyGenError } from "@/lib/ontology-gen";
import type { ActionObject } from "@/lib/ontology-gen";

const obj: ActionObject = await resolveActionObject({
  actionRef: "matchResume",     // required: name or numeric id
  domain: "RAAS-v1",            // required
  client: "腾讯",                // optional
  clientDepartment: undefined,  // reserved; no-op
  apiBase: undefined,           // optional; defaults to env
  apiToken: undefined,          // optional; defaults to env
  timeoutMs: undefined,         // optional; defaults to 8000
});

// Mode B — snapshot, no runtime deps
import { matchResumeActionObject } from "@/generated/match-resume.action-object";

// Both modes — the same shape
obj.prompt;                            // markdown for LLM
obj.sections.<key>;                    // single-section access (11 keys)
obj.actionSteps;                       // structured rules (filtered by client in Mode A)
obj.inputs / obj.outputs / obj.sideEffects;
obj.meta.{actionId,actionName,domain,compiledAt,templateVersion};

// Mode A — error handling
try { … } catch (err) {
  if (err instanceof OntologyGenError) {
    err.name;        // "OntologyNotFoundError" | "OntologyAuthError" | … | "ActionValidationError"
    err.message;
    err.details;     // optional structured context
  }
}

// CLI tools
npm run gen:ontology -- --action-name matchResume --domain RAAS-v1
npm run gen:ontology:types
npm run smoke:ontology -- --into generated
npm run verify:ontology
```

Auth (every Mode A call):
```
process.env.ONTOLOGY_API_BASE   = http://localhost:3500
process.env.ONTOLOGY_API_TOKEN  = <bearer token>
```

---

## Reference

- Design spec — [`docs/2026-05-08-action-object-codegen.spec.md`](./docs/2026-05-08-action-object-codegen.spec.md)
- Upstream API guide — [`ONTOLOGY-API-USER-GUIDE-BASED-ON-NEO4J.md`](./ONTOLOGY-API-USER-GUIDE-BASED-ON-NEO4J.md)
- Public ABI — [`lib/ontology-gen/types.public.ts`](./lib/ontology-gen/types.public.ts) (mirror in [`generated/action-object.types.ts`](./generated/action-object.types.ts))
- Live demo — [`app/dev/action-preview/`](./app/dev/action-preview/) (Server Component; URL: `/dev/action-preview`)
- Reference snapshots — [`generated/`](./generated/) (22 actions)
