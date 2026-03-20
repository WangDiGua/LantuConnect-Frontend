# LantuConnect 前端 UI 规范

> 设计或改样式不确定时，先查本文；**DaisyUI 组件**与 **Tailwind 手写**需对齐同一套圆角与层级。

## 0. 文档维护（重要）

**每次对 UI 做可见优化时，须同步更新本文对应章节**（或在本节下方「变更记录」追加一条），避免规范与代码脱节。  
实现细节若在 `src/styles/index.css` 有全局覆盖，也请在本文「焦点与选中」等节注明。

### 变更记录（最近）

| 日期 | 内容摘要 |
|------|----------|
| 2026-03-20 | **路由**：控制台路径 `/c/{admin 或 user}/{sidebar}/{sub}`（`encodeURIComponent`），无子菜单项第三段为 `__root__`（`routeRoot.ts`）；`react-router-dom` + `useLayoutEffect` 与侧栏点击 `navigate` 同步；入口 `/` 见 `ConsoleHomeRedirect`。 **数据可视化**：业务统计统一 **ECharts**（按需注册 chart 类型），壳组件 `EChartCard` + 主题工具 `echartsTheme.ts`；概览 `OverviewAnalyticsGrid`、监控 `MonitoringOverviewCharts`、管理员总览 `AdminConsoleCharts`。 **开源组件**：要闻轮播使用 **Swiper**（`HeroCarousel`）。 **DaisyUI**：公告区使用 `card` / `card-body` / `card-title` 等与 `data-theme` 联动。 **复用**：图表与轮播独立目录 `components/charts`、`components/ui`，避免页面内重复 option 大块（可再抽 `buildXxxOption`）。 |
| 2026-03-20 | **应用型侧栏目录**：一级项为「主按钮 + 独立展开箭头」（箭头可收起当前模块子树）；子项行统一 **`rounded-xl`**，分组标题置于 **`rounded-lg`** 浅底轨道内；当前模块下提供 **子项筛选框**（`toolbarSearchInputClass` + 左侧 Search 图标）；选中态以 **背景 + 字重 + 左侧主题色边线** 为主，去掉子项横向位移动效；管理员侧栏各子页补全 **Mock 可操作流程**（`views/adminApp/*`、`SystemConfigExtraPages`、`OrgStructurePage`、监控扩展页）。§6 补充「应用目录」约定。 |
| 2026-03-19 | **下拉框**：全站原生 select 统一使用 `nativeSelectClass(theme)`；`formFieldClasses` 增加 `appearance-none` + 自定义箭头（`.lantu-select`）；AgentCreate 内两处 Daisy select 改为规范样式；MainLayout 根节点增加 `data-theme` 以支持深色箭头；§1 增加「下拉框统一规范」 |
| 2026-03-19 | 概览「平台能力」：**素色卡片**（白/ `#1C1C1E` 底、细边框），左图标右文案，中性灰图标底；轮播 `group/carousel` 箭头悬停/focus-within 显示，圆点常驻 |
| 2026-03-19 | 概览轮播：**左右箭头**仅在卡片 `group-hover` 时显示；**底部圆点指示器**始终可见；工具广场：`MainLayout` 次级侧栏 `TOOL_SQUARE_GROUPS` + `ToolMarketModule`（工具发现 / 我的工具 / 上架 MCP / 创建 MCP）；Agent 观测：`AgentMonitoringPage`、`AgentTracePage`；`views/agent/ToolMarket.tsx` 改为对 `ToolMarketDiscover` 的别名导出 |
| 2026-03-19 | `main.tsx` 首屏前同步 `document.documentElement` 字号，消除 rem 与外观设置导致的「字先大后小」；`MgmtPageShell` 增加 `titleIcon` 统一子页标题图标；侧栏品牌区 Logo 水平垂直居中；新增 `DocsTutorialPage`、`UserSettingsPage`；概览轮播改为渐变底、序号、左右切换与顶栏进度条 |
| 2026-03-19 | 概览页：轮播要闻 + 通知公告 + 弱化渐变营销感；无次级侧栏时概览/快捷/个人中心主区 `w-full max-w-none` 占满原次级栏宽度；`Logo` 图形换新（连接弧 + 节点）；`AgentList` / `AgentMarket` / 知识库·数据库创建页下拉统一 `nativeSelectClass`；限流 / API Key / Token 列表工具栏 `TOOLBAR_ROW` + `toolbarSearchInputClass` |
| 2026-03-19 | 无次级侧栏时主区水平留白收紧：`LayoutChromeContext` + 概览/快捷/占位/个人中心/AI 助手等；`document.documentElement` 字号与外观「字号」同步，全站 rem 联动；`MgmtPageShell` 面包屑 + 主区 `overflow-y-auto`；侧栏 Logo 文案「兰智通」；次级侧栏顶栏面包屑「兰智通 › 当前主菜单」 |
| 2026-03-19 | 系统配置三页 `views/systemConfig/*`（模型配置 / 限流策略 / 审计日志）接入 `SystemConfigModule`；品牌更名为兰智通（LantuConnect），`index.html` 描述与 `public/favicon.svg`；主内容区切换动画 key 含 `activeAgentView` 与 `selectedAgentId`，过渡 `0.28s`；用户/角色列表↔表单使用 `AnimatePresence`；原生下拉统一 `utils/formFieldClasses.ts`（`rounded-xl`），Daisy `select` 补充 `rounded-xl` |
| 2026-03-19 | Agent 管理侧栏「智能体」更名为「Agent列表」；`AgentMarket` 市场页（搜索/热门词/分类/精选双列/全部栅格/排序/收藏与上架入口，数据见 `constants/agentMarket.ts`） |
| 2026-03-19 | 数据库管理页 `views/database/*`（全宽卡片布局，与智能体列表一致）；知识库列表/创建/批量/开发者/命中测试子页改为外层 `px` + `rounded-2xl` 主卡片、表单 `max-w-6xl` 双栏栅格、命中测试双栏并排，避免内容挤在居中小块 |
| 2026-03-19 | 外观持久化：`localStorage` 键 `lantu-appearance`（`src/utils/appearanceState.ts`），主题/主题色/字号/字体/动画切换后自动保存，刷新恢复；知识库页 `views/knowledge/*`（列表+创建/批量/开发者/命中测试子页）接入 Agent 管理「知识库」 |
| 2026-03-19 | `index.css`：覆盖 DaisyUI 输入/下拉/文本域聚焦的 2px 深色 outline，改为 1px 浅蓝 outline；默认控件聚焦边框柔化；`btn`/`btn-outline`/`btn-ghost` 的 `outline-color` 同步为浅主题色 |
| 2026-03-19 | 暗色主题下列表斑马纹：去掉 `table-zebra`，按奇偶行手写 `bg-white/5`（暗色）/ `bg-slate-50/80`（浅色），避免暗色下出现纯白行；AI 助手页主区与底部输入区背景统一：`main` 在「AI 助手」下设为 `bg-[#F2F2F7]`（浅）/ `bg-[#000000]`（暗），消除底部白条 |
| 2026-03-19 | §5 主区留白：主内容区外边距收紧为 `px-2 sm:px-3 lg:px-4 py-2 sm:py-3`（或 `py-4` 等适度值），背景色作细边；Overview、QuickAccess、AgentList、AgentCreate、AgentDetail、ToolMarket、UserProfile、PlaceholderView、AIAssistant 已统一按此调整 |
| 2026-03-19 | 概览 `Overview`、快捷入口 `QuickAccess`、工具市场 `ToolMarket`、用户资料 `UserProfile`、占位页 `PlaceholderView`、`AIAssistant`、`AgentDetail`：主区背景 `#F2F2F7` / 深色 `#000000`，卡片 `shadow-none` + `border-slate-200/80`（或深色 `border-white/10`），去营销重阴影；`MainLayout` 侧栏 Logo 区去掉加号；`AgentCreate` 与列表页壳层对齐（此前已做） |
| 2026-03-19 | 新增 §0 文档维护约定、§3 焦点/ring 规范、§4 表格与列表规范；`index.css` 弱化 `.btn:focus-visible`；`AgentList` 表 `min-w-[1280px]` + `overflow-x-auto` + 列 `min-w`；`MainLayout` 输入区 `ring-1`；外观色点 / 创建向导步骤环改细 |

### 持久化存储（localStorage）

| 键名 | 工具模块 | 内容 |
|------|----------|------|
| `lantu-main-nav` | `navigationState.ts` | 侧栏、子菜单、Agent 列表/详情视图状态（与 URL 同步后仍写入，便于 `/` 重定向恢复） |
| `lantu-appearance` | `appearanceState.ts` | 浅色/深色、主题色、字号、字体、转场动画 |

---

## 1. 圆角（Radius）

全站只使用下面几档，**禁止**对同类控件混用 `rounded-lg` / `rounded-xl` / `rounded-2xl` 随意组合。

| 层级 | 像素（约） | Tailwind | 用途 |
|------|------------|----------|------|
| **控件 Control** | 12px | `rounded-xl` | 按钮（自定义 `button`）、输入框、搜索框、`select`、侧栏可点击行、Tab 切换按钮、列表行内操作区 |
| **容器 Surface** | 16px | `rounded-2xl` | 卡片、面板、下拉/用户菜单外层、登录框、表格外层包裹、Agent 列表主卡片 |
| **嵌套紧凑 Dense** | 8px | `rounded-lg` | **仅**允许用在「已处于 Surface 内部」的成组控件底槽，如分段器轨道、Appearance 里成组小按钮的外框 |
| **圆形** | — | `rounded-full` | 头像、徽章药丸、开关圆钮、图标按钮（circle） |

**不要再用：**

- `rounded-md`（6px）作主要按钮/输入——统一改为 `rounded-xl` 或归入 Dense 的 `rounded-lg`。
- `rounded-3xl`（24px）——与 Surface 混用会显得不统一；**营销/大屏模块**若需更强风格，也优先用 `rounded-2xl`；若产品明确要求更大圆角再单独评审。

### DaisyUI 与全局变量

`src/styles/index.css` 的 `@layer base` 中为 DaisyUI 指定：

- `--radius-field: 0.75rem`（12px）→ `input` / `select` / `textarea` / `btn` 等字段圆角  
- `--radius-box: 1rem`（16px）→ `card` / `table` 等块级容器圆角  
- `--radius-selector: 0.75rem`（12px）→ 与字段一致  

手写 Tailwind 时：**控件 = `rounded-xl`，卡片 = `rounded-2xl`**，与上述变量语义一致。

### 下拉框（select）统一规范

- **全站原生 `<select>`** 须使用 **`nativeSelectClass(theme)`**（`src/utils/formFieldClasses.ts`），保证圆角 `rounded-xl`、边框、深浅主题背景/文字一致。
- 该工具类已包含 **`appearance-none`** 与右侧自定义箭头；箭头图标由 **`index.css` 内 `.lantu-select`** 提供（浅色 stroke 灰、深色 stroke 亮灰），避免浏览器默认三角样式。
- 与 `join` 组合时：左侧 select 使用 `rounded-l-xl rounded-r-none border-r-0`，右侧 input 使用 `rounded-l-none rounded-r-xl`。

---

## 2. 阴影与边框

- **主内容区卡片**：与侧栏统一的**扁平风格**，使用 `border` + **无投影**（`shadow-none`），避免突兀的落影；浅色下边框 `border-slate-200/80`，深色下 `border-white/10`。
- **主内容区背景**：浅色与侧栏一致使用 `bg-[#F2F2F7]`，保证左右视觉统一。
- 主操作按钮：可保留 `shadow-lg shadow-blue-500/20` 作为品牌强调（与现有智能体列表一致）。

---

## 3. 焦点、选中与 Ring（禁止「又粗又宽」）

- **禁止**使用粗 `ring-2` / `ring-4` + 大 `ring-offset` 作为默认焦点或选中态（键盘聚焦、表单聚焦、色块选中），视觉会像「一大圈边框」，不符合本项目风格。
- **推荐**：
  - 表单外框：`focus-within:ring-1` + 低透明度主题色（见 `MainLayout` 输入区）。
  - DaisyUI `btn` / `input` / `select` / `textarea`：由 `src/styles/index.css` **Subtle focus** 段覆盖——**禁止**沿用 Daisy 5 默认的 `outline: 2px solid base-content`（易与边框叠成粗黑双边）；统一为 **约 1px、浅主题色 `outline`**；默认 `input`/`select`/`textarea`（非 error、非 primary 等颜色变体）聚焦时 `--input-color` 用 primary 与 `base-300` 混合，边框更柔和。
  - 列表项「当前选中」：以 **背景色 + 字重** 区分（如侧栏），不要叠粗 ring。
- 主题色小圆点（外观设置里选颜色）可用 **`ring-1 ring-offset-1`** 表示选中，不要用 `ring-2 ring-offset-2`。

---

## 4. 数据表格与列表：可读性优先

- **禁止**为把表格塞进窄屏而无限压缩列宽，导致标签、文字叠在一起。
- **策略（二选一或组合）**：
  1. **横向滚动**：表格外层 `overflow-x-auto`，表格设置 **`min-w-[…]`**（小于视口宽度时出现底部横向滚动条），各列设置合理 **`min-w-*`**。
  2. **省略 + 完整信息**：单元格 `truncate` / `line-clamp-*`，并必须提供 **`title` 或 Tooltip** 展示全文。
- 标签、状态徽章：保持 **`whitespace-nowrap`**，列宽用 `min-w-*` 保证不被压扁。
- **斑马纹（暗色主题）**：不要使用 DaisyUI 的 `table-zebra`（暗色下会出纯白行）。按奇偶行手写背景：暗色偶数行 `bg-white/5`、奇数行 `bg-transparent`；浅色可用 `bg-slate-50/80` 与 `bg-transparent`，保证暗色下无高亮白条。

---

## 5. 间距与主区留白

- **主内容区外边距**：背景色（浅色 `#F2F2F7` / 深色 `#000000`）仅作**细边**，不要大面积留白。推荐：`px-2 sm:px-3 lg:px-4 py-2 sm:py-3`，避免使用 `px-5`、`py-4` 等过大值导致「卡片很小、背景一大圈」的观感。
- 页面内容区水平内边距（无卡片全铺时）：`px-3 sm:px-4 lg:px-4` 为宜，避免过窄或过宽。
- 卡片内边距：`p-4` ~ `p-6` 按信息密度选择，同类型页面保持一致。

---

## 6. 导航信息架构

- **同一业务闭环**（如 Agent：列表 → 创建 → 详情 → 行内测试）只占 **一个** 子菜单入口（如「Agent列表」），通过页面内状态切换，不拆成多个侧栏项。

### 6.1 应用型侧栏目录（Studio / 控制台）

适用于 **用户工作台** 与 **管理员平台** 等多子项树形菜单：

| 元素 | 约定 |
|------|------|
| 一级项 | `rounded-xl` 整行；**左侧**为导航主按钮（切换模块并默认展开子树），**右侧**为独立 **Chevron**（在当前已选模块上可 **收起/展开** 子树，避免误跳页）。 |
| 分组标题 | 使用 **`rounded-lg`** 的浅底轨道（`bg-slate-200/40` / `bg-white/5`）承载小字 `uppercase` 分组名，与子项行视觉分层。 |
| 子项行 | 一律 **`rounded-xl`** + `py-2`；**禁止**粗 `ring` 表示选中；选中态用 **背景块 + 字重**，深色下可加 **`border-l-2` + 主题色**。 |
| 子项检索 | 仅在 **当前激活的一级模块** 展开区内显示筛选框；占位符如「筛选子项…」；无匹配时展示「无匹配项」文案。 |
| 动效 | **不要**对侧栏行使用横向 `translate` 悬停；可用背景透明度/色块变化即可。 |

---

## 7. 路由与地址栏（控制台）

- **路径格式**：`/c/:role/:sidebar/:sub`，其中 `role` 为 `admin` 或 `user`；`sidebar` / `sub` 为 **URL 编码**后的侧栏 id（与 `navigation.ts` 中 `id` 一致）。
- **占位**：无子菜单的一级项（如 `AI 助手`、`文档教程`）第三段固定为 **`__root__`**（常量 `ROUTE_ROOT_SUB`）。
- **Agent**：侧栏为「我的 Agent」时，第三段为 **Agent 子菜单 id**（如 `agent-workspace`）。
- **实现**：`constants/consoleRoutes.ts`（`buildConsolePath` / `decodeConsolePath` / `isValidConsolePath`）；`getNavSubGroups` 在 `navigation.ts` 供布局与校验复用。
- **部署**：SPA 需服务端 **history fallback** 到 `index.html`（Vite preview 已支持；生产环境按 Nginx / CDN 配置）。

---

## 8. 数据图表（ECharts）

- **封装**：`components/charts/EChartCard.tsx` 负责 `init` / `ResizeObserver` / `dispose`，页面只传 `option` 与 `theme`。
- **主题**：文字、轴线、分割线等与浅色/深色对齐，见 `echartsTheme.ts`（`chartColors`、`baseAxis`、`baseTooltip` 等）。
- **按需注册**：在 `EChartCard` 内 `echarts.use` 仅注册用到的图表类型（`LineChart`、`BarChart`、`PieChart`、`RadarChart`、`FunnelChart` 等），避免整包 `import echarts`。
- **版式**：多图页使用 **响应式栅格**（如 `grid-cols-1 lg:grid-cols-2`），单图最小高度建议 **≥ 220px**，标题用 `title.textStyle` 与 §1 字号档协调。

---

## 9. 开源与 DaisyUI 使用原则

- **轮播**：优先 **Swiper**（已实现 `HeroCarousel`）；自定义动画轮播仅在没有交互需求时使用。
- **DaisyUI**：列表/卡片容器优先 `card`、`btn`、`badge` 等语义类，再通过 Tailwind 覆盖圆角（与 §1 一致：`rounded-2xl` 卡片、`rounded-xl` 按钮）。
- **复用**：同类可视化抽 **一个壳组件 + 多个 option 工厂**；跨页重复区块（如图表栅格）单独文件，禁止在业务页复制大段 JSX。

---

## 10. 修改清单（给开发者）

新增页面或组件时自检：

1. 按钮/输入/搜索是否均为 **`rounded-xl`**（或 Daisy 默认已跟 `--radius-field`）？  
2. 卡片/弹层外壳是否为 **`rounded-2xl`**？  
3. 是否出现无文档依据的 `rounded-3xl` / `rounded-md`？  
4. 焦点/选中是否避免 **粗 ring、宽 offset**？  
5. 表格/列表是否具备 **横向滚动或省略+title**，列是否有 **min-width**？  
6. 主内容区外边距是否 **收紧**（§5），避免背景色留白过大？  
7. 是否与 DaisyUI 主题变量冲突？若冲突以本文 + `index.css` 为准。  
8. **用户管理**（侧栏）：子项「用户管理 / 角色管理 / API Key 管理 / Token 管理」由 `UserManagementModule` 分发至 `src/views/userMgmt/*`，布局沿用 §5 主区灰底 + 内层 `rounded-2xl` 大卡片与表格斑马行（非 `table-zebra`）；演示数据见 `src/constants/userMgmt.ts`。  
9. 新增统计类页面时，是否已复用 **`EChartCard` + `echartsTheme`**？路由变更是否 **`buildConsolePath` + `navigate`**？

---

**文档版本**：与仓库同步维护；重大视觉改版时更新本页。
