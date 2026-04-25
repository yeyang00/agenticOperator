# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` — start the dev server on **port 3002** (not 3000; configured in `package.json`).
- `npm run build` — production build. Use this to surface TypeScript errors; `next build` runs typecheck + lint.
- `npm run start` — serve the production build on port 3002.
- `npm run lint` — `next lint`.

There is no test suite configured.

## Architecture

This is a frontend-only Next.js 14 (App Router) implementation of **Agentic Operator** — a control-plane UI for AI recruitment agents. All data is hard-coded mock data; there is no backend, API routes, or fetch layer.

### Top-level shape

`app/layout.tsx` wraps the entire tree in `AppProvider` from [lib/i18n.tsx](lib/i18n.tsx). Every route is a thin client component (`"use client"`) that renders `<Shell>` + a `*Content` component. **The `Shell` is the single source of chrome** (AppBar, LeftNav, CommandPalette, direction tag) — page files only pass `crumbs` and the direction tag string.

```
app/<route>/page.tsx   ← thin: returns <Shell crumbs={...}><FooContent /></Shell>
components/<route>/    ← all the real markup lives here
components/shared/     ← Shell + AppBar + LeftNav + CommandPalette + atoms + Ic
lib/i18n.tsx           ← AppProvider: lang (zh/en) + theme (light/dark) + t(key)
lib/events-catalog.ts  ← 28-event Inngest-style catalog used by /events
```

Routes implemented: `/fleet` (Direction A), `/workflow` (B), `/live` (C), `/events` (D), `/alerts`, `/datasources`. `/` redirects to `/fleet`.

### Design system — read this before styling anything

Visual identity is defined as **OKLCH CSS variables in [app/globals.css](app/globals.css)**. Tailwind theme colors in [tailwind.config.ts](tailwind.config.ts) are *aliases* that read those variables (`bg: "var(--c-bg)"`, etc.). Dark mode is toggled by setting `data-theme="dark"` on `<html>` (managed by `AppProvider`); the dark block in `globals.css` redefines the same variable names.

Practical consequence: never hardcode colors. Use Tailwind utilities (`bg-surface`, `border-line`, `text-ink-1`, `text-ok`, `bg-accent-bg`) **or** inline `style={{ background: "var(--c-ok)" }}`. Both auto-respond to theme changes. The `oklch(...)` fragments scattered through page components (e.g. `oklch(0.5 0.14 75)` for the warn ink) are intentional — they're shades that don't have token slots and were copied 1:1 from the design references.

The atoms in [components/shared/atoms.tsx](components/shared/atoms.tsx) (`StatusDot`, `Spark`, `Metric`, `Badge`, `Btn`, `Card`, `CardHead`) and the `.tbl` class in `globals.css` cover ~all repeated chrome. Reach for those before inventing one-off styled divs.

Icons live in [components/shared/Ic.tsx](components/shared/Ic.tsx) as a flat object (`Ic.search`, `Ic.bolt`, …). The `IcName` type is the union of keys — pages that pass icons through props (palette items, nav items) accept `IcName` strings rather than rendered nodes, then look them up.

### i18n

`useApp()` exposes `{ t, lang, setLang, theme, setTheme }`. The dictionary is two flat objects in [lib/i18n.tsx](lib/i18n.tsx) — when adding a string, add it under both `zh` and `en`. Keys are short and namespaced by area (`nav_*`, `m_*` for metrics, `wf_*` for workflow, `em_*` for events, `agent_*`, `evt_*`, etc.). `lang` and `theme` are persisted to `localStorage` under `ao:lang` / `ao:theme`.

Domain copy that's mock-data-only (e.g. agent names like "ReqSync", customer names like "字节跳动") is intentionally hardcoded in the page components — only UI chrome and labels go through `t()`.

### Design references

`design_handoff_agentic_operator/` contains the original handoff package: a README spec, `styles.css` (token source of truth), and Babel-transpiled-in-browser JSX prototypes for each direction. **Do not import from this folder** — it's reference material. When extending a page, the corresponding `direction-*.jsx` or `page-*.jsx` file is the visual ground truth.

### Reading a page component

Each `*Content.tsx` follows the same skeleton:

1. Mock data declared at the top (or imported from `lib/`).
2. Sub-header / KPI strip.
3. 2- or 3-column CSS grid for the body (typical `gridTemplateColumns: "232px 1fr 320px"`).
4. Local sub-components for cards, rows, etc., kept in the same file unless reused across routes.

The Workflow page ([components/workflow/WorkflowContent.tsx](components/workflow/WorkflowContent.tsx)) is the one exception with non-trivial logic: nodes + edges are positioned on a `1620×560` SVG viewBox and edges are computed from node coordinates. If you reposition nodes, the edges follow automatically.
