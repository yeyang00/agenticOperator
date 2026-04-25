/* global React, useT, AppBar, LeftNav, Ic, DirectionTag, CommandPalette */

// ===== Direction B: Workflow Canvas =====
// Visual orchestration of recruitment agents: trigger → steps → branches → guards → HITL → done
// Left: step palette. Center: node graph. Right: inspector for the selected node.

function WorkflowCanvasArtboard() {
  const { t } = useT();
  const [cmdkOpen, setCmdkOpen] = React.useState(false);
  const [selectedId, setSelectedId] = React.useState("jd");

  // Node definitions — positioned on a 1620x560 canvas
  // Lifecycle: Client sync → Analyze → Clarify(branch) → JD → Approval(HITL) → Publish → Collect → Parse → Match(branch) → AI Interview → Evaluate → Package → HITL review → Submit
  const nodes = [
    { id: "trig",    kind: "trigger", x: 20,   y: 240, title: "定时同步 / Webhook", sub: "SCHEDULED_SYNC · 客户 RMS",    icon: <Ic.bolt /> },
    { id: "sync",    kind: "agent",   x: 200,  y: 240, title: "ReqSync",            sub: t("agent_req_sync") + " → REQUIREMENT_SYNCED", icon: <Ic.db />,       status: "running" },
    { id: "analyze", kind: "agent",   x: 380,  y: 240, title: "ReqAnalyzer",        sub: t("agent_req_analyzer") + " → ANALYSIS_COMPLETED", icon: <Ic.sparkle />, status: "running" },
    { id: "clarify", kind: "branch",  x: 560,  y: 240, title: "信息完整?",           sub: "缺失字段 / 冲突",                icon: <Ic.branch /> },
    { id: "ask",     kind: "hitl",    x: 740,  y: 360, title: "HSM 澄清",            sub: "CLARIFICATION_RETRY",            icon: <Ic.user /> },
    { id: "jd",      kind: "agent",   x: 740,  y: 140, title: "JDGenerator",        sub: t("agent_jd_gen") + " → JD_GENERATED", icon: <Ic.sparkle />, status: "running", selected: true },
    { id: "jdappr",  kind: "hitl",    x: 920,  y: 140, title: "HSM 审批 JD",          sub: "JD_APPROVED / JD_REJECTED",     icon: <Ic.shield /> },
    { id: "publish", kind: "agent",   x: 1100, y: 140, title: "Publisher",          sub: t("agent_publisher") + " → CHANNEL_PUBLISHED", icon: <Ic.plug />, status: "degraded" },
    { id: "collect", kind: "agent",   x: 1280, y: 140, title: "ResumeCollector",    sub: "RESUME_DOWNLOADED",               icon: <Ic.db />,       status: "running" },
    { id: "parse",   kind: "agent",   x: 1280, y: 240, title: "ResumeParser + DupeCheck", sub: "RESUME_PROCESSED / LOCKED_CONFLICT", icon: <Ic.cpu />, status: "running" },
    { id: "match",   kind: "branch",  x: 1100, y: 340, title: "人岗匹配",             sub: "Matcher · 硬性 / 加分 / 负向",   icon: <Ic.branch /> },
    { id: "reject",  kind: "done",    x: 1280, y: 420, title: "归档 · MATCH_FAILED", sub: "黑名单 / 硬性不符",               icon: <Ic.cross /> },
    { id: "itv",     kind: "agent",   x: 920,  y: 340, title: "AIInterviewer",      sub: t("agent_interviewer") + " → AI_INTERVIEW_COMPLETED", icon: <Ic.sparkle />, status: "review" },
    { id: "eval",    kind: "agent",   x: 740,  y: 340, title: "Evaluator",          sub: "EVALUATION_PASSED / FAILED",      icon: <Ic.cpu />,      status: "running" },
    { id: "pkg",     kind: "agent",   x: 560,  y: 340, title: "PackageBuilder",     sub: "PACKAGE_GENERATED · 简历+评估",    icon: <Ic.book />,     status: "running" },
    { id: "review",  kind: "hitl",    x: 380,  y: 440, title: "HSM 审核推荐包",       sub: "PACKAGE_APPROVED · SLA 4h",     icon: <Ic.user /> },
    { id: "guard",   kind: "guard",   x: 200,  y: 440, title: "合规 & 黑名单",        sub: "PII / EEO / Blacklist",          icon: <Ic.shield /> },
    { id: "submit",  kind: "agent",   x: 20,   y: 440, title: "PortalSubmitter",    sub: "APPLICATION_SUBMITTED",           icon: <Ic.mail />,     status: "running" },
  ];

  const edges = [
    { from: "trig",    to: "sync" },
    { from: "sync",    to: "analyze" },
    { from: "analyze", to: "clarify" },
    { from: "clarify", to: "jd",     label: "OK" },
    { from: "clarify", to: "ask",    label: "缺失", dashed: true },
    { from: "ask",     to: "analyze", dashed: true },
    { from: "jd",      to: "jdappr" },
    { from: "jdappr",  to: "publish" },
    { from: "publish", to: "collect" },
    { from: "collect", to: "parse" },
    { from: "parse",   to: "match" },
    { from: "match",   to: "reject", label: "不符", dashed: true },
    { from: "match",   to: "itv",    label: "匹配" },
    { from: "itv",     to: "eval" },
    { from: "eval",    to: "pkg" },
    { from: "pkg",     to: "review" },
    { from: "review",  to: "guard" },
    { from: "guard",   to: "submit" },
  ];

  const sel = nodes.find((n) => n.id === selectedId) || nodes[0];

  return (
    <div className="ao-frame" data-screen-label="B Workflow Canvas">
      <AppBar
        crumbs={[t("nav_group_build"), t("nav_workflows"), t("wf_title")]}
        onOpenCmdK={() => setCmdkOpen(true)}
      />
      <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
        <LeftNav active="workflows" />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>

          {/* sub-header */}
          <div style={{ padding: "14px 22px", display: "flex", alignItems: "center", gap: 16, borderBottom: "1px solid var(--c-line)", background: "var(--c-surface)" }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 600, letterSpacing: "-0.01em" }}>{t("wf_title")}</div>
              <div className="muted" style={{ fontSize: 12, marginTop: 1 }}>{t("wf_sub")}</div>
            </div>
            <span className="badge ok"><span className="bdot" />已启用 · Active</span>
            <span className="badge info">v4.2 · draft</span>
            <div style={{ width: 1, height: 20, background: "var(--c-line)" }} />
            <button className="btn sm"><Ic.clock /> 版本历史</button>
            <button className="btn sm"><Ic.play /> 试运行</button>
            <button className="btn primary sm">发布</button>
          </div>

          {/* work area */}
          <div style={{
            flex: 1,
            display: "grid",
            gridTemplateColumns: "200px 1fr 300px",
            minHeight: 0,
          }}>

            {/* palette */}
            <aside style={{ borderRight: "1px solid var(--c-line)", background: "var(--c-surface)", overflow: "auto" }}>
              <PaletteSection title="触发 · Triggers" items={[
                { icon: <Ic.bolt />, label: "客户 RMS 同步 / SCHEDULED_SYNC"},
                { icon: <Ic.plug />, label: "渠道 Webhook (新简历)"},
                { icon: <Ic.calendar />, label: "定时重扫"},
                { icon: <Ic.mail />, label: "HSM 手动发起"},
              ]} />
              <PaletteSection title="智能体 · Agents" items={[
                { icon: <Ic.db />,      label: "ReqSync"},
                { icon: <Ic.sparkle />, label: "ReqAnalyzer"},
                { icon: <Ic.sparkle />, label: "JDGenerator"},
                { icon: <Ic.plug />,    label: "Publisher"},
                { icon: <Ic.db />,      label: "ResumeCollector"},
                { icon: <Ic.cpu />,     label: "ResumeParser"},
                { icon: <Ic.cpu />,     label: "DupeChecker"},
                { icon: <Ic.cpu />,     label: "Matcher"},
                { icon: <Ic.sparkle />, label: "AIInterviewer"},
                { icon: <Ic.cpu />,     label: "Evaluator"},
                { icon: <Ic.book />,    label: "PackageBuilder"},
                { icon: <Ic.mail />,    label: "PortalSubmitter"},
              ]} />
              <PaletteSection title="控制流 · Logic" items={[
                { icon: <Ic.branch />, label: "分支 (匹配 / 完整性)"},
                { icon: <Ic.clock />,  label: "等待 / 重试"},
                { icon: <Ic.user />,   label: "HSM 审批"},
                { icon: <Ic.shield />, label: "合规 / 黑名单护栏"},
                { icon: <Ic.db />,     label: "分布式锁"},
              ]} />
              <PaletteSection title="输出 · Output" items={[
                { icon: <Ic.plug />, label: "渠道发布 API"},
                { icon: <Ic.mail />, label: "客户门户提交"},
                { icon: <Ic.db />,   label: "写入知识库"},
                { icon: <Ic.check />, label: "完成 Done"},
              ]} />
            </aside>

            {/* canvas */}
            <div style={{ position: "relative", overflow: "hidden", background: "var(--c-panel)" }}>
              <div style={{
                position: "absolute", inset: 0,
                backgroundImage: "radial-gradient(circle, oklch(0.88 0.006 260) 1px, transparent 1px)",
                backgroundSize: "18px 18px",
                opacity: 0.9,
              }} />
              <svg
                viewBox="0 0 1620 560"
                preserveAspectRatio="xMidYMid meet"
                style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
              >
                <defs>
                  <marker id="arrowhead-b" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
                    <path d="M0,0 L0,6 L9,3 z" fill="oklch(0.58 0.010 260)" />
                  </marker>
                  <marker id="arrowhead-b-dim" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
                    <path d="M0,0 L0,6 L9,3 z" fill="oklch(0.78 0.006 260)" />
                  </marker>
                </defs>
                {edges.map((e, i) => {
                  const a = nodes.find((n) => n.id === e.from);
                  const b = nodes.find((n) => n.id === e.to);
                  if (!a || !b) return null;
                  const ax = a.x + 140, ay = a.y + 34;
                  const bx = b.x,        by = b.y + 34;
                  const mid = (ax + bx) / 2;
                  const d = `M ${ax} ${ay} C ${mid} ${ay}, ${mid} ${by}, ${bx} ${by}`;
                  return (
                    <g key={i}>
                      <path d={d}
                        stroke={e.dashed ? "oklch(0.78 0.006 260)" : "oklch(0.58 0.010 260)"}
                        strokeWidth="1.5"
                        strokeDasharray={e.dashed ? "4 4" : "none"}
                        fill="none"
                        markerEnd={e.dashed ? "url(#arrowhead-b-dim)" : "url(#arrowhead-b)"} />
                      {e.label && (
                        <g transform={`translate(${mid} ${(ay + by) / 2 - 2})`}>
                          <rect x="-16" y="-10" width="32" height="18" rx="9" fill="white" stroke="var(--c-line)" />
                          <text x="0" y="3" textAnchor="middle" fontSize="10" fontFamily="var(--f-mono)" fill="var(--c-ink-2)">{e.label}</text>
                        </g>
                      )}
                    </g>
                  );
                })}
                {/* animated packet along trigger → sync → analyze → clarify */}
                <circle r="4" fill="var(--c-accent)">
                  <animateMotion dur="5s" repeatCount="indefinite" path="M 160 274 L 340 274 L 520 274 L 700 274" />
                  <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.1;0.9;1" dur="5s" repeatCount="indefinite" />
                </circle>

                {nodes.map((n) => (
                  <WFNode
                    key={n.id}
                    node={n}
                    selected={n.id === selectedId}
                    onSelect={() => setSelectedId(n.id)}
                  />
                ))}
              </svg>

              {/* canvas chrome */}
              <div style={{
                position: "absolute", top: 12, left: 12,
                display: "flex", gap: 6,
                background: "var(--c-surface)",
                border: "1px solid var(--c-line)",
                borderRadius: 6,
                padding: 3,
                boxShadow: "var(--sh-1)",
              }}>
                <button className="btn sm ghost" style={{ height: 22, width: 22, padding: 0 }} title="undo">↶</button>
                <button className="btn sm ghost" style={{ height: 22, width: 22, padding: 0 }} title="redo">↷</button>
              </div>
              <div style={{
                position: "absolute", bottom: 12, left: 12,
                display: "flex", gap: 6, alignItems: "center",
                background: "var(--c-surface)",
                border: "1px solid var(--c-line)",
                borderRadius: 6,
                padding: "3px 8px",
                fontFamily: "var(--f-mono)", fontSize: 11, color: "var(--c-ink-3)",
                boxShadow: "var(--sh-1)",
              }}>
                <button className="btn sm ghost" style={{ height: 22, width: 22, padding: 0 }}>−</button>
                <span>84%</span>
                <button className="btn sm ghost" style={{ height: 22, width: 22, padding: 0 }}>+</button>
                <span style={{ width: 1, height: 12, background: "var(--c-line)", margin: "0 4px" }} />
                <span>fit</span>
              </div>
              <div style={{
                position: "absolute", bottom: 12, right: 12,
                background: "var(--c-surface)",
                border: "1px solid var(--c-line)",
                borderRadius: 6,
                padding: "6px 10px",
                fontSize: 11, color: "var(--c-ink-3)",
                boxShadow: "var(--sh-1)",
                display: "flex", gap: 10, alignItems: "center",
              }}>
                <span className="row"><span style={{ width: 8, height: 8, borderRadius: 2, background: "var(--c-accent-bg)", border: "1px solid var(--c-accent-line)" }} /> 触发</span>
                <span className="row"><span style={{ width: 8, height: 8, borderRadius: 2, background: "white", border: "1px solid var(--c-line-strong)" }} /> 智能体</span>
                <span className="row"><span style={{ width: 8, height: 8, borderRadius: 2, background: "var(--c-warn-bg)", border: "1px solid color-mix(in oklab, var(--c-warn) 40%, transparent)" }} /> 人工</span>
                <span className="row"><span style={{ width: 8, height: 8, borderRadius: 2, background: "var(--c-ok-bg)", border: "1px solid color-mix(in oklab, var(--c-ok) 30%, transparent)" }} /> 护栏</span>
              </div>
            </div>

            {/* inspector */}
            <aside style={{ borderLeft: "1px solid var(--c-line)", background: "var(--c-surface)", display: "flex", flexDirection: "column", minHeight: 0 }}>
              <Inspector node={sel} />
            </aside>

          </div>
        </div>
      </div>

      <DirectionTag label={t("dirB")} />
      <CommandPalette open={cmdkOpen} onClose={() => setCmdkOpen(false)} />
    </div>
  );
}

function PaletteSection({ title, items }) {
  return (
    <div style={{ padding: "12px 10px 4px" }}>
      <div style={{ fontSize: 10.5, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--c-ink-4)", padding: "4px 6px 8px", fontWeight: 600 }}>{title}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {items.map((it, i) => (
          <div key={i} style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "6px 8px",
            borderRadius: 5,
            fontSize: 12.5,
            cursor: "grab",
            color: "var(--c-ink-2)",
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = "var(--c-panel)"}
          onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
            <span style={{ color: "var(--c-ink-3)" }}>{it.icon}</span>
            <span>{it.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// SVG-rendered workflow node (renders inside the viewBox)
function WFNode({ node, selected, onSelect }) {
  const w = 140, h = 68;
  const style = (() => {
    switch (node.kind) {
      case "trigger": return { fill: "oklch(0.96 0.03 255)", stroke: "oklch(0.82 0.08 255)", accent: "var(--c-accent)" };
      case "hitl":    return { fill: "oklch(0.96 0.06 80)",  stroke: "color-mix(in oklab, var(--c-warn) 40%, transparent)", accent: "oklch(0.5 0.14 75)" };
      case "guard":   return { fill: "oklch(0.96 0.04 155)", stroke: "color-mix(in oklab, var(--c-ok) 30%, transparent)",   accent: "var(--c-ok)" };
      case "branch":  return { fill: "oklch(0.985 0.004 255)", stroke: "var(--c-line-strong)", accent: "var(--c-ink-2)" };
      case "done":    return { fill: "oklch(0.97 0.003 260)", stroke: "var(--c-line-strong)", accent: "var(--c-ink-3)" };
      default:        return { fill: "white", stroke: "var(--c-line-strong)", accent: "var(--c-ink-1)" };
    }
  })();
  const statusDot = node.status === "running" ? "var(--c-ok)"
    : node.status === "review" ? "var(--c-warn)"
    : node.status === "degraded" ? "var(--c-danger)"
    : null;
  return (
    <g transform={`translate(${node.x} ${node.y})`} style={{ cursor: "pointer" }} onClick={onSelect}>
      {selected && (
        <rect x="-5" y="-5" width={w + 10} height={h + 10} rx="11"
          fill="none" stroke="var(--c-accent)" strokeWidth="1.5" strokeDasharray="4 3" opacity="0.8" />
      )}
      <rect x="0" y="0" width={w} height={h} rx="7" fill={style.fill} stroke={style.stroke} strokeWidth="1" />
      {/* header strip */}
      <rect x="0" y="0" width={w} height="3" rx="7" fill={style.accent} />
      {/* icon */}
      <foreignObject x="8" y="10" width="22" height="22">
        <div xmlns="http://www.w3.org/1999/xhtml" style={{
          width: 22, height: 22, borderRadius: 5, display: "grid", placeItems: "center",
          background: "white", border: "1px solid var(--c-line)", color: style.accent,
        }}>{node.icon}</div>
      </foreignObject>
      <text x="36" y="24" fontSize="12" fontWeight="600" fill="var(--c-ink-1)" style={{ fontFamily: "var(--f-sans)" }}>{node.title}</text>
      <text x="36" y="40" fontSize="10.5" fill="var(--c-ink-3)" style={{ fontFamily: "var(--f-sans)" }}>{node.sub}</text>
      {/* status */}
      {statusDot && (
        <>
          <circle cx={w - 12} cy="14" r="4" fill={statusDot} opacity="0.2" />
          <circle cx={w - 12} cy="14" r="2.5" fill={statusDot}>
            <animate attributeName="opacity" values="1;0.4;1" dur="2s" repeatCount="indefinite" />
          </circle>
        </>
      )}
      {/* footer meta */}
      <line x1="0" y1="52" x2={w} y2="52" stroke="var(--c-line)" />
      <text x="10" y="63" fontSize="9.5" fill="var(--c-ink-4)" style={{ fontFamily: "var(--f-mono)" }}>
        {node.kind === "trigger" ? "event · cron"
          : node.kind === "hitl" ? "SLA 4h · HSM"
          : node.kind === "guard" ? "blocks on fail"
          : node.kind === "branch" ? "if / else"
          : node.kind === "done" ? "terminal"
          : "retry 3× · HITL"}
      </text>
      {/* ports */}
      <circle cx="0" cy={h/2} r="3.5" fill="white" stroke="var(--c-ink-4)" />
      <circle cx={w} cy={h/2} r="3.5" fill="white" stroke="var(--c-ink-4)" />
    </g>
  );
}

function Inspector({ node }) {
  const { t } = useT();
  return (
    <>
      <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--c-line)" }}>
        <div className="hint" style={{ marginBottom: 4 }}>{t("wf_inspector")}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 6, display: "grid", placeItems: "center",
            background: "var(--c-panel)", border: "1px solid var(--c-line)", color: "var(--c-accent)",
          }}>{node.icon}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>{node.title}</div>
            <div className="muted" style={{ fontSize: 11 }}>{node.sub}</div>
          </div>
          <button className="btn sm ghost" style={{ padding: "0 6px" }}><Ic.dots /></button>
        </div>
      </div>

      <div style={{ overflow: "auto", padding: "6px 0" }}>
        <InspectField label={t("wf_when")} value="event == 'ANALYSIS_COMPLETED' && completeness >= 0.9" mono />
        <InspectField label={t("wf_tools")}>
          <div className="row" style={{ flexWrap: "wrap", gap: 4 }}>
            <span className="badge"><Ic.db /> KB.readJob</span>
            <span className="badge"><Ic.sparkle /> LLM.generateJD</span>
            <span className="badge"><Ic.book /> Template.render</span>
            <span className="badge"><Ic.shield /> Compliance.lint</span>
          </div>
        </InspectField>
        <InspectField label={t("wf_input")}>
          <div className="mono" style={{ fontSize: 11, background: "var(--c-panel)", padding: "8px 10px", borderRadius: 5, border: "1px solid var(--c-line)", color: "var(--c-ink-2)", whiteSpace: "pre-wrap" }}>
            {"{\n  job_id, client_id,\n  analysis: { skills[], seniority, comp_band },\n  hsm_preferences: { tone, channels[] }\n}"}
          </div>
        </InspectField>
        <InspectField label={t("wf_output")}>
          <div className="mono" style={{ fontSize: 11, background: "var(--c-panel)", padding: "8px 10px", borderRadius: 5, border: "1px solid var(--c-line)", color: "var(--c-ink-2)", whiteSpace: "pre-wrap" }}>
            {"{\n  jd_md, jd_html,\n  variants: [channel→title+hook],\n  compliance: { pii: bool, eeo_flags[] },\n  next: 'JD_GENERATED'\n}"}
          </div>
        </InspectField>

        <InspectField label={t("wf_on_error")}>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <OnErrorRow icon={<Ic.clock />} label={t("wf_retry") + " · 指数退避"} kind="ok" />
            <OnErrorRow icon={<Ic.user />} label={t("wf_escalate") + " → HSM 手工撰写"} kind="warn" />
            <OnErrorRow icon={<Ic.shield />} label="合规失败 → CLARIFICATION_RETRY" kind="info" />
          </div>
        </InspectField>

        <InspectField label={t("wf_permissions")}>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12 }}>
            <PermRow label="KB · 读取职位分析" scope="read" />
            <PermRow label="KB · 写入 JD 草稿" scope="write" />
            <PermRow label="LLM · 调用生成" scope="write" />
            <PermRow label="Channels · 无直接发布" scope="none" />
          </div>
        </InspectField>

        <InspectField label={t("wf_sla") + " · " + t("wf_policies")}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 12 }}>
            <KV k={t("unit_ms") + " P95"} v="4800" />
            <KV k={t("concurrency")} v="12" />
            <KV k={t("rate_limit")} v="60/min" />
            <KV k="预算" v="¥0.42 / 次" />
          </div>
        </InspectField>
      </div>

      <div style={{ padding: 12, borderTop: "1px solid var(--c-line)", display: "flex", gap: 8 }}>
        <button className="btn ghost" style={{ flex: 1 }}>{t("cancel")}</button>
        <button className="btn primary" style={{ flex: 1 }}>{t("save")}</button>
      </div>
    </>
  );
}

function InspectField({ label, value, mono, children }) {
  return (
    <div style={{ padding: "10px 16px", borderBottom: "1px solid var(--c-line)" }}>
      <div style={{ fontSize: 10.5, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--c-ink-4)", fontWeight: 600, marginBottom: 6 }}>{label}</div>
      {value && <div className={mono ? "mono" : ""} style={{ fontSize: mono ? 11.5 : 12.5 }}>{value}</div>}
      {children}
    </div>
  );
}

function OnErrorRow({ icon, label, kind }) {
  const bg = kind === "ok" ? "var(--c-ok-bg)" : kind === "warn" ? "var(--c-warn-bg)" : "var(--c-info-bg)";
  const col = kind === "ok" ? "var(--c-ok)" : kind === "warn" ? "oklch(0.5 0.14 75)" : "var(--c-info)";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", borderRadius: 5, background: bg, border: `1px solid color-mix(in oklab, ${col} 30%, transparent)`, fontSize: 12 }}>
      <span style={{ color: col }}>{icon}</span>
      <span>{label}</span>
    </div>
  );
}

function PermRow({ label, scope }) {
  const tone = scope === "write" ? "warn" : scope === "read" ? "info" : "muted";
  const text = scope === "write" ? "写入" : scope === "read" ? "只读" : "无";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <span style={{ flex: 1 }}>{label}</span>
      <span className={"badge " + (tone === "muted" ? "" : tone)}>{text}</span>
    </div>
  );
}

function KV({ k, v }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", padding: "6px 8px", background: "var(--c-panel)", borderRadius: 5, border: "1px solid var(--c-line)" }}>
      <span className="hint">{k}</span>
      <span className="mono" style={{ fontSize: 12, fontWeight: 500 }}>{v}</span>
    </div>
  );
}

window.WorkflowCanvasArtboard = WorkflowCanvasArtboard;
