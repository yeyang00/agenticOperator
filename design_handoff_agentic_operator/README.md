# Handoff: Agentic Operator (智能招聘运营平台)

> 内部代号 **Agentic Operator** — 一个面向"AI 招聘代理 + 真人 Ops"协作的运营控制台。
> 本包供开发者使用 Claude Code 在 **TypeScript + React + Tailwind** 技术栈上重建。

---

## 1. Overview

Agentic Operator 是一个用于**监控、编排、调试** AI 招聘代理（agents）的运营平台。它围绕一个事件驱动的招聘工作流（Requirement → JD → Sourcing → Screening → Outreach → Interview → Offer），提供面向 Ops 同学的多种视角：

- **A · Fleet Control** — 舰队控制台 / Mission-Control-style 全局密集仪表
- **B · Workflow Canvas** — 节点编排 / 可视化 Agent + Action 编排
- **C · Live Operations** — 实时运行 / Run timeline + decision stream + 处置详情
- **D · Event Manager** — 事件中枢 / Inngest-style 事件总线（事件注册表 + 详情）
- **运营顶层页面**：
  - **告警 Alerts** — 告警规则 + 触发列表 + 告警详情
  - **数据源 Data Sources** — 24+ 个连接器（ATS、招聘渠道、模型、消息、存储、身份）

每个 Direction 都是同一业务问题的不同 IA 取向，可以并存或择一为产品主路径。

---

## 2. About the Design Files

> **重要：** `design/` 目录里的 HTML / JSX / CSS 文件是**设计稿（design references）**，不是生产代码。它们使用浏览器内 Babel 即时转译的 React + 原生 CSS 变量，目的是**演示视觉与交互**，不要直接拷贝到 Next.js / Vite 工程里。

请把它们当作 Figma 的替身：
- 颜色、字号、间距、圆角 → 抽成 Tailwind config / CSS variable
- React 结构 → 重写为 TypeScript 组件，使用项目自身的组件库（shadcn/ui、Radix、Ant Design 之类）
- 内联 SVG / 自绘图标 → 替换为 `lucide-react` 或项目既有图标库
- 数据 → 全部是写死的 mock，按真实 API schema 重新接入

---

## 3. Fidelity

**High-fidelity (hifi)。** 颜色、间距、字号、阴影、表格密度、状态徽章、状态点、迷你 sparkline、命令面板、Tab 切换、左右栏布局都已最终敲定。开发实现时应逐像素还原。

少数动效（hover transitions、status dot pulse、scrubber motion）也在 CSS 中定义，按相同 timing 函数实现即可。

---

## 4. Tech Stack 推荐

| 层 | 选型 | 备注 |
|---|---|---|
| Framework | **Next.js 14 App Router** 或 **Vite + React Router** | 视部署形态而定 |
| Language | **TypeScript (strict)** | |
| Styling | **Tailwind CSS** | 配合下方 Design Tokens 配 `tailwind.config.ts` |
| 组件库 | **shadcn/ui** + **Radix UI** | 按钮、Tabs、Dialog、Tooltip、Popover、Command(K) 直接用 shadcn |
| 图标 | **lucide-react** | 现稿用了内联 SVG，开发时换成 lucide |
| 表格 | **TanStack Table v8** | Alerts、Events、Data Sources 列表都是 dense table |
| 图表 / Spark | **Recharts** 或 **visx**；轻量 sparkline 可用 `react-sparklines` | |
| 节点编排（Direction B） | **React Flow (Reactflow)** | Direction B 的画布即用它实现 |
| 国际化 | **next-intl** 或 **react-i18next** | 全站需 `zh-CN` / `en-US` 两套 |
| 字体 | `Inter` (UI) + `JetBrains Mono` (mono) | 现稿是 system + ui-monospace，建议升级 |
| 状态管理 | React Query (server) + Zustand (UI) | 事件流相关考虑 SSE / WebSocket |

---

## 5. Information Architecture

```
/                               (默认跳到 fleet 或 workspace 选择器)
├─ /fleet                       Direction A — Fleet Control
├─ /workflow                    Direction B — Workflow Canvas
├─ /live                        Direction C — Live Operations
├─ /events                      Direction D — Event Manager
│   └─ /events/:eventName       事件详情（state, runs, history, logs）
├─ /alerts                      Alerts 顶层
│   └─ /alerts/:alertId         告警详情（4 tabs）
├─ /datasources                 Data Sources 顶层
│   └─ /datasources/:connId     连接器详情（6 tabs）
├─ /ontology                    （可选）Schema / Ontology 浏览
└─ /settings                    （可选）权限、密钥、Webhook
```

顶部 AppBar：logo + 当前 Direction tag + breadcrumbs + 全局搜索（⌘K）+ 实时连接状态点 + 语言切换 + 用户。
左侧 LeftNav：Workspaces、Quick filters、当前 Direction 的次级导航。

---

## 6. Domain Ontology（业务对象清单）

> 所有 mock 数据都基于这套对象，开发时请把它们映射到真实 API。

### Core entities
| Entity | 中文 | 说明 |
|---|---|---|
| `Requirement` | 招聘需求 | 客户提交的 JD 雏形（公司、岗位、画像、Headcount、预算） |
| `Job` | 岗位 | 由 Requirement 经 `JD_GENERATED` 落地的正式 JD |
| `Candidate` | 候选人 | 来自 sourcing 渠道，附 `score`, `stage`, `lastTouch` |
| `Application` | 投递 | (Job × Candidate) 的连接 + 当前 stage |
| `Interview` | 面试 | 时间、面试官、反馈 |
| `Offer` | Offer | 状态：drafted / sent / accepted / declined |
| `Customer` | 客户 | 字节跳动、美团、Shein 等 |
| `Channel` | 渠道 | BOSS / Liepin / 内推 / LinkedIn |
| `Agent` | AI 代理 | JDWriter / Sourcer / Screener / Outreacher / Scheduler / MatchScorer |
| `Run` | 运行 | 一次 Agent / Workflow 的执行实例 |
| `Event` | 事件 | 系统流通的事件包（见下） |
| `Rule` | 告警规则 | 触发条件 + 渠道 + 严重程度 |
| `Alert` | 告警 | Rule 触发出的实例 |
| `Connector` / `DataSource` | 数据源 | 外部 ATS、模型、消息、存储 |

### Standard event names（命名规范：UPPER_SNAKE）
```
REQUIREMENT_SUBMITTED   JD_GENERATED          JD_REJECTED
SOURCING_STARTED        CANDIDATE_FOUND       CV_PARSE_FAILED
SCREENING_PASSED        SCREENING_FAILED      MATCH_SCORED
OUTREACH_SENT           CANDIDATE_REPLIED     INTERVIEW_SCHEDULED
INTERVIEW_COMPLETED     INTERVIEW_FEEDBACK_PENDING
OFFER_DRAFTED           OFFER_SENT            OFFER_ACCEPTED   OFFER_DECLINED
SYNC_FAILED_ALERT       ANALYSIS_BLOCKED      REQUIREMENT_SYNCED
```

事件 schema（建议）：
```ts
type DomainEvent<T = unknown> = {
  id: string;             // evt_xxxx
  name: string;           // 见上
  ts: string;             // ISO
  source: string;         // agent/system/user/connector
  actor?: string;         // 触发者
  payload: T;             // 事件主体
  correlationId?: string; // 同一 Run / Application 串起来
  causationId?: string;   // 触发自哪个事件
};
```

---

## 7. Design Tokens

### 7.1 Colors （OKLCH，已在 `design/styles.css` 完整定义）

> Tailwind 配置示例：在 `tailwind.config.ts` 的 `theme.extend.colors` 里 1:1 复刻；也可保留 oklch 字符串。

```ts
// tailwind tokens（建议）
colors: {
  bg:      'oklch(0.99 0.004 255)',
  surface: '#ffffff',
  panel:   'oklch(0.985 0.004 255)',
  raised:  'oklch(0.975 0.004 255)',
  line:        'oklch(0.92 0.006 255)',
  'line-strong': 'oklch(0.86 0.008 255)',

  ink: {
    1: 'oklch(0.22 0.015 260)',  // primary text
    2: 'oklch(0.42 0.012 260)',
    3: 'oklch(0.58 0.010 260)',
    4: 'oklch(0.72 0.008 260)',  // ghost / placeholder
  },

  accent: {
    DEFAULT: 'oklch(0.56 0.14 255)',  // 主蓝
    2:       'oklch(0.66 0.11 255)',
    bg:      'oklch(0.96 0.03 255)',
    line:    'oklch(0.88 0.06 255)',
  },

  ok:    'oklch(0.62 0.13 155)',
  'ok-bg':   'oklch(0.96 0.04 155)',
  warn:  'oklch(0.74 0.15 75)',
  'warn-bg': 'oklch(0.96 0.06 80)',
  err:   'oklch(0.58 0.19 25)',
  'err-bg':  'oklch(0.96 0.05 25)',
  info:  'oklch(0.60 0.10 230)',
  'info-bg': 'oklch(0.96 0.03 230)',
}
```

### 7.2 Typography
- **Sans / UI**：`Inter`（fallback：system-ui）
- **Mono**：`JetBrains Mono`（fallback：ui-monospace, "SF Mono"）
- 默认 body：`13px / 1.4`，主 ink-1
- Metric 数值：`28px / 600 / -0.02em`
- Section 大标题：`16-18px / 600`
- Card head：`13px / 600`
- Hint / Label：`11px / ink-3 / uppercase 时 letter-spacing 0.06em`
- Mono 数字 / id / timestamp：`10.5-11px / ink-2-3`
- Tabular nums：`font-feature-settings: "tnum","lnum"`

### 7.3 Spacing
- 4 / 6 / 8 / 10 / 12 / 14 / 16 / 20 / 24 / 32 px 节奏
- 主框 padding：左/右 14px，上/下 10-12px
- AppBar 高 48px，LeftNav 宽 184px

### 7.4 Radius
- `--r-sm: 4px` (chip / dot)
- `--r-md: 6px` (button / input)
- `--r-lg: 8px` (card)
- `--r-xl: 12px` (dialog / cmdk)

### 7.5 Shadows
- `--sh-1: 0 1px 0 rgba(0,0,0,0.02), 0 1px 2px rgba(0,0,0,0.04)`（卡片）
- `--sh-2: 0 2px 8px rgba(0,0,0,0.06)`（hover / popover）
- `--sh-3: 0 12px 32px rgba(0,0,0,0.10)`（dialog / cmdk）

---

## 8. Shared UI Components （都在 `design/shared.jsx`）

按业务最小集合需要实现的组件清单：

| 组件 | 用途 | 备注 |
|---|---|---|
| `AppBar` | 顶部条 | logo + breadcrumbs + 搜索 + 状态 + 语言 + 用户 |
| `LeftNav` | 左侧导航 | sections + items + counts |
| `DirectionTag` | A/B/C/D 角标 | 颜色随 direction 变 |
| `CommandPalette` | ⌘K 命令面板 | 跨页跳转、agent / event / job 搜索 |
| `StatusDot` | 状态点 | ok / warn / err / info / idle，可带 pulse |
| `Spark` | 迷你柱状 spark | props: `data \| values`, `accent \| stroke`, `height \| h` |
| `Metric` | 大数字指标卡 | label / value / delta / sub |
| `Badge` | 徽章 | variants: default / ok / warn / err / info |
| `Btn` | 按钮 | variants: default / primary / accent / ghost / danger; sizes: sm / md |
| `Card`, `CardHead` | 卡片容器 | |
| `Tbl` | dense 数据表 | `tr:hover` 浅灰、mono 单元格 |
| `Ic` | 图标集 | 现为 inline SVG 字典；建议直接换 `lucide-react` |
| `useT()` | i18n hook | 现稿用 React context；换为 next-intl / i18next |

---

## 9. Screens / Views — 详细规格

每个 direction 一节。开发时配合 `design/<file>.jsx` 一起看。

### A · Fleet Control（`design/direction-a-fleet.jsx`）
**目的**：让 Ops 在一屏看到"舰队此刻在做什么"。
**布局**：
- 顶部 6 列指标条（active runs / events/min / queued / failures / SLA / agents up）
- 左：Agents 网格（6 个 Agent 卡片，每张含 status dot + 当前任务 + spark）
- 中：Live event firehose（按时间倒序的事件列表，按 severity 上色）
- 右：Pipeline funnel（Requirement → Offer 的漏斗 + 每段转化率）

### B · Workflow Canvas（`design/direction-b-workflow.jsx`）
**目的**：可视化"事件 → Agent → 副作用"的编排，用于查看 + 局部编辑。
**布局**：
- 中：节点画布（节点 = Event / Agent / Action / Decision / Human Step）
- 节点形状：Event 菱形、Agent 圆角矩形、Action 矩形、Decision 六边形
- 左：Node palette（按上面 ontology 分类）
- 右：Inspector（选中节点的 schema、subscribers、retry policy、SLA）
- **建议用 React Flow 实现**

### C · Live Operations（`design/direction-c-live.jsx`）
**目的**：单次 Run / Incident 的"时间线 + 决策流 + Swimlane"。
**布局**：
- 顶部：时间 scrubber + run 元信息（id / customer / job / duration / status）
- 左：Decision stream（每个决策的输入、输出、耗时、信心分）
- 中：Swimlanes（每行一个 actor — JDWriter / Sourcer / Screener / Recruiter / Hiring Manager），事件块按时间排
- 右：当前选中事件的 payload / logs

### D · Event Manager（`design/direction-d-events.jsx` + `direction-d-events-detail.jsx`）
**目的**：Inngest 风格的事件总线管理。
**事件列表 (`/events`)**：
- 左：分类树（domain / lifecycle / system / alert）
- 中：事件表（name · publishers · subscribers · last_seen · throughput · errors · spark）
- 右：所选事件的快速摘要

**事件详情 (`/events/:name`)**：
- 5 tabs：`概览` `Schema` `Subscribers / Publishers` `History` `Logs`
- 概览：throughput / error rate / p95 latency 3 个 Metric + 24h spark
- Schema：JSON Schema 编辑器（建议 `@monaco-editor/react`）
- Sub/Pub：左右两栏列出谁发、谁收，点击跳到 Agent 详情
- History：最近 N 条该事件实例（id / ts / source / payload preview）
- Logs：流式日志面板

### Alerts（`design/page-alerts.jsx`）
**列表布局**：
- 顶部 sub-header：6 KPIs（firing / ack / resolved / MTTA / MTTR / noise）
- 左 rail：规则分类 facets + severity facets + 噪声 spark
- 中：Alerts 表 → 选中后右侧或下方展开**告警详情**
- 右 rail：on-call 排班、escalation policy、active silences

**告警详情**（4 tabs）：
- `时间线 Timeline` — 状态变更 + 关联事件按时间排
- `关联事件 Related` — 引发该告警的 Event 列表
- `规则定义 Rule` — PromQL / SQL / DSL（视后端而定）
- `Runbook` — Markdown 操作手册

字段：`id, severity, title, status (firing/ack/resolved), assignee, channel, affected{runs,jobs,candidates}, spark[12], desc, related[eventNames]`

### Data Sources（`design/page-datasources.jsx`）
**列表布局**：
- 顶部 sub-header：连接器健康 KPIs + 入站速率 spark
- 左 rail：7 个分类（ATS/RMS · 招聘渠道 · 模型与向量库 · 消息 · 存储 · 身份）
- 中：Connector 卡片网格（24 个：ByteDance、美团、BOSS、Liepin、OpenAI、Claude、Milvus、飞书、Kafka、Okta…）
- 右 rail：实时跨源活动流 + Webhook health bars

**Connector 详情**（6 tabs）：
- `概览 Overview` — 连接状态、24h 吞吐、错误率 spark、最近事件
- `字段映射 Field Mapping` — 外部字段 ↔ 内部 ontology 字段
- `事件流 Event Stream` — 该连接器最近发出的事件
- `凭证与权限 Credentials` — secret 元数据（不显明文）、scopes
- `Webhook` — endpoint URL、签名、retry、最近 deliveries
- `变更历史 Audit` — schema / 凭证变更日志

---

## 10. Interactions & Behavior

- **⌘K (Cmd/Ctrl+K)** — 全局命令面板。搜 agent / event / job / customer / page。
- **状态点 pulse** — `@keyframes pulse` 2s ease-in-out infinite，用 box-shadow 扩散
- **行 hover** — `tr:hover td { background: var(--c-panel) }`，无 transition
- **Tabs** — 普通 underline tabs；激活态加 accent border-bottom
- **左 rail facet** — 点击切 active；count 显示 mono
- **Sparkbar** — `flex-end + flex:1` 柱条；> 0.7max 的柱条加 `.hot`（不变色，仅 opacity 1）
- **告警表 → 详情** — 选中行高亮，详情默认折叠展开（不要跳页）
- **Connector 卡片 → 详情** — 同上，进入 6 tab 视图
- **Direction 切换** — AppBar 上的 DirectionTag 是当前页指示，不可点击；切换由 LeftNav 完成
- **语言切换** — AppBar 右侧 zh / en segmented control，切换全站 i18n key
- **Tweaks 面板** — 设计稿里的一个工具，**不要进入产品**

---

## 11. State / Data Flow（建议）

```
┌──────────────┐      events/SSE       ┌──────────────┐
│ Backend API  │ ◀──────────────────▶  │  React App   │
│ (REST + SSE) │   REST queries        └──────────────┘
└──────────────┘
       │                                     │
       ├─ /events stream  (SSE)              ├─ React Query (server cache)
       ├─ /alerts/firing (SSE)               ├─ Zustand (UI: selection, filters)
       └─ REST: agents, runs, jobs,          └─ next-intl (locale)
              connectors, rules, etc.
```

- **Live event firehose / Live ops scrubber / Alerts firing** 都是 SSE 或 WebSocket。
- 列表页全部用 TanStack Query + 服务端筛选/分页。
- 选中态、tab、filter 用 URL search params 持久化（方便分享链接）。

---

## 12. Files in `design/`

| 文件 | 内容 |
|---|---|
| `Agentic Operator.html` | 入口，包含 design canvas 配置和所有 Direction 的注册 |
| `design-canvas.jsx` | 设计画布壳（pan / zoom / 多 artboard） |
| `shared.jsx` | 所有跨 direction 共享组件（AppBar、LeftNav、StatusDot、Spark、Metric、Btn、Tbl、Ic、useT） |
| `styles.css` | **全部 design tokens + 组件样式**（最重要 — 抽 Tailwind config 主要参考它） |
| `direction-a-fleet.jsx` | Direction A — Fleet Control |
| `direction-b-workflow.jsx` | Direction B — Workflow Canvas |
| `direction-c-live.jsx` | Direction C — Live Operations |
| `direction-d-events.jsx` | Direction D — Event Manager 列表 |
| `direction-d-events-detail.jsx` | Direction D — 事件详情 |
| `page-alerts.jsx` | Alerts 顶层页面（列表 + 详情） |
| `page-datasources.jsx` | Data Sources 顶层页面（列表 + 详情） |
| `tweaks-panel.jsx` | 设计阶段调参工具，**不要进入产品** |

---

## 13. 推荐实施顺序

1. **基础工程 + tokens**：起 Next.js / Vite，配 Tailwind + 上面 7.x 的 tokens；接 shadcn/ui；引 Inter + JetBrains Mono。
2. **App shell**：`AppBar` + `LeftNav` + `CommandPalette`，把路由架子搭起来。
3. **共享原子**：`StatusDot` `Spark` `Metric` `Badge` `Btn` `Card` `Tbl` `DirectionTag`。
4. **后端 mock 层**：用 `msw` 或 `json-server` 把 events / runs / agents / alerts / connectors mock 出来，再做 SSE。
5. **Direction A → D** 任选一个先做，建议从 **D · Event Manager** 起步（schema 最规整、最像 CRUD），积累领域模型理解。
6. **Alerts、Data Sources** 顶层页面（CRUD + 详情 6/4 tabs）。
7. **Direction B (React Flow)、Direction C (timeline)** 复杂度高，最后做。
8. **i18n** 全程用 key 写，不要硬编码中文/英文。

---

## 14. Open Questions for the Team

- 后端是否已有事件总线？Inngest / Temporal / 自研 Kafka？
- Agent runtime 在哪？LangGraph？自研？这影响 Run / Trace 的对接方式。
- Schema registry 是独立服务还是放 ontology 模块里？
- 多租户 / Workspace 模型？现稿假定有 workspace，但未细化权限。
- 通知渠道：飞书/邮件/Webhook 之外还有别的吗？
- Mobile 形态：是否需要一个只读的 Alerts / Live Ops 移动端？

---

祝实施顺利。  ✦
