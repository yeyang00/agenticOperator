/* global React */
// ===== i18n dictionary — Simplified Chinese default, English available =====
const I18N = {
  zh: {
    // brand
    brand: "Agentic Operator",
    tagline: "智能体操作中枢",
    // nav groups
    nav_overview: "总览",
    nav_fleet: "智能体舰队",
    nav_workflows: "工作流",
    nav_runs: "运行记录",
    nav_triggers: "触发器",
    nav_alerts: "告警",
    nav_audit: "审计日志",
    nav_compliance: "合规报告",
    nav_permissions: "权限",
    nav_integrations: "数据源",
    nav_settings: "设置",
    nav_group_operate: "运营",
    nav_group_build: "构建",
    nav_group_govern: "治理",
    // top bar
    search_placeholder: "搜索智能体、工作流、运行…",
    deploy_agent: "部署智能体",
    new_workflow: "新建工作流",
    // statuses
    s_running: "运行中",
    s_idle: "空闲",
    s_paused: "已暂停",
    s_failed: "失败",
    s_review: "待人工审核",
    s_degraded: "降级",
    s_healthy: "正常",
    // fleet
    fleet_title: "智能体舰队",
    fleet_sub: "部署、监控和治理招聘自动化智能体",
    m_active_agents: "活跃智能体",
    m_runs_24h: "24 小时运行数",
    m_success_rate: "成功率",
    m_hitl_queue: "待审核任务",
    m_cost_today: "今日消耗",
    m_anomalies: "异常",
    col_agent: "智能体",
    col_role: "职能",
    col_status: "状态",
    col_owner: "负责人",
    col_p50: "P50 耗时",
    col_runs: "今日运行",
    col_success: "成功率",
    col_cost: "成本",
    col_last_run: "最近运行",
    col_version: "版本",
    // workflow
    wf_title: "招聘自动化 · 高级工程师",
    wf_sub: "触发条件 · 执行顺序 · 异常处理 均可视化编排，无需编码",
    wf_trigger: "触发器",
    wf_step: "步骤",
    wf_branch: "分支",
    wf_guard: "护栏",
    wf_hitl: "人工介入",
    wf_done: "完成",
    wf_inspector: "步骤详情",
    wf_when: "触发时机",
    wf_input: "输入",
    wf_output: "输出",
    wf_on_error: "异常策略",
    wf_tools: "可用工具",
    wf_permissions: "权限范围",
    wf_retry: "重试 3 次 · 指数退避",
    wf_escalate: "升级至人工",
    wf_sla: "SLA",
    wf_policies: "策略",
    // live ops
    live_title: "实时运行",
    live_sub: "追踪每一个智能体的决策与资源消耗",
    live_trace: "调用轨迹",
    live_tokens: "Token",
    live_latency: "延迟",
    live_decisions: "决策",
    live_tools: "工具调用",
    live_timeline: "时间线",
    live_anomaly: "异常检测",
    live_ack: "确认",
    live_investigate: "排查",
    live_suppress: "暂时静默",
    // misc
    view_all: "查看全部",
    filter: "筛选",
    export: "导出",
    last_7d: "近 7 天",
    last_24h: "近 24 小时",
    realtime: "实时",
    search: "搜索",
    cancel: "取消",
    save: "保存",
    per_run: "/ 次",
    tokens_short: "tok",
    // roles
    role_sourcer: "简历搜寻",
    role_screener: "初筛",
    role_interviewer: "面试官",
    role_scorer: "评分",
    role_coordinator: "协调",
    role_offer: "Offer 发放",
    role_bg: "背景调查",
    role_outreach: "候选人触达",
    role_reporter: "数据报告",
    // commands
    cmd_jump: "跳转",
    cmd_actions: "操作",
    cmd_run_now: "立即运行",
    cmd_pause: "暂停",
    cmd_deploy: "部署新智能体",
    cmd_rollback: "回滚到上一版本",
    cmd_open_runs: "打开运行记录",
    cmd_open_audit: "查看审计日志",
    cmd_placeholder: "输入命令或搜索…",
    cmd_nav: "跳转",
    cmd_agents: "智能体",
    cmd_workflows: "工作流",
    // alerts
    al_title: "异常与告警",
    al_sev_high: "高",
    al_sev_med: "中",
    al_sev_low: "低",
    // deploy wizard
    dw_title: "部署新智能体",
    dw_step_template: "选择模板",
    dw_step_config: "配置",
    dw_step_perm: "权限",
    dw_step_review: "审核",
    // direction labels
    dirA: "方向 A · 舰队指挥",
    dirB: "方向 B · 工作流画布",
    dirC: "方向 C · 实时运行剧场",
    // misc values
    dept_recruit: "招聘运营",
    dept_tech: "技术招聘",
    dept_biz: "业务招聘",
    everyone: "全员",
    // 补充
    unit_ms: "毫秒",
    unit_per_h: "/小时",
    concurrency: "并发",
    rate_limit: "限速",
    pipeline: "流水线",
    candidates: "候选人",
    interviews: "面试",
    offers: "Offer",
    scheduled: "已安排",
    sourced: "已搜寻",
    screened: "已初筛",
    // ===== ontology (HR外包招聘) =====
    obj_client: "客户单位",
    obj_req_spec: "外包招聘需求",
    obj_req: "招聘岗位",
    obj_posting: "岗位发布",
    obj_candidate: "候选人",
    obj_resume: "简历",
    obj_application: "投递申请",
    obj_interview: "面试记录",
    obj_eval: "评估报告",
    obj_package: "推荐材料",
    obj_offer: "录用通知书",
    obj_channel: "招聘渠道",
    obj_blacklist: "黑名单",
    // actors
    actor_client: "客户 Hiring Manager",
    actor_hsm: "HSM · 交付负责人",
    actor_recruiter: "招聘专员",
    actor_interviewer: "内部面试官",
    actor_compliance: "合规",
    actor_agent: "AI Agent",
    // AI agents (real capabilities)
    agent_req_sync: "需求同步",
    agent_req_analyzer: "需求分析",
    agent_jd_gen: "JD 生成",
    agent_publisher: "多渠道发布",
    agent_collector: "简历采集",
    agent_parser: "简历解析",
    agent_matcher: "人岗匹配",
    agent_interviewer: "AI 面试官",
    agent_evaluator: "综合评估",
    agent_packager: "推荐包生成",
    agent_submitter: "客户门户提交",
    agent_bg: "背景调查",
    agent_dupe: "查重/黑名单",
    // events (lifecycle)
    evt_req_synced: "REQUIREMENT_SYNCED · 需求已同步",
    evt_analysis_done: "ANALYSIS_COMPLETED · 分析完成",
    evt_clarify_ready: "CLARIFICATION_READY · 澄清闭环",
    evt_clarify_incomplete: "CLARIFICATION_INCOMPLETE · 需澄清",
    evt_jd_gen: "JD_GENERATED · JD 生成",
    evt_jd_approved: "JD_APPROVED · JD 已审",
    evt_channel_pub: "CHANNEL_PUBLISHED · 渠道上线",
    evt_channel_fail: "CHANNEL_PUBLISHED_FAILED · 发布失败",
    evt_resume_dl: "RESUME_DOWNLOADED · 简历下载",
    evt_resume_processed: "RESUME_PROCESSED · 简历入库",
    evt_resume_error: "RESUME_PARSE_ERROR · 解析异常",
    evt_resume_locked: "RESUME_LOCKED_CONFLICT · 归属冲突",
    evt_match_pass: "MATCH_PASSED_NEED_INTERVIEW · 通过初筛",
    evt_match_pass_nointerview: "MATCH_PASSED_NO_INTERVIEW · 直接推荐",
    evt_match_fail: "MATCH_FAILED · 不匹配",
    evt_interview_invite: "INTERVIEW_INVITATION_SENT · 面试邀约",
    evt_interview_done: "AI_INTERVIEW_COMPLETED · 面试完成",
    evt_eval_pass: "EVALUATION_PASSED · 评估通过",
    evt_eval_fail: "EVALUATION_FAILED · 评估未通过",
    evt_pkg_gen: "PACKAGE_GENERATED · 材料已生成",
    evt_pkg_missing: "PACKAGE_MISSING_INFO · 材料不全",
    evt_pkg_approved: "PACKAGE_APPROVED · 已批准推荐",
    evt_submitted: "APPLICATION_SUBMITTED · 已提交客户",
    evt_submit_fail: "SUBMISSION_FAILED · 提交失败",
    // pipeline stage labels
    stage_req: "需求",
    stage_jd: "JD",
    stage_sourcing: "获客",
    stage_parse: "解析",
    stage_match: "匹配",
    stage_ai_itv: "AI 面",
    stage_eval: "评估",
    stage_pkg: "推荐包",
    stage_review: "人工审",
    stage_submit: "推客户",
    stage_client_itv: "客户面",
    stage_offer: "Offer",
    // Event Manager (Direction D)
    dirD: "方向 D · 事件中枢",
    em_title: "事件中枢 · Event Manager",
    em_sub: "事件总线 · 订阅编排 · 运行追踪 · 由 Inngest 驱动",
    em_registry: "事件注册表",
    em_stream: "实时事件流",
    em_functions: "函数运行",
    em_tab_overview: "概览",
    em_tab_schema: "Payload",
    em_tab_subs: "订阅者",
    em_tab_runs: "运行历史",
    em_tab_history: "事件历史",
    em_tab_logs: "日志",
    em_publishers: "发布方",
    em_subscribers: "订阅方",
    em_mutations: "状态变更",
    em_persistence: "持久化",
    em_retention: "保留期",
    em_delivery: "投递",
    em_backlog: "积压",
    em_dlq: "死信",
    em_replay: "重放",
    em_pause: "暂停",
    em_resume: "恢复订阅",
    em_metadata: "元数据",
    em_source_action: "来源 Action",
    em_target_obj: "目标对象",
    em_triggered_by: "触发来源",
    em_triggers_workflow: "触发的工作流",
    em_versions: "版本",
    // event stage groups
    eg_requirement: "需求 · Requirement",
    eg_jd: "JD · 发布",
    eg_resume: "简历 · 处理",
    eg_match: "匹配 · Matching",
    eg_interview: "面试 · Interview",
    eg_eval: "评估 · Evaluation",
    eg_package: "推荐包 · Package",
    eg_submit: "提交 · Submission",
    eg_system: "系统 · System",
  },
  en: {
    brand: "Agentic Operator",
    tagline: "OS for AI agents",
    nav_overview: "Overview",
    nav_fleet: "Agent Fleet",
    nav_workflows: "Workflows",
    nav_runs: "Runs",
    nav_triggers: "Triggers",
    nav_alerts: "Alerts",
    nav_audit: "Audit Log",
    nav_compliance: "Compliance",
    nav_permissions: "Permissions",
    nav_integrations: "Integrations",
    nav_settings: "Settings",
    nav_group_operate: "Operate",
    nav_group_build: "Build",
    nav_group_govern: "Govern",
    search_placeholder: "Search agents, workflows, runs…",
    deploy_agent: "Deploy agent",
    new_workflow: "New workflow",
    s_running: "Running",
    s_idle: "Idle",
    s_paused: "Paused",
    s_failed: "Failed",
    s_review: "Needs review",
    s_degraded: "Degraded",
    s_healthy: "Healthy",
    fleet_title: "Agent Fleet",
    fleet_sub: "Deploy, monitor and govern recruitment automation agents",
    m_active_agents: "Active agents",
    m_runs_24h: "Runs · 24h",
    m_success_rate: "Success rate",
    m_hitl_queue: "Human review queue",
    m_cost_today: "Spend today",
    m_anomalies: "Anomalies",
    col_agent: "Agent",
    col_role: "Role",
    col_status: "Status",
    col_owner: "Owner",
    col_p50: "P50 latency",
    col_runs: "Runs today",
    col_success: "Success",
    col_cost: "Cost",
    col_last_run: "Last run",
    col_version: "Version",
    wf_title: "Recruitment · Senior Engineer pipeline",
    wf_sub: "Compose triggers, sequence and fallbacks visually — no code",
    wf_trigger: "Trigger",
    wf_step: "Step",
    wf_branch: "Branch",
    wf_guard: "Guardrail",
    wf_hitl: "Human in the loop",
    wf_done: "Done",
    wf_inspector: "Step inspector",
    wf_when: "When",
    wf_input: "Input",
    wf_output: "Output",
    wf_on_error: "On error",
    wf_tools: "Tools",
    wf_permissions: "Permissions",
    wf_retry: "Retry 3x · exponential backoff",
    wf_escalate: "Escalate to human",
    wf_sla: "SLA",
    wf_policies: "Policies",
    live_title: "Live Operations",
    live_sub: "Trace every agent decision and resource consumption",
    live_trace: "Trace",
    live_tokens: "Tokens",
    live_latency: "Latency",
    live_decisions: "Decisions",
    live_tools: "Tool calls",
    live_timeline: "Timeline",
    live_anomaly: "Anomaly",
    live_ack: "Acknowledge",
    live_investigate: "Investigate",
    live_suppress: "Suppress",
    view_all: "View all",
    filter: "Filter",
    export: "Export",
    last_7d: "Last 7d",
    last_24h: "Last 24h",
    realtime: "Live",
    search: "Search",
    cancel: "Cancel",
    save: "Save",
    per_run: "/ run",
    tokens_short: "tok",
    role_sourcer: "Sourcer",
    role_screener: "Screener",
    role_interviewer: "Interviewer",
    role_scorer: "Scorer",
    role_coordinator: "Coordinator",
    role_offer: "Offer",
    role_bg: "Background check",
    role_outreach: "Outreach",
    role_reporter: "Reporter",
    cmd_jump: "Jump to",
    cmd_actions: "Actions",
    cmd_run_now: "Run now",
    cmd_pause: "Pause",
    cmd_deploy: "Deploy new agent",
    cmd_rollback: "Rollback to previous",
    cmd_open_runs: "Open runs",
    cmd_open_audit: "Open audit log",
    cmd_placeholder: "Type a command or search…",
    cmd_nav: "Navigate",
    cmd_agents: "Agents",
    cmd_workflows: "Workflows",
    al_title: "Alerts & anomalies",
    al_sev_high: "High",
    al_sev_med: "Med",
    al_sev_low: "Low",
    dw_title: "Deploy new agent",
    dw_step_template: "Template",
    dw_step_config: "Configure",
    dw_step_perm: "Permissions",
    dw_step_review: "Review",
    dirA: "Direction A · Fleet Command",
    dirB: "Direction B · Workflow Canvas",
    dirC: "Direction C · Live Run Theatre",
    dept_recruit: "Recruiting Ops",
    dept_tech: "Tech Recruiting",
    dept_biz: "Biz Recruiting",
    everyone: "Everyone",
    unit_ms: "ms",
    unit_per_h: "/h",
    concurrency: "Concurrency",
    rate_limit: "Rate limit",
    pipeline: "Pipeline",
    candidates: "Candidates",
    interviews: "Interviews",
    offers: "Offers",
    scheduled: "Scheduled",
    sourced: "Sourced",
    screened: "Screened",
    obj_client: "Client",
    obj_req_spec: "Requisition Spec",
    obj_req: "Job Requisition",
    obj_posting: "Job Posting",
    obj_candidate: "Candidate",
    obj_resume: "Resume",
    obj_application: "Application",
    obj_interview: "Interview",
    obj_eval: "Evaluation",
    obj_package: "Rec. Package",
    obj_offer: "Offer",
    obj_channel: "Channel",
    obj_blacklist: "Blacklist",
    actor_client: "Client HM",
    actor_hsm: "HSM · Delivery Lead",
    actor_recruiter: "Recruiter",
    actor_interviewer: "Internal Interviewer",
    actor_compliance: "Compliance",
    actor_agent: "AI Agent",
    agent_req_sync: "Requirement Sync",
    agent_req_analyzer: "Requirement Analyzer",
    agent_jd_gen: "JD Generator",
    agent_publisher: "Multi-channel Publisher",
    agent_collector: "Resume Collector",
    agent_parser: "Resume Parser",
    agent_matcher: "Candidate-Job Matcher",
    agent_interviewer: "AI Interviewer",
    agent_evaluator: "Evaluator",
    agent_packager: "Package Builder",
    agent_submitter: "Portal Submitter",
    agent_bg: "BG Check",
    agent_dupe: "Dupe / Blacklist Check",
    evt_req_synced: "REQUIREMENT_SYNCED",
    evt_analysis_done: "ANALYSIS_COMPLETED",
    evt_clarify_ready: "CLARIFICATION_READY",
    evt_clarify_incomplete: "CLARIFICATION_INCOMPLETE",
    evt_jd_gen: "JD_GENERATED",
    evt_jd_approved: "JD_APPROVED",
    evt_channel_pub: "CHANNEL_PUBLISHED",
    evt_channel_fail: "CHANNEL_PUBLISHED_FAILED",
    evt_resume_dl: "RESUME_DOWNLOADED",
    evt_resume_processed: "RESUME_PROCESSED",
    evt_resume_error: "RESUME_PARSE_ERROR",
    evt_resume_locked: "RESUME_LOCKED_CONFLICT",
    evt_match_pass: "MATCH_PASSED_NEED_INTERVIEW",
    evt_match_pass_nointerview: "MATCH_PASSED_NO_INTERVIEW",
    evt_match_fail: "MATCH_FAILED",
    evt_interview_invite: "INTERVIEW_INVITATION_SENT",
    evt_interview_done: "AI_INTERVIEW_COMPLETED",
    evt_eval_pass: "EVALUATION_PASSED",
    evt_eval_fail: "EVALUATION_FAILED",
    evt_pkg_gen: "PACKAGE_GENERATED",
    evt_pkg_missing: "PACKAGE_MISSING_INFO",
    evt_pkg_approved: "PACKAGE_APPROVED",
    evt_submitted: "APPLICATION_SUBMITTED",
    evt_submit_fail: "SUBMISSION_FAILED",
    stage_req: "Req",
    stage_jd: "JD",
    stage_sourcing: "Source",
    stage_parse: "Parse",
    stage_match: "Match",
    stage_ai_itv: "AI Itv",
    stage_eval: "Eval",
    stage_pkg: "Package",
    stage_review: "Review",
    stage_submit: "Submit",
    stage_client_itv: "Client Itv",
    stage_offer: "Offer",
    dirD: "Direction D · Event Hub",
    em_title: "Event Manager",
    em_sub: "Event bus · subscriptions · run tracing — powered by Inngest",
    em_registry: "Event registry",
    em_stream: "Live event stream",
    em_functions: "Function runs",
    em_tab_overview: "Overview",
    em_tab_schema: "Payload",
    em_tab_subs: "Subscribers",
    em_tab_runs: "Runs",
    em_tab_history: "History",
    em_tab_logs: "Logs",
    em_publishers: "Publishers",
    em_subscribers: "Subscribers",
    em_mutations: "State mutations",
    em_persistence: "Persistence",
    em_retention: "Retention",
    em_delivery: "Delivery",
    em_backlog: "Backlog",
    em_dlq: "Dead letter",
    em_replay: "Replay",
    em_pause: "Pause",
    em_resume: "Resume",
    em_metadata: "Metadata",
    em_source_action: "Source action",
    em_target_obj: "Target object",
    em_triggered_by: "Emitted by",
    em_triggers_workflow: "Triggers",
    em_versions: "Versions",
    eg_requirement: "Requirement",
    eg_jd: "JD · Publishing",
    eg_resume: "Resume · Processing",
    eg_match: "Matching",
    eg_interview: "Interview",
    eg_eval: "Evaluation",
    eg_package: "Package",
    eg_submit: "Submission",
    eg_system: "System",
  },
};

// ===== language context =====
const LangContext = React.createContext({
  lang: "zh",
  t: (k) => k,
  setLang: () => {},
});

function LangProvider({ children, forcedLang }) {
  // auto-detect: browser language first, else zh
  const initial = (() => {
    const n = (navigator.language || "zh").toLowerCase();
    return n.startsWith("zh") ? "zh" : "en";
  })();
  const [lang, setLang] = React.useState(initial);
  // If a parent force-sets the language (via Tweaks), honor it.
  React.useEffect(() => {
    if (forcedLang && forcedLang !== lang) setLang(forcedLang);
  }, [forcedLang]);
  const t = React.useCallback((k) => (I18N[lang] && I18N[lang][k]) || I18N.zh[k] || k, [lang]);
  return (
    <LangContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LangContext.Provider>
  );
}

function useT() {
  return React.useContext(LangContext);
}

function LangSwitch() {
  const { lang, setLang } = useT();
  return (
    <div className="ao-lang" role="tablist" aria-label="language">
      <button className={lang === "zh" ? "active" : ""} onClick={() => setLang("zh")}>中文</button>
      <button className={lang === "en" ? "active" : ""} onClick={() => setLang("en")}>EN</button>
    </div>
  );
}

// ===== tiny inline icons (stroke 1.5) =====
const Ic = {
  search: (p) => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" {...p}><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>),
  plus: (p) => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" {...p}><path d="M12 5v14M5 12h14"/></svg>),
  bell: (p) => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" {...p}><path d="M6 8a6 6 0 0 1 12 0c0 7 3 7 3 9H3c0-2 3-2 3-9Z"/><path d="M10 21a2 2 0 0 0 4 0"/></svg>),
  grid: (p) => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" {...p}><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>),
  workflow: (p) => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" {...p}><rect x="2" y="9" width="6" height="6" rx="1"/><rect x="16" y="3" width="6" height="6" rx="1"/><rect x="16" y="15" width="6" height="6" rx="1"/><path d="M8 12h4m0 0v-6h4M12 12v6h4"/></svg>),
  play: (p) => (<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" {...p}><path d="M7 5v14l11-7z"/></svg>),
  pause: (p) => (<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" {...p}><rect x="6" y="5" width="4" height="14"/><rect x="14" y="5" width="4" height="14"/></svg>),
  clock: (p) => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" {...p}><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>),
  shield: (p) => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" {...p}><path d="M12 3 4 6v6c0 5 3.5 8.5 8 9 4.5-.5 8-4 8-9V6l-8-3Z"/></svg>),
  alert: (p) => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" {...p}><path d="M12 3 2 20h20L12 3Z"/><path d="M12 10v5M12 18h.01"/></svg>),
  book: (p) => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" {...p}><path d="M4 4h12a4 4 0 0 1 4 4v12H8a4 4 0 0 1-4-4V4Z"/><path d="M4 16a4 4 0 0 1 4-4h12"/></svg>),
  key: (p) => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" {...p}><circle cx="8" cy="14" r="4"/><path d="m11 11 9-9m-3 3 2 2m-4 0 2 2"/></svg>),
  plug: (p) => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" {...p}><path d="M9 2v6M15 2v6M6 8h12v4a6 6 0 0 1-12 0V8ZM12 18v4"/></svg>),
  gear: (p) => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" {...p}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.6-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H9a1.7 1.7 0 0 0 1-1.6V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V9a1.7 1.7 0 0 0 1.6 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.6 1Z"/></svg>),
  chev: (p) => (<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" {...p}><path d="m9 6 6 6-6 6"/></svg>),
  chevD: (p) => (<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" {...p}><path d="m6 9 6 6 6-6"/></svg>),
  bolt: (p) => (<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" {...p}><path d="M13 2 3 14h7l-1 8 11-14h-7l0-6z"/></svg>),
  check: (p) => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="m5 12 5 5 9-11"/></svg>),
  cross: (p) => (<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" {...p}><path d="M6 6l12 12M18 6 6 18"/></svg>),
  dots: (p) => (<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" {...p}><circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/></svg>),
  user: (p) => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" {...p}><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>),
  sparkle: (p) => (<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" {...p}><path d="M12 2 13.8 8.2 20 10l-6.2 1.8L12 18l-1.8-6.2L4 10l6.2-1.8L12 2Z"/></svg>),
  branch: (p) => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" {...p}><circle cx="6" cy="4" r="2"/><circle cx="6" cy="20" r="2"/><circle cx="18" cy="12" r="2"/><path d="M6 6v12M6 12a6 6 0 0 0 10 0"/></svg>),
  db: (p) => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" {...p}><ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v6c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 11v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6"/></svg>),
  mail: (p) => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" {...p}><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>),
  calendar: (p) => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" {...p}><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 9h18M8 3v4M16 3v4"/></svg>),
  cpu: (p) => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" {...p}><rect x="6" y="6" width="12" height="12" rx="1"/><path d="M9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4"/></svg>),
  arrowR: (p) => (<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" {...p}><path d="M5 12h14M13 6l6 6-6 6"/></svg>),
  bookmark: (p) => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" {...p}><path d="M6 4h12v17l-6-4-6 4z"/></svg>),
  edit: (p) => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M4 20h4l11-11-4-4L4 16z"/></svg>),
  spark: (p) => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M3 17l5-7 4 4 5-9 4 6"/></svg>),
  map: (p) => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2z"/><path d="M9 4v14M15 6v14"/></svg>),
};

// ===== compact spark bars =====
function Spark({ data, values, accent, stroke, height, h }) {
  const arr = Array.isArray(data) ? data : (Array.isArray(values) ? values : [0]);
  const color = accent || stroke || "var(--c-accent)";
  const ht = height ?? h ?? 28;
  const max = Math.max(...arr, 1);
  return (
    <div className="sparkrow" style={{ height: ht }}>
      {arr.map((v, i) => (
        <div
          key={i}
          className={"bar " + (v / max > 0.7 ? "hot" : "")}
          style={{ height: `${(v / max) * 100}%`, background: color }}
        />
      ))}
    </div>
  );
}

// ===== metric tile =====
function Metric({ label, value, delta, deltaKind = "up", sub }) {
  return (
    <div className="metric">
      <div className="label">{label}</div>
      <div className="value">{value}</div>
      {delta && <div className={"delta " + (deltaKind === "down" ? "down" : deltaKind === "flat" ? "flat" : "")}>{delta}</div>}
      {sub && <div className="hint">{sub}</div>}
    </div>
  );
}

// ===== status dot =====
function StatusDot({ kind = "ok" }) {
  const color =
    kind === "ok" ? "var(--c-ok)" :
    kind === "warn" ? "var(--c-warn)" :
    kind === "err" ? "var(--c-err)" :
    kind === "info" ? "var(--c-info)" : "var(--c-ink-4)";
  return (
    <span style={{
      display: "inline-block", width: 8, height: 8, borderRadius: "50%",
      background: color, boxShadow: `0 0 0 3px color-mix(in oklab, ${color} 18%, transparent)`,
      animation: kind === "ok" || kind === "err" ? "pulse 2s ease-in-out infinite" : "none",
    }} />
  );
}

// ===== top app bar =====
function AppBar({ crumbs = [], onOpenCmdK, showLang = true }) {
  const { t } = useT();
  const tw = (window.useTweakContext ? window.useTweakContext().tw : null);
  const showHint = !tw || tw.showCommandHint !== false;
  return (
    <div className="ao-appbar">
      <div className="ao-logo">
        <div className="ao-logo-mark" />
        <span>{t("brand")}</span>
      </div>
      <div className="ao-breadcrumbs">
        {crumbs.map((c, i) => (
          <React.Fragment key={i}>
            {i > 0 && <span className="sep"><Ic.chev /></span>}
            <span className={i === crumbs.length - 1 ? "current" : ""}>{c}</span>
          </React.Fragment>
        ))}
      </div>
      <div className="ao-appbar-spacer" />
      <div className="ao-searchpill" onClick={onOpenCmdK}>
        <Ic.search />
        <span>{t("search_placeholder")}</span>
        {showHint && <kbd>⌘K</kbd>}
      </div>
      <div className="ao-pill"><span className="dot" />{t("realtime")}</div>
      {showLang && <LangSwitch />}
      <button className="ao-iconbtn" title="alerts"><Ic.bell /></button>
      <div className="ao-avatar">Z</div>
    </div>
  );
}

// ===== left nav =====
function LeftNav({ active = "fleet" }) {
  const { t } = useT();
  const items = [
    { group: "operate", title: t("nav_group_operate") },
    { id: "overview",   icon: <Ic.grid />,     label: t("nav_overview") },
    { id: "fleet",      icon: <Ic.cpu />,      label: t("nav_fleet"), count: "14" },
    { id: "runs",       icon: <Ic.play />,     label: t("nav_runs"),  count: "312" },
    { id: "alerts",     icon: <Ic.alert />,    label: t("nav_alerts"),count: "3" },
    { group: "build",   title: t("nav_group_build") },
    { id: "workflows",  icon: <Ic.workflow />, label: t("nav_workflows"), count: "9" },
    { id: "triggers",   icon: <Ic.bolt />,     label: t("nav_triggers") },
    { id: "integrations", icon: <Ic.plug />,   label: t("nav_integrations") },
    { group: "govern",  title: t("nav_group_govern") },
    { id: "permissions",icon: <Ic.key />,      label: t("nav_permissions") },
    { id: "audit",      icon: <Ic.book />,     label: t("nav_audit") },
    { id: "compliance", icon: <Ic.shield />,   label: t("nav_compliance") },
  ];
  return (
    <nav className="ao-nav">
      {items.map((it, i) =>
        it.group ? (
          <div key={i} className="ao-nav-group">{it.title}</div>
        ) : (
          <div
            key={it.id}
            className={"ao-nav-item " + (active === it.id ? "active" : "")}
          >
            <span style={{ width: 14, display: "inline-flex" }}>{it.icon}</span>
            <span>{it.label}</span>
            {it.count && <span className="count">{it.count}</span>}
          </div>
        )
      )}
      <div style={{ flex: 1 }} />
      <div className="ao-nav-item">
        <Ic.gear />
        <span>{t("nav_settings")}</span>
      </div>
    </nav>
  );
}

// ===== command palette =====
function CommandPalette({ open, onClose }) {
  const { t } = useT();
  const [q, setQ] = React.useState("");
  const inputRef = React.useRef(null);
  React.useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 10);
  }, [open]);
  React.useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose?.(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  if (!open) return null;
  const sections = [
    { title: t("cmd_actions"), items: [
      { icon: <Ic.bolt />, label: t("cmd_run_now"), meta: "Sourcer-01", shortcut: "↵" },
      { icon: <Ic.pause />, label: t("cmd_pause"),   meta: "Screener-03" },
      { icon: <Ic.plus />, label: t("cmd_deploy"),   meta: "" },
      { icon: <Ic.clock />, label: t("cmd_rollback"), meta: "v2.3.1 → v2.3.0" },
    ]},
    { title: t("cmd_nav"), items: [
      { icon: <Ic.play />, label: t("cmd_open_runs"),  meta: "G → R" },
      { icon: <Ic.book />, label: t("cmd_open_audit"), meta: "G → A" },
    ]},
    { title: t("cmd_agents"), items: [
      { icon: <Ic.cpu />, label: "Sourcer-01 · " + t("role_sourcer"),      meta: "v2.3.1" },
      { icon: <Ic.cpu />, label: "Screener-03 · " + t("role_screener"),    meta: "v1.9.4" },
      { icon: <Ic.cpu />, label: "Interviewer-AI · " + t("role_interviewer"), meta: "v0.7.2" },
    ]},
  ];
  return (
    <div className="ao-cmdk" onClick={(e) => e.target === e.currentTarget && onClose?.()}>
      <div className="ao-cmdk-box">
        <div className="ao-cmdk-input">
          <Ic.search />
          <input ref={inputRef} value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("cmd_placeholder")} />
          <kbd style={{
            fontFamily: "var(--f-mono)", fontSize: 10, background: "var(--c-panel)",
            border: "1px solid var(--c-line)", borderRadius: 3, padding: "1px 6px", color: "var(--c-ink-3)",
          }}>esc</kbd>
        </div>
        <div className="ao-cmdk-list">
          {sections.map((s, si) => (
            <div key={si}>
              <div className="ao-cmdk-section">{s.title}</div>
              {s.items.map((it, i) => (
                <div key={i} className={"ao-cmdk-row " + (si === 0 && i === 0 ? "active" : "")}>
                  <span className="icon">{it.icon}</span>
                  <span>{it.label}</span>
                  {it.meta && <span className="meta">{it.meta}</span>}
                </div>
              ))}
            </div>
          ))}
        </div>
        <div className="ao-cmdk-foot">
          <span><kbd>↑↓</kbd> {t("cmd_jump")}</span>
          <span><kbd>↵</kbd> {t("cmd_actions")}</span>
          <span style={{ marginLeft: "auto" }}>{t("brand")}</span>
        </div>
      </div>
    </div>
  );
}

// ===== direction-label chip shown at the bottom of each artboard =====
function DirectionTag({ label }) {
  const tw = (window.useTweakContext ? window.useTweakContext().tw : null);
  if (tw && tw.showDirectionTags === false) return null;
  return <div className="ao-focus-hint">{label}</div>;
}

// expose to other scripts
Object.assign(window, {
  LangProvider, LangContext, useT, LangSwitch, I18N,
  Ic, Spark, Metric, StatusDot, AppBar, LeftNav, CommandPalette, DirectionTag,
});
