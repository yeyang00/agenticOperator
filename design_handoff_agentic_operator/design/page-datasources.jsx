/* global React, useT, AppBar, LeftNav, Ic, DirectionTag, CommandPalette, StatusDot, Spark */

// ===== Data Sources (数据源 / Integrations) =====
// 客户系统、招聘渠道、模型/向量库、消息、内部数据库 等所有外部连接的统一管理。
// Layout: AppBar → SubHeader → 3-col:
//   left  – 分类树
//   center – 连接器卡片网格 + 选中后切换为详情面板
//   right – 同步活动 + webhook 健康

const SOURCE_CATS = [
  { id: "all",       label: "全部",        n: 24, ic: "grid" },
  { id: "ats",       label: "客户 ATS / RMS",   n: 6,  ic: "plug" },
  { id: "channel",   label: "招聘渠道",     n: 5,  ic: "bolt" },
  { id: "model",     label: "模型与向量库", n: 4,  ic: "cpu"  },
  { id: "messaging", label: "消息与协作",   n: 3,  ic: "bell" },
  { id: "storage",   label: "存储与数据库", n: 4,  ic: "book" },
  { id: "identity",  label: "身份与权限",   n: 2,  ic: "key"  },
];

const STATUS = {
  healthy:   { label: "正常", tone: "ok",   dot: "var(--c-ok)" },
  degraded:  { label: "降级", tone: "warn", dot: "oklch(0.62 0.14 75)" },
  failing:   { label: "异常", tone: "err",  dot: "var(--c-err)" },
  paused:    { label: "暂停", tone: "info", dot: "var(--c-ink-3)" },
  pending:   { label: "待授权", tone: "info", dot: "var(--c-info)" },
};

const SOURCES = [
  // ATS / RMS
  { id: "src-bytedance",  cat: "ats",       name: "ByteDance · ATS",        vendor: "Lever-自研",   logo: "BD", color: "oklch(0.55 0.18 255)",
    status: "healthy",   syncMode: "webhook + 5min poll", lastSync: "12s 前", events_1d: 1842, errs: 0,  latency: "84ms",
    fields: 38, mapped: 36, owner: "周航", contractEnd: "2026-08", desc: "字节跳动需求中心 webhook 推送 + 兜底轮询。" },
  { id: "src-meituan",    cat: "ats",       name: "美团 · 内部 RMS",         vendor: "Workday",      logo: "MT", color: "oklch(0.65 0.16 35)",
    status: "degraded",  syncMode: "OAuth · 15min poll",  lastSync: "3m 前", events_1d: 412,  errs: 12, latency: "612ms",
    fields: 41, mapped: 33, owner: "周航", contractEnd: "2026-04", desc: "Workday SOAP 偶发 504，已开 ticket。" },
  { id: "src-xiaomi",     cat: "ats",       name: "小米 · MiHire",            vendor: "MiHire",       logo: "Mi", color: "oklch(0.6 0.18 35)",
    status: "healthy",   syncMode: "REST · 实时 webhook",  lastSync: "实时",  events_1d: 308,  errs: 0,  latency: "42ms",
    fields: 28, mapped: 28, owner: "陈璐", contractEnd: "2027-02", desc: "全字段对齐，无映射缺口。" },
  { id: "src-baidu",      cat: "ats",       name: "百度 · 招聘云",            vendor: "Beisen",        logo: "Bd", color: "oklch(0.55 0.16 255)",
    status: "failing",   syncMode: "Webhook v3",            lastSync: "1h 前", events_1d: 0,    errs: 47, latency: "—",
    fields: 35, mapped: 30, owner: "周航", contractEnd: "2026-12", desc: "客户端 webhook 证书过期，已通知联系人续签。" },
  { id: "src-tencent",    cat: "ats",       name: "腾讯 · TCRMS",             vendor: "自研",         logo: "Tx", color: "oklch(0.6 0.14 145)",
    status: "pending",   syncMode: "尚未授权",              lastSync: "—",     events_1d: 0,    errs: 0,  latency: "—",
    fields: 0, mapped: 0,   owner: "李韵", contractEnd: "2026-06", desc: "等待安全合规评审通过。" },
  { id: "src-xiaohongshu",cat: "ats",       name: "小红书 · HRTalent",        vendor: "MoSeeker",     logo: "RS", color: "oklch(0.62 0.18 15)",
    status: "healthy",   syncMode: "REST · 30min poll",     lastSync: "8m 前", events_1d: 96,   errs: 0,  latency: "210ms",
    fields: 24, mapped: 24, owner: "陈璐", contractEnd: "2027-09", desc: "低频，但稳定。" },

  // 招聘渠道
  { id: "src-liepin",     cat: "channel",   name: "猎聘 · 简历库",            vendor: "Liepin Open",   logo: "LP", color: "oklch(0.6 0.16 35)",
    status: "healthy",   syncMode: "REST · API push",       lastSync: "实时",  events_1d: 4218, errs: 6,  latency: "98ms",
    fields: 56, mapped: 54, owner: "陈璐", contractEnd: "2026-03", desc: "含主动检索、JD 投放、候选人推送三类接口。" },
  { id: "src-boss",       cat: "channel",   name: "BOSS 直聘",                vendor: "Boss API",      logo: "BS", color: "oklch(0.6 0.18 145)",
    status: "healthy",   syncMode: "OAuth · webhook",       lastSync: "实时",  events_1d: 6790, errs: 18, latency: "76ms",
    fields: 42, mapped: 41, owner: "陈璐", contractEnd: "2026-11", desc: "主力渠道，每日推送量第一。" },
  { id: "src-zhilian",    cat: "channel",   name: "智联招聘",                  vendor: "Zhilian Open",  logo: "ZL", color: "oklch(0.6 0.16 255)",
    status: "degraded",  syncMode: "REST · 5min poll",      lastSync: "1m 前", events_1d: 1102, errs: 33, latency: "1.2s",
    fields: 38, mapped: 36, owner: "陈璐", contractEnd: "2026-07", desc: "p95 延迟突增，疑似上游 API 限速。" },
  { id: "src-linkedin",   cat: "channel",   name: "LinkedIn Recruiter",       vendor: "LinkedIn",      logo: "in", color: "oklch(0.55 0.16 255)",
    status: "paused",    syncMode: "OAuth",                  lastSync: "已暂停", events_1d: 0,   errs: 0,  latency: "—",
    fields: 32, mapped: 28, owner: "李韵", contractEnd: "2026-05", desc: "等待跨境合规复核，暂停同步 14 天。" },
  { id: "src-maimai",     cat: "channel",   name: "脉脉 · 人才库",            vendor: "Maimai Open",   logo: "MM", color: "oklch(0.6 0.18 75)",
    status: "healthy",   syncMode: "REST",                   lastSync: "21s 前", events_1d: 540,  errs: 1,  latency: "120ms",
    fields: 26, mapped: 26, owner: "陈璐", contractEnd: "2027-01", desc: "辅助渠道，覆盖被动候选人。" },

  // 模型与向量库
  { id: "src-openai",     cat: "model",     name: "OpenAI · gpt-4o",          vendor: "OpenAI",        logo: "AI", color: "oklch(0.6 0.14 145)",
    status: "healthy",   syncMode: "Inference",              lastSync: "实时",  events_1d: 18420,errs: 14, latency: "640ms",
    fields: 0,  mapped: 0, owner: "刘星", contractEnd: "—",        desc: "JD 生成 / 摘要 / 分析。月用量 78%。" },
  { id: "src-claude",     cat: "model",     name: "Anthropic · Claude",       vendor: "Anthropic",     logo: "An", color: "oklch(0.7 0.14 35)",
    status: "healthy",   syncMode: "Inference",              lastSync: "实时",  events_1d: 9128, errs: 2,  latency: "510ms",
    fields: 0,  mapped: 0, owner: "刘星", contractEnd: "—",        desc: "结构化抽取 / 长文本分析。" },
  { id: "src-bge",        cat: "model",     name: "BGE-M3 · 嵌入服务",        vendor: "自托管",         logo: "BG", color: "oklch(0.6 0.14 200)",
    status: "healthy",   syncMode: "Inference",              lastSync: "实时",  events_1d: 22340,errs: 0,  latency: "38ms",
    fields: 0,  mapped: 0, owner: "刘星", contractEnd: "—",        desc: "候选人 / JD / 知识库 嵌入。" },
  { id: "src-milvus",     cat: "model",     name: "Milvus 向量库",            vendor: "Zilliz Cloud",  logo: "Mv", color: "oklch(0.55 0.18 275)",
    status: "healthy",   syncMode: "持久化",                  lastSync: "实时",  events_1d: 0,    errs: 0,  latency: "12ms",
    fields: 0,  mapped: 0, owner: "刘星", contractEnd: "2026-12",  desc: "candidate_index / jd_index / knowledge_index, 共 1.2 亿向量。" },

  // 消息与协作
  { id: "src-feishu",     cat: "messaging", name: "飞书 · 通知 / 审批",       vendor: "Lark",          logo: "FS", color: "oklch(0.6 0.18 215)",
    status: "healthy",   syncMode: "Webhook + Open API",      lastSync: "实时",  events_1d: 4280, errs: 1,  latency: "84ms",
    fields: 0,  mapped: 0, owner: "刘星", contractEnd: "—",        desc: "告警、审批、面试约面、群组同步。" },
  { id: "src-wecom",      cat: "messaging", name: "企业微信",                  vendor: "Tencent",       logo: "WX", color: "oklch(0.6 0.18 145)",
    status: "healthy",   syncMode: "Webhook",                 lastSync: "实时",  events_1d: 612,  errs: 0,  latency: "92ms",
    fields: 0,  mapped: 0, owner: "陈璐", contractEnd: "—",        desc: "客户侧通知通道。" },
  { id: "src-email",      cat: "messaging", name: "出站邮件 · SMTP",           vendor: "AWS SES",       logo: "EM", color: "oklch(0.6 0.16 35)",
    status: "healthy",   syncMode: "SMTP",                    lastSync: "实时",  events_1d: 1290, errs: 4,  latency: "—",
    fields: 0,  mapped: 0, owner: "刘星", contractEnd: "2026-09",  desc: "面试邀请、确认信、Offer。" },

  // 存储与数据库
  { id: "src-pg",         cat: "storage",   name: "Postgres · 主库",          vendor: "AWS Aurora",    logo: "PG", color: "oklch(0.55 0.18 245)",
    status: "healthy",   syncMode: "Direct",                  lastSync: "实时",  events_1d: 0,    errs: 0,  latency: "3ms",
    fields: 0,  mapped: 0, owner: "刘星", contractEnd: "—",        desc: "Job_Requisition / Candidate / Interview …" },
  { id: "src-clickhouse", cat: "storage",   name: "ClickHouse · 分析库",      vendor: "Self-hosted",   logo: "CH", color: "oklch(0.7 0.16 75)",
    status: "healthy",   syncMode: "CDC · Debezium",           lastSync: "实时",  events_1d: 0,    errs: 0,  latency: "—",
    fields: 0,  mapped: 0, owner: "刘星", contractEnd: "—",        desc: "事件 + 度量持久化，支撑告警与报表。" },
  { id: "src-s3",         cat: "storage",   name: "对象存储 · S3",             vendor: "AWS",           logo: "S3", color: "oklch(0.62 0.16 35)",
    status: "healthy",   syncMode: "Direct",                  lastSync: "实时",  events_1d: 0,    errs: 0,  latency: "—",
    fields: 0,  mapped: 0, owner: "刘星", contractEnd: "—",        desc: "原始简历 / JD / 通话录音 / 模型产物。" },
  { id: "src-kafka",      cat: "storage",   name: "Kafka · 事件总线",          vendor: "MSK",           logo: "Kf", color: "oklch(0.55 0.16 0)",
    status: "healthy",   syncMode: "Stream",                  lastSync: "实时",  events_1d: 218400, errs: 12, latency: "8ms",
    fields: 0,  mapped: 0, owner: "刘星", contractEnd: "—",        desc: "Inngest 事件持久化通道。" },

  // 身份与权限
  { id: "src-okta",       cat: "identity",  name: "Okta · SSO",                vendor: "Okta",          logo: "Ok", color: "oklch(0.55 0.18 245)",
    status: "healthy",   syncMode: "SAML / SCIM",              lastSync: "5m 前", events_1d: 38,   errs: 0,  latency: "—",
    fields: 0,  mapped: 0, owner: "刘星", contractEnd: "2026-10",  desc: "全员 SSO + 员工目录同步。" },
  { id: "src-keycloak",   cat: "identity",  name: "客户子账号 · Keycloak",     vendor: "Self-hosted",   logo: "KC", color: "oklch(0.55 0.18 280)",
    status: "healthy",   syncMode: "OIDC",                     lastSync: "实时",  events_1d: 14,   errs: 0,  latency: "—",
    fields: 0,  mapped: 0, owner: "刘星", contractEnd: "—",        desc: "客户外部用户 / 面试官登录。" },
];

// ─────────────────────────────────────────────────────────────────────────
function DataSourcesPageArtboard() {
  const { t } = useT();
  const [cmdkOpen, setCmdkOpen] = React.useState(false);
  const [cat, setCat] = React.useState("all");
  const [selectedId, setSelectedId] = React.useState(null);

  const visible = SOURCES.filter((s) => cat === "all" || s.cat === cat);
  const selected = selectedId ? SOURCES.find((s) => s.id === selectedId) : null;

  return (
    <div className="ao-frame" data-screen-label="Data Sources 数据源">
      <AppBar
        crumbs={[t("nav_group_build"), t("nav_integrations"), selected ? selected.name : "全部连接器"]}
        onOpenCmdK={() => setCmdkOpen(true)}
      />
      <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
        <LeftNav active="integrations" />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
          <DSSubHeader />
          <div style={{ flex: 1, display: "grid", gridTemplateColumns: "232px 1fr 320px", minHeight: 0 }}>
            <DSCatRail cat={cat} setCat={setCat} />
            {selected
              ? <DSDetail s={selected} onBack={() => setSelectedId(null)} />
              : <DSGrid sources={visible} onOpen={setSelectedId} />}
            <DSRightRail />
          </div>
        </div>
      </div>
      <DirectionTag label="数据源 · Integrations" />
      <CommandPalette open={cmdkOpen} onClose={() => setCmdkOpen(false)} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
function DSSubHeader() {
  const stats = [
    { l: "已连接", v: "21 / 24", d: "1 待授权 · 2 异常", tone: "muted" },
    { l: "事件 · 1d", v: "262.4k", d: "+8.4%", tone: "up" },
    { l: "错误率",   v: "0.06%",  d: "目标 < 0.5%", tone: "up" },
    { l: "p95 延迟", v: "184ms",  d: "+22ms", tone: "down" },
    { l: "本月支出", v: "¥38,210",d: "−4.1%", tone: "up" },
    { l: "合规审核", v: "2 待处理",d: "Okta · Keycloak", tone: "muted" },
  ];
  return (
    <div style={{ padding: "14px 22px", borderBottom: "1px solid var(--c-line)", background: "var(--c-surface)", display: "flex", alignItems: "center", gap: 18 }}>
      <div>
        <div style={{ fontSize: 15, fontWeight: 600, letterSpacing: "-0.01em" }}>数据源 · 连接器</div>
        <div className="muted" style={{ fontSize: 12, marginTop: 1 }}>客户系统 · 渠道 · 模型 · 消息 · 存储 · 身份</div>
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
      <button className="btn sm">导入 Manifest</button>
      <button className="btn sm primary"><Ic.plus /> 新增连接器</button>
    </div>
  );
}

function DSCatRail({ cat, setCat }) {
  return (
    <div style={{ borderRight: "1px solid var(--c-line)", background: "var(--c-bg)", display: "flex", flexDirection: "column", minHeight: 0 }}>
      <div style={{ padding: "12px 14px 6px" }}>
        <div className="hint" style={{ marginBottom: 6 }}>分类</div>
        {SOURCE_CATS.map((c) => {
          const Icon = Ic[c.ic] || Ic.plug;
          const active = cat === c.id;
          return (
            <div key={c.id} className={"ao-nav-item" + (active ? " active" : "")} onClick={() => setCat(c.id)} style={{ cursor: "pointer" }}>
              <Icon />
              <span style={{ flex: 1 }}>{c.label}</span>
              <span className="ao-nav-count">{c.n}</span>
            </div>
          );
        })}
      </div>
      <div style={{ padding: "10px 14px", borderTop: "1px solid var(--c-line)", marginTop: 6 }}>
        <div className="hint" style={{ marginBottom: 8 }}>状态</div>
        {[
          ["healthy",  "正常", 19, "var(--c-ok)"],
          ["degraded", "降级", 2,  "oklch(0.62 0.14 75)"],
          ["failing",  "异常", 1,  "var(--c-err)"],
          ["paused",   "暂停", 1,  "var(--c-ink-3)"],
          ["pending",  "待授权",1, "var(--c-info)"],
        ].map((r, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 6px", fontSize: 12 }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: r[3] }} />
            <span style={{ flex: 1, color: "var(--c-ink-2)" }}>{r[1]}</span>
            <span className="mono" style={{ color: "var(--c-ink-3)", fontSize: 11 }}>{r[2]}</span>
          </div>
        ))}
      </div>
      <div style={{ padding: "10px 14px", borderTop: "1px solid var(--c-line)", marginTop: 6 }}>
        <div className="hint" style={{ marginBottom: 8 }}>建议</div>
        {[
          ["map", "字段映射缺口 5"],
          ["key", "凭证 30 天内过期 2"],
          ["spark", "用量异常 1"],
        ].map(([ic, label], i) => {
          const Icon = Ic[ic] || Ic.alert;
          return (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 6px", fontSize: 12, color: "var(--c-ink-2)", cursor: "pointer" }}>
              <Icon />
              <span>{label}</span>
            </div>
          );
        })}
      </div>
      <div style={{ flex: 1 }} />
      <div style={{ padding: "12px 14px", borderTop: "1px solid var(--c-line)" }}>
        <div className="hint">入站速率 · 1h</div>
        <Spark values={[3,4,3,5,7,6,8,7,9,8,10,9]} h={28} />
        <div className="mono" style={{ fontSize: 10.5, color: "var(--c-ink-3)" }}>262.4k events · 1d</div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
function DSGrid({ sources, onOpen }) {
  return (
    <div style={{ overflow: "auto", minHeight: 0, padding: "16px 22px", background: "var(--c-bg)" }}>
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
        gap: 14,
      }}>
        {sources.map((s) => <DSCard key={s.id} s={s} onOpen={onOpen} />)}
      </div>
    </div>
  );
}

function DSCard({ s, onOpen }) {
  const st = STATUS[s.status];
  return (
    <div
      onClick={() => onOpen(s.id)}
      style={{
        background: "var(--c-surface)", border: "1px solid var(--c-line)",
        borderRadius: 10, padding: 14, cursor: "pointer", position: "relative",
        transition: "border-color 0.15s, transform 0.15s",
        display: "flex", flexDirection: "column", gap: 10,
      }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--c-line-strong)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--c-line)"; }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
        <div style={{
          width: 34, height: 34, borderRadius: 8,
          background: s.color, color: "white",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontFamily: "var(--f-mono)", fontWeight: 600, fontSize: 12, flexShrink: 0,
        }}>{s.logo}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--c-ink-1)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.name}</div>
          <div className="hint" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.vendor} · {s.syncMode}</div>
        </div>
        <span className={"badge " + st.tone}><span className="bdot" style={{ background: st.dot }} />{st.label}</span>
      </div>
      <div style={{ fontSize: 11.5, color: "var(--c-ink-2)", lineHeight: 1.5, minHeight: 32 }}>{s.desc}</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, paddingTop: 8, borderTop: "1px dashed var(--c-line)" }}>
        <div><div className="hint">事件 · 1d</div><div className="mono" style={{ fontSize: 12.5, fontWeight: 600 }}>{s.events_1d.toLocaleString()}</div></div>
        <div><div className="hint">错误</div><div className="mono" style={{ fontSize: 12.5, fontWeight: 600, color: s.errs > 10 ? "var(--c-err)" : s.errs > 0 ? "oklch(0.62 0.14 75)" : "var(--c-ink-2)" }}>{s.errs}</div></div>
        <div><div className="hint">p95</div><div className="mono" style={{ fontSize: 12.5, fontWeight: 600 }}>{s.latency}</div></div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--c-ink-3)" }}>
        <Ic.clock />
        <span>同步 {s.lastSync}</span>
        <div style={{ flex: 1 }} />
        <span className="mono">{s.owner}</span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
function DSDetail({ s, onBack }) {
  const [tab, setTab] = React.useState("overview");
  const tabs = [
    ["overview", "概览"],
    ["fields",   "字段映射"],
    ["events",   "事件流"],
    ["auth",     "凭证与权限"],
    ["webhooks", "Webhook"],
    ["history",  "变更历史"],
  ];
  const st = STATUS[s.status];
  return (
    <div style={{ background: "var(--c-bg)", display: "flex", flexDirection: "column", minHeight: 0 }}>
      <div style={{ padding: "12px 18px 10px", borderBottom: "1px solid var(--c-line)", background: "var(--c-surface)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button className="btn sm ghost" onClick={onBack}>← 返回</button>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: s.color, color: "white",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: "var(--f-mono)", fontWeight: 600, fontSize: 12,
          }}>{s.logo}</div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, letterSpacing: "-0.01em" }}>{s.name}</div>
            <div className="mono" style={{ fontSize: 11, color: "var(--c-ink-3)" }}>{s.id} · {s.vendor}</div>
          </div>
          <span className={"badge " + st.tone} style={{ marginLeft: 6 }}><span className="bdot" style={{ background: st.dot }} />{st.label}</span>
          <div style={{ flex: 1 }} />
          <button className="btn sm">测试连接</button>
          <button className="btn sm">立即同步</button>
          <button className="btn sm danger">{s.status === "paused" ? "恢复" : "暂停"}</button>
          <button className="btn sm primary">配置</button>
        </div>
        <div style={{ display: "flex", gap: 18, marginTop: 10, fontSize: 11.5, color: "var(--c-ink-2)" }}>
          <span>同步 <span className="mono">{s.syncMode}</span></span>
          <span>最近 <span className="mono">{s.lastSync}</span></span>
          <span>事件 1d <span className="mono">{s.events_1d.toLocaleString()}</span></span>
          <span>错误 <span className="mono" style={{ color: s.errs > 0 ? "var(--c-err)" : undefined }}>{s.errs}</span></span>
          <span>p95 <span className="mono">{s.latency}</span></span>
          <span>负责人 <b>{s.owner}</b></span>
          <span>合同到期 <span className="mono">{s.contractEnd}</span></span>
        </div>
        <div style={{ display: "flex", gap: 0, marginTop: 12, marginBottom: -10 }}>
          {tabs.map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)} style={{
              padding: "8px 12px", fontSize: 12, background: "transparent", border: 0,
              borderBottom: "2px solid " + (tab === id ? "var(--c-ink-1)" : "transparent"),
              color: tab === id ? "var(--c-ink-1)" : "var(--c-ink-3)",
              fontWeight: tab === id ? 600 : 500, cursor: "pointer",
            }}>{label}</button>
          ))}
        </div>
      </div>
      <div style={{ flex: 1, overflow: "auto", padding: "14px 18px", minHeight: 0 }}>
        {tab === "overview" && <DSOverview s={s} />}
        {tab === "fields"   && <DSFields s={s} />}
        {tab === "events"   && <DSEvents s={s} />}
        {tab === "auth"     && <DSAuth s={s} />}
        {tab === "webhooks" && <DSWebhooks s={s} />}
        {tab === "history"  && <DSHistory s={s} />}
      </div>
    </div>
  );
}

function DSOverview({ s }) {
  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 14 }}>
        <div style={{ padding: 14, border: "1px solid var(--c-line)", borderRadius: 8, background: "var(--c-surface)" }}>
          <div style={{ fontSize: 12.5, fontWeight: 600, marginBottom: 10 }}>说明</div>
          <div style={{ fontSize: 12.5, color: "var(--c-ink-2)", lineHeight: 1.6 }}>{s.desc}</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginTop: 14 }}>
            <div><div className="hint">字段总数</div><div className="mono" style={{ fontSize: 18, fontWeight: 600 }}>{s.fields}</div></div>
            <div><div className="hint">已映射</div><div className="mono" style={{ fontSize: 18, fontWeight: 600 }}>{s.mapped} <span style={{ fontSize: 11, color: s.fields - s.mapped > 0 ? "oklch(0.62 0.14 75)" : "var(--c-ok)" }}>{s.fields - s.mapped > 0 ? `(缺 ${s.fields - s.mapped})` : "完整"}</span></div></div>
          </div>
        </div>
        <div style={{ padding: 14, border: "1px solid var(--c-line)", borderRadius: 8, background: "var(--c-surface)" }}>
          <div style={{ fontSize: 12.5, fontWeight: 600, marginBottom: 6 }}>事件吞吐 · 24h</div>
          <Spark values={[3,4,5,4,6,7,8,7,9,8,10,11,9,8,7,6,7,8,9,10,8,7,6,5]} h={56} />
          <div className="mono" style={{ fontSize: 10.5, color: "var(--c-ink-3)", marginTop: 4 }}>{s.events_1d.toLocaleString()} events · peak 11.2k/h</div>
          <div style={{ marginTop: 12 }}>
            <div className="hint" style={{ marginBottom: 4 }}>错误率 · 24h</div>
            <Spark values={[0.1,0.2,0.1,0.3,0.2,0.4,0.6,0.5,0.8,0.4,0.3,0.2]} h={28} stroke={s.errs > 0 ? "var(--c-err)" : "var(--c-ok)"} />
          </div>
        </div>
      </div>
      <div style={{ marginTop: 14, padding: 14, border: "1px solid var(--c-line)", borderRadius: 8, background: "var(--c-surface)" }}>
        <div style={{ fontSize: 12.5, fontWeight: 600, marginBottom: 10 }}>当前发布的事件类型</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {(s.cat === "ats" ? ["REQUIREMENT_SYNCED", "REQUIREMENT_LOGGED", "SYNC_FAILED_ALERT", "JOB_REQ_UPDATED", "JOB_REQ_CLOSED"]
            : s.cat === "channel" ? ["CV_RECEIVED", "CV_PARSED", "CHANNEL_PUSH_OK", "CHANNEL_PUSH_FAIL"]
            : s.cat === "model" ? ["INFERENCE_OK", "INFERENCE_FAIL", "TOKEN_BUDGET_WARN"]
            : s.cat === "messaging" ? ["NOTIFY_DELIVERED", "NOTIFY_FAILED", "WEBHOOK_RECEIVED"]
            : s.cat === "storage" ? ["DB_WRITE", "DB_READ_LATENCY"]
            : ["LOGIN_OK", "LOGIN_FAIL", "ROLE_CHANGED"]
          ).map((e) => (
            <span key={e} className="badge" style={{ background: "var(--c-panel)", borderColor: "var(--c-line)" }}><span className="bdot" style={{ background: "var(--c-info)" }} />{e}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

function DSFields({ s }) {
  const fields = [
    { theirs: "requisition_id",       ours: "Job_Requisition.id",            type: "String",  status: "ok",   xform: "—" },
    { theirs: "title",                ours: "Job_Requisition.title",         type: "String",  status: "ok",   xform: "—" },
    { theirs: "seniority_level",      ours: "Job_Requisition.seniority",     type: "Enum",    status: "warn", xform: "map → P3..P9" },
    { theirs: "city",                 ours: "Job_Requisition.location.city", type: "String",  status: "ok",   xform: "trim" },
    { theirs: "must_have_skills",     ours: "Job_Requisition_Spec.required", type: "List",    status: "ok",   xform: "split('|')" },
    { theirs: "salary_range",         ours: "Job_Requisition.salary",        type: "Object",  status: "ok",   xform: "currency=CNY" },
    { theirs: "headcount",            ours: "Job_Requisition.headcount",     type: "Integer", status: "ok",   xform: "—" },
    { theirs: "owner_email",          ours: "Job_Requisition.owner_id",      type: "String",  status: "ok",   xform: "lookup(users)" },
    { theirs: "(缺) industry_tags",   ours: "Job_Requisition.industry_tags", type: "List",    status: "miss", xform: "—" },
    { theirs: "(缺) reason_for_open", ours: "Job_Requisition.context",       type: "String",  status: "miss", xform: "—" },
  ];
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <div className="hint">字段映射 · 来源 → 内部 schema</div>
        <div style={{ flex: 1 }} />
        <button className="btn sm">导入 schema</button>
        <button className="btn sm primary">+ 新增映射</button>
      </div>
      <table className="tbl">
        <thead><tr><th>来源字段</th><th>内部字段</th><th>类型</th><th>变换</th><th>状态</th></tr></thead>
        <tbody>
          {fields.map((f, i) => (
            <tr key={i}>
              <td className="mono">{f.theirs}</td>
              <td className="mono">{f.ours}</td>
              <td><span className="badge">{f.type}</span></td>
              <td className="mono" style={{ color: "var(--c-ink-3)" }}>{f.xform}</td>
              <td>
                {f.status === "ok"   && <span className="badge ok"><span className="bdot" />已对齐</span>}
                {f.status === "warn" && <span className="badge warn"><span className="bdot" />需复核</span>}
                {f.status === "miss" && <span className="badge err"><span className="bdot" />缺失</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DSEvents({ s }) {
  return (
    <div>
      <div className="hint" style={{ marginBottom: 8 }}>最近事件 (实时)</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {[
          ["12s 前", "ok",  "REQUIREMENT_SYNCED", "req_8412 · senior backend"],
          ["28s 前", "ok",  "REQUIREMENT_SYNCED", "req_8411 · data scientist"],
          ["46s 前", "ok",  "JOB_REQ_UPDATED",    "req_8392 · headcount 1 → 2"],
          ["1m 前",  "err", "SYNC_FAILED_ALERT",  "schema mismatch · seniority_level"],
          ["1m 前",  "ok",  "REQUIREMENT_SYNCED", "req_8410 · android engineer"],
          ["2m 前",  "ok",  "REQUIREMENT_SYNCED", "req_8409 · qa lead"],
          ["3m 前",  "warn","JOB_REQ_UPDATED",    "req_8388 · 字段映射缺失被忽略"],
        ].map((r, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", border: "1px solid var(--c-line)", borderRadius: 6, background: "var(--c-surface)" }}>
            <span className="mono" style={{ width: 60, fontSize: 11, color: "var(--c-ink-3)" }}>{r[0]}</span>
            <span className={"badge " + r[1]}><span className="bdot" />{r[1]}</span>
            <span className="mono" style={{ fontSize: 12, fontWeight: 600 }}>{r[2]}</span>
            <span style={{ fontSize: 11.5, color: "var(--c-ink-2)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r[3]}</span>
            <button className="btn sm ghost">payload</button>
          </div>
        ))}
      </div>
    </div>
  );
}

function DSAuth({ s }) {
  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <div style={{ padding: 14, border: "1px solid var(--c-line)", borderRadius: 8, background: "var(--c-surface)" }}>
          <div style={{ fontSize: 12.5, fontWeight: 600, marginBottom: 10 }}>凭证</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div className="row" style={{ justifyContent: "space-between" }}>
              <span className="hint">类型</span><span className="mono">OAuth2 · client_credentials</span>
            </div>
            <div className="row" style={{ justifyContent: "space-between" }}>
              <span className="hint">Client ID</span><span className="mono">ao-prod-9f1c…</span>
            </div>
            <div className="row" style={{ justifyContent: "space-between" }}>
              <span className="hint">Secret</span><span className="mono">•••••••• 已加密</span>
            </div>
            <div className="row" style={{ justifyContent: "space-between" }}>
              <span className="hint">下次轮换</span><span className="mono">2026-02-14 · 27 天后</span>
            </div>
            <div className="row" style={{ justifyContent: "space-between" }}>
              <span className="hint">作用域</span><span className="mono">read:requisition write:status</span>
            </div>
          </div>
          <button className="btn sm" style={{ marginTop: 10 }}>立即轮换</button>
        </div>
        <div style={{ padding: 14, border: "1px solid var(--c-line)", borderRadius: 8, background: "var(--c-surface)" }}>
          <div style={{ fontSize: 12.5, fontWeight: 600, marginBottom: 10 }}>权限边界</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12 }}>
            {[
              ["read",  "Job_Requisition.*",          "允许"],
              ["read",  "Candidate.contact_info",     "脱敏"],
              ["write", "Job_Requisition.status",     "允许"],
              ["write", "Candidate.*",                "禁止"],
              ["write", "Salary.*",                   "禁止"],
            ].map((r, i) => (
              <div key={i} className="row" style={{ justifyContent: "space-between" }}>
                <span><span className="mono" style={{ fontSize: 10.5, padding: "1px 5px", border: "1px solid var(--c-line)", borderRadius: 3, marginRight: 6 }}>{r[0]}</span>{r[1]}</span>
                <span className={"badge " + (r[2] === "允许" ? "ok" : r[2] === "脱敏" ? "warn" : "err")}>{r[2]}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div style={{ marginTop: 14, padding: 14, border: "1px solid var(--c-line)", borderRadius: 8, background: "var(--c-surface)" }}>
        <div style={{ fontSize: 12.5, fontWeight: 600, marginBottom: 8 }}>合规与审计</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, fontSize: 11.5 }}>
          <div><div className="hint">数据出境</div><div>否 · 全部境内</div></div>
          <div><div className="hint">DPA 签署</div><div>2025-09-12</div></div>
          <div><div className="hint">最近审计</div><div>2025-12-08 · 通过</div></div>
          <div><div className="hint">PII 字段</div><div>3 · 全部脱敏存储</div></div>
        </div>
      </div>
    </div>
  );
}

function DSWebhooks({ s }) {
  return (
    <div>
      <div style={{ padding: 12, border: "1px solid var(--c-line)", borderRadius: 8, background: "var(--c-surface)", marginBottom: 12 }}>
        <div style={{ fontSize: 12.5, fontWeight: 600, marginBottom: 6 }}>入站 Webhook</div>
        <div className="mono" style={{ padding: 8, borderRadius: 6, background: "var(--c-panel)", border: "1px solid var(--c-line)", fontSize: 11.5 }}>
          POST https://api.agentic-op.cn/v1/ingest/{s.id}
        </div>
        <div style={{ display: "flex", gap: 18, marginTop: 8, fontSize: 11.5, color: "var(--c-ink-2)" }}>
          <span>签名 <span className="mono">HMAC-SHA256</span></span>
          <span>密钥版本 <span className="mono">v3</span></span>
          <span>重试 <span className="mono">指数退避 · 5 次</span></span>
        </div>
      </div>
      <div className="hint" style={{ marginBottom: 6 }}>最近 webhook 投递</div>
      <table className="tbl">
        <thead><tr><th>时间</th><th>事件</th><th>HTTP</th><th>耗时</th><th>重试</th><th>结果</th></tr></thead>
        <tbody>
          {[
            ["12:04:51", "REQUIREMENT_SYNCED", 200, "84ms",  "0", "ok"],
            ["12:04:32", "REQUIREMENT_SYNCED", 200, "92ms",  "0", "ok"],
            ["12:03:18", "JOB_REQ_UPDATED",    200, "112ms", "0", "ok"],
            ["12:01:04", "REQUIREMENT_SYNCED", 502, "—",     "1→ok", "ok"],
            ["11:58:21", "REQUIREMENT_SYNCED", 422, "—",     "5", "err"],
          ].map((r, i) => (
            <tr key={i}>
              <td className="mono">{r[0]}</td>
              <td className="mono">{r[1]}</td>
              <td className="mono" style={{ color: r[2] === 200 ? "var(--c-ok)" : "var(--c-err)" }}>{r[2]}</td>
              <td className="mono">{r[3]}</td>
              <td className="mono">{r[4]}</td>
              <td>{r[5] === "ok" ? <span className="badge ok"><span className="bdot" />ok</span> : <span className="badge err"><span className="bdot" />失败</span>}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DSHistory({ s }) {
  const log = [
    { t: "今日 11:32", who: "周航", text: "调整字段映射：seniority_level → 加入 enum P9" },
    { t: "今日 09:14", who: "system", text: "凭证健康检查通过" },
    { t: "昨日 18:42", who: "刘星", text: "切换到 webhook + 兜底轮询模式 (was webhook only)" },
    { t: "11-28",      who: "李韵", text: "续签合同至 2026-08" },
    { t: "11-21",      who: "陈璐", text: "新增字段映射：headcount" },
    { t: "11-12",      who: "system", text: "首次连接成功，初始化 schema" },
  ];
  return (
    <div style={{ position: "relative", paddingLeft: 22 }}>
      <div style={{ position: "absolute", left: 9, top: 4, bottom: 4, width: 1, background: "var(--c-line)" }} />
      {log.map((e, i) => (
        <div key={i} style={{ position: "relative", marginBottom: 14 }}>
          <div style={{ position: "absolute", left: -22, top: 2, width: 14, height: 14, borderRadius: "50%", border: "1.5px solid var(--c-accent)", background: "var(--c-bg)" }} />
          <div className="mono" style={{ fontSize: 11, color: "var(--c-accent)", fontWeight: 600 }}>{e.t} · {e.who}</div>
          <div style={{ fontSize: 12.5, color: "var(--c-ink-1)", marginTop: 2 }}>{e.text}</div>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
function DSRightRail() {
  return (
    <div style={{ borderLeft: "1px solid var(--c-line)", background: "var(--c-bg)", display: "flex", flexDirection: "column", minHeight: 0 }}>
      <div style={{ padding: "12px 14px", borderBottom: "1px solid var(--c-line)", background: "var(--c-surface)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 13, fontWeight: 600 }}>同步活动</span>
          <span className="badge info pulse"><span className="bdot" />live</span>
        </div>
        <div className="hint" style={{ marginTop: 2 }}>所有连接器最近 5 分钟事件流</div>
      </div>
      <div style={{ flex: 1, overflow: "auto", padding: "8px 12px", minHeight: 0 }}>
        {[
          { t: "12s",  src: "BOSS",     ev: "CV_RECEIVED", ok: true,  detail: "candidate_id=cand_8e21" },
          { t: "18s",  src: "ByteDance",ev: "REQUIREMENT_SYNCED", ok: true, detail: "req_8412" },
          { t: "32s",  src: "Liepin",   ev: "CV_RECEIVED", ok: true,  detail: "candidate_id=cand_8e1f" },
          { t: "44s",  src: "百度",      ev: "WEBHOOK_FAIL", ok: false, detail: "TLS handshake" },
          { t: "1m",   src: "OpenAI",   ev: "INFERENCE_OK", ok: true,  detail: "JD-gen · 720ms" },
          { t: "1m",   src: "美团",      ev: "REQUIREMENT_SYNCED", ok: true,  detail: "req_8409 · 612ms ⚠" },
          { t: "1m",   src: "飞书",      ev: "NOTIFY_DELIVERED", ok: true, detail: "@周航" },
          { t: "2m",   src: "BGE-M3",   ev: "INFERENCE_OK", ok: true,  detail: "embed · 22 docs" },
          { t: "2m",   src: "Kafka",    ev: "STREAM_LAG",  ok: false, detail: "lag=412 in 24s" },
          { t: "3m",   src: "Boss",     ev: "CV_RECEIVED", ok: true,  detail: "candidate_id=cand_8e1c" },
          { t: "3m",   src: "Claude",   ev: "INFERENCE_OK", ok: true,  detail: "extract · 1.2k tok" },
          { t: "4m",   src: "Liepin",   ev: "CHANNEL_PUSH_OK", ok: true, detail: "JD posted · job_2842" },
        ].map((e, i) => (
          <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "6px 4px", borderBottom: "1px dashed var(--c-line)" }}>
            <span className="mono" style={{ width: 28, fontSize: 10.5, color: "var(--c-ink-3)" }}>{e.t}</span>
            <span style={{ width: 6, height: 6, borderRadius: "50%", marginTop: 6, background: e.ok ? "var(--c-ok)" : "var(--c-err)" }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 11.5 }}>
                <span style={{ fontWeight: 600 }}>{e.src}</span>
                <span className="mono" style={{ color: "var(--c-ink-3)", marginLeft: 6 }}>{e.ev}</span>
              </div>
              <div className="mono" style={{ fontSize: 10.5, color: "var(--c-ink-3)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.detail}</div>
            </div>
          </div>
        ))}
      </div>
      <div style={{ padding: "10px 14px", borderTop: "1px solid var(--c-line)", background: "var(--c-surface)" }}>
        <div style={{ fontSize: 12.5, fontWeight: 600, marginBottom: 6 }}>Webhook 健康</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {[
            ["ByteDance", 99.8],
            ["BOSS",      99.4],
            ["Liepin",    98.7],
            ["美团",       96.2],
            ["百度",       0],
            ["飞书",       100],
          ].map(([n, v], i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11 }}>
              <span style={{ width: 64, color: "var(--c-ink-2)" }}>{n}</span>
              <div style={{ flex: 1, height: 6, borderRadius: 3, background: "var(--c-panel)", overflow: "hidden" }}>
                <div style={{ width: v + "%", height: "100%", background: v >= 99 ? "var(--c-ok)" : v >= 95 ? "oklch(0.62 0.14 75)" : "var(--c-err)" }} />
              </div>
              <span className="mono" style={{ width: 42, textAlign: "right", color: "var(--c-ink-3)" }}>{v}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

window.DataSourcesPageArtboard = DataSourcesPageArtboard;
