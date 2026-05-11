/**
 * /dev/action-preview — runtime resolveActionObject demo.
 *
 * Dev-only, URL-only (not in LeftNav). Reads `?ref=&domain=&client=&dept=&strategy=`.
 * Strategies: v3 (default, runs old runtime), v4-1 (runtime LLM + cache),
 * v4-2 (function template), v4-3 (static literal template), v4-4
 * (Chinese fill-in template with original rule prose).
 */

import { resolveActionObject, OntologyGenError } from "@/lib/ontology-gen";
import { resolveActionObjectV4 } from "@/lib/ontology-gen/v4";
import type { ActionObject } from "@/lib/ontology-gen";
import type { ActionObjectV4, PromptStrategy } from "@/lib/ontology-gen/v4";

import { PreviewForm } from "./Form";

export const dynamic = "force-dynamic";

type AnyStrategy = "v3" | PromptStrategy;

const PREVIEW_CHAR_LIMIT = 12_000;
const JSON_PREVIEW_CHAR_LIMIT = 16_000;

interface PreviewSearchParams {
  ref?: string;
  domain?: string;
  client?: string;
  dept?: string;
  strategy?: string;
  full?: string;
  llm?: string;
}

interface PageProps {
  searchParams: Promise<PreviewSearchParams>;
}

interface ResolveOkV3 { ok: true; kind: "v3"; obj: ActionObject; }
interface ResolveOkV4 { ok: true; kind: "v4"; obj: ActionObjectV4; }
interface ResolveError {
  ok: false;
  errorName: string;
  message: string;
  details?: unknown;
}
type ResolveResult = ResolveOkV3 | ResolveOkV4 | ResolveError;

export default async function ActionPreviewPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const ref = sp.ref?.trim();
  const domain = sp.domain?.trim();
  const client = sp.client?.trim() || undefined;
  const dept = sp.dept?.trim() || undefined;
  const strategy = (sp.strategy?.trim() as AnyStrategy) || "v3";
  const full = sp.full === "1";
  const allowRuntimeLlm = sp.llm === "1";
  const fullHref = makePreviewHref(sp, { full: full ? undefined : "1" });
  const safeHref = makePreviewHref(sp, { full: undefined });

  let result: ResolveResult | null = null;
  if (ref && domain) {
    result = await resolve(strategy, ref, domain, client, dept, allowRuntimeLlm);
  }

  return (
    <main className="min-h-screen bg-bg p-6 font-sans text-ink-1">
      <header className="mb-4">
        <h1 className="text-lg font-semibold text-ink-1">
          Action Preview <span className="ml-2 text-xs font-normal text-ink-3">— dev tool</span>
        </h1>
        <p className="mt-1 text-xs text-ink-3">
          Renders an Action&apos;s prompt for an LLM agent. Strategy {`{`}v3 / v4-1 / v4-2 / v4-3 / v4-4{`}`}
          selects the resolution path. Token never leaves the server.
        </p>
      </header>

      <PreviewForm />

      <section className="mt-6">
        {result === null ? (
          <p className="text-sm text-ink-3">
            Enter an action ref and domain, then click Resolve.
          </p>
        ) : result.ok && result.kind === "v3" ? (
          <ResultPanelsV3 obj={result.obj} full={full} fullHref={fullHref} safeHref={safeHref} />
        ) : result.ok && result.kind === "v4" ? (
          <ResultPanelsV4 obj={result.obj} full={full} fullHref={fullHref} safeHref={safeHref} />
        ) : (
          <ErrorPanel error={result as ResolveError} />
        )}
      </section>
    </main>
  );
}

async function resolve(
  strategy: AnyStrategy,
  ref: string,
  domain: string,
  client: string | undefined,
  clientDepartment: string | undefined,
  allowRuntimeLlm: boolean,
): Promise<ResolveResult> {
  try {
    if (strategy === "v3") {
      const obj = await resolveActionObject({ actionRef: ref, domain, client, clientDepartment });
      return { ok: true, kind: "v3", obj };
    }
    if (strategy === "v4-1" && !allowRuntimeLlm) {
      return {
        ok: false,
        errorName: "RuntimeLlmDisabled",
        message:
          "v4-1 performs runtime LLM transforms and can take a long time. Add &llm=1 to the URL to run it intentionally, or use v4-2/v4-3/v4-4 for a no-LLM preview.",
      };
    }
    const obj = await resolveActionObjectV4({
      actionRef: ref,
      domain,
      client,
      strategy: strategy as PromptStrategy,
    });
    return { ok: true, kind: "v4", obj };
  } catch (err) {
    if (err instanceof OntologyGenError) {
      return {
        ok: false,
        errorName: err.name,
        message: err.message,
        details: err.details,
      };
    }
    return {
      ok: false,
      errorName: err instanceof Error ? err.constructor.name : "UnexpectedError",
      message: err instanceof Error ? err.message : String(err),
    };
  }
}

function ResultPanelsV3({
  obj,
  full,
  fullHref,
  safeHref,
}: {
  obj: ActionObject;
  full: boolean;
  fullHref: string;
  safeHref: string;
}) {
  const ruleCount = obj.actionSteps.reduce((n, s) => n + s.rules.length, 0);
  const jsonText = full
    ? JSON.stringify(obj, null, 2)
    : JSON.stringify(summarizeV3(obj, ruleCount), null, 2);
  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-3">
        <Stat label="strategy" value="v3" />
        <Stat label="action" value={obj.meta.actionName} />
        <Stat label="id" value={obj.meta.actionId} />
        <Stat label="domain" value={obj.meta.domain} />
        <Stat label="template" value={obj.meta.templateVersion} />
        <Stat label="rules" value={String(ruleCount)} />
        <Stat label="compiledAt" value={obj.meta.compiledAt} />
      </div>
      <PreviewModeNotice full={full} fullHref={fullHref} safeHref={safeHref} />
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Prompt (markdown)">
          <PreviewPre text={obj.prompt} full={full} limit={PREVIEW_CHAR_LIMIT} />
        </Panel>
        <Panel title="ActionObject (JSON)">
          <PreviewPre text={jsonText} full={full} limit={JSON_PREVIEW_CHAR_LIMIT} />
        </Panel>
      </div>
    </div>
  );
}

function ResultPanelsV4({
  obj,
  full,
  fullHref,
  safeHref,
}: {
  obj: ActionObjectV4;
  full: boolean;
  fullHref: string;
  safeHref: string;
}) {
  const validationStatus =
    obj.meta.validation.roundTripFailures.length === 0 &&
    obj.meta.validation.missingInstructions.length === 0
      ? "ok"
      : "warning";
  const jsonText = full
    ? JSON.stringify(obj, null, 2)
    : JSON.stringify(summarizeV4(obj), null, 2);
  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-3">
        <Stat label="strategy" value={obj.meta.promptStrategy} />
        <Stat label="action" value={obj.meta.actionName} />
        <Stat label="id" value={obj.meta.actionId} />
        <Stat label="domain" value={obj.meta.domain} />
        <Stat label="client" value={obj.meta.client ?? "(none)"} />
        <Stat label="template" value={obj.meta.templateVersion} />
        <Stat label="compiledAt" value={obj.meta.compiledAt} />
        <Stat
          label="validation"
          value={
            validationStatus === "ok"
              ? "ok"
              : `${obj.meta.validation.roundTripFailures.length} fail / ${obj.meta.validation.missingInstructions.length} missing`
          }
        />
      </div>
      <PreviewModeNotice full={full} fullHref={fullHref} safeHref={safeHref} />
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Prompt (markdown)">
          <PreviewPre text={obj.prompt} full={full} limit={PREVIEW_CHAR_LIMIT} />
        </Panel>
        <Panel title="ActionObjectV4 (JSON)">
          <PreviewPre text={jsonText} full={full} limit={JSON_PREVIEW_CHAR_LIMIT} />
        </Panel>
      </div>
    </div>
  );
}

function ErrorPanel({ error }: { error: ResolveError }) {
  return (
    <div className="rounded-lg border border-err bg-err-bg p-4">
      <div className="mb-1 text-sm font-semibold text-err">{error.errorName}</div>
      <div className="font-mono text-xs text-ink-1">{error.message}</div>
      {error.details ? (
        <pre className="mt-2 overflow-auto whitespace-pre-wrap font-mono text-[11px] text-ink-2">
          {JSON.stringify(error.details, null, 2)}
        </pre>
      ) : null}
    </div>
  );
}

function PreviewModeNotice({
  full,
  fullHref,
  safeHref,
}: {
  full: boolean;
  fullHref: string;
  safeHref: string;
}) {
  return (
    <div className="mb-3 rounded-lg border border-line bg-surface px-3 py-2 text-xs text-ink-3">
      {full ? (
        <>
          Rendering full output. This can make the browser slow for large templates.{" "}
          <a className="font-medium text-accent hover:underline" href={safeHref}>
            Return to safe preview
          </a>
          .
        </>
      ) : (
        <>
          Safe preview mode is active. Long prompt and JSON fields are summarized to keep the page responsive.{" "}
          <a className="font-medium text-accent hover:underline" href={fullHref}>
            Render full output
          </a>
          .
        </>
      )}
    </div>
  );
}

function PreviewPre({ text, full, limit }: { text: string; full: boolean; limit: number }) {
  const clipped = full ? text : clipText(text, limit);
  return (
    <>
      <pre className="max-h-[70vh] overflow-auto whitespace-pre-wrap break-words font-mono text-xs leading-relaxed text-ink-1">
        {clipped}
      </pre>
      {!full && text.length > limit ? (
        <div className="mt-2 border-t border-line pt-2 text-xs text-ink-4">
          Showing {limit.toLocaleString()} of {text.length.toLocaleString()} characters.
        </div>
      ) : null}
    </>
  );
}

function clipText(text: string, limit: number): string {
  if (text.length <= limit) return text;
  return `${text.slice(0, limit)}\n\n[truncated ${text.length - limit} characters in safe preview mode]`;
}

function summarizeV3(obj: ActionObject, ruleCount: number) {
  return {
    kind: "v3",
    meta: obj.meta,
    action: {
      id: obj.id,
      name: obj.name,
      description: obj.description,
      category: obj.category,
      actor: obj.actor,
      trigger: obj.trigger,
      targetObjects: obj.targetObjects,
      triggeredEvents: obj.triggeredEvents,
    },
    counts: {
      inputs: obj.inputs.length,
      outputs: obj.outputs.length,
      steps: obj.actionSteps.length,
      rules: ruleCount,
      promptCharacters: obj.prompt.length,
    },
    sections: Object.fromEntries(
      Object.entries(obj.sections).map(([key, value]) => [
        key,
        value === null
          ? null
          : {
              characters: value.length,
              preview: clipText(value, 800),
            },
      ]),
    ),
    note: "Safe preview omits the full prompt and full ActionObject JSON. Use full=1 to render the complete object.",
  };
}

function summarizeV4(obj: ActionObjectV4) {
  return {
    kind: "v4",
    meta: obj.meta,
    counts: {
      promptCharacters: obj.prompt.length,
      roundTripFailures: obj.meta.validation.roundTripFailures.length,
      missingInstructions: obj.meta.validation.missingInstructions.length,
    },
    promptPreview: clipText(obj.prompt, 2_000),
    note: "Safe preview omits the full prompt from the JSON panel. Use full=1 to render the complete object.",
  };
}

function makePreviewHref(
  sp: PreviewSearchParams,
  updates: Partial<Record<keyof PreviewSearchParams, string | undefined>>,
): string {
  const next = new URLSearchParams();
  const keys: Array<keyof PreviewSearchParams> = [
    "ref",
    "domain",
    "client",
    "dept",
    "strategy",
    "full",
    "llm",
  ];
  for (const key of keys) {
    const value = updates[key] ?? sp[key];
    if (value) next.set(key, value);
  }
  for (const [key, value] of Object.entries(updates)) {
    if (value === undefined) next.delete(key);
  }
  const query = next.toString();
  return query ? `/dev/action-preview?${query}` : "/dev/action-preview";
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <span>
      <span className="text-ink-4">{label}:</span>{" "}
      <span className="font-mono text-ink-2">{value}</span>
    </span>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="min-w-0 overflow-hidden rounded-lg border border-line bg-surface shadow-sh-1">
      <header className="border-b border-line px-3 py-2 text-xs font-semibold uppercase tracking-wide text-ink-3">
        {title}
      </header>
      <div className="p-3">{children}</div>
    </section>
  );
}
