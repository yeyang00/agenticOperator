/* global React, useT, AppBar, LeftNav, Ic, DirectionTag, CommandPalette, StatusDot, Spark */

// ===== Alerts (告警) =====
// Triage-first incident view. Rule-driven alerts produced by upstream events.
// Layout: AppBar → SubHeader (KPIs + filters) → 3-col grid:
//   left  – stacked rule channels & severity facets
//   center – alert table + selected-alert detail (timeline, related events, actions)
//   right – on-call rotation + escalation + recent silences

const ALERTS = [
  {
    id: "AL-1042",
    title: "ANALYSIS_BLOCKED 速率突增",
    rule: "rate(ANALYSIS_BLOCKED) > 3/min for 5m",
    sev: "P1",
    state: "firing",
    started: "11:04:22",
    duration: "12m 41s",
    source: "ReqAnalyzer",
    stage: "requirement",
    assignee: "周航",
    channel: "feishu · #ops-incident",
    affected: { runs: 18, jobs: 6, candidates: 0 },
    spark: [2, 1, 2, 2, 1, 3, 4, 6, 7, 5, 8, 9],
    desc: "分析阶段连续阻塞，疑似客户 RMS 字段 schema 变更。",
    related: ["SYNC_FAILED_ALERT", "ANALYSIS_BLOCKED", "REQUIREMENT_SYNCED"],
    timeline: [
      { t: "11:04:22", k: "fired",  by: "rule-engine", text: "阈值触发：5 分钟内 23 次 BLOCKED" },
      { t: "11:04:25", k: "notify", by: "feishu",      text: "通知 #ops-incident · @周航 @值班" },
      { t: "11:05:10", k: "ack",    by: "周航",        text: "已确认，开始排查 ReqAnalyzer 日志" },
      { t: "11:08:46", k: "note",   by: "周航",        text: "定位：客户 ATS 端字段 `seniority_level` 改为 enum，未同步映射" },
      { t: "11:12:01", k: "action", by: "周航",        text: "降级该客户的 `ReqAnalyzer/v3.2` 到 `v3.1`，等待客户回复" },
    ],
  },
  {
    id: "AL-1041",
    title: "JD 重复检测命中率下降",
    rule: "p95(jd-dedupe.score) < 0.78 for 15m",
    sev: "P2",
    state: "firing",
    started: "10:48:09",
    duration: "28m 04s",
    source: "JDDedupe",
    stage: "jd",
    assignee: "未指派",
    channel: "feishu · #recruit-quality",
    affected: { runs: 4, jobs: 4, candidates: 0 },
    spark: [9, 9, 8, 8, 7, 7, 7, 6, 6, 5, 6, 5],
    desc: "去重模型嵌入分数持续低于阈值，疑似客户提交了大量短描述需求。",
    related: ["JD_GENERATED", "JD_REJECTED"],
    timeline: [
      { t: "10:48:09", k: "fired",  by: "rule-engine", text: "P95 score 跌至 0.74" },
      { t: "10:48:14", k: "notify", by: "feishu",      text: "通知 #recruit-quality" },
    ],
  },
  {
    id: "AL-1039",
    title: "Inngest 队列 backlog 偏高",
    rule: "queue.depth > 500 for 10m",
    sev: "P3",
    state: "ack",
    started: "10:21:55",
    duration: "54m 18s",
    source: "inngest.queue",
    stage: "system",
    assignee: "刘星",
    channel: "feishu · #infra",
    affected: { runs: 0, jobs: 0, candidates: 0 },
    spark: [3, 4, 5, 6, 7, 8, 8, 7, 7, 6, 6, 6],
    desc: "MatchScorer worker 副本数偏低，已自动扩容 +2。",
    related: ["MATCH_SCORED"],
    timeline: [
      { t: "10:21:55", k: "fired",  by: "rule-engine", text: "Backlog = 612" },
      { t: "10:22:30", k: "auto",   by: "autoscaler",  text: "扩容 MatchScorer · 副本 4 → 6" },
      { t: "10:34:11", k: "ack",    by: "刘星",        text: "确认，观察自动恢复" },
    ],
  },
  {
    id: "AL-1037",
    title: "面试反馈 SLA 即将逾期",
    rule: "feedback.pending_hours > 36",
    sev: "P3",
    state: "firing",
    started: "09:15:02",
    duration: "1h 41m",
    source: "FeedbackTracker",
    stage: "interview",
    assignee: "陈璐",
    channel: "feishu · #recruit-ops",
    affected: { runs: 12, jobs: 9, candidates: 12 },
    spark: [1, 2, 3, 3, 4, 5, 6, 7, 8, 8, 9, 9],
    desc: "12 位候选人面试反馈超过 36 小时未收回。",
    related: ["INTERVIEW_FEEDBACK_PENDING", "INTERVIEW_COMPLETED"],
    timeline: [
      { t: "09:15:02", k: "fired",  by: "rule-engine", text: "12 个 pending feedback" },
      { t: "09:15:08", k: "notify", by: "feishu",      text: "通知 #recruit-ops · @陈璐" },
      { t: "09:42:11", k: "ack",    by: "陈璐",        text: "已开始逐一催办" },
    ],
  },
  {
    id: "AL-1031",
    title: "CV 解析失败率上升",
    rule: "rate(CV_PARSE_FAILED) > 0.8% for 30m",
    sev: "P2",
    state: "resolved",
    started: "07:42:18",
    duration: "1h 12m",
    source: "CVParser",
    stage: "resume",
    assignee: "周航",
    channel: "feishu · #ops-incident",
    affected: { runs: 0, jobs: 0, candidates: 0 },
    spark: [4, 5, 6, 7, 8, 7, 6, 5, 4, 3, 2, 1],
    desc: "PDF 解析依赖更新后回归通过，已自动关闭。",
    related: ["CV_PARSE_FAILED"],
    timeline: [
      { t: "07:42:18", k: "fired",    by: "rule-engine", text: "失败率 = 1.4%" },
      { t: "07:55:00", k: "deploy",   by: "platform",    text: "回滚 cv-parser image · v2.4.1 → v2.3.7" },
      { t: "08:54:11", k: "resolved", by: "rule-engine", text: "失败率 0.12% < 阈值 30m" },
    ],
  },
  {
    id: "AL-1029",
    title: "客户提交协议过期",
    rule: "client.contract.days_left < 14",
    sev: "P3",
    state: "snoozed",
    started: "昨日 22:10",
    duration: "13h",
    source: "ContractMonitor",
    stage: "submit",
    assignee: "李韵",
    channel: "feishu · #commercial",
    affected: { runs: 0, jobs: 0, candidates: 0 },
    spark: [],
    desc: "客户「字节跳动」交付协议 11 天后到期。",
    related: [],
    timeline: [
      { t: "昨日 22:10", k: "fired",  by: "rule-engine", text: "13 天后到期" },
      { t: "今日 08:30", k: "snooze", by: "李韵",        text: "已联系商务，snooze 24h" },
    ],
  },
  {
    id: "AL-1024",
    title: "权限审计：超管账号 7 天未登录",
    rule: "iam.dormant_admin > 7d",
    sev: "P4",
    state: "firing",
    started: "今日 06:00",
    duration: "5h 12m",
    source: "IAM·Audit",
    stage: "system",
    assignee: "刘星",
    channel: "email · security@",
    affected: { runs: 0, jobs: 0, candidates: 0 },
    spark: [],
    desc: "账号 `wei.chen` 处于超管角色但 7 天未活动，建议降权。",
    related: [],
    timeline: [
      { t: "06:00:00", k: "fired",  by: "rule-engine", text: "Dormant 7d 超阈值" },
    ],
  },
];

const RULE_CHANNELS = [
  { id: "all",       label: "全部规则",      n: 12, ic: "alert" },
  { id: "event",     label: "事件速率",      n: 5,  ic: "bolt" },
  { id: "quality",   label: "模型质量",      n: 3,  ic: "spark" },
  { id: "sla",       label: "SLA · 承诺",    n: 2,  ic: "clock" },
  { id: "infra",     label: "基础设施",      n: 1,  ic: "cpu" },
  { id: "security",  label: "权限与审计",    n: 1,  ic: "shield" },
];

const SEV_FACETS = [
  { sev: "P1", n: 1, color: "var(--c-err)" },
  { sev: "P2", n: 2, color: "oklch(0.6 0.16 35)" },
  { sev: "P3", n: 3, color: "oklch(0.62 0.14 75)" },
  { sev: "P4", n: 1, color: "var(--c-ink-3)" },
];

const ON_CALL = [
  { name: "周航",  role: "L2 · ReqOps",     status: "primary",   shift: "08:00–20:00", phone: "···2914" },
  { name: "陈璐",  role: "L2 · Recruit",    status: "primary",   shift: "08:00–20:00", phone: "···7702" },
  { name: "刘星",  role: "L3 · Platform",   status: "secondary", shift: "今日 全天",    phone: "···1108" },
  { name: "李韵",  role: "Commercial",      status: "advisory",  shift: "工作时间",    phone: "···6645" },
  { name: "Bei",   role: "L2 · 夜班",       status: "off",       shift: "20:00 接班",  phone: "···0331" },
];

const SILENCED = [
  { id: "SIL-08", scope: "stage = jd · severity ≤ P3", until: "+2h",  by: "陈璐", reason: "JD 模型 A/B 实验中" },
  { id: "SIL-07", scope: "rule = inngest.queue.depth",  until: "+30m", by: "刘星", reason: "扩容观察期" },
];

// ─────────────────────────────────────────────────────────────────────────
function AlertsPageArtboard() {
  const { t } = useT();
  const [cmdkOpen, setCmdkOpen] = React.useState(false);
  const [selectedId, setSelectedId] = React.useState("AL-1042");
  const [channel, setChannel] = React.useState("all");
  const [sevFilter, setSevFilter] = React.useState(null);
  const [showResolved, setShowResolved] = React.useState(false);

  const visible = ALERTS.filter((a) => {
    if (!showResolved && (a.state === "resolved")) return false;
    if (sevFilter && a.sev !== sevFilter) return false;
    return true;
  });
  const selected = ALERTS.find((a) => a.id === selectedId) || visible[0] || ALERTS[0];

  return (
    <div className="ao-frame" data-screen-label="Alerts 告警">
      <AppBar
        crumbs={[t("nav_group_operate"), t("nav_alerts"), selected.id]}
        onOpenCmdK={() => setCmdkOpen(true)}
      />
      <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
        <LeftNav active="alerts" />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
          <AlertsSubHeader showResolved={showResolved} setShowResolved={setShowResolved} />
          <div style={{
            flex: 1,
            display: "grid",
            gridTemplateColumns: "232px 1fr 320px",
            minHeight: 0,
          }}>
            <AlertsLeftRail
              channel={channel} setChannel={setChannel}
              sev={sevFilter} setSev={setSevFilter}
            />
            <AlertsCenter
              alerts={visible}
              selectedId={selected.id}
              onSelect={setSelectedId}
              alert={selected}
            />
            <AlertsRightRail />
          </div>
        </div>
      </div>
      <DirectionTag label="告警 · Alerts" />
      <CommandPalette open={cmdkOpen} onClose={() => setCmdkOpen(false)} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
function AlertsSubHeader({ showResolved, setShowResolved }) {
  const stats = [
    { l: "firing",            v: "4",       d: "+1 · 10m",  tone: "down" },
    { l: "ack 中",            v: "2",       d: "MTTA 47s",  tone: "up"   },
    { l: "今日已解决",        v: "9",       d: "MTTR 18m",  tone: "up"   },
    { l: "P1 · 上月",         v: "3 → 1",  d: "−66%",      tone: "up"   },
    { l: "noise score",       v: "0.12",    d: "目标 < 0.2", tone: "up"   },
    { l: "on-call 响应率",     v: "100%",    d: "30 天",      tone: "up"   },
  ];
  return (
    <div style={{ padding: "14px 22px", borderBottom: "1px solid var(--c-line)", background: "var(--c-surface)", display: "flex", alignItems: "center", gap: 18 }}>
      <div>
        <div style={{ fontSize: 15, fontWeight: 600, letterSpacing: "-0.01em" }}>异常与告警</div>
        <div className="muted" style={{ fontSize: 12, marginTop: 1 }}>规则触发 · 自动通知 · 升级跟踪 · 静默与回放</div>
      </div>
      <div style={{ flex: 1, display: "grid", gridTemplateColumns: "repeat(6, minmax(0,1fr))", gap: 14, paddingLeft: 18, borderLeft: "1px solid var(--c-line)" }}>
        {stats.map((s, i) => (
          <div key={i}>
            <div className="hint">{s.l}</div>
            <div style={{ fontSize: 16, fontWeight: 600, letterSpacing: "-0.01em", fontFeatureSettings: '"tnum"' }}>{s.v}</div>
            <div className="mono" style={{ fontSize: 10.5, color: s.tone === "up" ? "var(--c-ok)" : s.tone === "down" ? "var(--c-err)" : "var(--c-ink-4)" }}>{s.d}</div>
          </div>
        ))}
      </div>
      <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--c-ink-2)" }}>
        <input type="checkbox" checked={showResolved} onChange={(e) => setShowResolved(e.target.checked)} />
        含已解决
      </label>
      <button className="btn sm"><Ic.bell /> 静默规则</button>
      <button className="btn sm primary"><Ic.plus /> 新建规则</button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
function AlertsLeftRail({ channel, setChannel, sev, setSev }) {
  return (
    <div style={{ borderRight: "1px solid var(--c-line)", background: "var(--c-bg)", display: "flex", flexDirection: "column", minHeight: 0 }}>
      <div style={{ padding: "12px 14px 6px" }}>
        <div className="hint" style={{ marginBottom: 6 }}>规则通道</div>
        {RULE_CHANNELS.map((c) => {
          const Icon = Ic[c.ic] || Ic.alert;
          const active = channel === c.id;
          return (
            <div
              key={c.id}
              className={"ao-nav-item" + (active ? " active" : "")}
              onClick={() => setChannel(c.id)}
              style={{ cursor: "pointer" }}
            >
              <Icon />
              <span style={{ flex: 1 }}>{c.label}</span>
              <span className="ao-nav-count">{c.n}</span>
            </div>
          );
        })}
      </div>
      <div style={{ padding: "10px 14px", borderTop: "1px solid var(--c-line)", marginTop: 6 }}>
        <div className="hint" style={{ marginBottom: 8 }}>严重度</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {SEV_FACETS.map((s) => {
            const active = sev === s.sev;
            return (
              <button
                key={s.sev}
                onClick={() => setSev(active ? null : s.sev)}
                style={{
                  display: "flex", alignItems: "center", gap: 8,
                  height: 26, padding: "0 8px",
                  border: "1px solid " + (active ? s.color : "var(--c-line)"),
                  background: active ? "color-mix(in oklab, " + s.color + " 12%, transparent)" : "var(--c-surface)",
                  borderRadius: 6, cursor: "pointer",
                  font: '500 11.5px var(--f-sans)', color: "var(--c-ink-1)",
                }}
              >
                <span style={{ width: 8, height: 8, borderRadius: 2, background: s.color }} />
                <span style={{ flex: 1, textAlign: "left" }}>{s.sev}</span>
                <span className="mono" style={{ color: "var(--c-ink-3)", fontSize: 11 }}>{s.n}</span>
              </button>
            );
          })}
        </div>
      </div>
      <div style={{ padding: "10px 14px", borderTop: "1px solid var(--c-line)", marginTop: 6 }}>
        <div className="hint" style={{ marginBottom: 8 }}>视图</div>
        {[
          ["未指派", 1],
          ["我负责", 0],
          ["我订阅", 4],
          ["近 24h", 11],
        ].map(([label, n]) => (
          <div key={label} className="ao-nav-item" style={{ cursor: "pointer" }}>
            <Ic.bookmark />
            <span style={{ flex: 1 }}>{label}</span>
            <span className="ao-nav-count">{n}</span>
          </div>
        ))}
      </div>
      <div style={{ flex: 1 }} />
      <div style={{ padding: "12px 14px", borderTop: "1px solid var(--c-line)", display: "flex", flexDirection: "column", gap: 6 }}>
        <div className="hint">每分钟噪声</div>
        <Spark values={[0.12, 0.18, 0.10, 0.14, 0.08, 0.16, 0.12, 0.09, 0.11, 0.13, 0.10, 0.12]} h={28} />
        <div className="mono" style={{ fontSize: 10.5, color: "var(--c-ink-3)" }}>0.12 · 目标 &lt; 0.2</div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
function AlertsCenter({ alerts, selectedId, onSelect, alert }) {
  return (
    <div style={{ display: "grid", gridTemplateRows: "minmax(220px, 0.95fr) 1fr", minHeight: 0 }}>
      <AlertsTable alerts={alerts} selectedId={selectedId} onSelect={onSelect} />
      <AlertDetail a={alert} />
    </div>
  );
}

function SevPill({ sev }) {
  const map = {
    P1: { bg: "var(--c-err-bg)", fg: "var(--c-err)", label: "P1" },
    P2: { bg: "color-mix(in oklab, oklch(0.6 0.16 35) 14%, transparent)", fg: "oklch(0.55 0.16 35)", label: "P2" },
    P3: { bg: "var(--c-warn-bg)", fg: "oklch(0.5 0.14 75)", label: "P3" },
    P4: { bg: "color-mix(in oklab, var(--c-ink-3) 14%, transparent)", fg: "var(--c-ink-3)", label: "P4" },
  };
  const m = map[sev] || map.P4;
  return <span className="badge" style={{ background: m.bg, color: m.fg, borderColor: "color-mix(in oklab, " + m.fg + " 30%, transparent)" }}>{m.label}</span>;
}

function StateBadge({ state }) {
  const map = {
    firing:   { tone: "err",  label: "firing",   pulse: true  },
    ack:      { tone: "info", label: "ack",      pulse: false },
    snoozed:  { tone: "warn", label: "snoozed",  pulse: false },
    resolved: { tone: "ok",   label: "resolved", pulse: false },
  };
  const m = map[state] || map.firing;
  return <span className={"badge " + m.tone + (m.pulse ? " pulse" : "")}><span className="bdot" />{m.label}</span>;
}

function AlertsTable({ alerts, selectedId, onSelect }) {
  return (
    <div style={{ borderBottom: "1px solid var(--c-line)", background: "var(--c-surface)", display: "flex", flexDirection: "column", minHeight: 0 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderBottom: "1px solid var(--c-line)" }}>
        <div style={{ fontSize: 13, fontWeight: 600 }}>当前告警</div>
        <span className="badge err pulse" style={{ marginLeft: 4 }}><span className="bdot" />4 firing</span>
        <div style={{ flex: 1 }} />
        <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--c-ink-3)", fontSize: 11.5 }}>
          <Ic.search /><span>搜索告警 / 规则 / 标签…</span>
          <kbd style={{ marginLeft: 4 }}>/</kbd>
        </div>
      </div>
      <div style={{ flex: 1, overflow: "auto", minHeight: 0 }}>
        <table className="tbl" style={{ tableLayout: "fixed" }}>
          <colgroup>
            <col style={{ width: 56 }} />
            <col style={{ width: 86 }} />
            <col />
            <col style={{ width: 124 }} />
            <col style={{ width: 96 }} />
            <col style={{ width: 120 }} />
            <col style={{ width: 92 }} />
            <col style={{ width: 96 }} />
            <col style={{ width: 110 }} />
          </colgroup>
          <thead>
            <tr>
              <th>sev</th>
              <th>state</th>
              <th>告警</th>
              <th>规则源</th>
              <th>持续</th>
              <th>影响</th>
              <th>负责人</th>
              <th>趋势</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {alerts.map((a) => {
              const active = a.id === selectedId;
              return (
                <tr key={a.id} onClick={() => onSelect(a.id)} style={{ cursor: "pointer", background: active ? "var(--c-accent-bg)" : undefined }}>
                  <td><SevPill sev={a.sev} /></td>
                  <td><StateBadge state={a.state} /></td>
                  <td>
                    <div style={{ fontWeight: 600, fontSize: 12.5, color: "var(--c-ink-1)" }}>{a.title}</div>
                    <div className="mono" style={{ color: "var(--c-ink-3)", fontSize: 10.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.id} · {a.rule}</div>
                  </td>
                  <td>
                    <div className="mono" style={{ fontSize: 11 }}>{a.source}</div>
                    <div className="hint" style={{ fontSize: 10.5 }}>{a.stage}</div>
                  </td>
                  <td>
                    <div className="mono" style={{ fontSize: 11.5, fontFeatureSettings: '"tnum"' }}>{a.duration}</div>
                    <div className="hint" style={{ fontSize: 10.5 }}>{a.started}</div>
                  </td>
                  <td>
                    <div style={{ fontSize: 11.5, color: "var(--c-ink-2)" }}>
                      <span className="mono">{a.affected.runs}</span> runs · <span className="mono">{a.affected.jobs}</span> jobs
                    </div>
                    <div className="hint" style={{ fontSize: 10.5 }}>candidates {a.affected.candidates}</div>
                  </td>
                  <td>
                    {a.assignee === "未指派"
                      ? <span className="badge warn">{a.assignee}</span>
                      : <span style={{ fontSize: 11.5 }}>{a.assignee}</span>}
                  </td>
                  <td><Spark values={a.spark.length ? a.spark : [0,0,0,0,0,0]} h={22} stroke={a.spark.length ? "var(--c-err)" : "var(--c-ink-4)"} /></td>
                  <td>
                    <button className="btn sm ghost" onClick={(e) => { e.stopPropagation(); }}>ack</button>
                    <button className="btn sm ghost" onClick={(e) => { e.stopPropagation(); }}>snooze</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
function AlertDetail({ a }) {
  const [tab, setTab] = React.useState("timeline");
  const tabs = [
    ["timeline", "时间线"],
    ["events",   "关联事件"],
    ["rule",     "规则定义"],
    ["runbook",  "Runbook"],
  ];
  return (
    <div style={{ background: "var(--c-bg)", display: "flex", flexDirection: "column", minHeight: 0 }}>
      <div style={{ padding: "12px 18px 10px", borderBottom: "1px solid var(--c-line)", background: "var(--c-surface)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <SevPill sev={a.sev} />
          <StateBadge state={a.state} />
          <div style={{ fontSize: 14, fontWeight: 600, letterSpacing: "-0.01em" }}>{a.title}</div>
          <span className="mono" style={{ color: "var(--c-ink-3)", fontSize: 11.5 }}>{a.id}</span>
          <div style={{ flex: 1 }} />
          <button className="btn sm"><Ic.bell />通知</button>
          <button className="btn sm">分配</button>
          <button className="btn sm">snooze</button>
          <button className="btn sm primary">resolve</button>
        </div>
        <div className="mono" style={{ fontSize: 11, color: "var(--c-ink-3)", marginTop: 6 }}>{a.rule}</div>
        <div style={{ display: "flex", gap: 18, marginTop: 8, fontSize: 11.5, color: "var(--c-ink-2)" }}>
          <span>开始 <span className="mono">{a.started}</span></span>
          <span>持续 <span className="mono">{a.duration}</span></span>
          <span>来源 <span className="mono">{a.source}</span></span>
          <span>通道 <span className="mono">{a.channel}</span></span>
          <span>负责 <b>{a.assignee}</b></span>
        </div>
        <div style={{ display: "flex", gap: 0, marginTop: 12, borderBottom: "1px solid transparent", marginBottom: -10 }}>
          {tabs.map(([id, label]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              style={{
                padding: "8px 12px", fontSize: 12,
                background: "transparent", border: "0",
                borderBottom: "2px solid " + (tab === id ? "var(--c-ink-1)" : "transparent"),
                color: tab === id ? "var(--c-ink-1)" : "var(--c-ink-3)",
                fontWeight: tab === id ? 600 : 500, cursor: "pointer",
              }}
            >{label}</button>
          ))}
        </div>
      </div>
      <div style={{ flex: 1, overflow: "auto", minHeight: 0, padding: "14px 18px" }}>
        {tab === "timeline" && <AlertTimeline a={a} />}
        {tab === "events"   && <AlertEvents a={a} />}
        {tab === "rule"     && <AlertRule a={a} />}
        {tab === "runbook"  && <AlertRunbook a={a} />}
      </div>
    </div>
  );
}

function AlertTimeline({ a }) {
  const kindMap = {
    fired:    { color: "var(--c-err)",  ic: "alert" },
    notify:   { color: "var(--c-info)", ic: "bell"  },
    ack:      { color: "var(--c-info)", ic: "check" },
    note:     { color: "var(--c-ink-3)", ic: "edit" },
    action:   { color: "var(--c-accent)", ic: "bolt" },
    auto:     { color: "var(--c-accent)", ic: "cpu" },
    deploy:   { color: "var(--c-accent)", ic: "play" },
    snooze:   { color: "oklch(0.62 0.14 75)", ic: "clock" },
    resolved: { color: "var(--c-ok)", ic: "check" },
  };
  return (
    <div>
      <div style={{ display: "flex", gap: 14, marginBottom: 14 }}>
        <div style={{ flex: 1, padding: 12, border: "1px solid var(--c-line)", borderRadius: 8, background: "var(--c-surface)" }}>
          <div className="hint">影响范围</div>
          <div style={{ display: "flex", gap: 22, marginTop: 6 }}>
            <div><div className="mono" style={{ fontSize: 18, fontWeight: 600, fontFeatureSettings: '"tnum"' }}>{a.affected.runs}</div><div className="hint">runs</div></div>
            <div><div className="mono" style={{ fontSize: 18, fontWeight: 600, fontFeatureSettings: '"tnum"' }}>{a.affected.jobs}</div><div className="hint">jobs</div></div>
            <div><div className="mono" style={{ fontSize: 18, fontWeight: 600, fontFeatureSettings: '"tnum"' }}>{a.affected.candidates}</div><div className="hint">candidates</div></div>
          </div>
          <div style={{ marginTop: 8, fontSize: 11.5, color: "var(--c-ink-2)" }}>{a.desc}</div>
        </div>
        <div style={{ width: 280, padding: 12, border: "1px solid var(--c-line)", borderRadius: 8, background: "var(--c-surface)" }}>
          <div className="hint">触发频率 · 12m</div>
          <Spark values={a.spark} h={48} stroke="var(--c-err)" />
          <div className="mono" style={{ fontSize: 10.5, color: "var(--c-ink-3)", marginTop: 4 }}>peak 9 · last 12 buckets</div>
        </div>
      </div>
      <div style={{ position: "relative", paddingLeft: 22 }}>
        <div style={{ position: "absolute", left: 9, top: 4, bottom: 4, width: 1, background: "var(--c-line)" }} />
        {a.timeline.map((e, i) => {
          const m = kindMap[e.k] || kindMap.note;
          const Icon = Ic[m.ic] || Ic.alert;
          return (
            <div key={i} style={{ position: "relative", display: "flex", gap: 12, marginBottom: 14 }}>
              <div style={{
                position: "absolute", left: -22, top: 0,
                width: 18, height: 18, borderRadius: "50%",
                background: "var(--c-bg)", border: "1.5px solid " + m.color,
                display: "flex", alignItems: "center", justifyContent: "center", color: m.color,
              }}>
                <Icon />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                  <span className="mono" style={{ fontSize: 11, color: m.color, fontWeight: 600 }}>{e.t}</span>
                  <span style={{ fontSize: 10.5, color: "var(--c-ink-3)", textTransform: "uppercase", letterSpacing: ".06em" }}>{e.k}</span>
                  <span className="hint">· {e.by}</span>
                </div>
                <div style={{ fontSize: 12.5, color: "var(--c-ink-1)", marginTop: 2 }}>{e.text}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AlertEvents({ a }) {
  return (
    <div>
      <div className="hint" style={{ marginBottom: 8 }}>关联事件类型 ({a.related.length})</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {a.related.length === 0 && <div className="muted" style={{ fontSize: 12 }}>无关联事件。规则基于系统度量触发。</div>}
        {a.related.map((name, i) => (
          <div key={i} style={{ padding: 10, border: "1px solid var(--c-line)", borderRadius: 8, background: "var(--c-surface)", display: "flex", alignItems: "center", gap: 10 }}>
            <Ic.bolt />
            <span className="mono" style={{ fontWeight: 600, fontSize: 12 }}>{name}</span>
            <div style={{ flex: 1 }} />
            <span className="badge info"><span className="bdot" />监听中</span>
            <button className="btn sm ghost">查看 →</button>
          </div>
        ))}
      </div>
      <div className="hint" style={{ marginTop: 16, marginBottom: 8 }}>受影响最近 runs</div>
      <table className="tbl">
        <thead><tr><th>run</th><th>workflow</th><th>状态</th><th>触发事件</th><th>用时</th></tr></thead>
        <tbody>
          {[
            ["run_8e21",  "client→submit/v4.2", "failed",  "REQUIREMENT_SYNCED", "2.4s"],
            ["run_8e1f",  "client→submit/v4.2", "failed",  "REQUIREMENT_SYNCED", "2.1s"],
            ["run_8e1c",  "client→submit/v4.2", "failed",  "REQUIREMENT_SYNCED", "1.9s"],
            ["run_8e1a",  "human-clarify/v1",   "running", "ANALYSIS_BLOCKED",   "31s"],
          ].map((r, i) => (
            <tr key={i}>
              <td className="mono">{r[0]}</td>
              <td className="mono">{r[1]}</td>
              <td>{r[2] === "failed" ? <StateBadge state="firing" /> : <span className="badge info"><span className="bdot" />running</span>}</td>
              <td className="mono">{r[3]}</td>
              <td className="mono">{r[4]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AlertRule({ a }) {
  return (
    <div>
      <div className="hint" style={{ marginBottom: 6 }}>规则 (PromQL-like)</div>
      <pre style={{
        margin: 0, padding: 12, borderRadius: 8,
        background: "var(--c-panel)", border: "1px solid var(--c-line)",
        fontFamily: "var(--f-mono)", fontSize: 12, color: "var(--c-ink-1)", whiteSpace: "pre-wrap",
      }}>{`expr: ${a.rule}
for:  5m
labels:
  severity: ${a.sev.toLowerCase()}
  team: req-ops
  source: ${a.source}
annotations:
  summary: "${a.title}"
  runbook_url: https://wiki.internal/runbooks/${a.id.toLowerCase()}
notifications:
  - feishu: ${a.channel}
  - escalate_after: 15m → on-call.secondary
  - escalate_after: 45m → manager`}</pre>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 }}>
        <div style={{ padding: 10, border: "1px solid var(--c-line)", borderRadius: 8, background: "var(--c-surface)" }}>
          <div className="hint">最近 7 天触发</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 4 }}>
            <span className="mono" style={{ fontSize: 18, fontWeight: 600 }}>14</span>
            <span style={{ color: "var(--c-ok)", fontSize: 11 }}>−21%</span>
          </div>
          <Spark values={[3, 2, 4, 1, 2, 1, 1]} h={28} />
        </div>
        <div style={{ padding: 10, border: "1px solid var(--c-line)", borderRadius: 8, background: "var(--c-surface)" }}>
          <div className="hint">误报率</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 4 }}>
            <span className="mono" style={{ fontSize: 18, fontWeight: 600 }}>4.3%</span>
            <span style={{ color: "var(--c-ok)", fontSize: 11 }}>正常</span>
          </div>
          <div className="hint" style={{ marginTop: 4 }}>3 / 70 · 30 天</div>
        </div>
      </div>
    </div>
  );
}

function AlertRunbook({ a }) {
  const steps = [
    { done: true,  text: "在 Inngest 控制台过滤 `event:ANALYSIS_BLOCKED`，确认错误集中类型。" },
    { done: true,  text: "若错误为 schema 不匹配 → 进入「数据源 → 客户 ATS」查看字段映射变更日志。" },
    { done: false, text: "联系客户技术对接确认字段语义；必要时降级到 ReqAnalyzer/v3.1。" },
    { done: false, text: "更新映射后重放最近 30 分钟的失败 runs。" },
    { done: false, text: "回归绿色后关闭告警并归档 RCA。" },
  ];
  return (
    <div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {steps.map((s, i) => (
          <div key={i} style={{
            display: "flex", gap: 10, padding: 10,
            border: "1px solid var(--c-line)", borderRadius: 8,
            background: s.done ? "color-mix(in oklab, var(--c-ok) 5%, var(--c-surface))" : "var(--c-surface)",
          }}>
            <div style={{
              width: 18, height: 18, borderRadius: "50%",
              border: "1.5px solid " + (s.done ? "var(--c-ok)" : "var(--c-line-strong)"),
              background: s.done ? "var(--c-ok)" : "transparent",
              color: "white", display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 10, flexShrink: 0,
            }}>{s.done ? "✓" : i + 1}</div>
            <div style={{ flex: 1, fontSize: 12.5, color: "var(--c-ink-1)", lineHeight: 1.5, textDecoration: s.done ? "line-through" : "none" }}>{s.text}</div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 14, padding: 10, border: "1px dashed var(--c-line-strong)", borderRadius: 8, fontSize: 11.5, color: "var(--c-ink-3)" }}>
        Runbook · <span className="mono">runbooks/{a.id.toLowerCase()}.md</span> · 维护人 平台运营 · 上次更新 3 天前
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
function AlertsRightRail() {
  return (
    <div style={{ borderLeft: "1px solid var(--c-line)", background: "var(--c-bg)", display: "flex", flexDirection: "column", minHeight: 0 }}>
      <div style={{ padding: "12px 14px", borderBottom: "1px solid var(--c-line)", background: "var(--c-surface)" }}>
        <div style={{ fontSize: 13, fontWeight: 600 }}>On-call · 当值</div>
        <div className="hint" style={{ marginTop: 2 }}>轮值表 / 升级路径 / 静默</div>
      </div>
      <div style={{ padding: "10px 12px" }}>
        {ON_CALL.map((p, i) => {
          const dot = p.status === "primary" ? "var(--c-ok)" : p.status === "secondary" ? "var(--c-info)" : p.status === "advisory" ? "oklch(0.62 0.14 75)" : "var(--c-ink-4)";
          return (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 6px", borderBottom: i === ON_CALL.length - 1 ? "none" : "1px solid var(--c-line)" }}>
              <div style={{ width: 30, height: 30, borderRadius: "50%", background: "var(--c-panel)", border: "1px solid var(--c-line)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 600 }}>{p.name[0]}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12.5, fontWeight: 600 }}>{p.name}</div>
                <div className="hint" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.role} · {p.shift}</div>
              </div>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: dot }} />
            </div>
          );
        })}
      </div>
      <div style={{ padding: "10px 14px", borderTop: "1px solid var(--c-line)", background: "var(--c-surface)" }}>
        <div style={{ fontSize: 12.5, fontWeight: 600 }}>升级策略</div>
      </div>
      <div style={{ padding: "10px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
        {[
          ["0 min",  "primary",   "feishu · 电话"],
          ["+15 min","secondary", "feishu"],
          ["+45 min","manager",   "短信 · 电话"],
          ["+90 min","org-wide",  "广播"],
        ].map((r, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span className="mono" style={{ width: 56, fontSize: 11, color: "var(--c-ink-3)" }}>{r[0]}</span>
            <span className="badge">{r[1]}</span>
            <span style={{ fontSize: 11.5, color: "var(--c-ink-2)" }}>→ {r[2]}</span>
          </div>
        ))}
      </div>
      <div style={{ padding: "10px 14px", borderTop: "1px solid var(--c-line)", background: "var(--c-surface)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 12.5, fontWeight: 600 }}>静默规则</span>
          <span className="badge warn"><span className="bdot" />{SILENCED.length}</span>
        </div>
      </div>
      <div style={{ padding: "8px 12px", display: "flex", flexDirection: "column", gap: 6 }}>
        {SILENCED.map((s) => (
          <div key={s.id} style={{ padding: 8, border: "1px solid var(--c-line)", borderRadius: 6, background: "var(--c-surface)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span className="mono" style={{ fontSize: 11, color: "var(--c-ink-3)" }}>{s.id}</span>
              <div style={{ flex: 1 }} />
              <span className="badge warn">{s.until}</span>
            </div>
            <div className="mono" style={{ fontSize: 11, marginTop: 4, color: "var(--c-ink-1)" }}>{s.scope}</div>
            <div className="hint" style={{ marginTop: 2 }}>{s.by} · {s.reason}</div>
          </div>
        ))}
      </div>
      <div style={{ flex: 1 }} />
      <div style={{ padding: "10px 14px", borderTop: "1px solid var(--c-line)", display: "flex", gap: 6 }}>
        <button className="btn sm" style={{ flex: 1 }}><Ic.bell />全部静音 1h</button>
        <button className="btn sm" style={{ flex: 1 }}>导出 RCA</button>
      </div>
    </div>
  );
}

window.AlertsPageArtboard = AlertsPageArtboard;
