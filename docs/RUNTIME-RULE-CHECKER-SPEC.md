# Runtime Rule Checker — Design SPEC

**Status**: MVP shipped as `simple-rule-check`; full `rule-check` impl pending
**Date**: 2026-05-12
**Scope**: matchResume rule evaluation (architecturally extensible to other actions)
**Related docs**: `docs/GENERATE-PROMPT-USER-GUIDE.md`, `ONTOLOGY-API-USER-GUIDE-BASED-ON-NEO4J.md`

## Module naming (locked)

| Phase | Module path | npm scripts | Dev UI | Status |
|---|---|---|---|---|
| **MVP (current)** | `lib/simple-rule-check/` | `simple-rule-check`, `simple-rule-check:seed`, `simple-rule-check:seed:check` | `/dev/simple-rule-check` | **Shipped, frozen** |
| **Full impl (future)** | `lib/rule-check/` (empty placeholder) | `rule-check`, `rule-check:seed*` | `/rule-check/*` | Not started |

The MVP is intentionally preserved as a separate module. Full impl is a **new module**, not a rewrite of the MVP — the MVP stays as the simple baseline so we can A/B against the full implementation.

### Critical coupling: `rule-check` consumes `generatePrompt` (locked)

For the full `rule-check` impl, the prompt fed to the LLM **must be derived from `generatePrompt`'s output** — not constructed by `rule-check` from scratch (as the MVP does via `extractor.ts`). This makes the two modules a single auditable chain:

```
generatePrompt(actionRef, client, dept?)  →  ActionObjectV4 (rules + schema + exec constraints)
                                              ↓ consumed by
                                          rule-check  →  evaluates against real Neo4j data
                                                          + deterministic validation
                                                          + audit-rich output schema
```

Rationale: `generatePrompt` is already the **canonical source** of "what should the LLM see". If `rule-check` builds its own prompt independently, the two systems drift: a rule change that ships through `generatePrompt` won't be reflected in `rule-check`'s evaluation until someone manually syncs. By forcing `rule-check` to consume `generatePrompt`'s output verbatim (with a focusing system message bolted on top), we get:

1. **No double bookkeeping** of rule text / schema / execution constraints.
2. **Single auditability surface** — the same prompt the operator sees in `/dev/generate-prompt` is exactly the prompt the Checker fed to the LLM (modulo the runtime input layer).
3. **Free downstream rule updates** — any change to rules in the ontology repo flows through `generatePrompt` and then into `rule-check` without a code change.

`simple-rule-check` (MVP) does **not** need this coupling — it stays on the extractor strategy as the simple baseline.

---

## 1. Context

`generatePrompt` produces a static prompt artifact for matchResume — rules + schema + execution constraints — but does not execute anything. It does not fetch runtime data, does not call an LLM, and does not produce decisions.

Kenny's question — **"how do you prove the result is correct?"** — demands more:

1. Real runtime data fetched from Neo4j as the **single source of truth** (not synthesized in the prompt)
2. LLM-driven rule evaluation **against that real data**
3. **Deterministic verification** that the LLM's output is grounded (no hallucinated evidence, no fabricated rule IDs)
4. Persistent **audit trail** enabling post-hoc Q&A
5. Demonstrable handling of both **positive** (should block → blocks) and **negative** (shouldn't block → doesn't) cases

This SPEC defines a new **Runtime Rule Checker** module that addresses these gaps. It sits downstream of `generatePrompt` in the matchResume business flow:

- Consumes rule definitions + scope
- Fetches required runtime evidence from the Ontology API
- Calls LLM to produce per-rule judgments
- Runs deterministic post-validation to catch LLM hallucination
- Persists a complete audit record
- Returns a structured decision the matchResume agent can route on

### The Ontology API is the inferencing capability source

Critically, the Ontology API (`/api/v1/ontology/*`, port 3500, Neo4j-backed) is not merely a database — it's the **inferencing substrate** the Checker is built on. Every dimension of rule evaluation pulls from a distinct API capability:

| Checker need | Ontology API capability |
|---|---|
| Fetch action's rules (with client-scoped filtering) | `GET /api/v1/ontology/actions/{ref}/rules?domain=...` |
| Read schema for instance / evidence validation | `GET /api/v1/ontology/schema/objects?domain=...` |
| Fetch single instance (Candidate, Job_Requisition) | `GET /api/v1/ontology/instances/{label}/{pk}?domain=...` |
| List instances with filter (Application, Blacklist) | `GET /api/v1/ontology/instances/{label}?domain=...&<filter>` |
| Seed test data | `POST /api/v1/ontology/instances/{label}` (bulk upsert supported, **seed script only** — not the Checker itself) |
| Future: rule classification metadata | extension to Rule node properties (v1.1) — **read-only**, owned by the ontology repo |

The Checker is therefore **deeply coupled to the Ontology API**, but the coupling is via stable HTTP contracts (per [ONTOLOGY-API-USER-GUIDE-BASED-ON-NEO4J.md](../ONTOLOGY-API-USER-GUIDE-BASED-ON-NEO4J.md)). All HTTP traffic goes through `lib/ontology-gen/client.ts` (already shipped). The Checker never talks bolt:// Neo4j directly.

### Test data must be initialized before MVP can run

The graph database does **not** currently contain the candidates, jobs, application history, or blacklist records the MVP demos against. A one-time **seed script** (`scripts/simple-rule-check-seed.ts`) initializes `RAAS-v1` domain via the Ontology API. The seed is idempotent (upsert-by-PK), and verification probes confirm presence before any rule check runs. The domain isolation (`RAAS-v1` vs production `RAAS-v1`) is essential — seed never touches prod.

**MVP** focuses on a tight closed loop — 5 rules spanning all instance-fetch shapes (single-field, nested, cross-object via Application) — with both positive and negative test cases — to prove correctness end-to-end. **Full implementation** scales to all matchResume rules, adds batch + composite confidence, and ships a commercial-grade product UI.

---

## 2. Goals + Non-goals

### Goals

| | |
|---|---|
| **Auditable** | Every check produces a complete trace: input + fetched evidence + prompt + LLM response + validation + final decision |
| **Hallucination-resistant** | Step-9 deterministic validation catches non-existent rule IDs, ungrounded evidence, schema violations |
| **Decoupled from generatePrompt's text format** | Checker pulls rules from the Ontology API directly via `fetchAction`; does NOT parse generatePrompt's prompt string |
| **Scales without refactor** | MVP single-rule architecture extends to batch evaluation via reserved interface; storage / confidence / prompt-strategy are pluggable from day one |
| **Reusable for Q&A** | Saved runs support post-hoc "why was C002 blocked" queries (full impl) |
| **Demonstrable** | CLI for engineers + dev UI for MVP; full-impl ships a polished product UI |

### Non-goals

- **Never** writing new DataObject instances into the Ontology API (incl. `RuleCheckResult` or any other write-back). The Checker is a **read-only consumer** of the Ontology API. Audit lives on filesystem (MVP) and on filesystem + an out-of-band store TBD (full impl) — **never** as Neo4j nodes. Locked decision; not negotiable.
- Full matchResume agent orchestration — described in flow only; not built in this SPEC
- Multi-action support — matchResume only for MVP, but contract leaves room
- Persisted rule classification — hand-coded switch in MVP; metadata-driven in v1.1
- Production-grade reliability — no circuit breakers, rate limiters, retry policies (only 1 retry for LLM transient errors)
- Cost optimization — no LLM response caching in MVP

---

## 3. MVP vs Full implementation — at a glance

| Dimension | **MVP** | **Full implementation** |
|---|---|---|
| Rules covered | **5 rules**: 10-7 (期望薪资), 10-17 / 10-18 / 10-25 (blacklist class — candidate-internal), **10-32 (岗位冷冻期 — cross-object Application)** | All matchResume rules (40+), extensible to other actions |
| Instance fetch shapes exercised | Candidate single-field, Candidate nested (work_experience), **Application list-with-filter** | + Blacklist, Locks, cross-action results |
| Prompt strategy | **B**: extract single rule's text + execution-constraint wrapper | **A**: use `generatePrompt` full output, focus via system instruction |
| LLM call pattern | **One call per rule** | **One call per matchResume run** evaluating all rules → `RuleJudgment[]` |
| Confidence | LLM self-reported `∈ [0, 1]` | Composite: `0.4 × logprob_score + 0.3 × evidence_count_factor + 0.3 × consistency_factor` |
| Storage | Filesystem `data/simple-rule-check-runs/<runId>.json` | Filesystem `data/rule-check-runs/<runId>.json` (Neo4j write-back is **forbidden** per §2 Non-goals; any future external store, e.g. OpenSearch or S3, is out-of-Ontology-API) |
| Public API | `checkRule()` only; `checkRules()` reserved (throws `NotImplementedError`) | `checkRule()` + `checkRules()` (batch with internal parallelism) |
| Validation | rule_id exists + evidence grounded + schema valid | + block-semantic check via rule classification metadata |
| Audit Q&A | Inspect trace JSON manually | LLM-driven Q&A panel + cross-run analytics |
| UI | `/dev/simple-rule-check` dev tool | `/rule-check/*` commercial product UI on port 3002 |

### Why this MVP is not throwaway

MVP code is structured behind interfaces so migration to full is **swap-implementation, not rewrite**:

| Interface | MVP impl | Full impl |
|---|---|---|
| `PromptStrategy` | `extractedRulePrompt` | `fullActionPrompt` |
| `Orchestrator` | `SingleCallOrchestrator` | `AllInOneOrchestrator` |
| `ConfidenceCalculator` | `LLMSelfReported` | `Composite` |
| `RunStore` | `FilesystemRunStore` | `FilesystemRunStore` (+ optional out-of-Ontology external store, e.g. object storage) — **never** a Neo4jRunStore |

The MVP **picks the simpler concrete for each**, but the abstraction is in place.

---

## 4. End-to-end business flow

Below is the **production target** flow. **MVP scope** is the highlighted block (steps 6-9 plus persistence); upstream agents (1-5) and downstream routing (10) are described for context.

```
┌───────────────────────────────────────────────────────────────┐
│ 1. Resume upload / download                                    │
└──────────────────────────────┬─────────────────────────────────┘
                               ▼
┌───────────────────────────────────────────────────────────────┐
│ 2. parseResume agent — parses resume document                  │
└──────────────────────────────┬─────────────────────────────────┘
                               ▼
┌───────────────────────────────────────────────────────────────┐
│ 3. resume-process event — triggers matchResume agent           │
└──────────────────────────────┬─────────────────────────────────┘
                               ▼
┌───────────────────────────────────────────────────────────────┐
│ 4. matchResume agent — resolves (candidate, job, client,       │
│    department) from event payload                              │
└──────────────────────────────┬─────────────────────────────────┘
                               ▼
┌───────────────────────────────────────────────────────────────┐
│ 5. matchResume agent calls `generatePrompt({ actionRef:        │
│    "matchResume", client, clientDepartment? })`                │
│    → ActionObjectV4 with rule defs, schema, execution rules    │
└──────────────────────────────┬─────────────────────────────────┘
                               ▼
╔═══════════════════════════════════════════════════════════════╗  ◄═══ MVP
║ 6. matchResume agent calls Runtime Rule Checker               ║   scope
║                                                               ║   begins
║ ┌───────────────────────────────────────────────────────────┐ ║
║ │ 7. Checker fetches required instances from Ontology API   │ ║
║ │    (Neo4j-backed):                                        │ ║
║ │      - Candidate by candidateId                           │ ║
║ │      - Job_Requisition by jobRef (if rule needs it)       │ ║
║ │      - Application filtered by (candidate, client) │ ║
║ │      - Blacklist filtered by (candidate, client)    │ ║
║ │    Selection driven by `instancesNeededForRule(ruleId)`   │ ║
║ │    — hardcoded switch in MVP, metadata-driven in v1.1     │ ║
║ └─────────────────────────┬─────────────────────────────────┘ ║
║                           ▼                                   ║
║ ┌───────────────────────────────────────────────────────────┐ ║
║ │ 8. Checker builds eval prompt + calls LLM (single call):  │ ║
║ │      MVP:  extracted rule text + evidence + output schema │ ║
║ │      Full: full generatePrompt output + focusing system   │ ║
║ │            message                                        │ ║
║ │                                                           │ ║
║ │    Output schema (strict JSON):                           │ ║
║ │    {                                                      │ ║
║ │      rule_id, decision, evidence: [...],                  │ ║
║ │      root_cause, confidence, next_action                  │ ║
║ │    }                                                      │ ║
║ └─────────────────────────┬─────────────────────────────────┘ ║
║                           ▼                                   ║
║ ┌───────────────────────────────────────────────────────────┐ ║
║ │ 9. Checker validates LLM output (deterministic):          │ ║
║ │    a. rule_id ∈ fetched rules                             │ ║
║ │    b. each evidence references (objectType, objectId)     │ ║
║ │       in fetched.instances; field exists; value matches   │ ║
║ │    c. response parses against Zod schema                  │ ║
║ │    d. block-semantic check (skipped in MVP)               │ ║
║ │                                                           │ ║
║ │    On failure: do NOT retry. Record failure tags; force   │ ║
║ │    finalDecision.decision = "pending_human" with overrideReason │ ║
║ └─────────────────────────┬─────────────────────────────────┘ ║
║                           ▼                                   ║
║                Persist RuleCheckRun                           ║
║                  → data/simple-rule-check-runs/<YYYYMMDD>/<runId> ║
║                                                               ║
║                Return RuleCheckRun                            ║
╚═══════════════════════════════════════════════════════════════╝  ◄═══ MVP
                               │                                     scope
                               ▼                                     ends
┌───────────────────────────────────────────────────────────────┐
│ 10. matchResume agent routes on finalDecision.decision:        │
│       - blocked         → stop recommendation                  │
│       - pending_human   → suspend for human review             │
│       - passed          → continue to scoring                  │
│       - not_started     → rule didn't apply; continue, no flag │
└───────────────────────────────────────────────────────────────┘
```

**MVP invocation surfaces** (replacing step 6 in the agent flow):

- CLI: `npm run simple-rule-check -- --rule 10-7 --candidate C-MVP-001 --job JR-MVP-001 --client 腾讯 --domain RAAS-v1`
- Web UI: `/dev/simple-rule-check` form

---

## 5. System architecture

### 5.1 Module map

```
lib/
├── ontology-gen/                     (existing — unchanged)
│   ├── fetch.ts                       (reused: fetchAction)
│   ├── v4/                            (reused: generatePrompt, adapters)
│   └── ...
├── simple-rule-check/                ◄── MVP MODULE (shipped, frozen)
│   ├── types.ts                       # CheckRuleInput, RuleJudgment, Evidence, ValidationReport, RuleCheckRun
│   ├── fetch-instances.ts             # GET /api/v1/ontology/instances/{label}/{pk|filter}
│   ├── rule-instance-map.ts           # switch(ruleId) → InstanceSpec; hardcoded
│   ├── prompt/
│   │   ├── extractor.ts               # extract single rule text + wrapper
│   │   ├── full.ts                    # stub: throws NotImplementedError
│   │   └── index.ts                   # PromptStrategy interface
│   ├── llm-client.ts                  # OpenAI Chat Completions wrapper (response_format json_schema)
│   ├── output-schema.ts               # Zod schema for RuleJudgment
│   ├── confidence/
│   │   ├── self-reported.ts
│   │   └── index.ts                   # ConfidenceCalculator interface
│   ├── validation/
│   │   ├── rule-id.ts
│   │   ├── evidence-grounded.ts
│   │   ├── schema.ts
│   │   ├── block-semantic.ts          # returns "skipped"
│   │   └── index.ts                   # runValidation()
│   ├── store/
│   │   ├── filesystem.ts              # the only store (no Neo4j write-back ever)
│   │   └── index.ts                   # RunStore interface
│   ├── orchestrator/
│   │   ├── single-call.ts             # one LLM call, one rule
│   │   └── index.ts                   # Orchestrator interface
│   ├── checker.ts                     # Public: checkRule(); checkRules() throws NotImplementedError
│   └── index.ts                       # Barrel exports
└── rule-check/                       ◄── FULL impl module (NOT YET CREATED — empty placeholder)
    │                                    will hold the all-rules orchestrator,
    │                                    composite confidence, full-action prompt strategy
    │                                    when built. Does NOT replace simple-rule-check.
    └── (empty)

scripts/
├── simple-rule-check.ts              # MVP CLI entry → simple-rule-check checkRule()
├── simple-rule-check-seed.ts         # MVP seed: 48 instances to RAAS-v1
├── rule-check.ts                     # (future) full impl CLI
└── rule-check-seed.ts                # (future) full impl seed if needed

app/dev/simple-rule-check/             # MVP dev UI (URL-only, not in LeftNav)
├── page.tsx
└── actions.ts                         # Server action wrapper

app/rule-check/                        # FULL product UI (stub dir, §9.2)
├── page.tsx                           # dashboard
├── runs/page.tsx                      # list
├── runs/[runId]/page.tsx              # detail
├── candidates/[id]/page.tsx
└── rules/page.tsx

data/simple-rule-check-runs/           # MVP audit traces (gitignored)
└── <YYYYMMDD>/<runId>.json

data/rule-check-runs/                  # FULL impl audit traces (gitignored, when built)
└── <YYYYMMDD>/<runId>.json
```

### 5.2 Ontology API capabilities the Checker depends on

**The Checker (both simple-rule-check and the future rule-check) is strictly a *read* consumer of the Ontology API.** The only writes against the Ontology API are issued by the **seed scripts** (`scripts/simple-rule-check-seed.ts` etc.), which exist to bootstrap test data — they are not the Checker itself.

| Capability | Endpoint(s) | Used by | MVP / Full |
|---|---|---|---|
| Rule retrieval (action-scoped, client-filtered) | `GET /api/v1/ontology/actions/{ref}/rules?domain=...&client=...` | `lib/simple-rule-check/fetch-rules.ts` (delegates to `lib/ontology-gen/fetch.ts`) | Both |
| Schema introspection | `GET /api/v1/ontology/objects/{label}?domain=...` | seed script (verify DataObject schemas exist); future `validation/evidence-grounded.ts` (verify `field` exists in schema) | Both |
| Single instance read | `GET /api/v1/ontology/instances/{label}/{pk}?domain=...` | `lib/simple-rule-check/fetch-instances.ts` (Candidate, Job_Requisition, …) | Both |
| Filtered instance listing | `GET /api/v1/ontology/instances/{label}?domain=...&<key=value>` | `lib/simple-rule-check/fetch-instances.ts` (Application by candidate+job, Resume by candidate, Candidate_Expectation by candidate) | Both |
| ~~Instance create / upsert~~ | ~~`POST /api/v1/ontology/instances/{label}`~~ | **Seed scripts ONLY** (`simple-rule-check-seed.ts`); never invoked by the Checker at runtime | seed-time only |
| ~~Instance update~~ | ~~`PUT /api/v1/ontology/instances/{label}/{pk}`~~ | Seed scripts only | seed-time only |
| ~~Persist RuleCheckResult~~ | — | **REMOVED.** Per §2 Non-goals, the Checker never writes any DataObject (incl. RuleCheckResult) into the Ontology API. Audit lives on filesystem (and future out-of-Ontology external storage if needed). | **forbidden** |

**Domain policy**: the MVP seed and the Checker both default to `RAAS-v1`; the earlier RAAS-v1 isolation requirement has been dropped per user decision. Audit traces are local-only, so cross-environment risk is limited to whatever the configured `ONTOLOGY_API_BASE` points at.

### 5.3 Internal data flow (MVP single-call)

```
checkRule({ actionRef, ruleId, candidateId, jobRef?, scope, domain })
            │
            ▼
   ┌────────────────────────────┐
   │ fetchAction(actionRef,     │ ──► allRules[] (from Ontology API)
   │   domain, scope.client)    │
   └────────────┬───────────────┘
                ▼
   ┌────────────────────────────┐
   │ selectRule(allRules,       │ ──► rule { id, name, sourceText, stepId }
   │   ruleId)                  │
   └────────────┬───────────────┘
                ▼
   ┌────────────────────────────────────┐
   │ instancesNeededForRule(ruleId)     │ ──► spec: InstanceSpec
   │ (hardcoded switch — MVP)           │
   └────────────┬───────────────────────┘
                ▼
   ┌────────────────────────────────────┐
   │ fetchInstances(spec, ids, domain)  │ ──► fetched: FetchedInstances
   │ (Ontology API instance endpoints)  │
   └────────────┬───────────────────────┘
                ▼
   ┌────────────────────────────────────┐
   │ promptStrategy.build(rule,         │ ──► prompt: string
   │   fetched, scope, currentTime)     │
   │ (extractor in MVP)                 │
   └────────────┬───────────────────────┘
                ▼
   ┌────────────────────────────────────┐
   │ llm.chat.completions.create({      │ ──► raw: LLMRawResponse
   │   model, messages, response_format │
   │ })                                 │
   └────────────┬───────────────────────┘
                ▼
   ┌────────────────────────────────────┐
   │ runValidation(raw, rule, fetched,  │ ──► parsed: RuleJudgment | null
   │   allRules)                        │      validation: ValidationReport
   └────────────┬───────────────────────┘
                ▼
   ┌────────────────────────────────────┐
   │ computeFinalDecision(parsed,       │ ──► finalDecision
   │   validation)                      │
   └────────────┬───────────────────────┘
                ▼
   ┌────────────────────────────────────┐
   │ runStore.write(run: RuleCheckRun)  │
   └────────────┬───────────────────────┘
                ▼
            return run
```

---

## 6. Public API

### 6.1 MVP — `checkRule` (single rule, single call)

```ts
// lib/simple-rule-check/types.ts  (MVP)
// lib/rule-check/types.ts          (future full impl — same shape, different module)

export interface CheckRuleInput {
  /** Action selector (e.g. "matchResume"). */
  actionRef: string;
  /** Rule id (e.g. "10-7"). */
  ruleId: string;
  /** Candidate PK to evaluate. */
  candidateId: string;
  /** Optional job context. Some rules need this; the switch decides. */
  jobRef?: string;
  /** Tenant scope. `client` is required for rule filtering. */
  scope: { client: string; department?: string };
  /** Default "RAAS-v1" for MVP — isolation from production. */
  domain?: string;
  /** Env overrides. */
  apiBase?: string;
  apiToken?: string;
  openaiApiKey?: string;
  openaiBaseUrl?: string;
  llmModel?: string;        // default "gpt-4o" (configurable)
}

export interface Evidence {
  sourceType: "neo4j_instance";  // FULL impl may add "external_api"
  objectType: string;            // e.g. "Candidate"
  objectId: string;              // e.g. "C-MVP-001"
  field: string;                 // e.g. "expected_salary"
  value: unknown;                // value LLM claimed it read
}

export interface RuleJudgment {
  ruleId: string;
  /** Locked four-value enum. See §7.6 for routing semantics. */
  decision: "not_started" | "passed" | "blocked" | "pending_human";
  evidence: Evidence[];
  /** Chinese, four-section self-justifying narrative — see §7.2. */
  rootCause: string;
  confidence: number;            // [0, 1]
  nextAction: string;
}

export interface ValidationReport {
  ruleIdExists: boolean;
  evidenceGrounded: boolean;
  schemaValid: boolean;
  blockSemanticCheck: "ok" | "warning" | "skipped";  // MVP always "skipped"
  overallOk: boolean;
  failures: string[];            // e.g. ["evidence_not_grounded", "field_mismatch:expected_salary"]
}

export interface RuleCheckRun {
  runId: string;                 // UUIDv7
  timestamp: string;             // ISO-8601
  input: CheckRuleInput;
  fetched: {
    rule: {
      id: string;
      name: string;
      sourceText: string;
      stepId: string;
      applicableScope: string;
    };
    instances: Array<{
      objectType: string;
      objectId: string;
      data: Record<string, unknown>;
    }>;
  };
  prompt: string;
  llmRaw: {
    model: string;
    response: unknown;            // raw API response, including logprobs if requested
    inputTokens: number;
    outputTokens: number;
    latencyMs: number;
  };
  llmParsed: RuleJudgment | null; // null if schema invalid
  validation: ValidationReport;
  finalDecision: {
    decision: "not_started" | "passed" | "blocked" | "pending_human";
    /** Populated when validation fails and LLM's decision is overridden to "pending_human". */
    overrideReason?: string;
  };
}

export async function checkRule(input: CheckRuleInput): Promise<RuleCheckRun>;
```

### 6.2 Full impl — `checkRules` (batch, reserved)

```ts
export interface CheckRulesInput extends Omit<CheckRuleInput, "ruleId"> {
  /** Specify rules. Default = all rules of the action. */
  ruleIds?: string[];
  /** Max concurrent LLM calls. Default 4. */
  concurrency?: number;
}

export interface RuleCheckBatchRun {
  batchId: string;
  timestamp: string;
  input: CheckRulesInput;
  results: RuleCheckRun[];        // one per rule
  aggregateDecision: {            // applies the matchResume aggregator
    decision: "not_started" | "passed" | "blocked" | "pending_human";
    triggeredRules: string[];
  };
}

export async function checkRules(input: CheckRulesInput): Promise<RuleCheckBatchRun>;
// MVP: throws NotImplementedError. Full impl wires AllInOneOrchestrator.
```

### 6.3 Full impl — audit-rich `RuleJudgment` schema

The full impl extends the MVP `RuleJudgment` with **audit-trail fields** that the Prove-centric UI (§9.2) renders directly. Backward compatible — old fields keep the same name + meaning; new fields are additive.

```ts
// lib/rule-check/output-schema.ts  (full impl)

export interface RuleJudgmentAudited extends RuleJudgment {
  /** 4-section Chinese narrative — same as MVP, but the UI parses it as structured. */
  rootCause: string;

  /** NEW: parsed view of rootCause sections — the LLM emits this in parallel
   *  with the prose `rootCause` so the UI doesn't have to regex-split. */
  rootCauseSections: {
    ruleRequirement: string;     // 【规则要求】
    dataObservation: string;     // 【数据观察】
    contrastReasoning: string;   // 【对照推理】
    conclusion: string;          // 【结论】
  };

  /** NEW: per-evidence provenance. The LLM must populate these so each
   *  evidence row in the UI can deep-link back to the exact API call. */
  evidence: Array<Evidence & {
    /** Which fetched-instance entry this evidence cites. */
    fetchedInstanceIndex: number;
    /** Was the value byte-equal? (Filled by post-validation, not LLM.) */
    grounded: boolean;
    /** Was this evidence actually used to reach the verdict, or just informational? */
    decisive: boolean;
  }>;

  /** NEW: counterfactual sketches — the LLM proposes "what would flip this verdict".
   *  Powers the Ask-Why panel's pre-canned counterfactuals. */
  counterfactuals?: Array<{
    hypotheticalChange: string;  // "如果 expected_salary_range 改为 90000-100000"
    predictedDecision: "not_started" | "passed" | "blocked" | "pending_human";
    confidence: number;
  }>;
}

export interface RuleCheckRunAudited extends Omit<RuleCheckRun, "llmParsed"> {
  llmParsed: RuleJudgmentAudited | null;

  /** NEW: which prompt template + actionObject version produced this prompt.
   *  Lets the diff view in §9.2 detect drift since the run. */
  promptProvenance: {
    /** Hash of the full prompt string. Cheap drift detector. */
    promptSha256: string;
    /** Snapshot of generatePrompt's input args + the resulting ActionObjectV4
     *  hash. Allows reconstructing "what generatePrompt would emit now" for diff. */
    generatePromptInput: {
      actionRef: string;
      client: string;
      clientDepartment?: string;
      domain: string;
      runtimeInputDigest: string;
    };
    actionObjectSha256: string;
    /** The exact ISO-8601 timestamp the actionObject was resolved. */
    resolvedAt: string;
  };

  /** NEW: each Ontology API call the Checker made, with full HTTP exchange.
   *  Lets the UI's "Source" link in evidence cards show the actual request/response. */
  ontologyApiTrace: Array<{
    requestUrl: string;
    requestMethod: "GET";
    requestHeaders: Record<string, string>;
    responseStatus: number;
    responseBody: unknown;
    latencyMs: number;
    timestamp: string;
  }>;

  /** NEW: human-override audit log (populated when an operator overrides pending_human). */
  humanOverrides?: Array<{
    overrider: string;            // operator id / email
    overrideAt: string;           // ISO-8601
    fromDecision: "pending_human";
    toDecision: "passed" | "blocked";
    reason: string;               // free text, required
  }>;

  /** NEW: ask-why interactions appended over time. Each Q&A becomes part of audit. */
  askWhyHistory?: Array<{
    askedAt: string;
    asker: string;
    question: string;
    answer: string;
    /** Hash of the trace JSON state at the time of asking, for reproducibility. */
    traceSha256AtAsk: string;
  }>;
}
```

Why each new field exists:

| Field | Audit purpose |
|---|---|
| `rootCauseSections` | UI doesn't regex-split LLM prose; sections come pre-parsed by the LLM itself. Eliminates rendering ambiguity. |
| `evidence[*].grounded` | Lets validation results stay attached to each evidence row, not aggregated separately. |
| `evidence[*].decisive` | Distinguishes "evidence the verdict pivots on" from "evidence the LLM cited for context". Critical for the UI's "show only decisive evidence" toggle. |
| `counterfactuals` | LLM-proposed flip points. Powers the Prove UI's Ask-Why pre-canned questions and surfaces sensitivity (a verdict that flips on a 1% data change deserves a human look). |
| `promptProvenance` | Detects ontology drift since the run — if the actionObject hash changed but the verdict is being relied on, the UI flags it. |
| `ontologyApiTrace` | Every fetch call is part of the receipt. The UI's "Source" link goes directly to the HTTP exchange, not just a synthesized `(objectType, objectId)` claim. |
| `humanOverrides` | The manual-resolution audit log lives inside the run record itself, not in a separate system. |
| `askWhyHistory` | Conversational audit becomes part of the permanent trace; can never be silently discarded. |

This schema is what makes the UI of §9.2 actually possible. It's also what makes the audit story Kenny is asking for **falsifiable** — every claim has receipts attached at the schema level.

---

## 7. Per-step design

### 7.1 Step 7 — Rule + instance resolution

`instancesNeededForRule(ruleId)` returns an `InstanceSpec`:

```ts
interface InstanceSpec {
  needsCandidate: boolean;       // always true in MVP
  needsJob?: boolean;
  needsApplications?: { byClient?: boolean; lookbackMonths?: number };
  needsBlacklist?: { byClient?: boolean; onlyActive?: boolean };
  needsLocks?: boolean;
}
```

#### MVP rule specs (hardcoded switch)

| Rule | Spec | Fetch shape exercised |
|---|---|---|
| `10-7` 期望薪资校验 | `{ needsCandidate: true }` | single-instance, single field |
| `10-17` 高风险回流人员 | `{ needsCandidate: true }` | single-instance, nested array (`work_experience`) |
| `10-18` EHS 回流人员 | `{ needsCandidate: true }` | single-instance, nested array |
| `10-25` 华为荣耀竞对 | `{ needsCandidate: true }` | single-instance, nested array + temporal (current time vs `end_date`) |
| **`10-32` 岗位冷冻期** | `{ needsCandidate: true, needsJob: true, needsApplications: { byClient: true, byJob: true, lookbackMonths: 3 } }` | **cross-instance list-with-filter + temporal** |

10-32 is the critical addition: it's the only rule of the five whose judgement is **literally impossible** without querying the graph for related instances. The candidate's `work_experience` doesn't tell us what jobs they previously applied to — that lives in `Application` (a separate DataObject linked by `candidate_id`). 10-32 forces the Checker to:
1. List `Application` records filtered by `(candidate_id, job_requisition_id, last 3 months)` via the Ontology API
2. Inspect each record's `status` for `筛选淘汰` / `面试淘汰` / `筛选通过未到面`
3. Feed all matching records into the LLM as evidence
4. Validate that LLM cites real `Application.<id>.status` values

If the LLM hallucinates an `Application` instance that wasn't fetched, the evidence-grounded validator catches it. That's the proof loop in microcosm.

Future v1.1: replace switch with metadata-driven (`rule_classification.json` or Ontology API rule-node extension).

#### Fetch implementation (`fetch-instances.ts`)

```ts
async function fetchCandidate(id: string, ctx: FetchCtx): Promise<Instance>;
async function fetchJob(ref: string, ctx: FetchCtx): Promise<Instance>;
async function listApplications(filter: { candidate_id, client?, since? }, ctx): Promise<Instance[]>;
async function listBlacklist(filter: { candidate_id, client?, active? }, ctx): Promise<Instance[]>;
```

All hit `GET /api/v1/ontology/instances/{label}/...?domain=...` per the Ontology API guide.

### 7.2 Step 8 — Eval prompt (MVP, extracted)

```
[system]
你是一名 Rule Evaluation Agent。你的任务是基于给定的 rule 原文和 candidate
的真实数据，判定该 candidate 在该客户的招聘场景下是否违反该 rule。

约束:
- 你只能使用 prompt 中提供的 rule 原文 + instance 数据
- 不允许编造 evidence — 每一条 evidence 必须能在提供的 instance 数据中
  精确定位到 (objectType, objectId, field, value)
- 如果数据不足以判定，输出 decision="pending" 并在 root_cause 中说明缺失字段
- 严格按指定 JSON schema 输出

[user]
## Action
{{actionRef}}

## 当前时间
{{currentTime}}    (ISO-8601, Asia/Shanghai)

## Client
{{scope.client}}{{?scope.department}} / {{scope.department}}{{/}}

## 待判定 Rule
[{{rule.id}}] {{rule.name}}
适用条件: {{rule.applicableScope}}
规则原文:
{{rule.sourceText}}

## Candidate (instance from Neo4j)
```json
{{candidate}}
```

{{?fetched.job}}
## Job (instance from Neo4j)
```json
{{job}}
```
{{/}}

## Output schema
按下面的 JSON schema 输出（response_format strict mode 强制）:
{{outputSchemaJson}}
```

### 7.3 Step 8 — LLM call

```ts
// llm-client.ts
import OpenAI from "openai";

const RuleJudgmentSchema = z.object({
  ruleId: z.string(),
  decision: z.enum(["not_started", "passed", "blocked", "pending_human"]),
  evidence: z.array(z.object({
    sourceType: z.literal("neo4j_instance"),
    objectType: z.string(),
    objectId: z.string(),
    field: z.string(),
    value: z.unknown(),
  })),
  rootCause: z.string(),
  confidence: z.number().min(0).max(1),
  nextAction: z.string(),
});

const response = await openai.chat.completions.create({
  model: "gpt-4o",
  messages: [
    { role: "system", content: SYSTEM },
    { role: "user", content: userPrompt },
  ],
  response_format: {
    type: "json_schema",
    json_schema: {
      name: "RuleJudgment",
      schema: zodToJsonSchema(RuleJudgmentSchema),
      strict: true,
    },
  },
  logprobs: true,                    // FULL impl uses these for confidence; MVP ignores
});
```

### 7.4 Step 9 — Validation (deterministic)

Each check is a pure function `(parsed, fetched, allRules) → boolean | tag`:

```ts
// validation/rule-id.ts
function validateRuleId(parsed, allRules): { ok: boolean; failures: string[] } {
  return allRules.some(r => r.id === parsed.ruleId)
    ? { ok: true, failures: [] }
    : { ok: false, failures: [`unknown_rule_id:${parsed.ruleId}`] };
}

// validation/evidence-grounded.ts
function validateEvidenceGrounded(parsed, fetched): { ok: boolean; failures: string[] } {
  const failures: string[] = [];
  for (const ev of parsed.evidence) {
    const inst = fetched.instances.find(
      i => i.objectType === ev.objectType && i.objectId === ev.objectId
    );
    if (!inst) {
      failures.push(`evidence_unknown_instance:${ev.objectType}/${ev.objectId}`);
      continue;
    }
    if (!(ev.field in inst.data)) {
      failures.push(`evidence_unknown_field:${ev.objectType}.${ev.field}`);
      continue;
    }
    if (!deepEqual(inst.data[ev.field], ev.value)) {
      failures.push(`evidence_value_mismatch:${ev.objectType}.${ev.field}`);
    }
  }
  return { ok: failures.length === 0, failures };
}

// validation/schema.ts
function validateSchema(raw): { ok: boolean; failures: string[]; parsed: RuleJudgment | null } {
  const result = RuleJudgmentSchema.safeParse(raw);
  return result.success
    ? { ok: true, failures: [], parsed: result.data }
    : { ok: false, failures: [`schema_invalid:${result.error.message}`], parsed: null };
}

// validation/block-semantic.ts — MVP returns skipped
function validateBlockSemantic(parsed, ruleClassification?): "ok" | "warning" | "skipped" {
  return "skipped";  // MVP
}
```

**Aggregate**:
```
overallOk = ruleIdExists && evidenceGrounded && schemaValid
         && (blockSemanticCheck === "ok" || blockSemanticCheck === "skipped")
```

**On failure**:
- `finalDecision.decision = "pending_human"`
- `finalDecision.overrideReason = validation.failures.join("; ")`
- Run is still persisted (failures are interesting data)

**No retry**. Failures are valuable signal — retrying masks LLM reliability data.

### 7.5 Confidence

**MVP** — `LLMSelfReported`: pass through `parsed.confidence` directly. Annotated in stored run as `confidenceSource: "llm_self_reported"`.

**Full** — `Composite`:

```
confidence = 0.4 × logprobScore
           + 0.3 × evidenceCountFactor
           + 0.3 × consistencyFactor
```

Where:
- `logprobScore = exp(logprob_of_decision_token)`  — from OpenAI `logprobs: true` response
- `evidenceCountFactor = min(evidence.length / 3, 1)`
- `consistencyFactor` = derived by re-prompting LLM to score "does each piece of evidence support the decision?" — a separate small LLM call returning per-evidence alignment scores

Confidence source is recorded in `RuleCheckRun.confidenceMeta`.

### 7.6 Step 10 — Decision routing (matchResume agent role)

Described for context. Not implemented in MVP — Checker just returns the `RuleCheckRun`; how a downstream agent acts on it is its concern:

```
switch (finalDecision.decision) {
  case "blocked":         // stop recommendation pipeline
  case "pending_human":   // suspend, queue for human review
  case "passed":          // continue to next step (scoring)
  case "not_started":     // rule didn't apply; continue, no flag
}
```

---

## 8. Rule coverage (MVP)

### 8.1 Test scenarios

**10 seeded candidates** in `RAAS-v1` domain, plus 2 jobs, plus 2 `Application` records (for 10-32). Each rule has a **positive** (expected to fire) and **negative** (expected NOT to fire) case.

| Rule | Positive case | Negative case |
|---|---|---|
| **10-7 期望薪资** | `C-MVP-001`: `expected_salary = null` → **pending_human** | `C-MVP-002`: `expected_salary = 60000`, job upper = 80000 → **passed** |
| **10-17 高风险回流** | `C-MVP-003`: work_experience 含 中软国际 + 离职编码 `A15` → **blocked** | `C-MVP-004`: work_experience 含 中软国际 + 离职编码 `A1` (正常) → **passed** |
| **10-18 EHS 回流** | `C-MVP-005`: work_experience 含 华腾 + 离职编码 `A13(1)EHS` → **pending_human** (需 HSM 评估) | `C-MVP-006`: 无华腾/中软国际历史 → **not_started** |
| **10-25 华为荣耀竞对** | `C-MVP-007`: 最近一段在 华为，end_date 一个月前 (< 3 月) → **pending_human** | `C-MVP-008`: 华为离职 end_date 8 个月前 (≥ 3 月) → **passed** |
| **10-32 岗位冷冻期** ★ cross-object | `C-MVP-009`: Application 有 `(C-MVP-009, JR-MVP-TENCENT-001, 2026-04-01, status="筛选淘汰")` (距今 ~6 周, < 3 月) → **not_started** | `C-MVP-010`: Application 有 `(C-MVP-010, JR-MVP-TENCENT-001, 2025-12-01, status="筛选淘汰")` (距今 ~5 月, ≥ 3 月) → **passed** |

For 10-32, the candidate fields themselves are otherwise "clean" (no blacklist hits, salary in range). The decision pivots **entirely** on the existence + timing of an `Application` record. This is the proof point Kenny is asking for: "show me a candidate that fails / passes a rule purely because of what's in the graph database, not what's in the resume."

### 8.2 Seed initialization

The graph database in `RAAS-v1` does NOT currently contain any of this data. `scripts/simple-rule-check-seed.ts` initializes it.

#### Seed order

1. **Schema verification** — `GET /api/v1/ontology/schema/objects?domain=RAAS-v1` to confirm the four DataObject schemas (`Candidate`, `Job_Requisition`, `Application`, `Blacklist`) exist with the expected PK fields. If any is missing, **fail with a clear error** pointing the user at the ontology repo to define them. The seed never auto-creates schemas (schema is the ontology repo's responsibility).
2. **Field-name discovery** — for each schema, capture the actual property keys (PK field name, value-typed fields). The seed adapts its POST payloads to these so it's robust to schema field-name drift. Stored as `seed.schemaSnapshot.json` (gitignored) for the run.
3. **Idempotent upsert** of:
   - 2 jobs: `JR-MVP-TENCENT-001` (腾讯 / WXG, salary upper 80000), `JR-MVP-BYTE-001` (字节 / AML)
   - 10 candidates as in §8.1
   - 2 `Application` records (C-MVP-009 / C-MVP-010 against `JR-MVP-TENCENT-001`)
4. **Verification probe** — re-fetch all written instances via `GET /api/v1/ontology/instances/{label}/{pk}?domain=RAAS-v1` and assert presence + field values match. Surfaces any silent server-side property-bag flattening surprises.

The seed is fully idempotent (PUT-via-POST upsert per ontology API contract); re-running ingests no duplicates. Cleanup is manual: `DELETE /api/v1/ontology/instances/...?domain=RAAS-v1` (not automated in MVP — accumulation is fine for a test domain).

#### Schema dependencies (must exist in `RAAS-v1` before seed runs)

| DataObject | Expected PK | Expected fields used by MVP (final field names TBD via §8.2 step 2) |
|---|---|---|
| `Candidate` | `candidate_id` | `name`, `gender`, `date_of_birth`, `expected_salary`, `work_experience` (array of `{ company, title, start_date, end_date, departure_code }`), `highest_education`, `skill_tags` |
| `Job_Requisition` | `job_requisition_id` | `client`, `department`, `title`, `salary_upper`, `required_skills`, `min_years_experience`, `age_max` |
| `Application` | `application_id` (or composite — discovered via schema introspection) | `candidate_id`, `job_requisition_id`, `client`, `application_date`, `status` |
| `Blacklist` | `blacklist_id` (or composite) | `candidate_id`, `client`, `reason`, `active` (reserved for v1.1, not used in MVP) |

If field names in the live schema differ from assumed, the seed adapter logs a clear diff and either remaps (if the difference is just naming) or aborts (if structurally incompatible).

### 8.3 Verification script

```bash
# 1. Confirm Ontology API reachable + schemas present
npm run simple-rule-check:seed:check                  # schema introspection only, no writes

# 2. Seed test data (idempotent)
npm run simple-rule-check:seed

# 3. Run all 10 cases (5 rules × pos/neg)
for case in '10-7:C-MVP-001:pending_human' \
            '10-7:C-MVP-002:passed' \
            '10-17:C-MVP-003:blocked' \
            '10-17:C-MVP-004:passed' \
            '10-18:C-MVP-005:pending_human' \
            '10-18:C-MVP-006:not_started' \
            '10-25:C-MVP-007:pending_human' \
            '10-25:C-MVP-008:passed' \
            '10-32:C-MVP-009:not_started' \
            '10-32:C-MVP-010:passed'; do
  IFS=: read rule cand expected <<< "$case"
  actual=$(npm run --silent simple-rule-check -- --rule $rule --candidate $cand \
            --client 腾讯 --job JR-MVP-TENCENT-001 --domain RAAS-v1 \
            --output decision-only)
  echo "[$rule/$cand] expected=$expected actual=$actual"
done
```

MVP demo passes iff **all 10 lines show `expected == actual`**.

---

## 9. Frontend / product UI

### 9.1 MVP — `/dev/simple-rule-check` (dev preview)

Layout (mirroring `/dev/generate-prompt`'s shape):

```
┌─────────────────────────────────────────────────────────────────┐
│ Runtime Rule Checker — dev preview                              │
│                                                                 │
│ ┌─ Run params ───────────────────────────────────────────────┐ │
│ │ actionRef: [matchResume]  domain: [RAAS-v1]           │ │
│ │ rule (dropdown of action's rules): [10-7]                   │ │
│ │ candidateId: [C-MVP-001]    jobRef: [JR-MVP-TENCENT-001]   │ │
│ │ client: [腾讯]               department (opt): [WXG]        │ │
│ │ [Run check]                                                 │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ ┌─ Result ──────────────────┐ ┌─ Trace (collapsible) ─────────┐│
│ │ ╔═════════════════╗       │ │ runId: 01HX...                ││
│ │ ║   PENDING       ║       │ │ timestamp: 2026-05-12T...     ││
│ │ ╚═════════════════╝       │ │ fetched.instances: [...]      ││
│ │                           │ │ prompt: <expand>              ││
│ │ Validation:               │ │ llmRaw: { ... }               ││
│ │  ✓ rule_id exists         │ │ llmParsed: { ... }            ││
│ │  ✓ evidence grounded      │ │ validation: { ... }           ││
│ │  ✓ schema valid           │ │ finalDecision: { ... }        ││
│ │  – block-semantic skipped │ └───────────────────────────────┘│
│ │                           │                                  │
│ │ Confidence: ████░░ 0.62   │                                  │
│ │                           │                                  │
│ │ Evidence:                 │                                  │
│ │ ┌─────────────────────┐   │                                  │
│ │ │ Candidate.expected_ │   │                                  │
│ │ │ salary = null       │   │                                  │
│ │ └─────────────────────┘   │                                  │
│ │                           │                                  │
│ │ Root cause:               │                                  │
│ │ 候选人未填写 expected_     │                                  │
│ │ salary 字段，依据 rule    │                                  │
│ │ 10-7 标记为薪资未知...     │                                  │
│ │                           │                                  │
│ │ Next action:              │                                  │
│ │ hold_for_manual_review    │                                  │
│ │                           │                                  │
│ │ Audit: data/simple-rule- │                                  │
│ │ check-runs/20260512/...   │                                  │
│ └───────────────────────────┘                                  │
└─────────────────────────────────────────────────────────────────┘
```

Purpose: engineering verification, not stakeholder demo.

### 9.2 Full — commercial product UI (Prove-centric)

The Full impl ships a polished product UI at `/rule-check/*`, integrated into the Agentic Operator app shell. The **dominant design principle** is **Prove**: every cell of UI must let the operator click-through to the underlying evidence — no claim is unfalsifiable.

The audit chain a user can traverse from any decision:

```
Decision → Validation report → LLM raw output → LLM prompt
                                                    │
                                                    ▼
                                                Action prompt (from generatePrompt)
                                                    │
                                                    ▼
                                                Fetched instances (from Ontology API)
                                                    │
                                                    ▼
                                                Source DataObject in Neo4j
```

Every UI panel exposes the appropriate "lens" into this chain. Below is the route map and per-route requirements.

#### `/rule-check` — Dashboard

Operator's home base. KPIs only — no decisions here, just signal.

- **KPI strip** (top): runs (24h), passed rate, blocked rate, pending_human queue size, low-confidence count, validation-failure count
- **Top fired rules (7d)**: stacked bar chart by decision; click → run list filtered to that rule
- **LLM reliability strip**: validation failure rate over time; spike = LLM regressed
- **Recent activity feed**: last 20 runs with badges + click-through
- **Alerts pane**: queue items > 24h old without human resolution

#### `/rule-check/runs` — Run list

The triage view.

- **Table columns**: timestamp, candidate (avatar + name), action/rule, decision badge, confidence bar, validation status (4 dots: rule_id / evidence / schema / block-semantic), audit link
- **Filters**: decision, rule, candidate, client, date range, confidence threshold, validation failure type
- **Bulk**: export selected runs (CSV / PDF / signed JSON bundle for compliance), re-run
- **Saved views**: "Pending human queue", "All blocked last 7d", "Low confidence (<0.5)"

#### `/rule-check/runs/[runId]` — Run detail (the "Prove" page)

The central page. Designed as a vertical scroll with **6 stacked layers** that mirror the audit chain top-to-bottom:

**Layer 1 — Verdict hero**
- Giant decision badge (`PASSED` / `BLOCKED` / `PENDING_HUMAN` / `NOT_STARTED`)
- Candidate avatar + name + job + client + timestamp + runId
- Confidence ring (radial gauge with composite-confidence breakdown on hover)
- Sticky breadcrumb so the verdict stays visible while scrolling

**Layer 2 — Why this verdict (Root cause card)**
- The LLM's **four-section rootCause** rendered as a styled vertical timeline:
  - 【规则要求】(blue band) — what the rule demands
  - 【数据观察】(neutral band) — what was read, each fact linked to the evidence card it came from
  - 【对照推理】(amber band) — the LLM's reasoning step
  - 【结论】(decision-color band) — verdict + why-not-other-three
- Each linked fact is a **chip with hover preview** of the underlying instance JSON

**Layer 3 — Evidence ledger**
- Each piece of evidence as a card:
  - Object icon + `objectType` / `objectId` + field path (JSONPath-lite)
  - Value displayed with byte-equal source highlight
  - **"Source" link** → opens side-panel showing the raw `GET /api/v1/ontology/instances/...` response (the actual HTTP exchange, including request URL + timestamp + response body)
  - **"Provenance"** chip showing which fetched-instances entry it cites
- Filter: "show only evidence used in the verdict" vs "show all fetched"

**Layer 4 — Validation strip**
- Four-light board, each click expands to show the deterministic check's failures with line-level detail
- For `evidence_grounded`, hovering each evidence row shows the deep-equal diff if the value mismatched
- For `block_semantic`, link to the Rule node's classification metadata in the ontology browser

**Layer 5 — Prompt + Response (the receipts)**
- **Prompt panel** (collapsible default-collapsed):
  - **Three-tab view**:
    - **Resolved prompt** — exactly what was sent to the LLM (system + user message text, with rule text / evidence sections / current-time / output schema visually demarcated)
    - **Source actionObject** — the `generatePrompt` output that was consumed verbatim (with a "diff against current" button to detect ontology drift since the run)
    - **Diff** — side-by-side highlighting between "resolved prompt at run time" vs "what generatePrompt would produce now" (drift detection)
  - "Copy prompt" / "Export as `.md`" / "Re-run with this exact prompt" buttons
- **LLM response panel** (collapsible default-collapsed):
  - Raw JSON response with token boundaries highlighted if logprobs were captured
  - Parsed `RuleJudgment` rendered side-by-side
  - Model + latency + token counts + cost USD
  - If `logprobs: true` was on, an inline mini-chart of per-token logprob — clicking the "decision" token shows its top-5 alternatives (this is **the** proof that the model wasn't uncertain about the verdict)

**Layer 6 — "Ask why" Q&A**
- LLM-powered audit assistant grounded **only** in this run's trace JSON
- Pre-canned questions: "为什么不是 blocked？" / "如果候选人的 expected_salary_range 改成 X，结果会怎样？（反事实）" / "evidence[2] 是从哪条 instance 来的？"
- Counterfactual answers are explicitly labelled as **speculation**
- Asks-history appended to run trace (becomes part of the audit record)

**Footer actions**
- **Re-run latest** — re-fetch instances + re-evaluate; on completion, render a 3-pane diff (instances changed / prompt changed / decision changed)
- **Human override** — operator with permission can override `pending_human` → `passed` / `blocked`; the override + reason + identity get appended to the trace (this is the manual-resolution audit log)
- **Bundle for compliance** — exports a single signed `.json.zip` with run + prompt + LLM raw + Ontology API calls + screenshot

#### `/rule-check/runs/[runId]/compare/[otherRunId]` — Diff view

Two runs (e.g., before/after a rule change, or pre/post re-run) rendered side-by-side at the Layer-2 (rootCause) and Layer-3 (evidence) granularity. Critical for regression detection.

#### `/rule-check/candidates/[id]` — Candidate-centric

- Candidate profile + parsed resume preview (read-only)
- Timeline of all rule checks across jobs/clients — chronological run list
- Aggregate stats: pass rate, top blocking rules, average confidence
- "Run new check" inline form

#### `/rule-check/rules` — Rule library

- Browse all rules for matchResume (and future actions)
- Per rule card:
  - Source text (read directly from Ontology API, with a "view ontology source" link)
  - Rule classification metadata (`can_block`, `required_instances`) once v1.1 schema lands
  - 7d firing rate + decision split histogram
  - Last 10 firings → run detail
- Per-rule LLM reliability stats: `evidence_grounded` failure rate, average confidence

#### `/rule-check/audit` — Compliance + analytics

- **Compliance reports**: PDF/XLSX export of "all blocked decisions for Tenant X in date range Y", suitable for legal/HR
- **Cross-run analytics**: rule firing trends, LLM reliability over time, prompt-drift incidents
- **Org-wide dashboards**: customizable widgets pulling from the out-of-Ontology external store (TBD: OpenSearch / ClickHouse / etc.)

#### `/rule-check/settings` — Operator self-service

- Default model / temperature / timeout
- Confidence threshold for "low confidence" alerts
- Per-rule override: "always require human review for rule X"
- API tokens management (Ontology + LLM)

**Design system**: reuses existing `--c-*` OKLCH tokens in [app/globals.css](app/globals.css), atom components in [components/shared/atoms.tsx](components/shared/atoms.tsx) (`StatusDot`, `Spark`, `Metric`, `Badge`, `Btn`, `Card`, `CardHead`), iconography from [components/shared/Ic.tsx](components/shared/Ic.tsx). New components to be built: `EvidenceCard`, `PromptPanel` (3-tab), `LogprobInlineChart`, `RootCauseTimeline`, `DecisionBadge` (with 4-value styling), `ValidationLight` (4-cell grid), `RunDiffView`, `AskWhyChat`.

---

## 10. Audit + Q&A reuse

### 10.1 MVP — trace replay

Engineers inspect `data/simple-rule-check-runs/<YYYYMMDD>/<runId>.json` directly. No automated Q&A. Replay = re-run with same CLI args.

### 10.2 Full — LLM-driven Q&A

Run-detail page's "Ask why" panel:

```
[system]
你是审计员。基于下面的 RuleCheckRun trace 回答用户问题。
- 只能引用 trace 内的数据，不允许猜测
- 如果 trace 中没有答案，明确说明
- 如果用户问的是反事实（"如果 X 不同会怎样"），明确这是猜测并说明根据

[user]
Trace (full RuleCheckRun JSON):
{{runJson}}

问题: {{userQuestion}}
```

Cross-run analytics (e.g., "all C-MVP-007 runs where 10-25 fired, last 30 days") run against an **out-of-Ontology external store** TBD (object storage / OpenSearch / ClickHouse / etc., full impl only). The Ontology API is **never** written to by the Checker — see §2 Non-goals.

---

## 11. Error modes + handling

| Failure | MVP behavior |
|---|---|
| Ontology API: candidate not found in domain | Return `pending_human` with overrideReason `candidate_not_found`; persist run |
| Ontology API: required DataObject schema missing in domain (seed-time) | Seed script fails fast with explicit error: "DataObject <label> not defined in <domain>; create via ontology repo or POST /api/v1/ontology/objects"; no auto-create (prevents prod accidents) |
| Ontology API: Application list returns 0 rows for 10-32 candidate | Pass empty array to LLM as evidence; LLM should output `decision="not_started"` (no cooldown applies because the precondition — an Application exists — isn't met). NOT a Checker error. |
| Ontology API: auth/timeout error | Throw `OntologyGenError`; caller handles |
| LLM API: 5xx / timeout | 1 retry with exponential backoff; on 2nd failure return `pending_human` with overrideReason `llm_unreachable`; persist run |
| LLM API: 429 rate limit | Respect `Retry-After`; 1 retry; same fallback |
| LLM output: malformed JSON | Caught by Zod in `validateSchema`; counted as `schema_invalid` failure |
| Validation failure (any kind) | No retry. Record failure, override to `pending_human`. Run persisted. |
| Filesystem write failure | Log + propagate; return RuleCheckRun in-memory; caller warned |

---

## 12. Environment + dependencies

### `.env.example` additions

```
# OpenAI (or compatible — set OPENAI_BASE_URL to point at OpenRouter etc)
OPENAI_API_KEY=
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_MODEL=gpt-4o
```

### `package.json` additions

```json
{
  "dependencies": {
    "openai": "^4.x",
    "zod": "^3.x",
    "uuid": "^10.x"
  },
  "scripts": {
    "rule-check": "node --env-file=.env.local --import tsx scripts/simple-rule-check.ts",
    "rule-check:seed": "node --env-file=.env.local --import tsx scripts/simple-rule-check-seed.ts",
    "rule-check:seed:check": "node --env-file=.env.local --import tsx scripts/simple-rule-check-seed.ts --check-only"
  }
}
```

### `.gitignore` additions

```
# simple-rule-check (MVP) audit traces
data/simple-rule-check-runs/

# rule-check (full impl, when built) audit traces
data/rule-check-runs/
```

---

## 13. Verification

No automated test suite (per CLAUDE.md). MVP verification:

1. **TypeScript build** — `npm run build` green (Next 16 = tsc --noEmit + lint)
2. **Schema check** — `npm run simple-rule-check:seed:check` confirms all four DataObject schemas (`Candidate` / `Job_Requisition` / `Application` / `Blacklist`) exist in `RAAS-v1` with expected PK fields
3. **Seed data POST** — `npm run simple-rule-check:seed` creates 2 jobs + 10 candidates + 2 Application records; verify count via Ontology API listing endpoints
4. **10 expected outcomes** — script per §8.3; all 10 lines show `expected == actual`
5. **Cross-object proof point (10-32 explicit demo)** — for `C-MVP-009`, the audit JSON must show:
   - `fetched.instances` includes an `Application` object
   - `llmParsed.evidence` cites that `Application.<id>.status = "筛选淘汰"` (or schema-equivalent field)
   - `validation.evidenceGrounded = true`
   - `finalDecision.decision = "not_started"`
   This is the "graph proof" Kenny needs — written into the audit record verbatim.
6. **Validation trip test** — manually inject a Mock LLM response that hallucinates evidence (e.g., a non-existent `Application` object id); verify `validation.evidenceGrounded = false` and `finalDecision.decision = "pending_human"` with `overrideReason` populated
7. **Dev UI smoke** — `npm run dev`; open `/dev/simple-rule-check`; run one MVP case (including 10-32); verify all panels render, including the Application evidence card
8. **Audit replay** — open one persisted JSON; verify all expected sections present

---

## 14. Open questions / future work

1. **Rule classification persistence** — hand-coded switch in `simple-rule-check`. Future `rule-check`: store `required_instances` + `can_block` metadata on Rule nodes in Ontology API (read-only, owned by the ontology repo — we never write these from the Checker). Coordinate with ontology repo for schema extension.
2. ~~`RuleCheckResult` DataObject schema~~ — **dropped.** Per §2 Non-goals the Checker never writes Neo4j instances. If we need queryable analytics across runs, the storage substrate will be an external store (filesystem index, object storage, OpenSearch, ClickHouse, etc.) — **not** the Ontology API.
3. **LLM provider abstraction** — MVP locks OpenAI Chat Completions structure (compatible with OpenRouter etc via `OPENAI_BASE_URL`). If we want to A/B different providers natively, add an `LLMClient` abstraction layer.
4. **Cost tracking** — token + latency + USD-cost recorded per run; aggregate dashboard widget in full impl.
5. **matchResume agent** — production agent that orchestrates steps 1-10 is separate future work. This SPEC defines only Checker (steps 6-9 in agent's flow).
6. **`rule-check` (full impl) module** — currently an empty placeholder at `lib/rule-check/`. To be built when we move beyond single-rule MVP: `checkRules()` batch API + aggregator, composite confidence, `fullActionPrompt` strategy. The MVP `lib/simple-rule-check/` stays frozen as the baseline.

---

## 15. Decision log (locked)

| | |
|---|---|
| Module naming | MVP module: `lib/simple-rule-check/` (shipped, frozen). Full impl module: `lib/rule-check/` (placeholder, not yet built). The MVP is preserved as a separate module so we can A/B against the full impl when ready. |
| Decision enum | Locked to four values: `not_started \| passed \| blocked \| pending_human`. Older drafts mentioned `pass / block / pending / warning / not_applicable`; those are obsolete. |
| Ontology API write policy | **Forbidden.** Rule Checker is a read-only consumer; never writes any DataObject (incl. RuleCheckResult). Seed scripts write at bootstrap only. |
| Full impl prompt source | **`rule-check` MUST consume `generatePrompt`'s output as the prompt source** (Strategy A), not build its own. `simple-rule-check` keeps the extractor strategy as the baseline for A/B. Locked: 2026-05-12. |
| Full impl LLM call mode | **One LLM call evaluates all rules** of the action → `RuleJudgment[]`. Accepted risk: large prompt + long structured output, mitigated by `response_format: json_schema strict` + the audit chain. If context-window blows up in practice, fall back to per-ActionStep batching (deferred decision). Locked: 2026-05-12. |
| Block-semantic dependency | Block-semantic check requires Rule classification metadata (`can_block`, `required_instances`) on Rule nodes. **We will push the ontology repo to extend the Rule schema in v1.1**; `rule-check` reads only — never writes. This is the one external dependency that must clear before block-semantic check can ship. Locked: 2026-05-12. |
| Generator vs Checker | Two independent modules; share Ontology API as upstream rule source |
| MVP prompt strategy | Extracted single rule + execution wrapper |
| Full prompt strategy | Full `generatePrompt` output + focusing system message |
| MVP call pattern | One LLM call per rule |
| Full call pattern | One LLM call evaluates all rules → `RuleJudgment[]` |
| MVP confidence | LLM self-reported `[0, 1]` |
| Full confidence | Composite (logprobs + evidence count + consistency) |
| Storage MVP | Filesystem `data/simple-rule-check-runs/<YYYYMMDD>/<runId>.json` |
| Storage Full | Filesystem `data/rule-check-runs/<YYYYMMDD>/<runId>.json`. **Neo4j write-back is forbidden** — Rule Checker never writes DataObject instances into the Ontology API (incl. no `RuleCheckResult`). Any cross-run analytics layer must use an out-of-Ontology external store. |
| API MVP | `checkRule()` only |
| API Full | `checkRule()` + `checkRules()` (batch) |
| Domain policy | MVP defaults to `RAAS-v1`. The earlier TEST-RAAS-v1 isolation requirement has been dropped per user decision — audit traces are local-only so blast radius is limited to what `ONTOLOGY_API_BASE` points at. |
| First MVP rule | `10-7` (期望薪资) — minimum data plumbing, full loop demonstrated |
| MVP rule cohort | `10-7`, `10-17`, `10-18`, `10-25`, **`10-32`** — 10 seed candidates + 2 Application records |
| Cross-object MVP rule | `10-32` 岗位冷冻期 — forces `GET /api/v1/ontology/instances/Application?candidate_id=...&job_requisition_id=...`; LLM evidence must cite `Application.<id>.status` |
| Seed initialization | Required: graph has NO test data initially; `scripts/simple-rule-check-seed.ts` boots 4 DataObject schemas via verification + writes 14 instances (2 jobs + 10 candidates + 2 Application) to `RAAS-v1` |
| Ontology API coupling | Checker depends on **4 read-only** API capabilities (rule retrieval, schema introspection, single-instance read, filtered listing). Instance upsert is **seed-script only** and not part of the Checker's runtime dependency surface. Never talks bolt:// Neo4j directly. |
| LLM provider lock | OpenAI Chat Completions API + `response_format: json_schema` strict |
| Block-semantic check | Skipped in MVP, enabled in v1.1 with rule classification metadata |
| Validation failure handling | No retry. Force `pending_human`, persist run, record failure tags |
| UI MVP | `/dev/simple-rule-check` dev preview, mirroring `/dev/generate-prompt`'s shape |
| UI Full | Commercial product UI at `/rule-check/*`, integrated into app shell |
| Audit Q&A | Manual trace inspection in MVP; LLM-powered Q&A in full impl |

---

## 16. Pre-plan thinking — for full `rule-check` impl

Notes to drive the next PLAN MODE session. These are working assumptions, not locked decisions.

### 16.1 The shape of the work

Full impl is **not** "MVP + more rules". It is a different architecture:

| Axis | MVP (`simple-rule-check`) | Full (`rule-check`) |
|---|---|---|
| Prompt source | Hand-built `extractor.ts` | **Verbatim consumption of `generatePrompt` output** + thin focusing system message |
| Call topology | 1 rule → 1 LLM call | All rules of an action → 1 LLM call → `RuleJudgment[]` |
| Aggregation | N/A | `aggregateDecision(judgments[]) → action-level decision` |
| Output | Plain `RuleJudgment` | `RuleJudgmentAudited` (§6.3) with provenance + counterfactuals |
| Storage | Filesystem only | Filesystem + out-of-Ontology external store (TBD) |
| Surfaces | CLI + dev UI | CLI + dev UI + **commercial product UI** at `/rule-check/*` |
| Coupling | Standalone | **Coupled upstream to `generatePrompt`**, downstream to `matchResume agent` (when built) |

### 16.2 Dependency order (what blocks what)

```
[A] Schema work (Ontology repo, external)
    ├── (a1) Add can_block + required_instances to Rule node
    └── (a2) [optional] Add RuleCheckResult-like audit nodes — NO, forbidden per §2
              (use external store instead — pick OpenSearch | ClickHouse | filesystem index)
                              │
[B] Module skeleton (lib/rule-check/)
    ├── (b1) types-audited.ts + RuleJudgmentAudited / RuleCheckRunAudited
    ├── (b2) prompt/full-action.ts  — consumes generatePrompt → produces eval prompt
    ├── (b3) orchestrator/all-in-one.ts  — one LLM call, all rules
    ├── (b4) confidence/composite.ts  — needs logprobs (validate provider supports)
    ├── (b5) validation/block-semantic.ts  — needs (a1)
    ├── (b6) checker.ts  — checkRules() actual impl
    └── (b7) store/external.ts  — pick + implement external store
                              │
[C] CLI + dev preview (scripts/rule-check.ts, /dev/rule-check)
                              │
[D] Commercial UI (/rule-check/*) — depends on (B) for audit-rich payload
    ├── (d1) Run detail page  — Layer 1-6 panels
    ├── (d2) Run list + filters
    ├── (d3) Diff view  — needs (B) promptProvenance
    ├── (d4) Ask-why panel  — needs (B) askWhyHistory schema + LLM call wiring
    ├── (d5) Dashboard
    ├── (d6) Compliance / audit pages
    └── (d7) Settings
                              │
[E] matchResume agent integration — separate work, but Full impl unlocks it
```

Bottleneck: **(A) — ontology schema work**. Block-semantic validation can't ship until rule classification metadata exists. Workaround during dev: hard-code a `rule_classification.json` in `lib/rule-check/` and migrate to ontology-driven once (a1) lands.

### 16.3 Risks worth flagging in plan

| Risk | Why it bites | Mitigation candidate |
|---|---|---|
| One-LLM-call hits context window | matchResume has 40+ rules. Combined rule text + per-rule instances could be 50k+ tokens. | Per-action-step batching as fallback. Add explicit token-count probe before sending. |
| `logprobs: true` unsupported by current LLM provider | Composite confidence needs it. Provider may return `null`. | Confidence calculator handles graceful degradation: if no logprobs, drop to `0.5 × evidenceCount + 0.5 × consistency`. |
| `generatePrompt` output not stable across calls (random ordering, timestamps) | promptProvenance.promptSha256 changes spuriously, breaks drift detection. | Verify `generatePrompt` is deterministic given identical inputs. If not, hash a normalized version (sorted keys, stripped timestamps). |
| Counterfactual hallucination | LLM-proposed counterfactuals could be wrong about what flips a verdict. | Don't trust them — UI labels them "speculative". Optionally run them through the actual Checker as a verification step (expensive). |
| External store choice paralysis | OpenSearch / ClickHouse / filesystem index / S3 — all viable, all wrong for some workload. | MVP-of-Full ships with filesystem-index (no infra). Migration path documented. |
| MVP / Full divergence | `simple-rule-check` could rot. | Decide explicitly: MVP accepts security/schema-drift fixes only, no feature work. Document in CLAUDE.md. |

### 16.4 Reuse map (verified against current code)

Already shipped, reuse as-is:
- `lib/ontology-gen/client.ts` — HTTP layer
- `lib/ontology-gen/errors.ts` — error hierarchy
- `lib/ontology-gen/fetch.ts:fetchAction` — rule retrieval
- `lib/ontology-gen/v4/projectActionObject` — **the entry point `rule-check` will call to get the prompt source**
- `lib/simple-rule-check/types.ts:Evidence, ValidationReport, ...` — base types Full impl extends
- `components/shared/atoms.tsx` — UI atoms
- `app/globals.css` — OKLCH tokens, dark mode

To-be-built atoms for the Prove UI (per §9.2 footer):
- `EvidenceCard` (with provenance link + grounded indicator)
- `PromptPanel` (3-tab: resolved / source actionObject / diff)
- `LogprobInlineChart` (only renders when logprobs available)
- `RootCauseTimeline` (4-section colored band layout)
- `DecisionBadge` (4-value styling)
- `ValidationLight` (4-cell)
- `RunDiffView`
- `AskWhyChat`

### 16.5 Open design questions for PLAN MODE

1. **External store pick** — OpenSearch (good for analytics + full-text search) vs ClickHouse (cheaper, better for time-series) vs plain filesystem index (zero-infra, MVP-friendly). Recommendation: start with filesystem index, design store interface so swap is later.

2. **Where does matchResume agent live?** — `lib/match-resume/` (new dir)? Or is it the orchestrator that calls into `lib/rule-check/` and lives… outside this repo (e.g., a worker process)?

3. **"Resolved prompt" capture timing** — capture once at prompt-build (cheap) vs allow re-fetching from `generatePrompt` for the diff view (more accurate but slower). Recommendation: capture once + store; diff view re-invokes `generatePrompt` lazily on user request.

4. **logprob fallback** — does dev want hard-fail (refuse to ship if provider doesn't support) or graceful degradation? Implies LLM client probe at startup.

5. **UI build order** — bottom-up (atoms → run detail → list → dashboard) vs top-down (dashboard skeleton → fill in)? My take: bottom-up. Run detail page is the highest-value standalone view; rest depend on its components.

6. **Rule classification metadata bootstrap path** — push ontology repo to extend Rule schema is the locked decision, but timeline is uncertain. While waiting, do we ship a temp local `rule_classification.json`?

7. **Re-run + diff** — does "re-run" persist as a new run with the original-runId linked, or as a sub-record of the original? My take: new run with `priorRunId` field; preserves linear timeline.
