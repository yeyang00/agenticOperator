# Agentic Operator · 智能体操作中枢

> An operations console for AI recruitment agents — monitor, orchestrate and debug fleets of agents from one screen.

[![Next.js](https://img.shields.io/badge/Next.js-16.2-black)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-19.2-149ECA)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)](https://www.typescriptlang.org)
[![Tailwind](https://img.shields.io/badge/Tailwind-4.2-06B6D4)](https://tailwindcss.com)
[![Node](https://img.shields.io/badge/Node-%E2%89%A522-339933)](https://nodejs.org)
[![License](https://img.shields.io/badge/license-private-lightgrey)]()

---

## What is this?

Agentic Operator is a **mission-control UI** for a fleet of AI agents that automate enterprise recruitment — from job-requirement intake to JD generation, multi-channel sourcing, resume parsing, candidate matching, AI interviewing, evaluation and final delivery to the customer. It is built for the human Ops team that *supervises* this fleet: HSMs (delivery leads), recruiters, platform engineers and compliance.

The product treats the recruitment pipeline as an **event-driven workflow** in the [Inngest](https://www.inngest.com) style:

```
REQUIREMENT_SYNCED → ANALYSIS_COMPLETED → JD_GENERATED → CHANNEL_PUBLISHED
       → RESUME_DOWNLOADED → MATCH_PASSED → AI_INTERVIEW_COMPLETED
       → EVALUATION_PASSED → PACKAGE_APPROVED → APPLICATION_SUBMITTED
```

Each transition is an event; each event has publishers, subscribers, retry policy, SLA and audit trail. The console makes that fabric **legible at a glance** — what's running, what's stuck, where money is being spent, what humans need to approve next.

This repository is the **frontend** — Next.js + TypeScript + Tailwind, using hard-coded mock data. There is no backend yet; the UI is wired to demonstrate the full information architecture and visual language so it can be plugged into a real event bus (Inngest, Temporal or self-hosted Kafka) and Agent runtime (LangGraph, custom) when those are ready.

---

## Why does it exist?

Recruitment-process-outsourcing (RPO) teams running AI agents face four problems no off-the-shelf observability tool solves cleanly:

1. **Heterogeneity.** A single hire touches a Workday-style ATS, four job boards, two LLM vendors, a vector DB, a meeting scheduler, and a customer portal. None of those tools know about each other; the Ops team holds the model in their heads.
2. **Mixed initiative.** Most steps are agent-driven, but JD approval, recommendation-package review, and clarification on incomplete requirements are **human-in-the-loop**. A purely-AI dashboard hides the human queue; a purely-human ticket tool hides the agent activity.
3. **Cost control.** Token spend, vendor API rate limits, and channel fees compound quickly. Finance wants per-customer, per-job, per-agent breakdowns in near real time.
4. **Compliance & audit.** EEO, PII handling, candidate consent, and customer NDAs are non-negotiable. Every event must be traceable, every model decision explainable, every override logged.

Agentic Operator answers all four with one IA: **events as the universal substrate**, six purpose-built views that pivot on those events, and a strict design system so dense data stays readable.

---

## Six views, one fabric

| Path | Direction | Audience | What you do here |
|---|---|---|---|
| `/fleet` | **A · Fleet Command** | All Ops | Mission-control dashboard. KPI strip, full agent table, alert rail, activity feed, compliance scorecard, pipeline funnel. The default landing page. |
| `/workflow` | **B · Workflow Canvas** | Platform engineers | Visual orchestration. Trigger → agents → branches → guardrails → human-in-the-loop → terminal. SVG graph with live packet animation; click any node to inspect tools, permissions, retry policy, SLA. |
| `/live` | **C · Live Run Theatre** | On-call recruiters | Single-run forensics. Swimlane timeline (one row per agent), decision stream with confidence scores, full call-tree trace, anomaly panel for triage. |
| `/events` | **D · Event Manager** | Engineers / Auditors | Inngest-style event bus. Registry grouped by stage, six tabs per event (Overview, Schema, Subscribers, Runs, History, Logs), live event firehose. |
| `/alerts` | **Alerts** | On-call | Triage-first incident view. KPIs (firing/ack/MTTR/noise), severity facets, table → 4-tab detail (Timeline, Related events, Rule definition, Runbook), on-call rota, silences. |
| `/datasources` | **Data Sources** | Platform / Compliance | All 24 external connectors — ATS systems, job boards, LLM vendors, vector DB, messaging, storage, identity. Health, throughput, field mappings, credentials, webhook deliveries, audit log. |

Every view shares one **AppBar** (logo, breadcrumbs, ⌘K command palette, realtime status pill, **language switcher (中文 / EN)**, **theme toggle (light / dark)**, alerts bell, avatar) and one **LeftNav** grouped by Operate / Build / Govern.

---

## Design language

Visual identity is intentionally **dense, calm and instrument-like** — closer to a Bloomberg terminal than a SaaS marketing dashboard. Three principles:

- **OKLCH color space** for tokens. Gives perceptually uniform shifts between light and dark themes with one variable redefinition.
- **Tabular numerals everywhere** money, latency or counts appear, so columns align without explicit widths.
- **One accent color**. Status is communicated by `ok / warn / err / info` semantic tokens; the accent (default deep blue) is reserved for selection and key calls-to-action.

Tokens live in [`app/globals.css`](app/globals.css); Tailwind utilities (`bg-surface`, `text-ink-2`, `border-line`, `bg-accent-bg`, …) are aliases that read those variables. Dark mode flips by setting `data-theme="dark"` on `<html>` — every component recolors automatically.

Typography: Inter for UI, JetBrains Mono for IDs / latency / payloads / event names.

---

## Architecture (frontend)

```
app/
  layout.tsx              wraps the tree in AppProvider (lang + theme + i18n)
  page.tsx                redirects / → /fleet
  <route>/page.tsx        thin: <Shell><FooContent /></Shell>
components/
  shared/
    Shell.tsx             AppBar + LeftNav + CommandPalette + direction tag
    AppBar.tsx            search · language toggle · theme toggle · avatar
    LeftNav.tsx           routes, active highlight, counts
    CommandPalette.tsx    ⌘K global launcher
    atoms.tsx             StatusDot · Spark · Metric · Badge · Btn · Card
    Ic.tsx                inline-SVG icon set (~30 icons)
  fleet/                  Fleet view content
  workflow/               Workflow canvas (SVG node graph)
  live/                   Live run + swimlane + decision stream
  events/                 Event registry + 6-tab detail + live firehose
  alerts/                 Alerts triage
  datasources/            24 connector grid + 6-tab detail
lib/
  i18n.tsx                AppProvider · zh/en dictionary · localStorage persist
  events-catalog.ts       28-event Inngest-style catalog
design_handoff_agentic_operator/   Original design references (do not import)
```

The UI is **client-rendered** (`"use client"` at the top of every route) because all interactivity — theme, language, command palette, live stream simulation — is browser-state. There are no API routes; data is hard-coded in each `*Content.tsx`.

For a more detailed working contract see [CLAUDE.md](CLAUDE.md).

---

## Tech stack

- **Framework:** Next.js 16.2 (App Router · Turbopack)
- **Runtime:** React 19.2 · Node ≥ 22 (developed against Node 25)
- **Language:** TypeScript 5 (strict)
- **Styling:** Tailwind CSS 4.2 — CSS-first config via `@theme inline` over OKLCH variables
- **State:** React Context (no global store needed at this fidelity)
- **Icons:** inline SVGs (zero icon-library dependency)
- **i18n:** custom flat-dictionary `t()` hook with `localStorage` persistence

The deployed version intentionally has **zero backend dependencies** so it can be hosted as a static export, run in a corporate VPN, or embedded in an internal portal with no infra setup.

---

## Getting started

```bash
# install
npm install

# dev — runs on port 3002, NOT 3000
npm run dev

# production build (also typechecks + lints)
npm run build
npm run start

# lint only
npm run lint
```

Then open <http://localhost:3002> — you'll land on `/fleet`.

Use the language toggle (中文 / EN) and theme toggle (sun / moon) in the top-right to verify both modes render correctly. Press **⌘K** (or **Ctrl+K**) anywhere to open the command palette.

### Configuration

Copy `.env.example` to `.env.local`. **The current frontend reads no environment variables**; the file is a scaffold for the eventual backend / LLM gateway integration. Existing scripts on `npm run dev` will work without touching it.

---

## Internationalization

Two locales ship today: **简体中文 (zh)** and **English (en)**. The dictionary is a flat object in [`lib/i18n.tsx`](lib/i18n.tsx); add a key under both locales and call `t("your_key")`. Nothing more.

Domain-specific copy that's mock-data only (e.g. customer names like "字节跳动", agent names like "ReqSync") is intentionally kept in the page components — only UI chrome and labels go through `t()`. This keeps the dictionary lean and lets the recruitment domain stay verbatim.

The user's choice is persisted to `localStorage` under `ao:lang`. First-load default is auto-detected from `navigator.language`.

---

## Theming

Light / dark themes share the same component code. Switching is one attribute on `<html>`:

```ts
document.documentElement.setAttribute("data-theme", "dark");
```

The dark block in `globals.css` redefines the same `--c-*` variable names with darker OKLCH values. Every Tailwind utility, every inline `style={{ background: "var(--c-line)" }}`, and every SVG fill via `currentColor` recolors automatically. The user's choice is persisted to `localStorage` under `ao:theme`.

---

## Roadmap

The shapes you see today are deliberately implementation-ready — no feature is mocked at lower fidelity than it would ship. The work to turn this into production:

- **Event bus.** Wire `lib/events-catalog.ts` to a real Inngest deployment (or self-hosted Temporal/Kafka). Replace the `setInterval` live-stream with SSE/WebSocket.
- **Agent runtime.** Hook the agent table on `/fleet` and the swimlane on `/live` to LangGraph (or whatever runtime ships). The schema here is `Run` + `Span` + `Event`.
- **Connector integrations.** Replace the 24 hard-coded sources on `/datasources` with a manifest pulled from the platform.
- **Alerts engine.** Today's alerts are static; future is rule definitions evaluated by Prometheus / SQL DSL with feishu / wecom / email webhook fan-out.
- **Workflow editor.** `/workflow` currently renders a fixed graph. Migrate to [React Flow](https://reactflow.dev) for drag-edit-publish.
- **Auth + multi-tenant.** Workspace switcher, role-based view access, audit log.
- **Mobile read-only view.** Alerts + Live ops on a phone for on-call.

---

## Repository layout

| Path | Purpose |
|---|---|
| [`app/`](app) | Next.js App Router — one folder per route |
| [`components/`](components) | UI components, grouped by route + `shared/` |
| [`lib/`](lib) | i18n provider, event catalog |
| [`design_handoff_agentic_operator/`](design_handoff_agentic_operator) | Original design references — **reference only, do not import** |
| [`tailwind.config.ts`](tailwind.config.ts) | Token → utility aliases |
| [`app/globals.css`](app/globals.css) | OKLCH design tokens (light + dark) |
| [`CLAUDE.md`](CLAUDE.md) | Contract for AI coding agents touching this repo |
| [`.env.example`](.env.example) | Future-backend env scaffold |

---

## License

Private — internal use only. Not licensed for external distribution.

---

<sub>Built from the *Agentic Operator* design handoff package by Claude Design. Visual style by the design team; engineering by you and your favorite agent.</sub>
