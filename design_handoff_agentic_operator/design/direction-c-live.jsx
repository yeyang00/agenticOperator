/* global React, useT, AppBar, LeftNav, Ic, DirectionTag, CommandPalette, StatusDot, Spark */

// ===== Direction C: Live Run Theatre =====
// Real-time trace of a single run: left run list, center swimlane timeline + decision stream, right metrics/anomaly panel

function LiveRunArtboard() {
  const { t } = useT();
  const [cmdkOpen, setCmdkOpen] = React.useState(false);

  const runs = [
    { id: "RUN-J2041", job: "工行 · 高级后端工程师 · 上海", started: "14:02", dur: "00:04:21", status: "running", tokens: "1.82M", cost: "¥12.41", current: true },
    { id: "RUN-J2040", job: "平安 · ML 工程师 · 远程",      started: "13:58", dur: "00:02:14", status: "review",  tokens: "612k", cost: "¥4.80" },
    { id: "RUN-J2039", job: "微众 · 产品设计师 · 北京",    started: "13:41", dur: "00:03:02", status: "ok",      tokens: "841k", cost: "¥5.32" },
    { id: "RUN-J2038", job: "字节 · 前端工程师 · 深圳",    started: "13:33", dur: "00:01:48", status: "ok",      tokens: "412k", cost: "¥3.12" },
    { id: "RUN-J2037", job: "滴滴 · 增长 PM · 远程",         started: "13:18", dur: "00:04:55", status: "err",     tokens: "201k", cost: "¥1.88" },
    { id: "RUN-J2036", job: "阿里 · 数据科学家 · 杭州",    started: "13:02", dur: "00:02:40", status: "ok",      tokens: "722k", cost: "¥4.44" },
  ];

  // swimlanes — one row per ontology agent + one human lane
  const lanes = [
    { agent: "ReqSync",        events: [
      { s: 0,  e: 4,  kind: "ok",   label: "RMS.pull · JD-2041" },
      { s: 4,  e: 7,  kind: "ok",   label: "REQUIREMENT_SYNCED" },
    ]},
    { agent: "ReqAnalyzer",    events: [
      { s: 7,  e: 14, kind: "ok",   label: "LLM.extract·技能+薪资" },
      { s: 14, e: 18, kind: "warn", label: "缺失: 年限下限" },
    ]},
    { agent: "HSM · 人工",      events: [
      { s: 18, e: 22, kind: "hitl", label: "CLARIFICATION_RETRY" },
    ]},
    { agent: "JDGenerator",    events: [
      { s: 22, e: 32, kind: "ok",   label: "LLM.generateJD" },
      { s: 32, e: 36, kind: "tool", label: "compliance.lint" },
    ]},
    { agent: "Publisher",      events: [
      { s: 36, e: 42, kind: "ok",   label: "前程无忧·51·智联" },
      { s: 42, e: 46, kind: "err",  label: "BOSS API 429" },
      { s: 46, e: 50, kind: "ok",   label: "retry·恢复" },
    ]},
    { agent: "ResumeParser",   events: [
      { s: 50, e: 64, kind: "ok",   label: "parse 3102 · OCR+LLM" },
    ]},
    { agent: "Matcher",        events: [
      { s: 64, e: 76, kind: "ok",   label: "硬性+加分+负向" },
      { s: 76, e: 78, kind: "warn", label: "低置信: 12" },
    ]},
    { agent: "AIInterviewer",  events: [
      { s: 78, e: 90, kind: "ok",   label: "conduct 88 · voice" },
      { s: 90, e: 92, kind: "err",  label: "audio.jitter" },
    ]},
    { agent: "Evaluator",      events: [
      { s: 92, e: 96, kind: "ok",   label: "rubric + bias check" },
    ]},
    { agent: "PackageBuilder", events: [
      { s: 96, e: 100, kind: "hitl", label: "等待 HSM 审批" },
    ]},
  ];

  const decisions = [
    { t: "14:06:12", agent: "Matcher",        type: "decision", text: "CAND-8821 匹配度 0.92 · 硬性 5/6 · 加分 +12 (Spring Cloud + 金融背景)。进入 AI 面试。", conf: 0.92 },
    { t: "14:06:09", agent: "Matcher",        type: "tool",     text: "调用 LLM.classify(model=haiku-4-5, tokens=4,218) · scoring rubric v3.2", conf: null },
    { t: "14:06:04", agent: "AIInterviewer",  type: "anomaly",  text: "音频抖动超过阈值 320ms，已自动重连。候选人体验评分下降 0.12。", conf: null, sev: "med" },
    { t: "14:05:58", agent: "AIInterviewer",  type: "decision", text: "候选人对“分布式事务”的回答置信度 0.61，追加 1 个场景题。", conf: 0.71 },
    { t: "14:05:41", agent: "ResumeParser",   type: "decision", text: "12 份简历置信度 <0.6 (模糊字段)，标记 RESUME_LOCKED_PENDING · 待人工复核。", conf: 0.58 },
    { t: "14:05:22", agent: "Publisher",      type: "tool",     text: "渠道发布 · 前程/智联/猛聘/BOSS · 4 个渠道 · CHANNEL_PUBLISHED", conf: null },
    { t: "14:05:08", agent: "Publisher",      type: "anomaly",  text: "BOSS 直聘返回 429 Too Many Requests · 退避 2s 重试 · 恢复。", conf: null, sev: "low" },
    { t: "14:04:51", agent: "JDGenerator",    type: "decision", text: "生成 4 条渠道变体 (前程/智联/猛聘/BOSS)，合规预检 ✓。JD_GENERATED。", conf: 0.94 },
    { t: "14:04:11", agent: "ReqAnalyzer",    type: "decision", text: "检测到缺失关键字段：年限下限 · 触发 CLARIFICATION_RETRY → HSM。", conf: 0.88 },
    { t: "14:03:04", agent: "ReqSync",        type: "tool",     text: "拉取客户 RMS 职位 JD-2041 · rev=42 · REQUIREMENT_SYNCED", conf: null },
  ];

  const trace = [
    { lv: 0, label: "run.start", detail: "RUN-J2041 · workflow: Client→Submit v4.2", t: "+0.00s" },
    { lv: 1, label: "ReqSync.execute", detail: "input: {client_id:ICBC, job_id:JD-2041}", t: "+0.04s" },
    { lv: 2, label: "tool: rms.pull", detail: "REQUIREMENT_SYNCED · 812ms", t: "+0.86s" },
    { lv: 1, label: "ReqAnalyzer.execute", detail: "ANALYSIS_COMPLETED · completeness=0.83", t: "+18.1s" },
    { lv: 2, label: "⚠ CLARIFICATION_RETRY", detail: "missing: years_min → HSM queue", t: "+22.3s" },
    { lv: 1, label: "JDGenerator.execute", detail: "JD_GENERATED · 4 channel variants", t: "+1m 12s" },
    { lv: 1, label: "Publisher.execute", detail: "CHANNEL_PUBLISHED · 51Job+Zhilian+Liepin", t: "+1m 56s" },
    { lv: 2, label: "⚠ channel.boss 429", detail: "retry · recovered", t: "+2m 11s" },
    { lv: 1, label: "ResumeParser.execute", detail: "3102 parsed · OCR+LLM", t: "+2m 50s" },
    { lv: 1, label: "Matcher.execute", detail: "2802 scored · top 88", t: "+3m 04s" },
    { lv: 1, label: "AIInterviewer.execute", detail: "88 conducted · voice mode", t: "+3m 42s" },
    { lv: 2, label: "⚠ audio.jitter", detail: "320ms > 280ms threshold · recovered", t: "+4m 01s" },
  ];

  return (
    <div className="ao-frame" data-screen-label="C Live Run Theatre">
      <AppBar
        crumbs={[t("nav_group_operate"), t("nav_runs"), "RUN-J2041"]}
        onOpenCmdK={() => setCmdkOpen(true)}
      />
      <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
        <LeftNav active="runs" />
        <div style={{ flex: 1, display: "grid", gridTemplateColumns: "260px 1fr 320px", minHeight: 0 }}>

          {/* run list */}
          <aside style={{ borderRight: "1px solid var(--c-line)", background: "var(--c-surface)", display: "flex", flexDirection: "column", minHeight: 0 }}>
            <div style={{ padding: "12px 14px", borderBottom: "1px solid var(--c-line)", display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ flex: 1, fontSize: 13, fontWeight: 600 }}>{t("nav_runs")}</div>
              <span className="badge info"><span className="bdot" />{t("realtime")}</span>
            </div>
            <div style={{ padding: "8px 10px", borderBottom: "1px solid var(--c-line)", display: "flex", gap: 6 }}>
              <button className="btn sm" style={{ flex: 1 }}>全部</button>
              <button className="btn sm ghost">运行中</button>
              <button className="btn sm ghost">失败</button>
            </div>
            <div style={{ flex: 1, overflow: "auto" }}>
              {runs.map((r) => (
                <div key={r.id} style={{
                  padding: "12px 14px",
                  borderBottom: "1px solid var(--c-line)",
                  background: r.current ? "var(--c-accent-bg)" : "transparent",
                  borderLeft: r.current ? "2px solid var(--c-accent)" : "2px solid transparent",
                  cursor: "pointer",
                }}>
                  <div className="row" style={{ marginBottom: 4 }}>
                    <span className="mono" style={{ fontSize: 11, color: r.current ? "var(--c-accent)" : "var(--c-ink-3)", fontWeight: 600 }}>{r.id}</span>
                    <div style={{ flex: 1 }} />
                    <StatusDot kind={r.status === "running" ? "ok" : r.status === "err" ? "err" : r.status === "review" ? "warn" : "info"} />
                  </div>
                  <div style={{ fontSize: 12.5, fontWeight: 500, marginBottom: 2, lineHeight: 1.3 }}>{r.job}</div>
                  <div className="mono muted" style={{ fontSize: 10.5 }}>
                    {r.started} · {r.dur} · {r.tokens}
                  </div>
                </div>
              ))}
            </div>
          </aside>

          {/* center: timeline + decisions */}
          <div style={{ display: "flex", flexDirection: "column", minHeight: 0, overflow: "auto" }}>
            {/* header */}
            <div style={{ padding: "16px 22px", borderBottom: "1px solid var(--c-line)", background: "var(--c-surface)" }}>
              <div className="row" style={{ marginBottom: 6 }}>
                <span className="mono" style={{ fontSize: 11, color: "var(--c-accent)", fontWeight: 600 }}>RUN-J2041</span>
                <span className="badge ok pulse"><span className="bdot" />{t("s_running")}</span>
                <div style={{ flex: 1 }} />
                <button className="btn sm ghost"><Ic.pause /> 暂停</button>
                <button className="btn sm ghost">导出轨迹</button>
                <button className="btn sm danger">中止</button>
              </div>
              <div style={{ fontSize: 17, fontWeight: 600, letterSpacing: "-0.015em" }}>工行 · 高级后端工程师 · 上海 · JD-2041</div>
              <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>Workflow: Client→Submit v4.2 · 启动 14:02:41 · 已运行 4m 21s · 当前阶段 PACKAGE_GENERATED→待审批</div>
              <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 14 }}>
                <MiniStat label={t("live_tokens")} value="1.82M" sub="+8.4k/s" />
                <MiniStat label={t("live_latency") + " P50"} value="820ms" sub="→ within SLA" ok />
                <MiniStat label={t("live_decisions")} value="47" sub="3 low-conf" warn />
                <MiniStat label={t("live_tools")} value="128" sub="12 tools" />
                <MiniStat label="成本" value="¥12.41" sub="budget ¥30" ok />
              </div>
            </div>

            {/* timeline */}
            <div style={{ padding: "16px 22px", borderBottom: "1px solid var(--c-line)" }}>
              <div className="row" style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{t("live_timeline")}</div>
                <span className="hint" style={{ marginLeft: 10 }}>swimlane · per agent</span>
                <div style={{ flex: 1 }} />
                <div className="hint">↕ {lanes.length} agents · ↔ 4m 21s</div>
              </div>
              <Swimlane lanes={lanes} />
            </div>

            {/* decisions stream */}
            <div style={{ padding: "16px 22px", flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
              <div className="row" style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>决策流 · Decision stream</div>
                <div style={{ flex: 1 }} />
                <button className="btn sm ghost"><Ic.search /> 过滤</button>
              </div>
              <div style={{
                border: "1px solid var(--c-line)",
                borderRadius: 8,
                background: "var(--c-surface)",
                overflow: "hidden",
                flex: 1,
              }}>
                {decisions.map((d, i) => (
                  <DecisionRow key={i} d={d} last={i === decisions.length - 1} />
                ))}
              </div>
            </div>
          </div>

          {/* right: trace + anomaly */}
          <aside style={{ borderLeft: "1px solid var(--c-line)", background: "var(--c-surface)", display: "flex", flexDirection: "column", minHeight: 0 }}>
            <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--c-line)", display: "flex", alignItems: "center" }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{t("live_trace")}</div>
              <div style={{ flex: 1 }} />
              <button className="btn sm ghost"><Ic.dots /></button>
            </div>
            <div style={{ flex: 1, overflow: "auto", padding: "8px 4px" }}>
              {trace.map((x, i) => (
                <div key={i} style={{ display: "flex", gap: 8, padding: "4px 12px", alignItems: "flex-start" }}>
                  <span className="mono" style={{ fontSize: 10, color: "var(--c-ink-4)", width: 52, flexShrink: 0 }}>{x.t}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="mono" style={{ fontSize: 11, color: x.label.startsWith("⚠") ? "var(--c-err)" : "var(--c-ink-1)", paddingLeft: x.lv * 10 }}>
                      {x.label}
                    </div>
                    <div className="mono muted" style={{ fontSize: 10.5, paddingLeft: x.lv * 10 }}>{x.detail}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* anomaly card */}
            <div style={{ borderTop: "1px solid var(--c-line)", padding: 14 }}>
              <div className="row" style={{ marginBottom: 8 }}>
                <span style={{
                  width: 22, height: 22, borderRadius: 5,
                  display: "grid", placeItems: "center",
                  background: "var(--c-warn-bg)", color: "oklch(0.5 0.14 75)",
                }}><Ic.alert /></span>
                <span style={{ fontSize: 13, fontWeight: 600 }}>{t("live_anomaly")}</span>
                <div style={{ flex: 1 }} />
                <span className="badge warn">{t("al_sev_med")}</span>
              </div>
              <div style={{ fontSize: 12.5, fontWeight: 500, marginBottom: 2 }}>AIInterviewer · 音频抖动</div>
              <div className="muted" style={{ fontSize: 11.5, lineHeight: 1.45 }}>
                连续 3 次 ping 超过 280ms 阈值。已自动重连，候选人体验评分下降 0.12。建议检查 WebRTC 边缘节点。
              </div>
              <div style={{ marginTop: 10, display: "flex", gap: 6 }}>
                <button className="btn sm primary" style={{ flex: 1 }}>{t("live_investigate")}</button>
                <button className="btn sm">{t("live_ack")}</button>
                <button className="btn sm ghost">{t("live_suppress")}</button>
              </div>
            </div>
          </aside>
        </div>
      </div>

      <DirectionTag label={t("dirC")} />
      <CommandPalette open={cmdkOpen} onClose={() => setCmdkOpen(false)} />
    </div>
  );
}

function MiniStat({ label, value, sub, ok, warn }) {
  const col = warn ? "oklch(0.5 0.14 75)" : ok ? "var(--c-ok)" : "var(--c-ink-3)";
  return (
    <div>
      <div className="hint">{label}</div>
      <div style={{ fontSize: 18, fontWeight: 600, fontFamily: "var(--f-sans)", letterSpacing: "-0.01em", fontFeatureSettings: '"tnum"' }}>{value}</div>
      <div className="mono" style={{ fontSize: 10.5, color: col }}>{sub}</div>
    </div>
  );
}

function Swimlane({ lanes }) {
  const rowH = 34;
  return (
    <div style={{ border: "1px solid var(--c-line)", borderRadius: 8, overflow: "hidden", background: "var(--c-surface)" }}>
      {/* axis */}
      <div style={{ display: "grid", gridTemplateColumns: "130px 1fr", borderBottom: "1px solid var(--c-line)", background: "var(--c-panel)" }}>
        <div style={{ padding: "6px 12px", fontSize: 10.5, color: "var(--c-ink-4)", letterSpacing: "0.06em", textTransform: "uppercase", borderRight: "1px solid var(--c-line)" }}>Agent</div>
        <div style={{ position: "relative", height: 22 }}>
          {[0, 20, 40, 60, 80, 100].map((p) => (
            <div key={p} style={{ position: "absolute", left: `${p}%`, top: 4, fontSize: 10, color: "var(--c-ink-4)", fontFamily: "var(--f-mono)" }}>
              {p === 0 ? "0" : p === 100 ? "4m 21s" : `${Math.round(p * 0.0421 * 60)}s`}
            </div>
          ))}
        </div>
      </div>

      {lanes.map((ln, i) => (
        <div key={i} style={{ display: "grid", gridTemplateColumns: "130px 1fr", borderBottom: i < lanes.length - 1 ? "1px solid var(--c-line)" : 0 }}>
          <div style={{ padding: "0 12px", display: "flex", alignItems: "center", gap: 6, fontSize: 12, borderRight: "1px solid var(--c-line)", background: "var(--c-panel)" }}>
            <StatusDot kind="ok" />
            <span style={{ fontWeight: 500 }}>{ln.agent}</span>
          </div>
          <div style={{ position: "relative", height: rowH }}>
            {/* grid ticks */}
            {[20, 40, 60, 80].map((p) => (
              <div key={p} style={{ position: "absolute", left: `${p}%`, top: 0, bottom: 0, width: 1, background: "var(--c-line)", opacity: 0.6 }} />
            ))}
            {ln.events.map((ev, j) => {
              const col =
                ev.kind === "ok" ? "var(--c-accent)" :
                ev.kind === "tool" ? "var(--c-info)" :
                ev.kind === "warn" ? "var(--c-warn)" :
                ev.kind === "err" ? "var(--c-err)" :
                ev.kind === "hitl" ? "oklch(0.5 0.14 75)" :
                "var(--c-ink-3)";
              const bg =
                ev.kind === "ok" ? "color-mix(in oklab, var(--c-accent) 18%, transparent)" :
                ev.kind === "tool" ? "var(--c-info-bg)" :
                ev.kind === "warn" ? "var(--c-warn-bg)" :
                ev.kind === "err" ? "var(--c-err-bg)" :
                ev.kind === "hitl" ? "var(--c-warn-bg)" :
                "var(--c-panel)";
              return (
                <div key={j} style={{
                  position: "absolute",
                  left: `${ev.s}%`, width: `calc(${ev.e - ev.s}% - 2px)`,
                  top: 5, bottom: 5,
                  background: bg,
                  border: `1px solid ${col}`,
                  borderLeft: `3px solid ${col}`,
                  borderRadius: 4,
                  display: "flex", alignItems: "center",
                  padding: "0 6px",
                  fontSize: 10.5, color: "var(--c-ink-1)",
                  whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                }}>
                  {ev.label}
                </div>
              );
            })}
            {/* live cursor on last lane if there's a hitl, else at end of content */}
            {i === lanes.length - 1 && (
              <div style={{
                position: "absolute", left: "96%", top: 0, bottom: 0, width: 2,
                background: "var(--c-accent)",
              }}>
                <div style={{
                  position: "absolute", top: -3, left: -4, width: 10, height: 10, borderRadius: "50%",
                  background: "var(--c-accent)", boxShadow: "0 0 0 4px color-mix(in oklab, var(--c-accent) 24%, transparent)",
                  animation: "pulse 1.4s ease-in-out infinite",
                }} />
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function DecisionRow({ d, last }) {
  const isAnomaly = d.type === "anomaly";
  const isTool = d.type === "tool";
  const dotCol = isAnomaly ? "var(--c-err)" : isTool ? "var(--c-info)" : "var(--c-accent)";
  return (
    <div style={{
      padding: "11px 14px",
      borderBottom: last ? 0 : "1px solid var(--c-line)",
      display: "flex", alignItems: "flex-start", gap: 12,
    }}>
      <span className="mono" style={{ fontSize: 10.5, color: "var(--c-ink-4)", width: 60, flexShrink: 0, paddingTop: 2 }}>{d.t}</span>
      <span style={{ width: 8, height: 8, borderRadius: "50%", background: dotCol, marginTop: 7, flexShrink: 0, boxShadow: `0 0 0 3px color-mix(in oklab, ${dotCol} 18%, transparent)` }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="row" style={{ gap: 6, marginBottom: 2 }}>
          <span className="mono" style={{ fontSize: 10.5, color: "var(--c-ink-3)" }}>{d.agent}</span>
          <span className={"badge " + (isAnomaly ? "err" : isTool ? "info" : "")}>
            {isAnomaly ? "异常" : isTool ? "工具" : "决策"}
          </span>
          {d.conf != null && (
            <span className="mono" style={{ fontSize: 10.5, color: d.conf >= 0.8 ? "var(--c-ok)" : d.conf >= 0.65 ? "oklch(0.5 0.14 75)" : "var(--c-err)" }}>
              conf {d.conf.toFixed(2)}
            </span>
          )}
        </div>
        <div style={{ fontSize: 12.5, lineHeight: 1.4 }}>{d.text}</div>
      </div>
    </div>
  );
}

window.LiveRunArtboard = LiveRunArtboard;
