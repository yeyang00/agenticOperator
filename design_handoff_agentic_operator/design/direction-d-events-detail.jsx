/* global React, useT, Ic, StatusDot, EVENT_CATALOG, kindDot */

// ===== Center: Event Detail panel (tabs) =====
function EventDetail({ event, tab, setTab }) {
  const { t } = useT();
  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: 0, background: "var(--c-panel)" }}>
      <EventDetailHeader event={event} />
      <EventDetailTabs tab={tab} setTab={setTab} />
      <div style={{ flex: 1, overflow: "auto" }}>
        {tab === "overview" && <TabOverview event={event} />}
        {tab === "schema"   && <TabSchema event={event} />}
        {tab === "subs"     && <TabSubscribers event={event} />}
        {tab === "runs"     && <TabRuns event={event} />}
        {tab === "history"  && <TabHistory event={event} />}
        {tab === "logs"     && <TabLogs event={event} />}
      </div>
    </div>
  );
}

function EventDetailHeader({ event }) {
  const { t } = useT();
  const isError = event.kind === "error";
  return (
    <div style={{ padding: "16px 22px", background: "var(--c-surface)", borderBottom: "1px solid var(--c-line)" }}>
      <div className="row" style={{ marginBottom: 8 }}>
        <span style={{
          width: 30, height: 30, borderRadius: 6, display: "grid", placeItems: "center",
          background: `color-mix(in oklab, ${kindDot(event.kind)} 14%, transparent)`,
          border: `1px solid color-mix(in oklab, ${kindDot(event.kind)} 32%, transparent)`,
          color: kindDot(event.kind),
        }}>
          {event.kind === "error" ? <Ic.alert />
            : event.kind === "gate" ? <Ic.branch />
            : event.kind === "trigger" ? <Ic.bolt />
            : <Ic.bolt />}
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="mono" style={{ fontSize: 15, fontWeight: 600, letterSpacing: "-0.005em", color: isError ? "var(--c-err)" : "var(--c-ink-1)" }}>
            {event.name}
          </div>
          <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>{event.desc}</div>
        </div>
        <span className="badge info">v2 · schema</span>
        <span className={"badge " + (event.err > 0 ? "warn" : "ok")}>
          <span className="bdot" />{event.err > 0 ? `${event.err} err / 24h` : "healthy · 24h"}
        </span>
      </div>

      <div style={{ display: "flex", gap: 18, marginTop: 12 }}>
        <HeaderStat label="24h 发布" value={event.rate.toLocaleString()} />
        <HeaderStat label="P95 投递" value="84ms" tone="ok" />
        <HeaderStat label={t("em_subscribers")} value={event.subscribers.length} />
        <HeaderStat label={t("em_retention")} value="90d" />
        <HeaderStat label={t("em_persistence")} value="PostgreSQL + S3" muted />
        <div style={{ flex: 1 }} />
        <button className="btn sm"><Ic.play /> {t("em_replay")}</button>
        <button className="btn sm"><Ic.pause /> {t("em_pause")}</button>
        <button className="btn sm ghost"><Ic.dots /></button>
      </div>
    </div>
  );
}

function HeaderStat({ label, value, tone, muted }) {
  const col = tone === "ok" ? "var(--c-ok)" : "var(--c-ink-1)";
  return (
    <div>
      <div className="hint">{label}</div>
      <div className="mono" style={{ fontSize: 13.5, fontWeight: 600, color: col, opacity: muted ? 0.75 : 1, fontFeatureSettings: '"tnum"' }}>{value}</div>
    </div>
  );
}

function EventDetailTabs({ tab, setTab }) {
  const { t } = useT();
  const tabs = [
    { id: "overview", label: t("em_tab_overview") },
    { id: "schema",   label: t("em_tab_schema") },
    { id: "subs",     label: t("em_tab_subs") },
    { id: "runs",     label: t("em_tab_runs") },
    { id: "history",  label: t("em_tab_history") },
    { id: "logs",     label: t("em_tab_logs") },
  ];
  return (
    <div style={{ borderBottom: "1px solid var(--c-line)", background: "var(--c-surface)", padding: "0 14px", display: "flex", gap: 2 }}>
      {tabs.map((tb) => (
        <button key={tb.id} onClick={() => setTab(tb.id)} style={{
          background: "transparent", border: 0,
          padding: "10px 12px", fontSize: 12.5,
          color: tab === tb.id ? "var(--c-ink-1)" : "var(--c-ink-3)",
          fontWeight: tab === tb.id ? 600 : 500,
          borderBottom: tab === tb.id ? "2px solid var(--c-accent)" : "2px solid transparent",
          cursor: "pointer",
        }}>
          {tb.label}
        </button>
      ))}
    </div>
  );
}

// ----- Overview tab -----
function TabOverview({ event }) {
  const { t } = useT();
  const emitsEvents = event.emits || [];
  return (
    <div style={{ padding: 22, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
      <Card title={t("em_publishers")} count={event.publishers.length}>
        {event.publishers.map((p, i) => <EntityRow key={i} icon={<Ic.cpu />} name={p} meta={i === 0 ? "primary" : "fallback"} tone="info" />)}
      </Card>
      <Card title={t("em_subscribers")} count={event.subscribers.length}>
        {event.subscribers.map((s, i) => <EntityRow key={i} icon={<Ic.plug />} name={s} meta={`step.waitForEvent · #${i+1}`} />)}
      </Card>

      <Card title={t("em_source_action")} span>
        <EMKV rows={[
          ["source.action", "analyzeRequirement"],
          ["triggered_by", t("actor_agent") + " · ReqAnalyzer"],
          ["idempotency_key", "req_id + analysis_nonce"],
          ["dedupe_window", "60s"],
        ]} />
      </Card>

      <Card title={t("em_triggers_workflow") + " · 下游"} count={emitsEvents.length} span>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {emitsEvents.length === 0 && <div className="muted" style={{ fontSize: 12.5, padding: 8 }}>— 终端事件 · 无下游 —</div>}
          {emitsEvents.map((ev, i) => {
            const target = EVENT_CATALOG.find((x) => x.name === ev);
            return (
              <div key={i} style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "8px 10px", borderRadius: 5,
                background: "var(--c-panel)", border: "1px solid var(--c-line)",
              }}>
                <span className="mono" style={{ fontSize: 10.5, color: "var(--c-ink-4)" }}>emit →</span>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: kindDot(target?.kind || "domain") }} />
                <span className="mono" style={{ fontSize: 11.5, fontWeight: 600 }}>{ev}</span>
                <div style={{ flex: 1 }} />
                <span className="mono" style={{ fontSize: 10.5, color: "var(--c-ink-4)" }}>{target ? `${target.rate}/h` : "—"}</span>
              </div>
            );
          })}
        </div>
      </Card>

      <Card title={t("em_mutations")} count={event.mutations.length} span>
        {event.mutations.length === 0 && <div className="muted" style={{ fontSize: 12.5, padding: 8 }}>— 该事件不修改状态 —</div>}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {event.mutations.map((m, i) => (
            <span key={i} className="badge" style={{ background: "var(--c-panel)", border: "1px solid var(--c-line)" }}>
              <Ic.db /> {m}
            </span>
          ))}
        </div>
      </Card>

      <Card title={t("em_delivery") + " · Inngest"}>
        <EMKV rows={[
          ["delivery", "at-least-once"],
          ["concurrency", "25 / function"],
          ["rate_limit", "500/min · per job_id"],
          ["retries", "5 · exp. backoff 30s→30m"],
          ["timeout", "30s"],
        ]} />
      </Card>
      <Card title={t("em_persistence")}>
        <EMKV rows={[
          ["log_store", "PostgreSQL · events_log"],
          ["payload_blob", "S3 · ao-events/2025-…"],
          ["retention", "90 天 · WORM · 合规"],
          ["index", "name + job_requisition_id + ts"],
          ["GDPR", "PII 字段加密 · 字段级"],
        ]} />
      </Card>
    </div>
  );
}

function Card({ title, count, children, span }) {
  return (
    <div style={{
      gridColumn: span ? "1 / -1" : undefined,
      border: "1px solid var(--c-line)", borderRadius: 8, background: "var(--c-surface)", overflow: "hidden",
    }}>
      <div style={{ padding: "10px 14px", borderBottom: "1px solid var(--c-line)", display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ fontSize: 12, fontWeight: 600, flex: 1, letterSpacing: "-0.005em" }}>{title}</div>
        {count != null && <span className="mono" style={{ fontSize: 10.5, color: "var(--c-ink-4)" }}>{count}</span>}
      </div>
      <div style={{ padding: 12 }}>{children}</div>
    </div>
  );
}

function EntityRow({ icon, name, meta, tone }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 4px", borderBottom: "1px dashed var(--c-line)" }}>
      <span style={{
        width: 22, height: 22, borderRadius: 5, display: "grid", placeItems: "center",
        background: tone === "info" ? "var(--c-info-bg)" : "var(--c-panel)",
        color: tone === "info" ? "var(--c-info)" : "var(--c-ink-2)",
        border: "1px solid var(--c-line)",
      }}>{icon}</span>
      <span style={{ fontSize: 12.5, fontWeight: 500, flex: 1 }}>{name}</span>
      <span className="mono" style={{ fontSize: 10.5, color: "var(--c-ink-4)" }}>{meta}</span>
    </div>
  );
}

function EMKV({ rows }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", columnGap: 14, rowGap: 6, fontSize: 12 }}>
      {rows.map(([k, v], i) => (
        <React.Fragment key={i}>
          <div className="mono" style={{ color: "var(--c-ink-4)", fontSize: 11 }}>{k}</div>
          <div className="mono" style={{ color: "var(--c-ink-1)", fontSize: 11.5 }}>{v}</div>
        </React.Fragment>
      ))}
    </div>
  );
}

// ----- Schema tab -----
function TabSchema({ event }) {
  const { t } = useT();
  return (
    <div style={{ padding: 22, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, alignItems: "start" }}>
      <div>
        <Card title="event_data · payload fields" count={event.data.length}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr auto", rowGap: 0 }}>
            <div className="mono" style={{ fontSize: 10.5, color: "var(--c-ink-4)", padding: "4px 6px", borderBottom: "1px solid var(--c-line)", letterSpacing: "0.04em", textTransform: "uppercase" }}>field</div>
            <div className="mono" style={{ fontSize: 10.5, color: "var(--c-ink-4)", padding: "4px 6px", borderBottom: "1px solid var(--c-line)", letterSpacing: "0.04em", textTransform: "uppercase", textAlign: "right" }}>type</div>
            {event.data.map(([k, tp], i) => (
              <React.Fragment key={i}>
                <div style={{ padding: "8px 6px", borderBottom: i === event.data.length - 1 ? 0 : "1px dashed var(--c-line)", fontFamily: "var(--f-mono)", fontSize: 11.5 }}>{k}</div>
                <div style={{ padding: "8px 6px", borderBottom: i === event.data.length - 1 ? 0 : "1px dashed var(--c-line)", textAlign: "right" }}>
                  <span className="mono" style={{ fontSize: 10.5, color: "var(--c-info)", background: "var(--c-info-bg)", padding: "2px 6px", borderRadius: 4, border: "1px solid color-mix(in oklab, var(--c-info) 20%, transparent)" }}>{tp}</span>
                </div>
              </React.Fragment>
            ))}
          </div>
        </Card>

        <div style={{ height: 14 }} />

        <Card title={t("em_mutations") + " · state_mutations"} count={event.mutations.length}>
          {event.mutations.length === 0 && <div className="muted" style={{ fontSize: 12.5, padding: 6 }}>无状态变更 · pure signal event</div>}
          {event.mutations.map((m, i) => (
            <div key={i} style={{
              padding: "8px 10px",
              border: "1px solid var(--c-line)",
              borderRadius: 5,
              marginBottom: 6,
              background: "var(--c-panel)",
              display: "flex", alignItems: "center", gap: 8,
            }}>
              <Ic.db />
              <span className="mono" style={{ fontSize: 12, fontWeight: 600 }}>{m}</span>
              <span className="badge info" style={{ marginLeft: "auto" }}>CREATE_OR_MODIFY</span>
            </div>
          ))}
        </Card>
      </div>

      <div>
        <Card title="Sample payload · JSON">
          <pre style={{
            margin: 0, padding: 14,
            background: "oklch(0.22 0.01 260)", color: "oklch(0.92 0.01 260)",
            fontFamily: "var(--f-mono)", fontSize: 11,
            borderRadius: 6, overflow: "auto", lineHeight: 1.55,
            border: "1px solid oklch(0.28 0.01 260)",
          }}>
{`{
  "name": "${event.name}",
  "ts":   "2025-01-14T14:06:04.812Z",
  "id":   "evt_01HQ9K7MZE3XFN2P8T5RA6WQ0V",
  "data": {
${event.data.map(([k, tp]) => `    "${k}": ${sampleFor(k, tp)}`).join(",\n")}
  },
  "user": { "hsm_id": "u_482", "tenant": "icbc" },
  "meta": {
    "source":  "${event.publishers[0] || 'system'}",
    "trace_id":"tr_7b3c29e1d2",
    "schema":  "v2",
    "idempotency": "${event.name.toLowerCase()}:\${job_id}"
  }
}`}
          </pre>
        </Card>

        <div style={{ height: 14 }} />

        <Card title="JSON Schema · validation">
          <pre style={{
            margin: 0, padding: 14,
            background: "var(--c-panel)", color: "var(--c-ink-2)",
            fontFamily: "var(--f-mono)", fontSize: 10.5,
            borderRadius: 6, overflow: "auto", lineHeight: 1.5,
            border: "1px solid var(--c-line)",
          }}>
{`{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title":   "${event.name}",
  "type":    "object",
  "required":[${event.data.slice(0,2).map(([k]) => `"${k}"`).join(",")}],
  "properties": {
${event.data.map(([k, tp]) => `    "${k}": { "type": "${jsonType(tp)}" }`).join(",\n")}
  },
  "additionalProperties": false
}`}
          </pre>
        </Card>
      </div>
    </div>
  );
}

function sampleFor(key, type) {
  if (key.includes("_id"))       return '"req_2041"';
  if (key.includes("_url"))      return '"s3://ao-events/resumes/8821.pdf"';
  if (key === "confidence_rating" || key === "matching_score") return "0.83";
  if (key === "complexity_score") return "0.74";
  if (key === "extracted_skills") return '["Java","Spring Cloud","Kafka","MySQL"]';
  if (key === "analysis_duration_ms") return "1820";
  if (type === "Boolean")        return "true";
  if (type === "Integer")        return "42";
  if (type === "Float")          return "0.92";
  if (type.startsWith("List"))   return '["…"]';
  if (type === "Array")          return '[]';
  if (type === "Object")         return "{}";
  if (type === "Enum")           return '"HIGH"';
  if (type === "Date")           return '"2025-02-10"';
  return '"…"';
}
function jsonType(t) {
  if (t === "Integer" || t === "Float") return "number";
  if (t === "Boolean") return "boolean";
  if (t === "Array" || t.startsWith("List")) return "array";
  if (t === "Object") return "object";
  return "string";
}

// ----- Subscribers tab -----
function TabSubscribers({ event }) {
  const { t } = useT();
  const allSubs = event.subscribers.map((s, i) => ({
    fn: s,
    match: "event.name == '" + event.name + "'" + (i === 0 ? "" : " && event.data.is_urgent == true"),
    concurrency: [25, 12, 8, 4, 2][i] ?? 2,
    runs24h: Math.max(0, event.rate - i * Math.round(event.rate * 0.15)),
    success: 98.2 + (i % 3) * 0.4,
    p95: 120 + i * 80,
    status: i === 0 ? "active" : i === 1 ? "active" : i === 2 ? "active" : "paused",
  }));
  return (
    <div style={{ padding: 22 }}>
      <Card title={"Inngest functions · 订阅 " + event.name} count={allSubs.length}>
        <div>
          <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1.6fr repeat(4, 0.8fr)", gap: 0, alignItems: "center", padding: "6px 8px", borderBottom: "1px solid var(--c-line)", fontSize: 10.5, color: "var(--c-ink-4)", letterSpacing: "0.06em", textTransform: "uppercase", fontWeight: 600 }}>
            <div>function</div><div>match · if</div>
            <div style={{ textAlign: "right" }}>conc.</div>
            <div style={{ textAlign: "right" }}>runs 24h</div>
            <div style={{ textAlign: "right" }}>success</div>
            <div style={{ textAlign: "right" }}>P95</div>
          </div>
          {allSubs.map((s, i) => (
            <div key={i} style={{
              display: "grid", gridTemplateColumns: "1.4fr 1.6fr repeat(4, 0.8fr)",
              alignItems: "center", padding: "10px 8px",
              borderBottom: i === allSubs.length - 1 ? 0 : "1px dashed var(--c-line)",
              fontSize: 12, fontFeatureSettings: '"tnum"',
            }}>
              <div className="row" style={{ gap: 8 }}>
                <StatusDot kind={s.status === "active" ? "ok" : "paused"} />
                <span className="mono" style={{ fontSize: 11.5, fontWeight: 600 }}>{s.fn}</span>
                {s.status === "paused" && <span className="badge">paused</span>}
              </div>
              <div className="mono" style={{ fontSize: 10.5, color: "var(--c-ink-3)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.match}</div>
              <div className="mono" style={{ textAlign: "right", fontSize: 11 }}>{s.concurrency}</div>
              <div className="mono" style={{ textAlign: "right", fontSize: 11 }}>{s.runs24h.toLocaleString()}</div>
              <div className="mono" style={{ textAlign: "right", fontSize: 11, color: s.success >= 99 ? "var(--c-ok)" : "var(--c-ink-1)" }}>{s.success.toFixed(1)}%</div>
              <div className="mono" style={{ textAlign: "right", fontSize: 11 }}>{s.p95}ms</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ----- Runs tab -----
function TabRuns({ event }) {
  const runs = [
    { id: "run_01HQ…7MZE", fn: event.subscribers[0], state: "completed", took: "1.82s",  started: "14:06:04", steps: 7, attempts: 1, trigger: event.name },
    { id: "run_01HQ…7MZF", fn: event.subscribers[0], state: "completed", took: "2.14s",  started: "14:06:02", steps: 7, attempts: 1, trigger: event.name },
    { id: "run_01HQ…7MZG", fn: event.subscribers[1] || event.subscribers[0], state: "running",  took: "0:01:04", started: "14:06:01", steps: 4, attempts: 1, trigger: event.name },
    { id: "run_01HQ…7MZH", fn: event.subscribers[0], state: "failed",    took: "0.92s",   started: "14:05:58", steps: 3, attempts: 2, trigger: event.name, error: "TOOL_TIMEOUT · llm.extract" },
    { id: "run_01HQ…7MZJ", fn: event.subscribers[0], state: "completed", took: "1.68s",  started: "14:05:52", steps: 7, attempts: 1, trigger: event.name },
    { id: "run_01HQ…7MZK", fn: event.subscribers[0], state: "waiting",   took: "—",     started: "14:05:44", steps: 2, attempts: 1, trigger: event.name, waitOn: "CLARIFICATION_RETRY" },
    { id: "run_01HQ…7MZL", fn: event.subscribers[0], state: "completed", took: "1.92s",  started: "14:05:41", steps: 7, attempts: 1, trigger: event.name },
    { id: "run_01HQ…7MZM", fn: event.subscribers[0], state: "completed", took: "1.44s",  started: "14:05:38", steps: 7, attempts: 1, trigger: event.name },
  ];
  const stateDot = {
    completed: "var(--c-ok)", running: "var(--c-info)", failed: "var(--c-err)",
    waiting: "oklch(0.5 0.14 75)", paused: "var(--c-ink-3)",
  };
  return (
    <div style={{ padding: 22 }}>
      <Card title="Function runs · 最近 10 分钟" count={runs.length}>
        <div>
          <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1.4fr 0.8fr 0.8fr 0.8fr 0.6fr 1.4fr", gap: 0, alignItems: "center", padding: "6px 8px", borderBottom: "1px solid var(--c-line)", fontSize: 10.5, color: "var(--c-ink-4)", letterSpacing: "0.06em", textTransform: "uppercase", fontWeight: 600 }}>
            <div>run</div><div>function</div>
            <div>state</div>
            <div style={{ textAlign: "right" }}>took</div>
            <div style={{ textAlign: "right" }}>started</div>
            <div style={{ textAlign: "right" }}>steps</div>
            <div>detail</div>
          </div>
          {runs.map((r, i) => (
            <div key={i} style={{
              display: "grid", gridTemplateColumns: "1.4fr 1.4fr 0.8fr 0.8fr 0.8fr 0.6fr 1.4fr",
              alignItems: "center", padding: "10px 8px",
              borderBottom: i === runs.length - 1 ? 0 : "1px dashed var(--c-line)",
              fontSize: 11.5, fontFeatureSettings: '"tnum"',
            }}>
              <div className="mono" style={{ fontSize: 10.5, color: "var(--c-ink-3)" }}>{r.id}</div>
              <div className="mono" style={{ fontSize: 11, fontWeight: 500 }}>{r.fn}</div>
              <div className="row" style={{ gap: 6 }}>
                <span style={{ width: 7, height: 7, borderRadius: "50%", background: stateDot[r.state], boxShadow: `0 0 0 3px color-mix(in oklab, ${stateDot[r.state]} 18%, transparent)` }} />
                <span className="mono" style={{ fontSize: 10.5 }}>{r.state}</span>
                {r.attempts > 1 && <span className="mono" style={{ fontSize: 10, color: "var(--c-err)" }}>×{r.attempts}</span>}
              </div>
              <div className="mono" style={{ textAlign: "right" }}>{r.took}</div>
              <div className="mono" style={{ textAlign: "right", color: "var(--c-ink-3)" }}>{r.started}</div>
              <div className="mono" style={{ textAlign: "right" }}>{r.steps}</div>
              <div className="mono" style={{ fontSize: 10.5, color: r.error ? "var(--c-err)" : "var(--c-ink-3)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {r.error || (r.waitOn ? `⏸ wait for ${r.waitOn}` : "—")}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ----- History tab -----
function TabHistory({ event }) {
  const { t } = useT();
  // Sparkline-ish bar chart of 24h rate
  const bars = Array.from({ length: 24 }, (_, i) => {
    const base = event.rate / 24;
    const noise = Math.sin(i * 0.8) * 0.45 + Math.cos(i * 1.3) * 0.25;
    return Math.max(0, Math.round(base * (1 + noise)));
  });
  const errBars = bars.map((v) => Math.round(v * 0.004 * (event.err / Math.max(1, event.rate / 1000))));
  const maxV = Math.max(...bars, 1);
  return (
    <div style={{ padding: 22 }}>
      <Card title="过去 24 小时 · 事件速率" count={event.rate.toLocaleString() + " total"}>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 140, padding: "6px 2px" }}>
          {bars.map((v, i) => (
            <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
              <div style={{ height: `${(v / maxV) * 110}px`, width: "100%", background: "color-mix(in oklab, var(--c-accent) 65%, transparent)", borderRadius: "3px 3px 0 0", position: "relative" }}>
                {errBars[i] > 0 && <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: `${Math.min(100, (errBars[i] / v) * 100)}%`, background: "var(--c-err)", borderRadius: "3px 3px 0 0" }} />}
              </div>
              <span className="mono" style={{ fontSize: 8.5, color: "var(--c-ink-4)" }}>{i}</span>
            </div>
          ))}
        </div>
      </Card>

      <div style={{ height: 14 }} />

      <Card title={t("em_versions") + " · schema evolution"}>
        <div>
          {[
            { ver: "v2", date: "2025-01-08", by: "HSM·treasury", note: "add `confidence_rating` · breaking" },
            { ver: "v1.4", date: "2024-11-22", by: "AI·schema-bot", note: "rename: `match_score`→`confidence_rating`" },
            { ver: "v1.3", date: "2024-10-05", by: "HSM·ops", note: "add `analysis_duration_ms`" },
            { ver: "v1.0", date: "2024-07-01", by: "初版", note: "initial" },
          ].map((v, i) => (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "60px 100px 140px 1fr", gap: 10, padding: "8px 6px", borderBottom: i === 3 ? 0 : "1px dashed var(--c-line)", fontSize: 12 }}>
              <span className="mono" style={{ fontSize: 11, fontWeight: 600, color: i === 0 ? "var(--c-accent)" : "var(--c-ink-3)" }}>{v.ver}</span>
              <span className="mono" style={{ fontSize: 10.5, color: "var(--c-ink-4)" }}>{v.date}</span>
              <span style={{ fontSize: 11.5 }}>{v.by}</span>
              <span className="mono" style={{ fontSize: 10.5, color: "var(--c-ink-3)" }}>{v.note}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
// ----- Logs tab -----
function TabLogs({ event }) {
  const logs = [
    { t: "14:06:04.812", lv: "info",  msg: `event.published ${event.name} · payload=1.4kb` },
    { t: "14:06:04.814", lv: "info",  msg: `→ dispatch to ${event.subscribers[0]} (conc 3/25)` },
    { t: "14:06:04.816", lv: "info",  msg: `→ persisted · S3 key ao-events/2025-01-14/${event.name.toLowerCase()}/01HQ7MZE` },
    { t: "14:06:04.892", lv: "info",  msg: `${event.subscribers[0]} step.run resolved in 68ms` },
    { t: "14:06:04.910", lv: "warn",  msg: `replay triggered for run_01HQ…7MZH · attempt 2` },
    { t: "14:06:05.124", lv: "info",  msg: `schema validated ok · v2` },
    { t: "14:06:05.288", lv: "error", msg: `llm.extract timeout 30s · run_01HQ…7MZH FAILED` },
    { t: "14:06:05.290", lv: "info",  msg: `deadletter · 1 run → dlq.${event.name.toLowerCase()}` },
    { t: "14:06:05.431", lv: "info",  msg: `consumer lag = 0ms · P95 = 84ms` },
    { t: "14:06:05.612", lv: "debug", msg: `event.data.job_requisition_id=JD-2041 tenant=icbc` },
    { t: "14:06:05.842", lv: "info",  msg: `audit trail committed · user=u_482 · tenant=icbc` },
  ];
  const lvCol = { info: "var(--c-ink-2)", warn: "oklch(0.5 0.14 75)", error: "var(--c-err)", debug: "var(--c-ink-4)" };
  return (
    <div style={{ padding: 22 }}>
      <Card title="Runtime logs · structured · tail">
        <div style={{
          fontFamily: "var(--f-mono)", fontSize: 11,
          background: "oklch(0.22 0.01 260)",
          border: "1px solid oklch(0.28 0.01 260)",
          borderRadius: 6,
          padding: "10px 12px",
          maxHeight: 360, overflow: "auto",
          lineHeight: 1.55,
          color: "oklch(0.85 0.01 260)",
        }}>
          {logs.map((l, i) => (
            <div key={i} style={{ display: "flex", gap: 10 }}>
              <span style={{ color: "oklch(0.6 0.02 260)" }}>{l.t}</span>
              <span style={{ width: 44, color: lvCol[l.lv], textTransform: "uppercase", fontSize: 10 }}>{l.lv}</span>
              <span>{l.msg}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ===== Right rail: live stream of events =====
function EventLiveStream() {
  const { t } = useT();
  const tw = (window.useTweakContext ? window.useTweakContext().tw : null);
  const tweakEnabled = !tw || tw.liveStream !== false;
  const tempoMs = Math.max(300, Math.round(((tw && tw.streamSpeed) || 1.4) * 1000));
  const [paused, setPaused] = React.useState(false);
  const effectivePaused = paused || !tweakEnabled;
  const [items, setItems] = React.useState(() => seedStream());
  React.useEffect(() => {
    if (effectivePaused) return;
    const id = setInterval(() => {
      setItems((prev) => [randomEvent(), ...prev].slice(0, 20));
    }, tempoMs);
    return () => clearInterval(id);
  }, [effectivePaused, tempoMs]);

  return (
    <aside style={{ borderLeft: "1px solid var(--c-line)", background: "var(--c-surface)", display: "flex", flexDirection: "column", minHeight: 0 }}>
      <div style={{ padding: "12px 14px", borderBottom: "1px solid var(--c-line)", display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ fontSize: 13, fontWeight: 600, flex: 1 }}>{t("em_stream")}</div>
        <span className="badge info"><span className="bdot" />{effectivePaused ? (tweakEnabled ? "paused" : "off") : "live"}</span>
        <button className="btn sm ghost" style={{ padding: "0 6px" }} onClick={() => setPaused((p) => !p)} disabled={!tweakEnabled}>
          {effectivePaused ? <Ic.play /> : <Ic.pause />}
        </button>
      </div>
      <div style={{ padding: "8px 10px", borderBottom: "1px solid var(--c-line)", display: "flex", gap: 6 }}>
        <input placeholder="filter: name, job_id…" style={{
          flex: 1, height: 24, border: "1px solid var(--c-line)", background: "var(--c-panel)",
          borderRadius: 4, padding: "0 8px", fontFamily: "var(--f-mono)", fontSize: 10.5, color: "var(--c-ink-1)", outline: "none",
        }} />
        <button className="btn sm ghost" style={{ padding: "0 6px" }} title="filter"><Ic.grid /></button>
      </div>
      <div style={{ flex: 1, overflow: "auto", minHeight: 0 }}>
        {items.map((e, i) => (
          <StreamRow key={e.id} e={e} isNew={i === 0 && !effectivePaused} />
        ))}
      </div>
      <div style={{ padding: "10px 14px", borderTop: "1px solid var(--c-line)", display: "flex", alignItems: "center", fontSize: 11, color: "var(--c-ink-4)" }}>
        <span className="mono">{items.length} shown · 4,827/min</span>
        <div style={{ flex: 1 }} />
        <button className="btn sm ghost" style={{ padding: "0 6px" }}>{t("em_replay")}</button>
      </div>
    </aside>
  );
}

function StreamRow({ e, isNew }) {
  const [fresh, setFresh] = React.useState(isNew);
  React.useEffect(() => {
    if (!fresh) return;
    const id = setTimeout(() => setFresh(false), 900);
    return () => clearTimeout(id);
  }, [fresh]);
  const ev = EVENT_CATALOG.find((x) => x.name === e.name);
  const dot = kindDot(ev?.kind || "domain");
  return (
    <div style={{
      padding: "8px 12px",
      borderBottom: "1px solid var(--c-line)",
      background: fresh ? "color-mix(in oklab, var(--c-accent) 10%, transparent)" : "transparent",
      transition: "background 0.9s ease-out",
      display: "flex", alignItems: "flex-start", gap: 8,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: dot, marginTop: 6, flexShrink: 0, boxShadow: `0 0 0 3px color-mix(in oklab, ${dot} 18%, transparent)` }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="row" style={{ gap: 6, marginBottom: 2 }}>
          <span className="mono" style={{ fontSize: 10, color: "var(--c-ink-4)" }}>{e.t}</span>
          <span className="mono" style={{ fontSize: 11, fontWeight: 600, color: e.isErr ? "var(--c-err)" : "var(--c-ink-1)" }}>{e.name}</span>
        </div>
        <div className="mono" style={{ fontSize: 10, color: "var(--c-ink-4)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          job={e.job} · tenant={e.tenant} · {e.sub}
        </div>
      </div>
    </div>
  );
}

function seedStream() {
  const now = new Date();
  const out = [];
  for (let i = 0; i < 16; i++) {
    const d = new Date(now.getTime() - i * 4200);
    out.push(randomEvent(d));
  }
  return out;
}

let _ctr = 1000;
function randomEvent(dateOverride) {
  const d = dateOverride || new Date();
  const pool = EVENT_CATALOG.filter((e) => e.rate > 20);
  const ev = pool[Math.floor(Math.random() * pool.length)];
  const tenants = ["icbc", "ping-an", "weipinhui", "bytedance", "didi", "alibaba"];
  const jobs = ["JD-2041", "JD-2039", "JD-2037", "JD-2033", "JD-2029", "JD-2024"];
  _ctr += 1;
  return {
    id: "evt_" + _ctr,
    name: ev.name,
    isErr: ev.kind === "error" || ev.kind === "gate",
    t: d.toTimeString().slice(0, 8) + "." + String(d.getMilliseconds()).padStart(3, "0"),
    job: jobs[Math.floor(Math.random() * jobs.length)],
    tenant: tenants[Math.floor(Math.random() * tenants.length)],
    sub: ev.subscribers[0],
  };
}

window.EventDetail = EventDetail;
window.EventLiveStream = EventLiveStream;
