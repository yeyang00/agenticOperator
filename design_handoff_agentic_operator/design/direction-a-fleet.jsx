/* global React, useT, AppBar, LeftNav, Metric, Spark, Ic, StatusDot, DirectionTag */

// ===== Direction A: Fleet Command =====
// Dense mission-control dashboard: metrics grid + live agents table + alert rail + activity feed

function FleetCommandArtboard() {
  const { t } = useT();

  const metrics = [
    { key: "m_active_agents", value: "11 / 12", delta: "+1", kind: "up" },
    { key: "m_runs_24h",      value: "9,427",   delta: "+22.4%", kind: "up" },
    { key: "m_success_rate",  value: "94.8%",   delta: "+0.6pp", kind: "up" },
    { key: "m_hitl_queue",    value: "42",      delta: "−8",     kind: "up", sub: "JD审批 · 推荐包 · 评分分歧" },
    { key: "m_cost_today",    value: "¥2,749",  delta: "+¥312",  kind: "down" },
    { key: "m_anomalies",     value: "4",       delta: "1 new",  kind: "down" },
  ];

  const agents = [
    { id: "REQ-01", name: "ReqSync",       roleK: "agent_req_sync",     status: "running",  owner: "HSM · 交付",    p50: "420ms", runs: 214, success: 99.1, cost: "¥48",  last: "刚刚", ver: "v1.4.2", spark: [3,4,2,5,7,6,8,5,9,6,7,8,9,7,8,9] },
    { id: "ANA-02", name: "ReqAnalyzer",   roleK: "agent_req_analyzer", status: "running",  owner: "HSM · 交付",    p50: "1.8s",  runs: 204, success: 96.6, cost: "¥182", last: "1m", ver: "v2.1.0", spark: [2,3,4,3,5,6,5,7,6,8,5,6,7,6,5,7] },
    { id: "JDG-03", name: "JDGenerator",   roleK: "agent_jd_gen",       status: "running",  owner: "HSM · 交付",    p50: "2.1s",  runs: 198, success: 97.3, cost: "¥221", last: "2m", ver: "v1.9.4", spark: [4,5,6,7,5,6,8,7,9,6,7,5,8,7,6,7] },
    { id: "PUB-04", name: "Publisher",     roleK: "agent_publisher",    status: "degraded", owner: "招聘运营",       p50: "3.4s",  runs: 187, success: 82.4, cost: "¥64",  last: "4m", ver: "v1.2.0", spark: [3,4,5,3,4,5,3,4,2,3,4,5,3,4,3,4] },
    { id: "COL-05", name: "ResumeCollector", roleK: "agent_collector", status: "running",  owner: "招聘运营",       p50: "680ms", runs: 3284, success: 99.6, cost: "¥58",  last: "刚刚", ver: "v3.0.1", spark: [5,6,7,8,6,7,9,8,9,8,9,7,9,8,7,9] },
    { id: "PAR-06", name: "ResumeParser",  roleK: "agent_parser",       status: "running",  owner: "招聘运营",       p50: "1.2s",  runs: 3102, success: 94.8, cost: "¥412", last: "刚刚", ver: "v2.8.0", spark: [4,5,6,7,6,7,8,7,9,6,7,8,9,7,8,9] },
    { id: "DUP-07", name: "DupeCheck",     roleK: "agent_dupe",         status: "running",  owner: "合规",           p50: "280ms", runs: 2941, success: 99.9, cost: "¥36",  last: "刚刚", ver: "v1.5.3", spark: [2,3,3,4,5,6,5,7,6,8,7,8,9,7,8,9] },
    { id: "MAT-08", name: "Matcher",       roleK: "agent_matcher",      status: "running",  owner: "招聘运营",       p50: "1.6s",  runs: 2802, success: 93.1, cost: "¥264", last: "刚刚", ver: "v2.3.1", spark: [3,4,5,4,6,7,6,8,7,9,8,9,8,7,9,8] },
    { id: "ITV-09", name: "AIInterviewer", roleK: "agent_interviewer",  status: "review",   owner: "技术招聘",       p50: "24m",   runs: 88,   success: 88.6, cost: "¥1,204", last: "6m", ver: "v0.7.2", spark: [1,2,2,3,4,3,5,4,6,5,7,6,5,4,3,4] },
    { id: "EVL-10", name: "Evaluator",     roleK: "agent_evaluator",    status: "running",  owner: "技术招聘",       p50: "2.4s",  runs: 81,   success: 97.5, cost: "¥172", last: "8m", ver: "v1.6.0", spark: [2,3,3,4,5,6,5,7,6,8,7,8,9,7,8,9] },
    { id: "PKG-11", name: "PackageBuilder", roleK: "agent_packager",    status: "running",  owner: "招聘运营",       p50: "3.1s",  runs: 64,   success: 98.4, cost: "¥88",  last: "12m", ver: "v1.1.2", spark: [1,2,1,2,3,2,3,4,3,4,3,4,5,4,5,4] },
    { id: "SUB-12", name: "PortalSubmitter", roleK: "agent_submitter",  status: "paused",   owner: "招聘运营",       p50: "—",     runs: 0,    success: "—",   cost: "¥0",   last: "2h",  ver: "v2.0.0", spark: [2,2,1,2,3,2,1,2,1,0,0,0,0,0,0,0] },
  ];

  const alerts = [
    { sev: "high", title: "Publisher · 猎聘渠道推送失败率 17.6%", sub: "CHANNEL_PUBLISHED_FAILED · token 校验 401", agent: "PUB-04", time: "6m" },
    { sev: "med",  title: "AIInterviewer · 评分置信度 <0.65", sub: "CAND-8821 · JOB-142 建议人工复核",           agent: "ITV-09", time: "14m" },
    { sev: "med",  title: "ResumeParser · 解析错误率上升", sub: "近 30 分钟 5.2% → 9.8% · RESUME_PARSE_ERROR",   agent: "PAR-06", time: "22m" },
    { sev: "low",  title: "Matcher · 3 份简历归属冲突", sub: "RESUME_LOCKED_CONFLICT · 另一顾问已锁定",         agent: "MAT-08", time: "38m" },
  ];

  const activity = [
    { who: "System",   what: "事件 · REQUIREMENT_SYNCED", meta: "JR-2041 · 工行 · 高级后端工程师", t: "2分钟前", kind: "info" },
    { who: "Zhang W.", what: "批准 · PACKAGE_APPROVED",    meta: "CAND-8790 → JR-1987 · 字节",     t: "6分钟前", kind: "ok" },
    { who: "System",   what: "事件 · JD_APPROVED",         meta: "JR-2039 · HSM 李航 审批",        t: "11分钟前", kind: "info" },
    { who: "System",   what: "告警 · CHANNEL_PUBLISHED_FAILED", meta: "猎聘 · JR-2035",             t: "28分钟前", kind: "err" },
    { who: "Chen Y.",  what: "澄清 · CLARIFICATION_READY", meta: "JR-2032 · 补充必备技能 + 薪资带宽", t: "1小时前", kind: "info" },
    { who: "System",   what: "事件 · APPLICATION_SUBMITTED", meta: "CAND-8731 → 招行招聘门户",      t: "2小时前", kind: "ok" },
  ];

  const statusBadge = (s) => {
    if (s === "running")  return <span className="badge ok pulse"><span className="bdot" />{t("s_running")}</span>;
    if (s === "paused")   return <span className="badge"><span className="bdot" style={{background:"var(--c-ink-4)"}} />{t("s_paused")}</span>;
    if (s === "review")   return <span className="badge warn"><span className="bdot" />{t("s_review")}</span>;
    if (s === "degraded") return <span className="badge err pulse"><span className="bdot" />{t("s_degraded")}</span>;
    if (s === "failed")   return <span className="badge err"><span className="bdot" />{t("s_failed")}</span>;
    return <span className="badge">{s}</span>;
  };

  const [cmdkOpen, setCmdkOpen] = React.useState(false);

  return (
    <div className="ao-frame" data-screen-label="A Fleet Command">
      <AppBar
        crumbs={[t("nav_group_operate"), t("nav_fleet")]}
        onOpenCmdK={() => setCmdkOpen(true)}
      />
      <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
        <LeftNav active="fleet" />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, overflow: "auto" }}>

          {/* page header */}
          <div style={{ padding: "18px 22px 10px", display: "flex", alignItems: "flex-end", gap: 16, borderBottom: "1px solid var(--c-line)" }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 18, fontWeight: 600, letterSpacing: "-0.015em" }}>{t("fleet_title")}</div>
              <div className="muted" style={{ marginTop: 2, fontSize: 12 }}>{t("fleet_sub")}</div>
            </div>
            <div className="row" style={{ gap: 8 }}>
              <button className="btn sm"><Ic.clock /> {t("last_24h")} <Ic.chevD /></button>
              <button className="btn sm"><Ic.user /> {t("everyone")} <Ic.chevD /></button>
              <div style={{ width: 1, height: 20, background: "var(--c-line)" }} />
              <button className="btn sm"><Ic.plug /> {t("new_workflow")}</button>
              <button className="btn primary sm"><Ic.plus /> {t("deploy_agent")}</button>
            </div>
          </div>

          {/* metric strip */}
          <div style={{
            display: "grid", gridTemplateColumns: "repeat(6, 1fr)",
            gap: 1, background: "var(--c-line)", borderBottom: "1px solid var(--c-line)"
          }}>
            {metrics.map((m, i) => (
              <div key={i} style={{ background: "var(--c-surface)", padding: "14px 18px" }}>
                <Metric
                  label={t(m.key)}
                  value={m.value}
                  delta={m.delta}
                  deltaKind={m.kind}
                />
                <div style={{ marginTop: 8 }}>
                  <Spark data={fakeSpark(i)} />
                </div>
              </div>
            ))}
          </div>

          {/* body grid */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1fr) 320px",
            gap: 0,
            flex: 1,
            minHeight: 0,
          }}>
            {/* agents table */}
            <div style={{ padding: "16px 22px", minWidth: 0 }}>
              <div className="card">
                <div className="card-head">
                  <h3>{t("fleet_title")}</h3>
                  <span className="badge info">{agents.length}</span>
                  <div style={{ flex: 1 }} />
                  <button className="btn sm ghost"><Ic.search /> {t("filter")}</button>
                  <button className="btn sm ghost"><Ic.dots /></button>
                </div>
                <div style={{ overflow: "auto" }}>
                  <table className="tbl">
                    <thead>
                      <tr>
                        <th>{t("col_agent")}</th>
                        <th>{t("col_role")}</th>
                        <th>{t("col_status")}</th>
                        <th>24h</th>
                        <th style={{ textAlign: "right" }}>{t("col_runs")}</th>
                        <th style={{ textAlign: "right" }}>{t("col_success")}</th>
                        <th style={{ textAlign: "right" }}>{t("col_p50")}</th>
                        <th style={{ textAlign: "right" }}>{t("col_cost")}</th>
                        <th>{t("col_version")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {agents.map((a) => (
                        <tr key={a.id}>
                          <td>
                            <div className="row" style={{ gap: 10 }}>
                              <AgentGlyph id={a.id} />
                              <div>
                                <div style={{ fontWeight: 500 }}>{a.name}</div>
                                <div className="mono" style={{ fontSize: 10.5, color: "var(--c-ink-4)" }}>{a.id} · {a.owner}</div>
                              </div>
                            </div>
                          </td>
                          <td>{t(a.roleK)}</td>
                          <td>{statusBadge(a.status)}</td>
                          <td style={{ width: 96 }}><Spark data={a.spark} height={22} /></td>
                          <td style={{ textAlign: "right" }} className="mono">{a.runs}</td>
                          <td style={{ textAlign: "right" }} className="mono">
                            {typeof a.success === "number" ? (
                              <span style={{ color: a.success >= 95 ? "var(--c-ok)" : a.success >= 88 ? "var(--c-ink-1)" : "var(--c-err)" }}>
                                {a.success.toFixed(1)}%
                              </span>
                            ) : a.success}
                          </td>
                          <td style={{ textAlign: "right" }} className="mono">{a.p50}</td>
                          <td style={{ textAlign: "right" }} className="mono">{a.cost}</td>
                          <td className="mono" style={{ color: "var(--c-ink-3)" }}>{a.ver}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div style={{ padding: "8px 14px", borderTop: "1px solid var(--c-line)", display: "flex", alignItems: "center", fontSize: 11.5, color: "var(--c-ink-3)" }}>
                  显示 {agents.length} / 14 · <span className="muted" style={{ marginLeft: 6 }}>已筛选：所有状态</span>
                  <div style={{ flex: 1 }} />
                  <button className="btn sm ghost">{t("view_all")} <Ic.chev /></button>
                </div>
              </div>

              {/* pipeline strip */}
              <div className="card" style={{ marginTop: 16 }}>
                <div className="card-head">
                  <h3>{t("pipeline")} · JR-2041 高级后端工程师 · 工行</h3>
                  <div style={{ flex: 1 }} />
                  <span className="badge info">{t("realtime")}</span>
                </div>
                <div style={{ padding: "16px 18px" }}>
                  <PipelineStrip />
                </div>
              </div>
            </div>

            {/* right rail */}
            <div style={{
              padding: "16px 22px 16px 0",
              display: "flex", flexDirection: "column", gap: 16,
              borderLeft: "0",
            }}>
              {/* alerts */}
              <div className="card">
                <div className="card-head">
                  <h3>{t("al_title")}</h3>
                  <span className="badge err">{alerts.length}</span>
                  <div style={{ flex: 1 }} />
                  <button className="btn sm ghost">{t("view_all")}</button>
                </div>
                <div>
                  {alerts.map((a, i) => (
                    <div key={i} style={{
                      padding: "12px 14px",
                      borderBottom: i < alerts.length - 1 ? "1px solid var(--c-line)" : 0,
                      display: "flex", gap: 10, alignItems: "flex-start",
                    }}>
                      <div style={{
                        width: 24, height: 24, borderRadius: 6, flexShrink: 0,
                        display: "grid", placeItems: "center",
                        background: a.sev === "high" ? "var(--c-err-bg)" : a.sev === "med" ? "var(--c-warn-bg)" : "var(--c-info-bg)",
                        color: a.sev === "high" ? "var(--c-err)" : a.sev === "med" ? "oklch(0.5 0.14 75)" : "var(--c-info)",
                      }}>
                        <Ic.alert />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12.5, fontWeight: 500, lineHeight: 1.35 }}>{a.title}</div>
                        <div className="muted" style={{ fontSize: 11, marginTop: 2 }}>{a.sub}</div>
                        <div style={{ marginTop: 8, display: "flex", gap: 6, flexWrap: "wrap" }}>
                          <button className="btn sm ghost" style={{ height: 22, padding: "0 7px", fontSize: 11 }}>{t("live_investigate")}</button>
                          <button className="btn sm ghost" style={{ height: 22, padding: "0 7px", fontSize: 11 }}>{t("live_ack")}</button>
                        </div>
                      </div>
                      <div className="mono" style={{ fontSize: 10.5, color: "var(--c-ink-4)", whiteSpace: "nowrap" }}>{a.time}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* activity feed */}
              <div className="card">
                <div className="card-head">
                  <h3>活动 · Activity</h3>
                  <div style={{ flex: 1 }} />
                  <span className="hint">{t("last_24h")}</span>
                </div>
                <div style={{ padding: "6px 0" }}>
                  {activity.map((it, i) => (
                    <div key={i} style={{ padding: "8px 14px", display: "flex", gap: 10, alignItems: "flex-start" }}>
                      <div style={{
                        width: 6, height: 6, borderRadius: "50%", marginTop: 6,
                        background: it.kind === "ok" ? "var(--c-ok)" : it.kind === "err" ? "var(--c-err)" : "var(--c-info)",
                        flexShrink: 0,
                      }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12 }}>
                          <span style={{ fontWeight: 500 }}>{it.who}</span>{" · "}
                          <span>{it.what}</span>
                        </div>
                        <div className="mono muted" style={{ fontSize: 10.5, marginTop: 1 }}>{it.meta}</div>
                      </div>
                      <div className="mono" style={{ fontSize: 10.5, color: "var(--c-ink-4)" }}>{it.t}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* compliance strip */}
              <div className="card">
                <div className="card-head">
                  <h3>合规 · Compliance</h3>
                  <div style={{ flex: 1 }} />
                  <span className="badge ok"><span className="bdot" />100%</span>
                </div>
                <div style={{ padding: "12px 14px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, fontSize: 12 }}>
                  <ComplianceRow label="PII 数据处理" ok />
                  <ComplianceRow label="候选人同意" ok />
                  <ComplianceRow label="EEO 偏差检测" ok />
                  <ComplianceRow label="GDPR 留存" ok />
                  <ComplianceRow label="审计覆盖率" ok sub="100%" />
                  <ComplianceRow label="权限最小化" ok sub="14 / 14" />
                </div>
              </div>

            </div>
          </div>

        </div>
      </div>

      <DirectionTag label={t("dirA")} />
      <CommandPalette open={cmdkOpen} onClose={() => setCmdkOpen(false)} />
    </div>
  );
}

function ComplianceRow({ label, ok, sub }) {
  return (
    <div className="row" style={{ alignItems: "center" }}>
      <span style={{
        width: 16, height: 16, borderRadius: 4, display: "grid", placeItems: "center",
        background: ok ? "var(--c-ok-bg)" : "var(--c-err-bg)",
        color: ok ? "var(--c-ok)" : "var(--c-err)",
      }}>
        {ok ? <Ic.check /> : <Ic.cross />}
      </span>
      <span style={{ flex: 1 }}>{label}</span>
      {sub && <span className="mono muted" style={{ fontSize: 10.5 }}>{sub}</span>}
    </div>
  );
}

function AgentGlyph({ id }) {
  // stable pseudo color from id
  const seed = id.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const hues = [255, 210, 155, 75, 25, 320, 175];
  const h = hues[seed % hues.length];
  return (
    <div style={{
      width: 24, height: 24, borderRadius: 6, flexShrink: 0,
      background: `linear-gradient(135deg, oklch(0.94 0.04 ${h}) 0%, oklch(0.86 0.08 ${h}) 100%)`,
      border: `1px solid oklch(0.80 0.08 ${h})`,
      display: "grid", placeItems: "center",
      fontFamily: "var(--f-mono)", fontSize: 9.5, fontWeight: 600,
      color: `oklch(0.35 0.10 ${h})`,
      letterSpacing: "0.02em",
    }}>
      {id.slice(0, 3)}
    </div>
  );
}

function PipelineStrip() {
  const stages = [
    { label: "需求同步",  agent: "ReqSync",        count: 24,   next: 22 },
    { label: "JD 生成",   agent: "JDGenerator",    count: 22,   next: 20 },
    { label: "渠道发布",  agent: "Publisher",      count: 20,   next: null },
    { label: "简历入库",  agent: "ResumeParser",   count: 3102, next: 2802 },
    { label: "人岗匹配",  agent: "Matcher",        count: 2802, next: 814 },
    { label: "AI 面试",   agent: "AIInterviewer",  count: 214,  next: 88 },
    { label: "综合评估",  agent: "Evaluator",      count: 88,   next: 64 },
    { label: "推荐包",    agent: "PackageBuilder", count: 64,   next: 42, hitl: true },
    { label: "已提客户",  agent: "PortalSubmitter", count: 42,  next: null },
  ];
  const max = stages[0].count;
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${stages.length}, 1fr)`, gap: 1, background: "var(--c-line)", borderRadius: 6, overflow: "hidden", border: "1px solid var(--c-line)" }}>
      {stages.map((s, i) => (
        <div key={i} style={{ background: s.hitl ? "var(--c-warn-bg)" : "var(--c-surface)", padding: "10px 12px" }}>
          <div className="muted" style={{ fontSize: 10.5, letterSpacing: "0.04em", textTransform: "uppercase" }}>{s.label}</div>
          <div style={{ fontFamily: "var(--f-mono)", fontSize: 18, fontWeight: 600, marginTop: 4, letterSpacing: "-0.01em" }}>{s.count.toLocaleString()}</div>
          <div style={{ height: 3, background: "var(--c-line)", borderRadius: 2, marginTop: 6, overflow: "hidden" }}>
            <div style={{
              height: "100%",
              width: `${(s.count / max) * 100}%`,
              background: s.hitl ? "var(--c-warn)" : "var(--c-accent)",
              borderRadius: 2,
            }} />
          </div>
          <div className="hint" style={{ marginTop: 6 }}>{s.agent}</div>
        </div>
      ))}
    </div>
  );
}

// pseudo-random but stable spark data per index
function fakeSpark(i) {
  const base = [3,4,5,4,6,7,6,8,7,9,8,9,8,7,9,8];
  return base.map((v, j) => Math.max(1, v + ((i * 3 + j * 2) % 4) - 2));
}

window.FleetCommandArtboard = FleetCommandArtboard;
