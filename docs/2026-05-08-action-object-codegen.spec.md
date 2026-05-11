# Action Object Codegen — Spec

| | |
|---|---|
| **Status** | Draft v4 — self-containment review applied; **template `v3`** is the only supported template |
| **Last updated** | 2026-05-08 |
| **Module path** | `lib/ontology-gen/` (library) + `scripts/gen-action-*.ts` (CLI) |
| **Output path** | `generated/` (committed; consumed by the LLM Agent runtime project) |
| **Upstream API** | Ontology API at `http://localhost:3500/api/v1/ontology` — see `ONTOLOGY-API-USER-GUIDE-BASED-ON-NEO4J.md` |
| **Reference data** | `actions_v0_1_006.json` — current shape of all 22 Actions |

---

## 0. TL;DR

A codegen module that fetches an Action definition from the Ontology API, compiles it into a typed `ActionObject` containing a ready-to-use `prompt` string plus structured fields, and emits a TypeScript module to `generated/`. The emitted module is committed to this repo and consumed by an external LLM Agent runtime, which uses `actionObject.prompt` as **one fragment** of its user prompt at LLM-call time, alongside other prompt parts the runtime maintains itself.

The prompt is structured as a **binding-contract action specification** (template `v3`): the opening block declares the fragment's role and the contract semantics, then the body lays out preconditions, action-level inputs, per-step blocks (step header carries `[objectType]`; rules render as 3-row blocks with `/`-separated metadata `id / severity / executor / applicableClient` plus `businessLogicRuleName` label and explicit `when:` / `do:` keywords), output schema with a JSON skeleton, a structured side-effect boundary with four sub-blocks (`### writes` with verb + `propertyImpacted` field set + per-entry note, `### reads`, `### notifies` with per-entry condition + event, `### emits`), error policy, completion criteria, a step-grouped rule index, and a self-check list. The codegen does **not** declare runtime tools (those are owned by the runtime, not this fragment).

Pipeline: `fetch+validate+coerce` → `project` → `emit`. CLI: `npm run gen:ontology`. One Action per invocation, one TS file per Action.

---

## 1. Goals and non-goals

### 1.1 Goals

- **Snapshot semantics.** Emitted TS files are committed; prompt changes show up as PR diffs.
- **Determinism.** Same Action data + same `CompileOptions` + same `templateVersion` → byte-identical output.
- **Multi-Action from day 1.** All 22 Actions in `actions_v0_1_006.json` go through the same pipeline; no per-Action code paths required for the currently known Actions.
- **One TS object = one Action.** Each invocation produces one `<action>.action-object.ts`. No bundles, no umbrella exports.
- **Module independence.** `lib/ontology-gen/` has zero dependency on `app/`, `components/`, `lib/i18n.tsx`, or any UI code. Removing the module does not affect the host UI; modifying the host UI does not affect the module.
- **Fail-build-red.** Any fetch / validate / projection error exits the CLI non-zero. No half-written output files.

### 1.2 Non-goals (current scope)

- **No batch generation.** One Action per CLI invocation. Batch is deferred until a real consumer needs it.
- **No on-disk cache** of API responses.
- **No LLM-rendered prompts.** Rendering is deterministic template code.
- **No per-Action template override registry.** The 11 generic section renderers handle all 22 known Actions. Add a registry only when a future Action genuinely needs custom rendering.
- **No `sourceHash` / `ontologyRevision` provenance.** Defer until the API exposes a stable revision token.
- **No `## Tools available` section.** Tool surface is owned by the LLM Agent runtime; encoding a placeholder here would create a contract the codegen cannot honor (see §16).

---

## 2. Background and rationale

### 2.1 The problem

The Agentic Operator project currently runs on hard-coded mock data. A separate **LLM Agent runtime** project (out of scope for this spec) needs typed Action definitions to drive its behaviour: at LLM-call time, the agent composes a user message from multiple fragments, one of which is "the instructions for this Action" — a prompt block describing what the Action does, its steps, its rules, its inputs and outputs.

The Ontology API stores Actions in Neo4j as property-bag nodes with nested `action_steps[].rules[]` (see `actions_v0_1_006.json`). The API **does not** know about prompts — it is schema-agnostic and stores whatever the client writes.

We therefore need a **codegen step** that reads the Action graph, compiles it into both a structured TS object and a default prose rendering, and writes a `.ts` file the runtime can `import`.

### 2.2 Why a codegen, not a runtime fetch

Three reasons compile lives on our side as snapshot codegen, not as a runtime fetch by the agent runtime:

1. **Reviewability.** Prompt changes are PR-visible diffs. A regression in prompt text is caught at review time, not at deploy time.
2. **Determinism for the agent runtime.** The runtime sees a stable, versioned input. No "what was the API serving last Tuesday at 3pm?" debugging.
3. **The API has no concept of "prompt".** Property-bag, schema-agnostic — there is no first-class location to put a compiled prompt server-side, and forcing one would break the API's design philosophy.

### 2.3 Why a CLI library, not a Next.js API route or React page

- The host project is mock-data frontend with no API layer (per `CLAUDE.md`). Adding `/api/codegen` would pollute a deliberate architectural boundary.
- The product is a `.ts` file checked into the consumer repo, not a runtime endpoint. A persistent service offers no value.
- A future React preview page can `import` the same library. Library shape preserves both options at zero cost.

---

## 3. Module form and file layout

```
agenticOperator/
├── lib/
│   └── ontology-gen/                       # the library — UI-free, zero host coupling
│       ├── types.public.ts                  # ABI: Action, ActionObject, ActionInput, ActionOutput,
│       │                                    #      ActionStep, ActionRule
│       ├── types.internal.ts                # FetchOptions, CompileOptions, EmitOptions,
│       │                                    # GenerateOptions, error class shapes
│       ├── client.ts                        # HTTP client (auth, base URL, error mapping)
│       ├── fetch.ts                         # fetchActionTree(opts) — primary entrypoint
│       ├── validate.ts                      # invariant checks + type coercion
│       ├── compile/
│       │   ├── index.ts                     # project(action, opts) → ActionObject
│       │   ├── sections.ts                  # 7 section renderers
│       │   └── stable-json.ts               # deterministic JSON.stringify (sorted keys)
│       ├── emit.ts                          # ActionObject → TS source string
│       ├── errors.ts                        # typed error classes
│       └── index.ts                         # public surface: generateActionSnapshot, ...
├── scripts/
│   ├── gen-action-snapshot.ts               # CLI: parse argv/env → call lib → write file
│   └── gen-action-types.ts                  # CLI: copy types.public.ts → generated/action-object.types.ts
├── generated/                                # committed output, consumed by the agent runtime
│   ├── action-object.types.ts               # public ABI, emitted from lib/ontology-gen/types.public.ts
│   └── <action-name>.action-object.ts       # one per Action snapshot
├── package.json                              # scripts: "gen:ontology", "gen:ontology:types"
└── .env.example                              # ONTOLOGY_API_BASE, ONTOLOGY_API_TOKEN
```

**Independence check.** Deleting `lib/ontology-gen/`, `scripts/gen-action-*.ts`, and `generated/` leaves the host UI untouched. Conversely, edits to `app/`, `components/`, or `lib/i18n.tsx` cannot affect codegen behaviour.

**Why `generated/` lives in this repo, not in the consumer repo.** Decided up front: emitted files are checked into this codegen repo and imported by the consumer through whatever distribution mechanism that repo uses (path import, package publish, git submodule). This keeps the codegen tool and its outputs auditable in one place.

---

## 4. Upstream API integration

### 4.1 Authentication and endpoints

Auth: bearer token via env `ONTOLOGY_API_TOKEN`, sent as `Authorization: Bearer <token>` on every request.

Base URL: env `ONTOLOGY_API_BASE` (e.g. `http://localhost:3500`).

| Endpoint | Used for | Notes |
|---|---|---|
| `GET /api/v1/ontology/actions/{ref}/rules?domain=<D>` | **Primary fetch path** for any Action | Composite read. Returns one Action object with nested `action_steps[]` (each carrying its `rules[]`). `{ref}` resolves to `Action.id` then `Action.action_id` then `Action.name` (id wins on ties). The same endpoint also returns three derived fields (`rules[]` deduped at top level, `ruleCount`, `userPrompt`) which the codegen drops — see §6.5. |
| `GET /api/v1/ontology/actions/{ref}?domain=<D>` | not used by the codegen | Returns only the Action node's flat properties (no traversal). Reserved for future enrichers. |
| `GET /api/v1/ontology/actions/{ref}/steps?domain=<D>` | not used by the codegen | Returns the Action plus `action_steps[]` without per-step `rules[]`. Reserved for future enrichers. |

`{ref}` accepts either a numeric id (e.g. `10`), an `action_id` alias, or a name (e.g. `matchResume`). The CLI `--action-id` and `--action-name` flags both resolve to the same `{ref}` URL segment; the legacy in-CLI precedence is retained ("if both flags are provided, `--action-id` wins") only because the server-side resolver also wins on id over name.

Domain is mandatory on every call as `?domain=…` (`400 missing-domain` otherwise — note the API has standardized on `?domain=`, not `?domainId=`, even on the composite endpoint as of 2026-05-08).

### 4.2 Error mapping

| HTTP / API code | Library error class | CLI exit |
|---|---|---|
| 401 `unauthorized` | `OntologyAuthError` | 1 |
| 404 `node-not-found` / `action-not-found` | `OntologyNotFoundError` | 1 |
| 400 `missing-domain` / `missing-id` | `OntologyRequestError` | 1 |
| 502 `neo4j-unavailable` | `OntologyUpstreamError` | 1 |
| 500 `server-misconfigured` / `internal-error` | `OntologyServerError` | 1 |
| timeout | `OntologyTimeoutError` | 1 |

Default request timeout: **8000 ms**, configurable via `--timeout-ms`.

#### 4.2.1 Error class shapes

All errors thrown by `lib/ontology-gen/` extend a common base. Defined in `lib/ontology-gen/errors.ts`:

```ts
export abstract class OntologyGenError extends Error {
  abstract readonly code: string;             // stable string for log/grep
  readonly details?: Record<string, unknown>;
  constructor(message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = this.constructor.name;
    this.details = details;
  }
}

// HTTP / upstream errors — populated from the API response
export class OntologyAuthError extends OntologyGenError {
  readonly code = "ontology-auth";
  readonly httpStatus = 401;
}
export class OntologyNotFoundError extends OntologyGenError {
  readonly code = "ontology-not-found";
  readonly httpStatus = 404;
  readonly resource: string;                  // "action" | "node" | ...
  constructor(resource: string, message: string, details?: Record<string, unknown>) {
    super(message, details);
    this.resource = resource;
  }
}
export class OntologyRequestError extends OntologyGenError {
  readonly code = "ontology-request";
  readonly httpStatus = 400;
}
export class OntologyUpstreamError extends OntologyGenError {
  readonly code = "ontology-upstream";
  readonly httpStatus = 502;
}
export class OntologyServerError extends OntologyGenError {
  readonly code = "ontology-server";
  readonly httpStatus = 500;
}
export class OntologyTimeoutError extends OntologyGenError {
  readonly code = "ontology-timeout";
  readonly timeoutMs: number;
  constructor(timeoutMs: number, message: string) {
    super(message);
    this.timeoutMs = timeoutMs;
  }
}

// Contract / validation — local errors, no httpStatus
export class OntologyContractError extends OntologyGenError {
  readonly code = "ontology-contract";       // upstream returned shape we don't accept
}
export class ActionValidationError extends OntologyGenError {
  readonly code = "action-validation";        // invariant violation; details.invariant identifies it
}
```

The CLI catches `OntologyGenError`, prints `error.name + ": " + error.message + (details ? "\n" + JSON.stringify(details, null, 2) : "")` to stderr, and exits 1. Unknown errors (programming bugs) print stack trace and exit 1.

### 4.3 Property-bag reality

The API is schema-agnostic (API doc §"Schema-agnostic = no field-level validation"). Consequence for us: the `Action` type we define in `types.public.ts` is **our** contract, not the API's. The API may at any time return additional fields we ignore, or omit fields we expected.

Validation policy (see §6.4 for the asserted invariants and §6.1 for per-field defaults):

- **Hard-required fields** (missing or invalid → `ActionValidationError`): `id`, `name`, `action_steps` (must be present, may be `[]`), `action_steps[i].order`, `action_steps[i].rules[j].id`.
- **Soft-required fields** (missing → filled with sentinel default at fetch, type stays non-optional): `description`, `submission_criteria`, `category`, `actor`, `trigger`, `target_objects`, `inputs`, `outputs`, `object_type`, `action_steps[i].name`, `action_steps[i].description`, `action_steps[i].objectType`, `action_steps[i].rules`, `action_steps[i].rules[j].submissionCriteria`, `action_steps[i].rules[j].description`. Defaults: `""` for strings, `[]` for arrays, `"unknown"` for `objectType` (preserves runtime narrowability).
- **Truly optional fields** (missing → field is `undefined` on the typed Action): `action_steps[i].condition`, `inputs[i].sourceObject`. These are the only `?:` properties on the public types.
- **Unknown fields** (anything outside the whitelist in §6.5) are silently dropped during fetch. Our snapshot is a curated subset, not a verbatim dump.

Why "soft-required" instead of just "optional": the consumer never has to write `obj.description ?? ""`. Every field is always defined with a usable default. The cost — dropping the distinction between "API didn't send it" and "API sent empty string" — is acceptable because the consumer doesn't need to make that distinction (it's a snapshot, not a queryable record).

### 4.4 How we obtain the full Action tree

An earlier API revision had `ActionStep` "surfaced via the match-resume tree only" and left ambiguous whether the bare `GET /actions/{id}` returned nested `action_steps` for non-`matchResume` Actions. **The 2026-05-08 API revision resolves this ambiguity** by promoting the rules-tree read into a generalized path-segment endpoint usable for any Action:

```
GET /api/v1/ontology/actions/{ref}/rules?domain=<D>
→ {
    ...action,                              // all property-bag fields stored on the (:Action) node
    action_steps: [{ ...step, rules: [...] }, ...],
    rules:     [...],                       // top-level deduped — DROPPED by codegen (§6.5)
    ruleCount: N,                           // DROPPED by codegen (§6.5)
    userPrompt: "..."                       // API-compiled markdown — DROPPED by codegen (§6.5)
  }
```

Step discovery is dual-path on the server (`(:Action)-[:HAS_STEP]->(:ActionStep)` plus a `step.action_id` / `actionId` / `parentActionId` property fallback) and rule discovery is bidirectional (`(:Rule)-[:GOVERNS]->(:ActionStep)` plus `(:ActionStep)-[:CHECKS]->(:Rule)`, plus a `step.rules_json` / `rulesJson` / `rules` property fallback that gets hydrated via a batched follow-up query). The codegen treats this endpoint as the **single fetch path** for stage ①; no fallback dispatch is needed and the legacy `/match-resume/rules` endpoint is not called (it is removed in the same API revision).

`fetch.ts` still validates the response shape: if `action_steps` is missing (the property is absent, not just an empty array), it throws `OntologyContractError` pointing at this spec section. The three derived fields (`rules`, `ruleCount`, `userPrompt`) are dropped silently per the §6.5 whitelist policy.

### 4.5 Multi-source composition (architectural readiness, deferred work)

A future Action's prompt may benefit from data the Action node itself does not carry — for example, the schema of a `Job_Requisition` DataObject named in `targetObjects`, or the trigger Event description named in `trigger`. Generating this richer prompt requires fetching from multiple endpoints and merging.

**The current scope does not implement this.** The codegen fetches exactly one endpoint and produces a one-Action snapshot from it. But the architecture is designed so this can be added later without restructuring:

```
            ┌─────────────────┐
            │ fetchAction     │   single endpoint, returns Action
            └────────┬────────┘
                     │  Action
                     ▼
later ──► ┌─────────────────────────┐
          │ enrichActionTree        │   pluggable; current = identity
          │   (enrichers: Enricher[]) │
          └────────┬────────────────┘
                   │  Action  (potentially with optional `enrichment` field)
                   ▼
              project →  emit  (unchanged)
```

An `Enricher` is a pure async function `(action, ctx) => Promise<Partial<EnrichmentBundle>>`. Composition is left-to-right merge. Candidates:

- **TargetObjectsEnricher** — for each name in `action.targetObjects`, fetch `/objects/{id}` and attach its property catalogue.
- **TriggerEventsEnricher** — for each name in `action.trigger`, fetch `/events/{id}` and attach the event's description and payload schema.
- **RelatedActionsEnricher** — fetch other Actions in the same `category` for cross-reference notes.

**Implications for the current scope**:
- The `Action` type in §6.1 stays as defined. Enrichment, when added, lives under an optional `enrichment?: EnrichmentBundle` field added to `Action` and `ActionObject` per §13 add-only ABI rule.
- The pipeline in §5 stays a single linear chain; future revisions insert an enrichment step between fetch and project.
- The renderer set in §7.5 stays as the **template `v3` baseline**. Enrichment-aware sections would be additive (new section keys appended after `beforeReturning`), gated by a `templateVersion` bump.
- The fetch client stays a thin HTTP wrapper. Each enricher is its own module under `lib/ontology-gen/enrichers/`, none required for the current scope (the directory does not exist yet).

This section exists to commit the architectural seam now, so enrichment work is incremental, not a rewrite.

---

## 5. Pipeline

```
       env + CLI flags
              │
              ▼
   ┌──────────────────────────┐
   │  ① fetch + validate +    │   async; performs HTTP call,
   │     coerce               │   asserts invariants, narrows types
   └──────────┬───────────────┘
              │  Action  (1:1 with API response, camelCase, validated)
              ▼
   ┌──────────────────────────┐
   │  ② project               │   pure; renders sections, assembles
   │                          │   ActionObject (incl. prompt + sections)
   └──────────┬───────────────┘
              │  ActionObject
              ▼
   ┌──────────────────────────┐
   │  ③ emit                  │   pure; produces TS source string
   └──────────┬───────────────┘
              │  string
              ▼
       writeFile (atomic)
```

### 5.1 Public signatures

```ts
// lib/ontology-gen/index.ts

export async function fetchAction(opts: FetchOptions): Promise<Action>;
export function projectActionObject(action: Action, opts: CompileOptions): ActionObject;
export function emitActionObjectModule(obj: ActionObject, opts: EmitOptions): string;

// orchestrator
export async function generateActionSnapshot(
  opts: FetchOptions & CompileOptions & EmitOptions & { outputPath: string },
): Promise<{
  sourceCode: string;
  fileName: string;
  meta: ActionObject["meta"];
}>;
```

### 5.2 Why fetch+validate+coerce is one stage

Originally split across three stages (fetch, normalize, validate). Collapsed because:
- API responses (per `actions_v0_1_006.json`) are already nested and structured. Heavy normalization is unnecessary.
- Validation is a handful of `assertInvariant(...)` calls at the end of the fetch function. Splitting it into a separate stage adds ceremony with no testability gain at the current scale.
- Type coercion is mechanical (e.g. `action_steps[].order: "1"` → `1`, snake_case keys → camelCase). Belongs alongside fetch.

Stages 2 and 3 stay separate because they have different inputs (Action vs. ActionObject) and different concerns (semantic compilation vs. code generation).

### 5.3 Failure semantics per stage

| Stage | Failure mode | What it means | Action |
|---|---|---|---|
| ① fetch | Network / 5xx / timeout | Upstream issue | Retry or wait; not a code bug |
| ① validate | Invariant violated | Upstream contract drift | Update spec or fix data |
| ① coerce | Type coercion fails | Upstream returned unexpected type | Update spec, possibly extend type |
| ② project | Should be infallible if validate passed | Bug in our code | Fix bug |
| ③ emit | Should be infallible | Bug in our code | Fix bug |

This separation matters because a runtime operator triaging a failed `npm run gen:ontology` knows immediately whether to call the API team or open an issue against this codegen.

---

## 6. Type contract

All types live in `lib/ontology-gen/types.public.ts` and are emitted verbatim to `generated/action-object.types.ts` via `npm run gen:ontology:types`. The emitted file is the **ABI** between us and the consumer.

### 6.1 The `Action` type (post-fetch, pre-compile)

1:1 with the API response, with snake_case → camelCase rename and `order: string → number` coercion. No "Raw" / "Normalized" two-layer model — there is one `Action` type, period.

Each field carries an inline annotation showing its missing-value default (per §4.3). Fields marked `?:` are the **only** fields that can legitimately be `undefined`; all others are guaranteed defined after fetch.

```ts
export interface Action {
  id: string;                        // hard-required, e.g. "10"
  name: string;                      // hard-required, e.g. "matchResume"
  description: string;               // soft-required, default ""
  submissionCriteria: string;        // soft-required, default ""
  objectType: "action" | string;     // soft-required, default "action"
  category: string;                  // soft-required, default ""
  actor: string[];                   // soft-required, default []
  trigger: string[];                 // soft-required, default []
  targetObjects: string[];           // soft-required, default []
  inputs: ActionInput[];             // soft-required, default []
  outputs: ActionOutput[];           // soft-required, default []
  actionSteps: ActionStep[];         // hard-required (presence), default []

  // v2 structural data (added in template v2 — see §7)
  sideEffects: ActionSideEffects;    // soft-required, default { dataChanges: [], notifications: [] }
  triggeredEvents: string[];         // soft-required, default []
                                     //   hoisted from JSON key `triggered_event` (which is an
                                     //   array despite the singular name); renamed to plural
                                     //   in the typed model for honesty.
}

export interface ActionInput {
  name: string;                      // hard-required (within input)
  type: string;                      // soft-required, default "Unknown"
  description: string;               // soft-required, default ""
  sourceObject?: string;             // truly optional (undefined OK)
  required: boolean;                 // soft-required, default false
}

export interface ActionOutput {
  name: string;                      // hard-required (within output)
  type: string;                      // soft-required, default "Unknown"
  description: string;               // soft-required, default ""
}

export interface ActionStep {
  order: number;                     // hard-required, coerced from string|number
  name: string;                      // soft-required, default ""
  description: string;               // soft-required, default ""
  objectType: "logic" | "tool" | "data" | "unknown" | string;   // soft-required, default "unknown"
  condition?: string;                // truly optional (undefined OK)
  rules: ActionRule[];               // soft-required, default []

  // v2 structural data (added in template v2)
  inputs: ActionStepInput[];         // soft-required, default []  (was Action-only in v1)
  outputs: ActionStepOutput[];       // soft-required, default []  (was Action-only in v1)
  doneWhen?: string;                 // truly optional — explicit step-completion criterion.
                                     //   Recommended by spec; upstream may not yet provide.
                                     //   When absent, the rendered step block omits the line.
}

export interface ActionStepInput {
  name: string;                      // hard-required (within step input)
  type: string;                      // soft-required, default "Unknown"
  description: string;               // soft-required, default ""
  sourceObject?: string;             // truly optional. Two valid shapes:
                                     //   (a) "<DataObject>.<field>"  — read from a DataObject
                                     //   (b) "<priorStepName>.<outputName>" — chained from prior step
}

export interface ActionStepOutput {
  name: string;                      // hard-required (within step output)
  type: string;                      // soft-required, default "Unknown"
  description: string;               // soft-required, default ""
}

export interface ActionRule {
  id: string;                        // hard-required, e.g. "10-16"
  submissionCriteria: string;        // soft-required, default ""
  description: string;               // soft-required, default ""
                                     //   When upstream omits `description` but supplies
                                     //   `standardizedLogicRule` (live-API shape), fetch
                                     //   uses the latter as `description` to keep the
                                     //   prompt body source single-typed.

  // v2 structural data
  severity: "blocker" | "branch" | "advisory" | string;  // soft-required, default "advisory"
                                                          //   - blocker:  violating halts the step
                                                          //   - branch:   dictates an alternative path
                                                          //   - advisory: should be observed; no halt
                                                          //   Until upstream supplies this field, fetch
                                                          //   substitutes "advisory" (least restrictive
                                                          //   safe default).

  // Live-API Rule properties — all truly-optional. Available on `(:Rule)` nodes
  // returned by /actions/{ref}/rules but not present in actions_v0_1_006.json.
  businessLogicRuleName?: string;    // human-readable rule name; preferred label in `## Rule index`
  standardizedLogicRule?: string;    // alias of `description` on the live API; preserved separately
                                     //   in case consumers want the un-aliased value
  executor?: string;                 // "Agent" / "Human" / etc.
  ruleSource?: string;               // "内部流程" / "客户系统" / etc.
  applicableClient?: string;         // "通用" or a specific client id
}

// ───── v2 side-effect data model ─────

export interface ActionSideEffects {
  dataChanges: ActionDataChange[];     // soft-required, default []
  notifications: ActionNotification[]; // soft-required, default []
}

export interface ActionDataChange {
  objectType: string;                  // hard-required (within entry), e.g. "Job_Requisition"
  action: string;                      // soft-required, default "" — e.g. "CREATE", "MODIFY",
                                       //   "DELETE", "CREATE_OR_MODIFY"
  propertyImpacted: string[];          // soft-required, default []
  description: string;                 // soft-required, default ""
  stepRefId?: string;                  // truly optional. When present, this change is attributed
                                       //   to the named step (matched against ActionStep.name or
                                       //   String(ActionStep.order)). When absent, change appears
                                       //   only in the Action-level Side-effect boundary, not in
                                       //   any Step block.
}

export interface ActionNotification {
  recipient: string;                   // soft-required, default ""  (e.g. "HSM")
  channel: string;                     // soft-required, default ""  (e.g. "Email", "InApp")
  condition: string;                   // soft-required, default ""
  message: string;                     // soft-required, default ""
  triggeredEvent: string;              // soft-required, default ""  (event name; "" means no event)
  stepRefId?: string;                  // truly optional, same semantics as ActionDataChange.stepRefId
}
```

**Failure rule.** If a hard-required field is missing, malformed, or fails coercion, fetch throws `ActionValidationError` with `details: { invariant, path, observedValue }`. If a soft-required field is missing, fetch substitutes the default silently and continues. Truly-optional fields stay `undefined`.

**Severity-default rationale.** Defaulting `ActionRule.severity` to `"advisory"` rather than `"blocker"` is deliberate: defaulting to blocker would silently turn every legacy rule into a hard halt the moment the field is honored, which is unsafe. Production teams that want a rule treated as a hard guard must mark it `"blocker"` explicitly upstream.

### 6.2 The `ActionObject` type (post-compile, the emitted shape)

```ts
export interface ActionObject {
  // ───── 1:1 mirror of Action (structured truth) ─────
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
  actionSteps: ActionStep[];
  sideEffects: ActionSideEffects;     // v2 — full structured side-effect tree
  triggeredEvents: string[];          // v2 — Action-level outbound events

  // ───── Compilation products ─────
  /** Default prose rendering. The convenience field used by 95% of consumers.
   *  Equals the non-null sections joined by "\n\n", in source order. */
  prompt: string;

  /** Structured access to the same content, for consumers that need to
   *  recompose, trim, or replace sections.
   *
   *  Nullability rule (uniform): every section returns `null` when its source
   *  data is empty / missing, EXCEPT four sections that always render:
   *    - `actionSpec`         — hard-required name + binding-contract framing
   *    - `errorPolicy`        — baseline policies + data-driven specifics
   *    - `completionCriteria` — at minimum a generic terminator clause
   *    - `beforeReturning`    — baseline self-check list
   *  Consumer code uses `if (sections.X)` or spread-and-filter to handle
   *  absent sections. */
  sections: {
    actionSpec: string;                    // always present (was: role)
    purpose: string | null;                // null when action.description === ""              (was: description)
    preconditions: string | null;          // null when action.submissionCriteria === ""       (was: submissionCriteria)
    inputsSpec: string | null;             // null when action.inputs is empty
    steps: string | null;                  // null when action.actionSteps is empty
    output: string | null;                 // null when action.outputs is empty                (was: outputFormat)
    sideEffectBoundary: string | null;     // null when targetObjects, dataChanges, notifications,
                                           //   and triggeredEvents are all empty              (was: sideEffects)
    errorPolicy: string;                   // always present (baseline + specifics)
    completionCriteria: string;            // always present
    ruleIndex: string | null;              // null when no rules anywhere in the Action
    beforeReturning: string;               // always present
  };

  // ───── Provenance ─────
  meta: {
    actionId: string;                // e.g. "10"
    actionName: string;              // e.g. "matchResume"
    domain: string;                  // e.g. "RAAS-v1"
    compiledAt: string;              // ISO 8601
    templateVersion: "v3";
  };
}
```

**Field ordering note.** The interface declares fields in three blocks (mirror, compilation, provenance). The emitter preserves this order in the generated file for human readability.

**On redundancy of `name` and `meta.actionName`** (or `id` and `meta.actionId`). They carry the same value at compile time. The duplication is intentional:
- Top-level `name` / `id` is the **runtime** API of the object — code that uses the Action reads `obj.name`, `obj.id`. It would be awkward to write `obj.meta.actionName` for normal access.
- `meta.actionName` / `meta.actionId` are **provenance** — they describe what the snapshot was built from. They live alongside `domain`, `compiledAt`, `templateVersion` because together those five answer "what is this file and where did it come from".

If the top-level `name` is ever transformed (e.g. a future `--rename` flag), `meta.actionName` would still record the source-of-truth name from the API. Keeping both unambiguous from day 1 prevents that ambiguity later.

### 6.3 `CompileOptions`

```ts
export interface CompileOptions {
  /** Currently the only valid value; reserved for ABI evolution.
   *  Default in CLI is "v3"; "v1" and "v2" are no longer implemented (superseded). */
  templateVersion: "v3";

  /** Reserved. The renderer emits Chinese-source descriptions verbatim
   *  regardless; this field remains for forward compatibility only. */
  locale?: "zh" | "en";

  /** Override `meta.compiledAt`. Used by fixture verification to normalise to
   *  a fixed sentinel; production callers leave undefined. */
  compiledAtOverride?: string;

  /** Required for `meta.domain` — provenance only. */
  domain: string;

  /** Optional per-call rule scope filter. When supplied, rules whose
   *  `applicableClient` is non-empty / non-"通用" and doesn't match `client`
   *  are dropped from `actionSteps[*].rules` (and from `ruleIndex` by
   *  transitive effect). The filter touches rules only — steps / inputs /
   *  outputs / side-effects skeleton pass through unchanged.
   *
   *  Used by the runtime resolver (§11.5) to scope a single Action's prompt
   *  to a specific tenant. The CLI (§9) does not pass it; offline snapshots
   *  in `generated/` represent the "all clients" view.
   *
   *  `clientDepartment` is reserved for upstream API support: the Ontology
   *  API will expose `applicableClientDepartment` on `(:Rule)` in a future
   *  revision. Currently a no-op until that field ships. */
  clientFilter?: {
    client?: string;
    clientDepartment?: string;
  };
}
```

### 6.4 Validation invariants (asserted in stage ①)

- `action.id` is a non-empty string.
- `action.name` is a non-empty string and matches `^[a-zA-Z][a-zA-Z0-9]*$` (used as TS export name root).
- `action.actionSteps` is present (may be empty).
- Every `actionSteps[i].order` coerces to a finite positive integer.
- `actionSteps[i].order` values are unique within the Action.
- Every `actionSteps[i].rules[j].id` is a non-empty string.
- Every `actionSteps[i].rules[j].severity` (after default-fill) is one of the recognized values
  `"blocker" | "branch" | "advisory"` **or** an arbitrary string passed through (see §6.1 — the type
  union is open). Recognized values affect rendering (see §7.5); unrecognized values are emitted
  verbatim under `(<id>, <severity>)`.
- Every `sideEffects.dataChanges[i].objectType` is a non-empty string when the entry is present.

Violations throw `ActionValidationError` with a structured `details` field naming the invariant and the offending value.

### 6.5 Field name mapping (snake_case → camelCase whitelist)

The fetch stage applies an **explicit whitelist mapping**, not a generic algorithm. Reasoning: the API is schema-agnostic (§4.3), so an algorithmic conversion would silently re-key any future field the API team introduces. A whitelist localises the contract: anything outside the table is dropped during fetch.

| API key (snake_case)       | TS key (camelCase)        | Container                                                              |
|----------------------------|---------------------------|------------------------------------------------------------------------|
| `id`                       | `id`                      | Action, ActionRule                                                     |
| `name`                     | `name`                    | Action, ActionInput, ActionOutput, ActionStep, ActionStepInput, ActionStepOutput |
| `description`              | `description`             | Action, ActionInput, ActionOutput, ActionStep, ActionStepInput, ActionStepOutput, ActionRule, ActionDataChange |
| `submission_criteria`      | `submissionCriteria`      | Action, ActionRule                                                     |
| `object_type`              | `objectType`              | Action, ActionStep, ActionDataChange — see note (a) below              |
| `category`                 | `category`                | Action                                                                 |
| `actor`                    | `actor`                   | Action                                                                 |
| `trigger`                  | `trigger`                 | Action                                                                 |
| `target_objects`           | `targetObjects`           | Action                                                                 |
| `inputs`                   | `inputs`                  | Action, **ActionStep** (v2: extended to step level)                    |
| `outputs`                  | `outputs`                 | Action, **ActionStep** (v2: extended to step level)                    |
| `action_steps`             | `actionSteps`             | Action                                                                 |
| `type`                     | `type`                    | ActionInput, ActionOutput, ActionStepInput, ActionStepOutput           |
| `source_object`            | `sourceObject`            | ActionInput, ActionStepInput                                           |
| `required`                 | `required`                | ActionInput                                                            |
| `order`                    | `order` (number)          | ActionStep — also coerced                                              |
| `condition`                | `condition`               | ActionStep, ActionNotification                                         |
| `rules`                    | `rules`                   | ActionStep                                                             |
| `done_when`                | `doneWhen`                | ActionStep — v2; truly-optional                                        |
| `severity`                 | `severity`                | ActionRule — v2; soft-required, default `"advisory"`                   |
| `side_effects`             | `sideEffects`             | Action — v2 root container                                             |
| `data_changes`             | `dataChanges`             | ActionSideEffects — v2                                                 |
| `notifications`            | `notifications`           | ActionSideEffects — v2                                                 |
| `action`                   | `action`                  | ActionDataChange — v2 (the verb; e.g. CREATE_OR_MODIFY)                |
| `property_impacted`        | `propertyImpacted`        | ActionDataChange — v2                                                  |
| `recipient`                | `recipient`               | ActionNotification — v2                                                |
| `channel`                  | `channel`                 | ActionNotification — v2                                                |
| `message`                  | `message`                 | ActionNotification — v2                                                |
| `triggered_event`          | `triggeredEvent` / `triggeredEvents` | ActionNotification (singular field) **and** Action top level — see note (b) below |
| `step_ref_id`              | `stepRefId`               | ActionDataChange, ActionNotification — v2; truly-optional              |

**Note (a) — `object_type` polysemy.** The same JSON key serves three semantically different roles:
- On Action: a node-kind discriminator (always `"action"`).
- On ActionStep: a step kind (`"logic"`, `"tool"`, `"data"`, ...).
- On ActionDataChange: the name of the DataObject being mutated (`"Job_Requisition"`, `"Candidate"`).
The whitelist accepts the same key in all three containers; downstream renderers interpret it per container.

**Note (b) — `triggered_event` polysemy.** The same JSON key appears at two levels with opposite cardinality:
- Inside a notification entry, it is **a single event name string** — mapped to `ActionNotification.triggeredEvent` (singular).
- At the Action top level, it is **an array of event names** — mapped to `Action.triggeredEvents` (plural).
The fetch stage detects shape and routes accordingly. If the API ever returns the wrong shape for either level, fetch throws `OntologyContractError`.

**Live-API Rule fields.** The `(:Rule)` node on the live ontology API exposes additional descriptive properties. They round-trip into `ActionRule` as truly-optional fields:

| API key                    | TS key                  | Container   |
|----------------------------|-------------------------|-------------|
| `businessLogicRuleName`    | `businessLogicRuleName` | ActionRule  |
| `standardizedLogicRule`    | `standardizedLogicRule` | ActionRule  |
| `executor`                 | `executor`              | ActionRule  |
| `ruleSource` / `rule_source`           | `ruleSource`         | ActionRule  |
| `applicableClient` / `applicable_client` | `applicableClient` | ActionRule  |

**`*_json` flatten-rule inflation** (see §16). Before whitelist filtering, fetch runs a pre-pass that rehydrates JSON-stringified property-bag fields. For each of `actor`, `trigger`, `target_objects`, `inputs`, `outputs`, `side_effects`, `triggered_event` (at Action top-level) and `inputs`, `outputs` (inside each `action_step`): if the non-suffixed key is absent and `<key>_json` is a JSON-encoded string, the string is parsed and exposed under `<key>`. The `_json` aliases never reach the whitelist stage — they are consumed by the inflater and dropped from the working object.

If the API later returns a key not in this whitelist, the fetch stage **silently drops it**. Adding support for a new field is an explicit edit to this table + the `Action` type — never automatic.

Per-container schema validation rejects any unknown nested object key beyond the whitelist; whitelisted keys with the wrong type throw `OntologyContractError`.

**Explicitly-dropped fields (response-derived, not stored on the node).** The `/actions/{ref}/rules` endpoint adds three fields the codegen deliberately ignores:

| Dropped field    | Source                | Why we drop it                                                                                                                                                                                                                                                            |
|------------------|-----------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `rules`          | API-side dedup        | Top-level deduped projection of all `action_steps[].rules[]`. The codegen already produces this from the nested form when needed (e.g. `## Rule index` in §7.5.10) and does not want a second source-of-truth that could disagree.                                       |
| `ruleCount`      | API-side count        | Trivially derivable from `action_steps[].rules[]`. Carrying both a count and the nested array would be a determinism trap (which one is canonical when they disagree?).                                                                                                  |
| `userPrompt`     | API-compiled markdown | The API now compiles a markdown prompt of its own. The codegen has its own template `v3` (§7) with a binding-contract structure, error policy, completion criteria, etc. that the API's `userPrompt` does not produce. We do not want two competing prompt formats in the snapshot — the codegen's `prompt` is authoritative for our consumer. |

These fields are matched and dropped by name in the fetch stage. They never appear on the typed `Action` and they are not part of the emitted `ActionObject`.

---

## 7. Compile (project stage)

### 7.1 Section renderers

Eleven renderers live in `lib/ontology-gen/compile/sections.ts`. Each is a pure function:

```ts
type Section = string | null;
type SectionRenderer<T> = (input: T) => Section;
```

| # | Section key | Always present? | Source data | Header in prompt | Notes |
|---|-------------|-----------------|-------------|------------------|-------|
| 1 | `actionSpec`         | yes | `action.{name, category, actor, trigger}` | `## Action specification: <name>` | Declares the fragment as a binding contract; emits category / actor / trigger as a metadata bullet list. Replaces v1's `role`. |
| 2 | `purpose`            | no  | `action.description`                       | `## Purpose`                       | Renamed from v1's `description`. |
| 3 | `preconditions`      | no  | `action.submissionCriteria`                | `## Preconditions`                 | Renamed from v1's `submissionCriteria` (header was `## Run when`). The new word avoids overlap with step-level "precondition" and rule-level "when". |
| 4 | `inputsSpec`         | no  | `action.inputs[]`                          | `## Inputs`                        | Adds a leading sentence stating "the runtime provides these as a JSON object on the inbound payload". Each line shows source linkage: `- <name> (<type>, <req>) ← <sourceObject>: <desc>`. |
| 5 | `steps`              | no  | `action.actionSteps[]` + filtered `sideEffects.*[stepRefId]` | `## Steps` | Sorted by `order`. Each step is a structured block — header `<order>. <name> [<objectType>]` (objectType tag omitted when blank or "unknown"); body has `precondition` / `description` / `inputs` / `outputs` / `writes` / `notifies` / `rules` / `doneWhen` lines per §7.5.5. **v3 rule rendering** is a 3-row block per rule: `(<id> / <severity>[ / <executor>][ / <applicableClient>])[ <businessLogicRuleName>]` then `when: …` (omitted if blank) then `do: …`. |
| 6 | `output`             | no  | `action.outputs[]`                         | `## Output`                        | Renamed from v1's `outputFormat`. Renders both a typed list **and** a fenced JSON skeleton — LLM output-conformance is materially better when the shape is shown. |
| 7 | `sideEffectBoundary` | no  | `action.targetObjects` + `action.sideEffects` + `action.triggeredEvents` | `## Side-effect boundary` | **v3 structured into 4 sub-blocks**: `### writes` (one entry per `dataChange` with `<ObjectType> / <action>` plus `fields:` line and single-line `note:` from `description`), `### reads` (`targetObjects` minus the write set), `### notifies` (one entry per `notification` with `recipient / channel`, `when:` from `condition`, `event:` from `triggeredEvent` or `(none)`), `### emits` (deduped union of action-level `triggeredEvents` and notification-level `triggeredEvent`). Closes with "Anything outside the above is out of scope; refuse and surface via Error policy." Returns `null` only when all 4 sub-blocks are empty. |
| 8 | `errorPolicy`        | yes | derived (baseline + `sideEffects.notifications` + blocker rules) | `## Error policy` | Always-present baseline ("missing required input → return failed") plus data-driven rows for blocker rules and alert events. |
| 9 | `completionCriteria` | yes | derived (`actionSteps`, `outputs`, `triggeredEvents`)     | `## Completion criteria`           | "The action is complete when ALL of: …" — gives the LLM a definite stop. Always renders, even if minimal. |
|10 | `ruleIndex`          | no  | `actionSteps[].rules[]`                    | `## Rule index`                    | **v3 grouped by step**. One `### step <order> — <name>` sub-section per step that has rules, in step `order`; within each, rules sorted by `rule.id` lexicographically. Each rule line: `(<id> / <severity>[ / <executor>][ / <applicableClient>])[ <businessLogicRuleName>]` then `<one-line label>` (label preference: `businessLogicRuleName` → `submissionCriteria` → `description` → `(no description)`). Empty step-rules groups are omitted. Returns `null` when no rules anywhere. |
|11 | `beforeReturning`    | yes | derived (`outputs`, `sideEffects`, blocker rules)         | `## Before returning`              | Self-check list. Always renders. |

There is intentionally **no** "Tools available" section — runtime tool definitions are owned by the LLM Agent runtime, not by this fragment. Encoding a placeholder here would create an empty contract.

### 7.2 Assembly: `prompt` from `sections`

```ts
// lib/ontology-gen/compile/index.ts — single source of truth for prompt assembly
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
```

`prompt` is **derived** from `sections` via this single helper. Two consequences:

1. The compile stage produces `sections` first, then calls `assemblePrompt(sections)` to get `prompt`. Renderer code never produces `prompt` directly. This guarantees the two cannot drift.
2. The order constant in `assemblePrompt` is the canonical section ordering. Inserting a new section requires editing the constant in this single location.

Empty-string filtering is **not** done here — that's a renderer responsibility (§7.5). A renderer either returns valid prose or `null` (or, for the four always-present sections, valid prose only); never `""`.

### 7.3 Determinism

All ordering inside the compile stage is explicit:
- `actionSteps` sorted by `order` (ascending) before render.
- Within each step, `rules` sorted by `id` (lexicographic ASCII) before render.
- `ruleIndex` sorts all rules across the Action by `id` (lexicographic ASCII).
- `inputs`, `outputs`, `targetObjects`, `triggeredEvents`, `sideEffects.dataChanges`, `sideEffects.notifications` rendered in API-given order (assumed stable upstream; revisit if real data is non-deterministic).
- In the Side-effect boundary v3 sub-blocks, `### writes` / `### reads` / `### notifies` / `### emits` preserve API order; `### writes` and `### reads` use first-occurrence-preserving deduplication on `objectType` (via the writeSet / targetObjects diff); `### emits` uses `dedupeStable` for the union of action-level `triggeredEvents` and notification-level `triggeredEvent` — never re-sorted.
- `meta.compiledAt` is the only non-deterministic field; the prompt body never embeds time, hashes, or randomness.

### 7.4 Why no per-Action template registry

All 22 Actions in `actions_v0_1_006.json` share the same shape (`description` + `submissionCriteria` + `inputs[]` + `outputs[]` + `actionSteps[].rules[]` + `side_effects` + `triggered_event`). The eleven generic renderers handle every one of them without special cases.

A registry (`ACTION_REGISTRY: Record<string, Partial<SectionRenderers>>`) is justified only when a future Action requires a section rendered differently from the generic form. **Add it then, not now.** YAGNI.

### 7.5 Renderer specifications (concrete templates)

Every renderer is a pure function. Inputs are **already-validated, already-camelCased** values from `Action`. Outputs are either a complete prose section (with its `## ` heading) or — for the seven nullable sections — `null`. **Never an empty string.** Four renderers (`actionSpec`, `errorPolicy`, `completionCriteria`, `beforeReturning`) always return a string.

Section headers are English constants baked into the v2 template; bodies are passed through verbatim from the API (typically Chinese). Mixed-language output is intentional — see §16.

A shared helper handles common operations:

```ts
const HEADER_PREFIX = "## ";
const ITEM_BULLET = "- ";
const STEP_INDENT = "   ";          // 3 spaces; aligns under the digit of "10."
const RULE_INDENT = "   - ";        // step-level indent + dash

const trimEnd = (s: string) => s.replace(/[\s　]+$/u, "");   // strip trailing ws (CJK-aware)
const isBlank = (s: string) => s.trim().length === 0;
const truncOneLine = (s: string, max = 60): string => {
  const firstLine = trimEnd(s).split("\n")[0];
  return firstLine.length > max ? `${firstLine.slice(0, max - 1)}…` : firstLine;
};
```

#### 7.5.1 `actionSpec` (always non-null)

```ts
function renderActionSpec(action: Action): string {
  const meta: string[] = [];
  if (!isBlank(action.category))   meta.push(`${ITEM_BULLET}Category: ${action.category}`);
  if (action.actor.length   > 0)   meta.push(`${ITEM_BULLET}Actor:    ${action.actor.join(", ")}`);
  if (action.trigger.length > 0)   meta.push(`${ITEM_BULLET}Trigger:  ${action.trigger.join(", ")}`);

  const metaBlock = meta.length > 0 ? `\n\n${meta.join("\n")}` : "";

  return `${HEADER_PREFIX}Action specification: ${action.name}

The block below is the formal specification of the action \`${action.name}\`. It is part of a larger user message; the runtime supplies inputs and additional context separately. Treat this block as a binding contract: do not deviate from the declared steps, do not write outside the declared targets, and do not return outputs outside the declared schema. If preconditions are unmet or required inputs are missing, follow Error policy.${metaBlock}`;
}
```

| Edge case | Behaviour |
|---|---|
| `action.name === ""` | Cannot occur — hard-required. |
| All metadata empty | Renders only the contract paragraph (no metadata block). |

#### 7.5.2 `purpose`

```ts
function renderPurpose(action: Action): string | null {
  if (isBlank(action.description)) return null;
  return `${HEADER_PREFIX}Purpose
${trimEnd(action.description)}`;
}
```

#### 7.5.3 `preconditions`

```ts
function renderPreconditions(action: Action): string | null {
  if (isBlank(action.submissionCriteria)) return null;
  return `${HEADER_PREFIX}Preconditions
${trimEnd(action.submissionCriteria)}`;
}
```

The header is `Preconditions` — distinct from step-level `precondition:` and rule-level `when ...`, eliminating the v1 three-way "when" overload.

#### 7.5.4 `inputsSpec`

```ts
function renderInputsSpec(action: Action): string | null {
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
```

**Format:** `- <name> (<type>, <required|optional>) ← <sourceObject>: <description>` per line. The `← <sourceObject>` segment is omitted when `sourceObject` is undefined.

#### 7.5.5 `steps`

The most complex renderer. Steps are sorted by `order`; within each step, rules are sorted by `id` (lexicographic, ASCII). Each step block is structured (not free prose) — every present field becomes a labelled line.

```ts
function renderSteps(action: Action): string | null {
  if (action.actionSteps.length === 0) return null;

  const stepBlocks = [...action.actionSteps]
    .sort((a, b) => a.order - b.order)
    .map((step) => renderOneStep(step, action));

  return `${HEADER_PREFIX}Steps\n${stepBlocks.join("\n\n")}`;
}

function attribForStep(step: ActionStep) {
  const matchesStep = (refId: string | undefined) =>
    refId !== undefined && (refId === step.name || refId === String(step.order));
  return {
    matchesStep,
  };
}

function renderOneStep(step: ActionStep, action: Action): string {
  const stepName = isBlank(step.name) ? "(unnamed)" : step.name;
  // v3: append [objectType] when meaningful (skip "unknown" and blank).
  const objTypeTag =
    step.objectType && !isBlank(step.objectType) && step.objectType !== "unknown"
      ? ` [${step.objectType}]`
      : "";
  const lines: string[] = [`${step.order}. ${stepName}${objTypeTag}`];

  // precondition / description / inputs / outputs / writes / notifies blocks
  // — unchanged from v2 (see source).

  // rules — v3 3-row block, sorted by id within the step
  if (step.rules.length > 0) {
    lines.push(`${STEP_INDENT}rules:`);
    const sortedRules = [...step.rules].sort((a, b) =>
      a.id < b.id ? -1 : a.id > b.id ? 1 : 0,
    );
    for (const r of sortedRules) {
      lines.push(...renderRuleBlock(r));
    }
  }

  // doneWhen
  if (step.doneWhen && !isBlank(step.doneWhen)) {
    lines.push(`${STEP_INDENT}done when:    ${trimEnd(step.doneWhen)}`);
  }

  return lines.join("\n");
}

/**
 * v3 rule block — 3 rows (header / when / do):
 *
 *   - (<id> / <severity>[ / <executor>][ / <applicableClient>])[ <businessLogicRuleName>]
 *        when: <submissionCriteria>
 *        do:   <description>
 *
 * Continuation indent matches the visual width of `RULE_INDENT` (5 chars), so
 * `when:` / `do:` align under the `(` of the metadata. The `when:` line is
 * omitted entirely if `submissionCriteria` is blank. The `do:` line falls
 * back to `(no description)` if `description` is blank.
 *
 * `executor` and `applicableClient` segments append (in that order) only when
 * defined and non-blank. `businessLogicRuleName` follows the closing paren as
 * a label when defined and non-blank.
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

  const HANG = RULE_INDENT.replace(/[^ ]/g, " ");   // 5 spaces
  if (!isBlank(rule.submissionCriteria)) {
    out.push(`${HANG}when: ${trimEnd(rule.submissionCriteria)}`);
  }
  const desc = isBlank(rule.description) ? "(no description)" : trimEnd(rule.description);
  out.push(`${HANG}do:   ${desc}`);

  return out;
}
```

**Example.** Step 1 of `matchResume` (live-API data, real v3 output):

```
1. validateRedlineAndBlacklist [logic]
   precondition: 已收到简历处理完成事件，候选人记录已创建
   description:  执行红线检测和黑名单校验...
   inputs:
   - candidate_id (String) ← Candidate.candidate_id — 待校验的候选人唯一编号...
   - resume_id (String) ← Resume.resume_id — 候选人简历编号...
   outputs:
   - redline_result (String) — 红线和黑名单校验结果...
   rules:
   - (10-16 / advisory / Agent / 通用) 通用黑名单检验规则-被动释放人员
        when: 候选人有华腾或中软国际历史工作经历。
        do:   系统在简历匹配环节,自动检索候选人的历史任职记录...
   - (10-17 / advisory / Agent / 通用) 通用黑名单检验规则-高风险回流人员
        when: 候选人有华腾或中软国际历史工作经历。
        do:   系统在简历匹配环节...立即终止匹配流程。
   - (10-19 / advisory / Human / 通用) 通用黑名单检验规则-被动释放人员特殊审批
        when: HSM收到离职原因YCH提示且需继续录用。
        do:   HSM必须立即在系统中发起"高风险回流特殊审批"流程...
```

| Edge case | Behaviour |
|---|---|
| `step.condition` missing | The `precondition:` line is omitted. |
| `step.description` empty | The `description:` line is omitted. |
| `step.inputs` / `step.outputs` empty | The corresponding section is omitted (no `(none)` sentinel). |
| No `data_changes[*].stepRefId` matches step | The `writes:` line is omitted; the change still appears in Side-effect boundary. |
| No `notifications[*].stepRefId` matches step | The `notifies:` line is omitted; the notification still appears in Side-effect boundary. |
| `step.rules` empty | The `rules:` line is omitted. |
| `rule.submissionCriteria` empty | The whole `when:` row is omitted; rule renders as 2-row block (header + `do:`). |
| `rule.description` empty | The `do:` row renders `(no description)` so the rule block still has a body line. |
| `rule.executor` blank | The ` / <executor>` segment is dropped from the metadata tag. |
| `rule.applicableClient` blank | The ` / <applicableClient>` segment is dropped from the metadata tag. |
| `rule.businessLogicRuleName` blank | The label after `)` is dropped; only metadata tag remains on the header row. |
| `step.objectType` blank or `"unknown"` | The `[<objectType>]` tag is dropped from the step header. |
| `step.doneWhen` missing | The `done when:` line is omitted. (Strongly recommended upstream; see §17.) |
| Step `order` collision | Cannot occur — fetch validates uniqueness (§6.4). |

#### 7.5.6 `output`

```ts
function renderOutput(action: Action): string | null {
  if (action.outputs.length === 0) return null;

  const fieldLines = action.outputs.map((out) => {
    const desc = isBlank(out.description) ? "(no description)" : trimEnd(out.description);
    return `${ITEM_BULLET}${out.name} (${out.type}): ${desc}`;
  });

  const skeletonEntries = action.outputs.map((out) => {
    return `  ${JSON.stringify(out.name)}: ${jsonPlaceholder(out.type)}`;
  });
  const skeleton = `{\n${skeletonEntries.join(",\n")}\n}`;

  return `${HEADER_PREFIX}Output
Return a JSON object matching this schema. The fields below are required; do not include extra keys.

${fieldLines.join("\n")}

\`\`\`json
${skeleton}
\`\`\``;
}

/** Map a declared type string to a JSON placeholder for the skeleton.
 *  Pure mapping — no validation. Recognized prefixes: List<...>, Map<...>,
 *  String/Text, Number/Integer/Float, Boolean. Unknown → quoted "<Type>". */
function jsonPlaceholder(type: string): string {
  const t = type.trim();
  if (/^List<.+>$/i.test(t))    return `["<${t.slice(5, -1)}>", "..."]`;
  if (/^Map<.+>$/i.test(t))     return `{ "<key>": "<value>" }`;
  if (/^(Number|Integer|Float)$/i.test(t)) return `<${t}>`;
  if (/^Boolean$/i.test(t))     return `<Boolean>`;
  return `"<${t}>"`;
}
```

**Format:** Typed bullet list followed by a fenced JSON skeleton. The skeleton materially improves structured-output conformance by giving the LLM the exact key list and shape, rather than asking it to construct one.

#### 7.5.7 `sideEffectBoundary`

**v3 4-sub-block layout.** Replaces the v2 4-line `MAY ...` summary with structured detail per data_change and per notification. The four sub-blocks render in fixed order; each sub-block is omitted when empty. The closing scope clause stays.

```ts
function renderSideEffectBoundary(action: Action): string | null {
  const dataChanges = action.sideEffects.dataChanges;
  const notifications = action.sideEffects.notifications;

  // ── ### writes: one entry per dataChange, with verb + fields + first-line note ──
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
      const firstLine = trimEnd(dc.description).split("\n")[0] ?? "";
      if (!isBlank(firstLine)) block.push(`   note:   ${firstLine}`);
    }
    writeBlocks.push(block.join("\n"));
  }

  // ── ### reads: targetObjects minus the write set ──
  const reads = action.targetObjects.filter((o) => !writeObjectTypes.has(o));

  // ── ### notifies: one entry per notification (preserve API order) ──
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

  // ── ### emits: dedup-stable union of triggeredEvents + notifications[].triggeredEvent ──
  const events = dedupeStable([
    ...action.triggeredEvents,
    ...notifications.map((n) => n.triggeredEvent).filter((s) => !isBlank(s)),
  ]);

  if (writeBlocks.length === 0 && reads.length === 0 && notifyBlocks.length === 0 && events.length === 0) {
    return null;
  }

  const sections: string[] = [];
  if (writeBlocks.length > 0)  sections.push(`### writes\n${writeBlocks.join("\n")}`);
  if (reads.length > 0)        sections.push(`### reads\n${reads.join(", ")}`);
  if (notifyBlocks.length > 0) sections.push(`### notifies\n${notifyBlocks.join("\n")}`);
  if (events.length > 0)       sections.push(`### emits\n${events.map((e) => `- ${e}`).join("\n")}`);
  sections.push(`Anything outside the above is out of scope; refuse and surface via Error policy.`);

  return `${HEADER_PREFIX}Side-effect boundary\n\n${sections.join("\n\n")}`;
}

function dedupeStable<T>(arr: T[]): T[] {
  const seen = new Set<T>();
  const out: T[] = [];
  for (const x of arr) if (!seen.has(x)) { seen.add(x); out.push(x); }
  return out;
}
```

**Format:** 4 sub-blocks with `###` headers (`writes` / `reads` / `notifies` / `emits`). The `note:` line in each `### writes` entry is `description` first-line only; `message` from notifications is **not** rendered (kept on `sideEffects.notifications[i].message` for programmatic consumers — would duplicate `condition` in prose).

**Example** (matchResume live data — abridged):
```
## Side-effect boundary

### writes
- Candidate_Match_Result / CREATE
   fields: candidate_match_result_id, client_id, candidate_id, job_position_id, result, reason
   note:   为候选人与每个匹配岗位创建匹配结果记录...
- Application / MODIFY
   fields: status, stage, matching_score
   note:   更新职位投递申请的匹配得分和流程状态...

### reads
Resume, Job_Requisition, Job_Requisition_Specification, Client, Client_Department, Salary_Scheme, Candidate_Expectation

### notifies
- HSM / InApp
   when:  候选人离职原因含YCH但非高风险编码需特殊备案
   event: (none)
- 招聘专员 / InApp
   when:  候选人命中竞对互不挖角红线...
   event: (none)
... (14 entries total)

### emits
- MATCH_PASSED_NEED_INTERVIEW
- MATCH_PASSED_NO_INTERVIEW
- MATCH_FAILED

Anything outside the above is out of scope; refuse and surface via Error policy.
```

#### 7.5.8 `errorPolicy` (always non-null)

```ts
function renderErrorPolicy(action: Action): string {
  const lines: string[] = [
    `${ITEM_BULLET}Missing or invalid required input → return {"status":"failed","reason":"<which field>","retry":false}; do not partially execute.`,
    `${ITEM_BULLET}Upstream resource unreachable or auth failure → return {"status":"failed","reason":"<...>","retry":true}.`,
  ];

  // Blocker rules
  const hasBlocker = action.actionSteps.some((s) => s.rules.some((r) => r.severity === "blocker"));
  if (hasBlocker) {
    lines.push(`${ITEM_BULLET}Blocker-severity rule violation → halt the offending step, surface failure, do not proceed to dependent steps.`);
  }

  // Alert events derived from notifications
  const alertEvents = dedupeStable(
    action.sideEffects.notifications.map((n) => n.triggeredEvent).filter((e) => !!e),
  );
  if (alertEvents.length > 0) {
    lines.push(`${ITEM_BULLET}When any condition listed in a step's "notifies:" line is met, emit the corresponding event with details. Alert events: ${alertEvents.join(", ")}.`);
  }

  return `${HEADER_PREFIX}Error policy
${lines.join("\n")}`;
}
```

**Format:** A bullet list of policies, baseline first, data-driven specifics after.

#### 7.5.9 `completionCriteria` (always non-null)

```ts
function renderCompletionCriteria(action: Action): string {
  const items: string[] = [];

  if (action.actionSteps.length > 0) {
    items.push(`Each step has run to its declared termination, or its failure has been surfaced per Error policy.`);
  }

  if (action.outputs.length > 0) {
    const required = action.outputs.map((o) => o.name).join(", ");
    items.push(`The Output JSON contains all required keys (${required}) and conforms to the schema in Output.`);
  }

  const hasOutboundEvents =
    action.triggeredEvents.length > 0 ||
    action.sideEffects.notifications.some((n) => !!n.triggeredEvent);
  if (hasOutboundEvents) {
    items.push(`Any required outbound event has been emitted (success events on success; alert events on failure).`);
  }

  if (items.length === 0) {
    items.push(`The response addresses what was asked.`);
  }

  const numbered = items.map((s, i) => `${i + 1}. ${s}`);
  return `${HEADER_PREFIX}Completion criteria
The action is complete when ALL of:

${numbered.join("\n")}`;
}
```

#### 7.5.10 `ruleIndex`

**v3 step-grouped layout.** Replaces the v2 flat-by-id list with one `### step <order> — <name>` sub-section per step that has rules; within each, rules sort by `rule.id` lexicographically. Empty step-rules groups are omitted entirely.

```ts
function renderRuleIndex(action: Action): string | null {
  // v3: group by step (in step.order); within each group sort by rule.id.
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
```

**Format:** One `### step <order> — <name>` sub-section per non-empty step. Each rule line: `- (<id> / <severity>[ / <executor>][ / <applicableClient>])[ <businessLogicRuleName>]` plus a one-line label (preferring `businessLogicRuleName` → `submissionCriteria` → `description` → `(no description)`).

**Example** (matchResume live data — abridged):
```
## Rule index

### step 1 — validateRedlineAndBlacklist
- (10-16 / advisory / Agent / 通用) 通用黑名单检验规则-被动释放人员
- (10-17 / advisory / Agent / 通用) 通用黑名单检验规则-高风险回流人员
- (10-19 / advisory / Human / 通用) 通用黑名单检验规则-被动释放人员特殊审批

### step 2 — matchHardRequirements
- (10-10 / advisory / Agent / 通用) 简历履历空窗期与职业稳定性风险判定
- ...

### step 3 — evaluateBonusAndCheckReflux
- (10-1 / advisory / Agent / 字节) 字节新需求下发滞留简历优先转推
- ...

### step 4 — generateMatchResult
- (10-39 / advisory / Agent / 腾讯) 腾讯历史从业经历核实结果处理
```

#### 7.5.11 `beforeReturning` (always non-null)

```ts
function renderBeforeReturning(action: Action): string {
  const checks: string[] = [];

  if (action.outputs.length > 0) {
    checks.push(`Output JSON conforms to the Output schema (no extra or missing keys).`);
  }
  if (action.sideEffects.dataChanges.length > 0 || action.targetObjects.length > 0) {
    checks.push(`No write occurred outside Side-effect boundary.`);
  }
  if (action.sideEffects.notifications.length > 0 || action.triggeredEvents.length > 0) {
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
```

#### 7.5.12 Determinism summary for renderers

- All array sorts are explicit and stable (see §15).
- Set-like outputs (Side-effect boundary `MAY` lists, ruleIndex labels, errorPolicy alert events) use first-occurrence-preserving deduplication via `dedupeStable`.
- No timestamps, hashes, randomness, or env reads inside any renderer.
- All whitespace-trimming uses the shared `trimEnd` helper (Unicode-aware) for cross-platform consistency.

---

## 8. Emit (codegen stage)

### 8.1 What "emit" means

In compiler / codegen vocabulary, **emit** = serialize an in-memory IR into the target form (here, TypeScript source). Distinct from:
- "serialize" (data format conversion, no executable structure)
- "render" (template substitution, no syntactic concerns like imports / exports / escaping)

`emit` is one-shot, write-only, runtime-irrelevant. Once a file is emitted, this codegen has no further relationship with it.

### 8.2 Strategy

Hand-rolled string concatenation. No `typescript` Compiler API dependency. Approximately 50 lines of code.

```
import type { ActionObject } from "<typesImportPath>";

export const <camelCase(name)>ActionObject: ActionObject = {
  // structured fields rendered via stable-JSON
  id: "...",
  name: "...",
  ...
  prompt: `<escaped multi-line backtick string>`,
  sections: { ... },
  meta: { ... },
};
```

### 8.3 The `prompt` field in emit

`prompt` is rendered as a backtick-delimited template literal so the multi-line text stays grep-able and reviewable. Three escape rules:

1. `\` → `\\`
2. `` ` `` → `` \` ``
3. `${` → `\${`

Without these, a prompt containing a backtick or interpolation marker breaks compilation or worse, silently substitutes.

### 8.4 Other fields in emit

Every non-`prompt` field is serialized via `stableJson(value, indent)`, defined in `compile/stable-json.ts`:

```ts
export function stableJson(value: unknown, indent: number): string {
  return JSON.stringify(value, sortedReplacer, indent);
}

function sortedReplacer(_key: string, value: unknown): unknown {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, v]) => v !== undefined)
        .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)),
    );
  }
  return value;
}
```

Effect: object keys sort alphabetically, `undefined` values drop (vs. `null` which is preserved). Same input always produces the same string.

### 8.5 File header

Every emitted file begins with:

```ts
// AUTO-GENERATED by scripts/gen-action-snapshot.ts at <compiledAt>
// source: action=<name> id=<id> domain=<domain> template=<templateVersion>
// DO NOT EDIT — regenerate via: npm run gen:ontology -- --action-name <name>
```

Three lines. No more — bigger headers age into stale ceremony. `<templateVersion>` is `v2` for all current emissions.

### 8.6 Write semantics

| Outcome | File-system effect |
|---|---|
| All stages succeed | `fs.writeFile(outputPath, source, "utf8")` overwrites unconditionally. No `--force` flag needed; emitted files are always regenerable from upstream input. |
| Any stage fails (fetch / validate / project / emit) | No write. Pre-existing file at `outputPath` is left untouched. CLI exits non-zero. |
| Output path's parent directory is missing | The CLI creates it via `fs.mkdir(dir, { recursive: true })` before write. |
| Output path exists as a directory | `fs.writeFile` errors; CLI exits non-zero with an actionable message. |

Concurrent invocations writing to the same `outputPath` race; the current scope makes no guarantee. Belt-and-suspenders atomicity (write-temp + rename) is a future concern, listed in §16.

---

## 9. CLI surface

### 9.1 Commands

```bash
# Generate one Action's TS object
npm run gen:ontology -- \
  --action-name matchResume \
  --domain RAAS-v1 \
  --output generated/match-resume.action-object.ts

# Or by id
npm run gen:ontology -- \
  --action-id 10 \
  --domain RAAS-v1 \
  --output generated/match-resume.action-object.ts

# Refresh the public types file (run once after types.public.ts changes)
npm run gen:ontology:types
# → writes generated/action-object.types.ts
```

### 9.2 Flags

| Flag | Required | Default | Notes |
|---|---|---|---|
| `--action-name <name>` | one of `--action-name` / `--action-id` | — | Sent verbatim as the `{ref}` URL segment of `/actions/{ref}/rules`. The API resolves `{ref}` against `Action.id` → `Action.action_id` → `Action.name`. Also used to derive the default `--output` filename and the export symbol — so name-form yields the most ergonomic emitted file. |
| `--action-id <id>` | one of `--action-name` / `--action-id` | — | Same destination (URL `{ref}`). If both flags are provided, `--action-id` wins (matches the server-side resolver's id-over-name precedence). When only an id is supplied, the human-readable `name` is derived from the response, then used to pick the default `--output` and export symbol. |
| `--domain <domain>` | yes | — | Maps to `?domain=<D>` on the API. The API param is `?domain=` (not `?domainId=` — the older spelling was retired on 2026-05-08). |
| `--output <path>` | no | `generated/<kebab(name)>.action-object.ts` | Where to write. Parent directory created if missing. |
| `--types-import <path>` | no | `./action-object.types` | Import specifier in the emitted file. Relative to the output file's directory. No file extension — relies on TS resolution. |
| `--template-version <v>` | no | `v2` | Currently only `v2` is implemented. (`v1` is superseded; see §13.5.) |
| `--timeout-ms <n>` | no | `8000` | Request timeout. |
| `--api-base <url>` | no | env `ONTOLOGY_API_BASE` | Override the API base URL. |
| `--quiet` | no | false | Suppress progress logs. Errors still go to stderr. |

### 9.3 Environment variables

| Var | Required | Notes |
|---|---|---|
| `ONTOLOGY_API_BASE` | yes (unless `--api-base`) | e.g. `http://localhost:3500` |
| `ONTOLOGY_API_TOKEN` | yes | Bearer token. Never written to emitted files or logs. |

The CLI reads `.env` automatically via `dotenv` (added as a dev dependency). Production usage: pass via real env, not files.

### 9.4 Exit codes

| Code | Meaning |
|---|---|
| 0 | Success; file written. |
| 1 | Any failure (auth, fetch, validate, project, emit, write). |
| 2 | CLI usage error (missing flags, mutually-exclusive flags). |

### 9.5 Name transformation algorithms

Two pure transformations are used in CLI defaults and emit. Both are deterministic, side-effect-free, and unicode-safe.

**Kebab-case** (used for default output filename):

```ts
// "matchResume"               → "match-resume"
// "syncFromClientSystem"      → "sync-from-client-system"
// "requirementReClarification"→ "requirement-re-clarification"
// "createJD"                  → "create-jd"
// "matchResume2"              → "match-resume2"
export function toKebab(name: string): string {
  return name
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")     // boundary at lower→Upper
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1-$2")  // boundary inside acronym runs
    .toLowerCase();
}
```

Verified against every name in `actions_v0_1_006.json` produces stable readable kebab forms.

**Camel-case for export name** (the symbol used in `export const <name>ActionObject`):

```ts
// "matchResume"            → "matchResumeActionObject"
// "createJD"               → "createJDActionObject" (acronyms preserved)
// "manualEntry"            → "manualEntryActionObject"
export function toExportName(name: string): string {
  return `${name}ActionObject`;
}
```

Action `name` is constrained by §6.4 to match `^[a-zA-Z][a-zA-Z0-9]*$`, so it is **already** a valid TS identifier. No transformation needed beyond appending the suffix.

If a future Action's `name` violates this constraint, `ActionValidationError` is thrown in fetch — codegen never silently re-shapes identifiers.

### 9.6 `gen-action-types.ts` behaviour

This auxiliary CLI script propagates the public type contract from the lib to the consumer-facing emit directory.

Behaviour:
1. Read `lib/ontology-gen/types.public.ts` from disk.
2. Prepend a banner:
   ```ts
   // AUTO-GENERATED by scripts/gen-action-types.ts at <ISO timestamp>
   // source: lib/ontology-gen/types.public.ts
   // DO NOT EDIT — regenerate via: npm run gen:ontology:types
   ```
3. Write the result to `--output` (default `generated/action-object.types.ts`), overwriting unconditionally.

It does **not** modify, filter, or transpile the type definitions. The lib's `types.public.ts` is authored such that it imports nothing (pure type declarations), so the file is portable as-is to the consumer side.

Flags: `--output <path>`, `--quiet`. No env vars required.

### 9.7 `package.json` additions

The two CLI commands and their dev dependencies. Replace existing `scripts` with the union; add `tsx` if not present.

```json
{
  "scripts": {
    "gen:ontology":       "node --env-file=.env.local --import tsx scripts/gen-action-snapshot.ts",
    "gen:ontology:types": "node --import tsx scripts/gen-action-types.ts"
  },
  "devDependencies": {
    "tsx": "^4.19.0"
  }
}
```

Notes:
- `--env-file` is built into Node ≥ 20.6. Project's `engines.node: ">=22"` (per `CLAUDE.md`) covers this. **No `dotenv` package is added** — relying on Node native is one fewer dep to track.
- `.env.local` is the recommended file for local secrets; do not commit it. Add `.env.local` to `.gitignore` if not already there.
- `gen:ontology:types` does not load env files (it touches no network).
- `tsx` is the only new dev dependency.

A `.env.example` should be committed at repo root:

```
# Copy to .env.local and fill in.
ONTOLOGY_API_BASE=http://localhost:3500
ONTOLOGY_API_TOKEN=
```

---

## 10. End-to-end example

### 10.1 Input — partial Action from API (per `actions_v0_1_006.json`)

```json
{
  "id": "10",
  "name": "matchResume",
  "description": "负责对处理完成的候选人简历进行智能匹配评估...",
  "submission_criteria": "1. RESUME_PROCESSED事件已送达\n2. 候选人(Candidate)记录已创建...",
  "object_type": "action",
  "category": "简历匹配",
  "actor": ["Agent"],
  "trigger": ["RESUME_PROCESSED"],
  "target_objects": ["Candidate", "Resume", "Job_Requisition", "..."],
  "triggered_event": ["MATCH_COMPLETED", "MATCH_FAILED_ALERT"],
  "side_effects": {
    "data_changes": [
      {
        "object_type": "Candidate_Match_Result",
        "action": "CREATE",
        "property_impacted": ["candidate_match_result_id", "candidate_id", "job_requisition_id", "match_score", "result"],
        "description": "为每个 (candidate, job_requisition) 组合写入一条匹配结果记录...",
        "step_ref_id": "emitResult"
      }
    ],
    "notifications": [
      {
        "recipient": "HSM",
        "channel": "Email",
        "condition": "候选人触发红线检测或在黑名单中",
        "message": "候选人 X 在岗位 Y 的匹配过程中被红线/黑名单拦截...",
        "triggered_event": "MATCH_FAILED_ALERT",
        "step_ref_id": "validateRedlineAndBlacklist"
      }
    ]
  },
  "inputs": [
    {
      "name": "candidate_id",
      "type": "String",
      "description": "待匹配的候选人唯一编号...",
      "source_object": "Candidate.candidate_id",
      "required": true
    },
    "..."
  ],
  "outputs": [
    {
      "name": "match_results",
      "type": "List<JSON>",
      "description": "候选人与各岗位的匹配结果列表..."
    },
    "..."
  ],
  "action_steps": [
    {
      "order": "1",
      "name": "validateRedlineAndBlacklist",
      "description": "执行红线检测和黑名单校验...",
      "object_type": "logic",
      "condition": "已收到简历处理完成事件，候选人记录已创建",
      "rules": [
        {
          "id": "10-16",
          "submission_criteria": "候选人有华腾或中软国际历史工作经历。",
          "description": "系统在简历匹配环节，自动检索候选人的历史任职记录..."
        },
        "..."
      ]
    },
    "..."
  ]
}
```

### 10.2 Output — emitted file

```ts
// AUTO-GENERATED by scripts/gen-action-snapshot.ts at 2026-05-08T12:00:00.000Z
// source: action=matchResume id=10 domain=RAAS-v1 template=v3
// DO NOT EDIT — regenerate via: npm run gen:ontology -- --action-name matchResume

import type { ActionObject } from "./action-object.types";

export const matchResumeActionObject: ActionObject = {
  id: "10",
  name: "matchResume",
  description: "负责对处理完成的候选人简历进行智能匹配评估...",
  submissionCriteria: "1. RESUME_PROCESSED事件已送达\n2. 候选人(Candidate)记录已创建...",
  category: "简历匹配",
  actor: ["Agent"],
  trigger: ["RESUME_PROCESSED"],
  targetObjects: ["Candidate", "Resume", "Job_Requisition", "..."],
  inputs: [
    {
      "description": "待匹配的候选人唯一编号...",
      "name": "candidate_id",
      "required": true,
      "sourceObject": "Candidate.candidate_id",
      "type": "String"
    }
    // ...
  ],
  outputs: [
    {
      "description": "候选人与各岗位的匹配结果列表...",
      "name": "match_results",
      "type": "List<JSON>"
    },
    {
      "description": "候选人整体匹配状态...",
      "name": "overall_status",
      "type": "String"
    }
  ],
  actionSteps: [
    {
      "condition": "已收到简历处理完成事件，候选人记录已创建",
      "description": "执行红线检测和黑名单校验...",
      "doneWhen": "validation_status 已设置且红线/黑名单命中已记录",
      "inputs": [/* step-level inputs… */],
      "name": "validateRedlineAndBlacklist",
      "objectType": "logic",
      "order": 1,
      "outputs": [/* step-level outputs… */],
      "rules": [
        {
          "description": "系统在简历匹配环节，自动检索候选人的历史任职记录...",
          "id": "10-16",
          "severity": "blocker",
          "submissionCriteria": "候选人有华腾或中软国际历史工作经历。"
        }
        // ...
      ]
    }
    // ...
  ],
  sideEffects: {
    "dataChanges": [
      {
        "action": "CREATE",
        "description": "为每个 (candidate, job_requisition) 组合写入一条匹配结果记录...",
        "objectType": "Candidate_Match_Result",
        "propertyImpacted": ["candidate_match_result_id", "candidate_id", "job_requisition_id", "match_score", "result"],
        "stepRefId": "emitResult"
      }
    ],
    "notifications": [
      {
        "channel": "Email",
        "condition": "候选人触发红线检测或在黑名单中",
        "message": "候选人 X 在岗位 Y 的匹配过程中被红线/黑名单拦截...",
        "recipient": "HSM",
        "stepRefId": "validateRedlineAndBlacklist",
        "triggeredEvent": "MATCH_FAILED_ALERT"
      }
    ]
  },
  triggeredEvents: ["MATCH_COMPLETED", "MATCH_FAILED_ALERT"],

  prompt: `## Action specification: matchResume

The block below is the formal specification of the action \`matchResume\`. It is part of a larger user message; the runtime supplies inputs and additional context separately. Treat this block as a binding contract: do not deviate from the declared steps, do not write outside the declared targets, and do not return outputs outside the declared schema. If preconditions are unmet or required inputs are missing, follow Error policy.

- Category: 简历匹配
- Actor:    Agent
- Trigger:  RESUME_PROCESSED

## Purpose
负责对处理完成的候选人简历进行智能匹配评估...

## Preconditions
1. RESUME_PROCESSED事件已送达
2. 候选人(Candidate)记录已创建...

## Inputs
The runtime provides these as a JSON object on the inbound payload; field names match exactly. Validate before proceeding; if a required field is missing, follow Error policy.

- candidate_id (String, required) ← Candidate.candidate_id: 待匹配的候选人唯一编号...
- resume_id (String, required) ← Resume.resume_id: 待匹配的候选人简历唯一编号...
- job_requisition_ids (List<String>, required) ← Job_Requisition.job_requisition_id: 候选人待匹配的招聘岗位编号列表...

## Steps
1. validateRedlineAndBlacklist [logic]
   precondition: 已收到简历处理完成事件，候选人记录已创建
   description:  执行红线检测和黑名单校验...
   notifies:
   - HSM via Email when 候选人触发红线检测或在黑名单中 (event: MATCH_FAILED_ALERT)
   rules:
   - (10-16 / blocker / Agent / 通用) 通用黑名单检验规则-被动释放人员
        when: 候选人有华腾或中软国际历史工作经历。
        do:   系统在简历匹配环节...
   - (10-17 / advisory / Agent / 通用) 通用黑名单检验规则-高风险回流人员
        when: 候选人有华腾或中软国际历史工作经历。
        do:   ...
   done when:    validation_status 已设置且红线/黑名单命中已记录

2. ...

3. emitResult [data]
   description:  写入 Candidate_Match_Result。
   writes:
   - Candidate_Match_Result: CREATE {candidate_match_result_id, candidate_id, job_requisition_id, match_score, result}
   done when:    每个 (candidate, job_requisition) 组合都写入了一条结果记录

## Output
Return a JSON object matching this schema. The fields below are required; do not include extra keys.

- match_results (List<JSON>): 候选人与各岗位的匹配结果列表...
- overall_status (String): 候选人整体匹配状态...

\`\`\`json
{
  "match_results": ["<JSON>", "..."],
  "overall_status": "<String>"
}
\`\`\`

## Side-effect boundary

### writes
- Candidate_Match_Result / CREATE
   fields: candidate_match_result_id, candidate_id, job_requisition_id, match_score, result
   note:   为每个 (candidate, job_requisition) 组合写入一条匹配结果记录...

### reads
Candidate, Resume, Job_Requisition, Job_Requisition_Specification, Application, Blacklist, Client, Client_Department, Salary_Scheme, Candidate_Expectation

### notifies
- HSM / Email
   when:  候选人触发红线检测或在黑名单中
   event: MATCH_FAILED_ALERT

### emits
- MATCH_COMPLETED
- MATCH_FAILED_ALERT

Anything outside the above is out of scope; refuse and surface via Error policy.

## Error policy
- Missing or invalid required input → return {"status":"failed","reason":"<which field>","retry":false}; do not partially execute.
- Upstream resource unreachable or auth failure → return {"status":"failed","reason":"<...>","retry":true}.
- Blocker-severity rule violation → halt the offending step, surface failure, do not proceed to dependent steps.
- When any condition listed in a step's "notifies:" line is met, emit the corresponding event with details. Alert events: MATCH_FAILED_ALERT.

## Completion criteria
The action is complete when ALL of:

1. Each step has run to its declared termination, or its failure has been surfaced per Error policy.
2. The Output JSON contains all required keys (match_results, overall_status) and conforms to the schema in Output.
3. Any required outbound event has been emitted (success events on success; alert events on failure).

## Rule index

### step 1 — validateRedlineAndBlacklist
- (10-16 / blocker / Agent / 通用) 通用黑名单检验规则-被动释放人员
- (10-17 / advisory / Agent / 通用) 通用黑名单检验规则-高风险回流人员

### step 3 — emitResult
- ...

## Before returning
Verify all of the following before responding:

- Output JSON conforms to the Output schema (no extra or missing keys).
- No write occurred outside Side-effect boundary.
- Every required notification or outbound event has been emitted.
- All blocker-severity rules were respected — no violation went unhandled.`,

  sections: {
    "actionSpec":         "## Action specification: matchResume\n...",
    "beforeReturning":    "## Before returning\nVerify all of the following...",
    "completionCriteria": "## Completion criteria\nThe action is complete when ALL of:\n...",
    "errorPolicy":        "## Error policy\n- Missing or invalid required input → ...",
    "inputsSpec":         "## Inputs\nThe runtime provides these as a JSON object...\n- candidate_id ...",
    "output":             "## Output\nReturn a JSON object matching this schema...",
    "preconditions":      "## Preconditions\n1. RESUME_PROCESSED事件已送达\n...",
    "purpose":            "## Purpose\n负责对处理完成的候选人简历进行智能匹配评估...",
    "ruleIndex":          "## Rule index\n\n### step 1 — validateRedlineAndBlacklist\n- (10-16 / blocker / Agent / 通用) ...\n...",
    "sideEffectBoundary": "## Side-effect boundary\n\n### writes\n- Candidate_Match_Result / CREATE\n   fields: candidate_match_result_id, ...\n...",
    "steps":              "## Steps\n1. validateRedlineAndBlacklist [logic]\n   precondition: ..."
  },

  meta: {
    "actionId": "10",
    "actionName": "matchResume",
    "compiledAt": "2026-05-08T12:00:00.000Z",
    "domain": "RAAS-v1",
    "templateVersion": "v3"
  }
};
```

Note the alphabetical key ordering inside `inputs[i]`, `actionSteps[i]`, `sideEffects.dataChanges[i]`, `sections`, `meta` etc. — this is the stable-JSON output. Top-level `ActionObject` keys preserve declaration order via the hand-rolled emitter.

> **For canonical v3 prompt rendering, see `__fixtures__/actions/matchResume.expected.ts`** in the repo. The excerpt above shows enough of the structure to be illustrative; the live fixture is the byte-exact reference.

---

## 11. Verification

This module ships without a unit-test framework — the host project has none (`CLAUDE.md`: "There is no test suite configured"). Verification relies on **golden snapshots** committed to the repo and human-reviewable diffs.

### 11.1 Golden fixtures

A `__fixtures__/` directory at repo root holds curated reference data:

```
__fixtures__/
├── actions/
│   ├── matchResume.input.json          # subset of API response, hand-curated
│   ├── matchResume.expected.ts         # the byte-exact expected emit output
│   ├── manualEntry.input.json          # an Action with empty action_steps
│   ├── manualEntry.expected.ts
│   ├── createJD.input.json             # acronym in name + non-Agent actor
│   ├── createJD.expected.ts
│   ├── jdReview.input.json             # human-actor; minimal data
│   └── jdReview.expected.ts
└── README.md                            # how to refresh fixtures
```

The four fixtures cover orthogonal axes:
- `matchResume` — primary happy path, all sections populated, includes `side_effects` with both `data_changes` and `notifications`.
- `manualEntry` — minimal Action, multiple sections null (`purpose`, `preconditions`, `ruleIndex` all absent); the four always-present sections still render with their baseline content.
- `createJD` — acronym in name; tests `toKebab` and `toExportName`.
- `jdReview` — human actor, sparse rules; ensures the renderer doesn't depend on `actor === ["Agent"]`.

Each fixture's `*.expected.ts` file is in v2 form. v1 fixtures from earlier drafts are not retained — `v1` is superseded (§13.5).

### 11.2 Verification script

`scripts/verify-snapshots.ts` is provided alongside the codegen. It:

1. Reads each `*.input.json`.
2. Runs the full pipeline (`fetchAction` is replaced by `parseAction(json)` for fixtures — unit-of-purity gain).
3. Compares the emit output to `*.expected.ts` byte-for-byte (modulo `meta.compiledAt`, which is normalised to a fixed sentinel `1970-01-01T00:00:00.000Z`).
4. Exits 0 if all match, 1 with diffs if any mismatch.

Wired as `npm run verify:ontology`.

### 11.3 Fixture refresh workflow

When an intentional change to the rendering rules lands:

1. Run `npm run verify:ontology` — observe the diffs.
2. Manually inspect each diff. Reject if any diff is a regression (unrelated section changed, whitespace drift, etc.).
3. Run `npm run verify:ontology -- --update` to overwrite the `*.expected.ts` files with the new outputs.
4. Commit the fixture updates in the same PR as the rule change. Reviewer sees both the renderer diff and the snapshot diff.

### 11.4 Smoke test (live API)

A separate, optional script `scripts/smoke-ontology.ts`:
1. Reads `ONTOLOGY_API_BASE` / `ONTOLOGY_API_TOKEN` from env.
2. Generates snapshots for all 22 known Actions (loops over the names listed in `__fixtures__/known-actions.json`).
3. Writes outputs to a tmp directory; does not commit.
4. Reports any fetch / validate failure; does not diff against fixtures.

Used to detect upstream contract drift between `actions_v0_1_006.json` (committed reference) and the live API.

Wired as `npm run smoke:ontology`. Not part of CI by default — run manually before significant releases or after Ontology API changes.

### 11.5 Runtime resolution mode

In addition to the offline CLI path (§9), the library exposes a runtime resolver for agent processes that need an `ActionObject` produced **on demand**, scoped to a specific tenant, without writing to disk.

```ts
import { resolveActionObject } from "@/lib/ontology-gen";

const obj = await resolveActionObject({
  actionRef: "matchResume",       // name or numeric id
  domain: "RAAS-v1",
  client: "腾讯",                  // optional rule scope
  clientDepartment: undefined,    // reserved; no-op until upstream API ships
  // apiBase / apiToken / timeoutMs default to env / fetchAction defaults
});
// obj.prompt → markdown for the LLM
// obj.meta.compiledAt → real time (not frozen)
// obj.meta.templateVersion === "v3"
```

Pipeline:
```
fetchAction(opts) → projectActionObject(action, { templateVersion: "v3", domain, clientFilter? }) → ActionObject
```

Single API call (`GET /actions/{ref}/rules?domain=…`) — no multi-API enrichment, no caching. The resolver is a thin orchestrator over `fetchAction` (§4) and `projectActionObject` (§7); identical projection rules apply.

**Shape contract**: the returned `ActionObject` is byte-for-byte the same shape as a `generated/*.action-object.ts` snapshot, modulo:
- `meta.compiledAt` — real time at fetch, not the frozen sentinel used in CLI offline output.
- `actionSteps[*].rules` — filtered when `clientFilter` is supplied (see §6.3 semantics).

No new fields on `meta`; no `warnings` slot. Errors propagate as-is — typed `OntologyGenError` subclasses (`OntologyAuthError` / `OntologyNotFoundError` / `OntologyTimeoutError` / `OntologyContractError` / `ActionValidationError`). Caller decides retry/log strategy.

**Preview page** (`app/dev/action-preview/`): a non-invasive dev tool that exposes the resolver via a Server Component + Server Action form. URL-only access (not in LeftNav); the bearer token never leaves the server. See `app/dev/action-preview/page.tsx` and `Form.tsx`. The preview is a demonstration vehicle, not a product page.

---

## 12. Consumer usage (LLM Agent runtime)

There are two consumption modes; both produce the same `ActionObject` shape and both feed the LLM via `obj.prompt`.

**Mode A — runtime resolver (preferred for agent processes).** Per-call fetch + projection, scoped by `(client, clientDepartment?)`. No file IO, no precomputation:
```ts
import { resolveActionObject } from "@/lib/ontology-gen";

const obj = await resolveActionObject({
  actionRef: "matchResume",
  domain: "RAAS-v1",
  client: "腾讯",
});
const userMessage = agentRuntimePrelude + "\n\n" + obj.prompt + "\n\n" + dynamicContext;
```
See §11.5 for semantics.

**Mode B — frozen snapshot import (CI / offline review).** The CLI emits `generated/*.action-object.ts`; consumers import the frozen object:

```ts
import { matchResumeActionObject } from "./generated/match-resume.action-object";

// runtime composes its user message from multiple fragments
const userMessage =
  agentRuntimePrelude +              // runtime-side context, not in scope here
  "\n\n" +
  matchResumeActionObject.prompt +   // the codegen output — the contract of this spec
  "\n\n" +
  formatPayload({ resume, jobRequisition });

const response = await llm.complete({
  messages: [{ role: "user", content: userMessage }],
});
```

For consumers that need to recompose, use `sections` directly:

```ts
// e.g. swap in a custom output format
const customised =
  [
    matchResumeActionObject.sections.actionSpec,
    matchResumeActionObject.sections.purpose,
    matchResumeActionObject.sections.steps,
    customXmlOutputFormatSection,
    matchResumeActionObject.sections.errorPolicy,
    matchResumeActionObject.sections.completionCriteria,
    matchResumeActionObject.sections.beforeReturning,
  ]
    .filter((s): s is string => s !== null)
    .join("\n\n");
```

For runtime introspection (e.g. validating that the agent provides all required inputs):

```ts
for (const input of matchResumeActionObject.inputs) {
  if (input.required && !payload[input.name]) {
    throw new Error(`Missing required input: ${input.name}`);
  }
}
```

---

## 13. ABI policy (compatibility contract)

The emitted `ActionObject` shape is the public ABI between this codegen and the consumer runtime. The contract:

### 13.1 Add-only

New fields on `ActionObject`, on its nested types (`ActionInput`, `ActionStep`, `ActionRule`, ...), and on `sections` may be added in any release. Existing consumer code continues to work because it ignores unknown fields.

### 13.2 No removal

Fields are never removed. If a field is no longer populated upstream, it is still emitted with a sentinel default (`""`, `[]`, or `null` per the type) so the consumer's destructuring does not break.

### 13.3 No type narrowing

Field types are never narrowed in a way that would invalidate previously valid values. Widening (e.g. a string union gaining a member) is allowed.

### 13.4 `prompt` is opaque

The text content of `prompt` may change between `templateVersion` revisions. The string format (encoding, line endings, presence of section headers) is **not** part of the ABI. Consumers that depend on the prompt being parsable in a specific way must either (a) use `sections` instead, or (b) pin to a specific `templateVersion` and treat upgrades as breaking.

### 13.5 `meta.templateVersion` advances on prompt-format change

Any change to the rendering rules in `compile/sections.ts` that produces a different `prompt` text for unchanged input data triggers a `templateVersion` bump. Pure bug fixes that affect no real input keep the current version. Reasoning: consumers that care about reproducibility can detect the bump in `meta` and decide whether to regenerate.

**v1 → v2 supersession.** `v1` introduced the seven-section layout (`role`, `description`, `submissionCriteria`, `inputsSpec`, `steps`, `outputFormat`, `sideEffects`). `v2` redesigned the prompt as a binding-contract action specification with eleven sections (see §7.1) and extended the structured ActionObject with `sideEffects` and `triggeredEvents`, plus per-step `inputs` / `outputs` / `doneWhen` and per-rule `severity`.

**v2 → v3 supersession (this revision).** `v2` rendered:
- step rules as a single line `(<id>, <severity>) when ...: <description>`
- side-effect boundary as 4 short `MAY ...` lines summarising the scope
- rule index as a flat list sorted by `rule.id`
- step header as `<order>. <name>`

`v3` rerenders the same data with materially higher self-containment:
- step rules become 3-row blocks: `(<id> / <severity>[ / <executor>][ / <applicableClient>])[ <businessLogicRuleName>]` + `when:` + `do:`
- side-effect boundary becomes 4 sub-blocks (`### writes` with verb + `propertyImpacted` + `note:`, `### reads`, `### notifies` with per-entry `when:` + `event:`, `### emits`)
- rule index groups by step (one `### step <order> — <name>` sub-section per step), sorting rules by `id` within each
- step header gains `[<objectType>]` tag

The 11 section keys are unchanged; the 4-always-present count is unchanged. **No type-contract changes** — `ActionRule.businessLogicRuleName` / `executor` / `applicableClient` / `standardizedLogicRule` and `ActionStep.objectType` were already declared in v2 (just not surfaced by the renderer). **`v2` is no longer implemented**; the codegen emits `v3` exclusively. No consumer had pinned to `v2` at the time of supersession, so no migration shim is provided.

### 13.6 Section ordering and naming

The v3 section keys (`actionSpec`, `purpose`, `preconditions`, `inputsSpec`, `steps`, `output`, `sideEffectBoundary`, `errorPolicy`, `completionCriteria`, `ruleIndex`, `beforeReturning`) are stable within `v3` — same 11 keys as `v2`, no rename, no add, no remove. Adding a new section is allowed within `v3` (gets appended after `beforeReturning`). Removing or renaming requires a further `templateVersion` bump (`v3` → `v4`).

---

## 14. Multi-Action evolution

### 14.1 What "multi-Action" means here

One TS object per Action. The codegen produces one file per `npm run gen:ontology` invocation. "Multi-Action" means **the same pipeline accepts any of the 22 (or future N) Actions without code changes** — not that one invocation produces multiple outputs.

### 14.2 Adding a new Action (Action #23)

1. Ontology team creates the Action node in Neo4j (with `action_steps[].rules[]` etc.)
2. Run `npm run gen:ontology -- --action-name <newName> --domain <D>`
3. Commit the resulting `generated/<new-name>.action-object.ts`

No code changes required if the new Action conforms to the schema in `actions_v0_1_006.json`.

### 14.3 When code changes might be required

A new Action may legitimately need custom behaviour:

| Need | Code change | Required when |
|---|---|---|
| Section text differs (e.g. `outputFormat` rendered as JSON schema instead of typed list) | Add per-Action override in a new `lib/ontology-gen/actions/<name>.ts` registry | Generic renderer no longer fits |
| Extra section needed | Add a new section + renderer; bump `templateVersion` | New semantic dimension |
| Different fetch path | Extend `fetch.ts` dispatch | New endpoint type |
| Multi-source enrichment (e.g. attach Event triggers, DataObject schemas, related Workflow context) | Implement an enricher in `fetch.ts` (see §4.5) | A future Action's prompt benefits from cross-resource context |

The current 22 Actions need none of these. The registry is **not** built in the current scope.

### 14.4 What's reserved for future template versions

- Per-Action template overrides (registry pattern, see §14.3 row 1)
- Batch invocation (`npm run gen:ontology --all` or `--from-file <list>`)
- Local cache of API responses to speed up batch
- React preview page hooked into the same library
- LLM-assisted prompt drafting (with human approval gate, never auto-emit)
- Multi-source enrichment (DataObject schemas, Event payloads) per §4.5

---

## 15. Determinism contract

The emitter must produce byte-identical output for unchanged input. Concretely:

- **Object key ordering**: alphabetical via `stableJson` for everything except top-level `ActionObject` (declaration order via hand-rolled emitter).
- **Array ordering**: explicit per source — `actionSteps` by `order`, rules by `id`, others by API-given order (assumed stable, see §15.1).
- **`undefined` skipped**: `stableJson` drops `undefined` values rather than serialising them inconsistently across Node versions.
- **No timestamps in `prompt` or `sections`**: only `meta.compiledAt`.
- **No randomness**: no `Math.random`, no UUIDs in any field.
- **No environment leakage**: no `process.env`, no `os.hostname` baked into output.

### 15.1 Known non-determinism source

`meta.compiledAt` advances with every regeneration even when nothing else changes. Consumer convention should ignore `meta.compiledAt` in `git diff` review. Consider adding a `.gitattributes` rule or a custom diff filter if this becomes noisy in practice.

API-side ordering of `inputs[]`, `outputs[]`, `targetObjects[]`, `actor[]`, `trigger[]` is assumed stable. If empirical observation shows non-determinism (e.g. Neo4j returns array elements in different orders across calls), `validate.ts` will be extended to sort these arrays defensively. Not done in the current scope — adds complexity for a not-yet-observed failure mode.

---

## 16. Out of scope (explicit)

- **Workflow CRUD.** Not relevant to this codegen.
- **Event / DataObject / Rule snapshot generation.** This codegen handles only Actions.
- **Multi-source enrichment** (DataObject schemas, related Events, etc.). See §4.5 for the architectural seam; not implemented in the current scope.
- **Schema endpoint integration.** We do not introspect available fields; we trust + assert.
- **Cross-domain Action queries.** Domain is mandatory and per-call.
- **Auth scopes.** API has one shared token; we use it as-is.
- **Prompt translation (locale).** `CompileOptions.locale` is reserved but ignored. The codegen emits whatever language the API stores (mostly Chinese in current data); section headers stay English. The mixed-language output is intentional — it gives an LLM both a structural cue (English headers it has seen in countless training prompts) and the domain-specific body (the Chinese the Action authors wrote).
- **Custom prompt styles per consumer.** One renderer set, one output. Consumers needing different styling re-render from `sections`.
- **Live re-fetch on file system change.** No watch mode.
- **Concurrent CLI invocations** writing to the same `outputPath`. `fs.writeFile` is not atomic against concurrent writers; running two `npm run gen:ontology` jobs targeting the same file simultaneously is undefined behaviour. Workflow is single-writer per file.
- ~~**JSON-stringified property auto-inflation.**~~ **Now implemented** (was deferred in earlier draft). The live Ontology API at `localhost:3500` exhibits the API doc's "flatten rule": Action node properties are stored as JSON-encoded strings under `<key>_json` aliases (`actor_json`, `inputs_json`, `outputs_json`, `target_objects_json`, `trigger_json`, `triggered_event_json`, `side_effects_json`). Empirically verified 2026-05-08 against the running API; the composite endpoint inflates `action_steps` (graph traversal) but **not** the Action's own property-bag fields. `fetch.ts` runs an `inflateJsonFields` pre-pass over the raw response (and over each `action_step`'s nested `inputs_json` / `outputs_json`) to rehydrate these into their structured form before whitelist filtering. Behaviour: prefer the non-suffixed key when both are present (canonical when populated); JSON.parse the `*_json` string when only the suffixed form is present; pass through directly when the suffixed value is already non-string. Idempotent against `actions_v0_1_006.json`-style inputs that have no `_json` suffixes.
- **`## Tools available` section is deliberately absent.** Runtime tool definitions are owned by the LLM Agent runtime, not by this fragment. An empty placeholder section would create a contract the codegen cannot honor (it has no insight into what tools the runtime exposes). If a future need arises to declare tool *expectations* in the Action ontology itself, that is an upstream + new section design — not a placeholder we include preemptively.

### 16.1 Generated files commit policy

The `generated/` directory **is committed** to the repo. Do **not** add it to `.gitignore`. Reviewers see codegen output as PR diffs (per §13 ABI policy), and reproducible generation is verified via `npm run verify:ontology` (§11). If a future automation reason demands gitignoring, that is a separate decision requiring a §13 amendment.

---

## 17. Open contracts (to validate at impl time)

1. **~~Generic `/actions/{id}` returns nested `action_steps`~~** — **resolved**. The 2026-05-08 API revision documents `GET /actions/{ref}/rules` as the path-segment endpoint that returns the full Action + `action_steps[].rules[]` tree for any Action. The codegen calls this endpoint exclusively (see §4.1, §4.4); the bare `GET /actions/{ref}` is no longer used.
2. **API returns `inputs[]` and `outputs[]` for all 22 Actions in `actions_v0_1_006.json` style** — confirmed via reference file. Will also be empirically verified at impl by `curl`-ing `/actions/{ref}/rules` for a sample.
3. **`actionSteps[].order` is always coercible to integer** — assumed; first 5 Actions in reference data confirm. Will be invariant-checked. Note the API-side `coalesce(s.order, s.index, "0")` fallback (per upstream changelog) means `order` is **always present** in the response, even if the original property used a different name — but the value may be the string `"0"` for steps that lacked any ordering hint. Validate accordingly.
4. **`applicableClient` on Rules** — present on the live API (observed values include `"通用"`, `"腾讯"`, `"字节"` on matchResume rules at 2026-05-08). Surfaced in v3 rule metadata and consumed by the runtime resolver's `clientFilter` (§6.3, §11.5). `applicableClientDepartment` is **not yet** present upstream; the filter slot is wired but a no-op until it ships.
5. **API response array ordering is stable across calls** — assumed. If proven false in practice, defensive sort added in `validate.ts`.
6. **`side_effects.{data_changes,notifications}` are returned by `/actions/{ref}/rules`** — confirmed in `actions_v0_1_006.json`. Since the API is property-bag (returns whatever is on the `(:Action)` node), this is reliable; will be empirically verified at impl.
7. **`step_ref_id` on `data_changes` / `notifications` entries** — **not yet present in upstream data**. Until upstream supplies it, the codegen renders these entries only at the Action level (`## Side-effect boundary`); per-step `writes:` / `notifies:` blocks remain empty. Strongly recommend upstream add `step_ref_id` (matching `ActionStep.name` or stringified `order`) so step-level attribution becomes possible without heuristics.
8. **`severity` field on Rule** — **not yet present in upstream data**. Codegen defaults to `"advisory"` per §6.1. The v3 renderer surfaces `severity` in the rule's metadata tag (e.g. `(10-17 / advisory / Agent / 通用)`); once upstream supplies non-`advisory` values they will appear automatically and `## Error policy` will gain a blocker-rule line.
9. **`done_when` on `ActionStep`** — **not yet present in upstream data**. When present, the renderer emits a `done when:` line per step. Without it, LLM agents have to infer step termination from prose, which is the primary failure mode this field is meant to close.
10. **Action top-level `triggered_event` is an array, not a singular** — confirmed in `actions_v0_1_006.json` for the first Action; assume holds elsewhere. Schema-validated at fetch time.
11. **Synthesized step ids (`${actionId}::${stepName}`)** — when an `(:ActionStep)` node lacks an explicit `id` property, the API synthesizes one of the form `${actionId}::${stepName}`. The codegen does not consume `step.id` (only `step.order` and `step.name`), so this is **informational only**. If a future revision starts using `step.id` (e.g. for cross-references), be aware that some ids are server-synthesized and may change if the step is renamed upstream.

---

## 18. Implementation roadmap (rough)

This is a sketch, not a binding plan; concrete sequencing belongs to whoever implements. Step 0 closes the open contracts in §17 before code lands.

0. **Validate open contracts** (§17). `curl` `/api/v1/ontology/actions/matchResume/rules?domain=RAAS-v1` (and the same endpoint with `--action-id 10` form) against a running API; confirm nested `action_steps[].rules[]` and `side_effects.*[]` are present, and observe the three derived fields (`rules`, `ruleCount`, `userPrompt`) so the §6.5 drop list aligns with what the server actually emits. Confirm array element ordering is stable across two consecutive calls. Note any §17 items 7–9 (`step_ref_id`, `severity`, `done_when`) that are absent — they are **not blockers** for implementation (renderers degrade gracefully), but they should be opened as upstream tickets.
1. Scaffold `lib/ontology-gen/types.public.ts` (§6.1, §6.2) and `types.internal.ts` (§3, §6.3, §4.2.1). The public file imports nothing. Include all v2 types: `ActionSideEffects`, `ActionDataChange`, `ActionNotification`, `ActionStepInput`, `ActionStepOutput`, plus `severity` / `inputs` / `outputs` / `doneWhen` / `triggeredEvents` / `sideEffects` field additions.
2. Implement `errors.ts` (§4.2.1) and `client.ts` (HTTP fetch + auth + error mapping per §4.2).
3. Implement `fetch.ts` and `validate.ts` (stage ①, §6.4 invariants, §6.5 whitelist mapping including the v2 additions, §4.3 default-fill rules including `severity = "advisory"`).
4. Implement `compile/sections.ts` (the 11 renderers per §7.5) and `compile/index.ts` (`projectActionObject` calling `assemblePrompt` per §7.2 with the v2 ordering).
5. Implement `compile/stable-json.ts` (§8.4) and `emit.ts` (§8.2, §8.3, §8.5).
6. Wire `index.ts` orchestrator; expose `generateActionSnapshot`, `fetchAction`, `projectActionObject`, `emitActionObjectModule`.
7. Implement `scripts/gen-action-snapshot.ts` (§9 surface) and `scripts/gen-action-types.ts` (§9.6).
8. Add `package.json` scripts and the single `tsx` dev dependency (§9.7). Commit `.env.example`.
9. Author `__fixtures__/` golden files (§11.1) — at minimum the four named fixtures, each in v2 form. Implement `scripts/verify-snapshots.ts` (§11.2). Wire `npm run verify:ontology`.
10. End-to-end smoke against a running Ontology API: `npm run gen:ontology -- --action-name matchResume --domain <D>`. Diff the output against `__fixtures__/actions/matchResume.expected.ts`. Iterate renderers until the diff is acceptable; refresh fixtures (§11.3) and commit. Pay special attention to: Side-effect boundary correctness, Error policy data-driven rows, and Rule index sorting.
11. Generate snapshots for the other 21 Actions in `actions_v0_1_006.json`; spot-check at least 5 manually for prose quality, and verify the Side-effect boundary covers all `target_objects`. Commit all 22 generated files.
12. Implement `scripts/smoke-ontology.ts` (§11.4) for ongoing upstream-drift detection. Optional but recommended.
13. **Follow-up upstream tickets** (in parallel, not blocking): request `Rule.severity`, `ActionStep.done_when`, and `step_ref_id` on side-effect entries. As each lands, refresh fixtures and re-emit — no template version bump unless the rendering rules themselves change.

---

## 19. References

- API guide: `ONTOLOGY-API-USER-GUIDE-BASED-ON-NEO4J.md`
- Reference data: `actions_v0_1_006.json` (22 Actions, full shape)
- Project conventions: `CLAUDE.md`
