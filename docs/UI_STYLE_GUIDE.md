# LantuConnect 前端 UI 规范

> 设计或改样式不确定时，先查本文；**DaisyUI 组件**与 **Tailwind 手写**需对齐同一套圆角与层级。

## 0. 文档维护（重要）

**每次对 UI 做可见优化时，须同步更新本文对应章节**（或在本节下方「变更记录」追加一条），避免规范与代码脱节。  
实现细节若在 `src/styles/index.css` 有全局覆盖，也请在本文「焦点与选中」等节注明。

### 变更记录（最近）

| 日期 | 内容摘要 |
|------|----------|
| 2026-03-19 | 概览「平台能力」改为对称 **渐变卡片**（去单侧粗边框）；轮播区使用 `group/carousel`，箭头 **悬停或 focus-within** 显示，底部 **圆点条常驻** |
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
| `lantu-main-nav` | `navigationState.ts` | 侧栏、子菜单、Agent 列表/详情视图状态 |
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

---

## 7. 修改清单（给开发者）

新增页面或组件时自检：

1. 按钮/输入/搜索是否均为 **`rounded-xl`**（或 Daisy 默认已跟 `--radius-field`）？  
2. 卡片/弹层外壳是否为 **`rounded-2xl`**？  
3. 是否出现无文档依据的 `rounded-3xl` / `rounded-md`？  
4. 焦点/选中是否避免 **粗 ring、宽 offset**？  
5. 表格/列表是否具备 **横向滚动或省略+title**，列是否有 **min-width**？  
6. 主内容区外边距是否 **收紧**（§5），避免背景色留白过大？  
7. 是否与 DaisyUI 主题变量冲突？若冲突以本文 + `index.css` 为准。  
8. **用户管理**（侧栏）：子项「用户管理 / 角色管理 / API Key 管理 / Token 管理」由 `UserManagementModule` 分发至 `src/views/userMgmt/*`，布局沿用 §5 主区灰底 + 内层 `rounded-2xl` 大卡片与表格斑马行（非 `table-zebra`）；演示数据见 `src/constants/userMgmt.ts`。

---

**文档版本**：与仓库同步维护；重大视觉改版时更新本页。
