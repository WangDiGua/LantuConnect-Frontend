# LantuConnect 前端全项目全量对齐总册（L3）

> 更新时间：2026-04-09
> 目标：输出"全项目能力总册 + 后端对齐真值"双层文档，覆盖全部路由、全部页面交互、全部接口与使用证据。
> 代码基线：`src/App.tsx`、`src/layouts/MainLayout.tsx`、`src/constants/consoleRoutes.ts`、`src/constants/navigation.ts`、`src/context/UserRoleContext.tsx`、`src/lib/http.ts`、`src/api/services/**`、`src/views/**`。

> **路由与菜单权威说明**：优先对照 [docs/frontend/routes-and-navigation.md](frontend/routes-and-navigation.md) 与上述源码。**A2.1 / A2.2** 表格由 `npm run docs:gen-console-routes` 根据 `ADMIN_SIDEBAR_PAGES` / `USER_SIDEBAR_PAGES` 生成；与 `MainLayout` 冲突时以源码为准。

## B0. 后端路由现状（执行改造时优先遵循）

- 本文档反映前端**当前代码真实状态**，所有接口均以代码为准。
- 统一资源主链路：
  - 目录：`GET /catalog/resources`
  - 解析：`POST /catalog/resolve`
  - 调用：`POST /invoke`
  - SDK：`/sdk/v1/*`
  - 沙箱：`/sandbox/*`
  - 资源可见性/调用策略：由资源 `access_policy` 与网关校验共同决定（见后端 `docs/frontend-alignment-handbook.md` §2.9）；独立 `/resource-grants` CRUD 与 grant 工单已下线。
  - 兼容占位：`GET /user-settings/api-keys/{apiKeyId}/resource-grants` 仍保留但恒返回空列表。
- 资源注册中心：`/resource-center/resources*`
- 资源审核闭环：`/audit/resources/*`
- 旧路径（`/agents/**`、`/v1/skills/**`、`/v1/apps/**`、`/v1/datasets/**`、`/v1/providers/**`、`/v1/categories/**`）已下线，对应 service 内部为 stub（返回空或抛出 410 异常）。

---

## A. 第一层：全项目能力总册（全景）

## A1. 范围与判定标准

- 本文档覆盖角色：访客（登录）、管理端（admin 视图）、用户端（user 视图）、全局壳层（header/sidebar/message/settings）。
- 页面可达性判定按 `findSidebarForPage(role,page)` 与 `MainLayout` 路由校验执行。
- "全量交互（L3）"定义：主按钮 + 次级按钮 + 筛选 + 分页 + tab + modal confirm/cancel + menu action + toggle。
- 接口路径统一使用后端风格花括号：`/resource/{id}`（代码中 `:id` 或模板字符串统一映射到该风格）。

### A1.1 数据展示形态规范（列表 / 卡片）

- 默认使用**列表/表格**：
  - 字段数 >= 5 且需跨行对比（状态、时间、角色、计数、权限等）。
  - 存在筛选/分页/排序/批量操作需求。
  - 典型：用户、角色、API Key、审核记录、调用日志、使用记录、配额策略。
- 使用**卡片**：
  - 低密度信息，强调摘要、视觉封面、推荐与导航。
  - 典型：仪表盘 KPI、发现页推荐、详情页顶部摘要信息。
- 特例：
  - 组织架构保留层级结构（tree list / tree table），不使用普通平铺卡片。

### A1.2 页面展示形态矩阵（当前基线）

| 页面 | 展示形态 | 说明 |
|---|---|---|
| `UserListPage` | 表格 | 管理对象列表，需字段对比与操作列 |
| `RoleListPage` | 表格 | 角色/权限对比场景，标准列表 |
| `ApiKeyListPage` | 表格 | Key 生命周期与调用统计，标准列表 |
| `ResourceAuditList` | 表格 | 审核队列，便于状态与时间横向比对 |
| `CallLogPage` | 表格 | 高频日志数据，便于检索与回溯 |
| `UsageRecordsPage` | 表格 | 使用行为流水，便于批量扫描 |
| `OrgStructurePage` | 树列表 | 保留层级关系，非平铺卡片 |
| `ExploreHub` / `UserWorkspaceOverview` | 卡片 + 摘要 | 导航与摘要信息优先 |

## A2. 路由与页面全量矩阵（admin / user）

> `状态` 取值：`reachable`（路由可达且有真实组件）、`direct-url-only`（无菜单入口但可直接访问）、`placeholder`（渲染占位）、`redirect`（被 `normalizeDeprecatedPage` 重定向）。

### A2.0 废弃页面重定向（normalizeDeprecatedPage）

仅涉及 **URL slug 替换**（实现见 `MainLayout.tsx` 内 `normalizeDeprecatedPage`），其中 `provider-list` / `provider-create` 已兼容重定向到 `resource-audit`。

| 旧 page slug | 重定向目标 |
|---|---|
| `agent-create` | `agent-register` |
| `agent-versions` | `agent-register` |
| `skill-create` | `skill-register` |
| `app-create` | `app-register` |
| `dataset-create` | `dataset-register` |
| `category-management` | `tag-management` |
| `submit-agent` | `my-agents-pub` |
| `submit-skill` | `my-agents-pub` |
| `my-agents` | `my-publish-agent` |
| `my-skills` | `my-publish-skill` |
| `quota-management` | `rate-limit-policy` |
| `quick-access` | `workspace` |
| `recent-use` | `usage-records` |

管理端旧列表/审核 URL 另见真值文档中的 **replace 到 `resource-catalog` / `resource-audit`**（带 `?type=`）。

### A2.1 admin 全量 page

侧栏一级 `sidebarId` 与下列 **逐行** `page` 与 `src/constants/consoleRoutes.ts` 中 `ADMIN_SIDEBAR_PAGES` **完全机械一致**。浏览器主路径为 **`#/c/{page}`**；`#/admin/*` 仅兼容重定向入站。

<!-- AUTO-GENERATED A2.1:BEGIN -->

> 本表由 `scripts/generate-console-route-tables.mjs` 从 `ADMIN_SIDEBAR_PAGES` 生成；请勿手改块内内容。

| sidebarId | page slug | Hash 路径 | 渲染组件 | 状态 | 说明 |
|---|---|---|---|---|---|
| overview | `dashboard` | `#/c/dashboard` | AdminOverviewModule | reachable | — |
| overview | `usage-statistics` | `#/c/usage-statistics` | AdminOverviewModule | reachable | — |
| overview | `data-reports` | `#/c/data-reports` | AdminOverviewModule | reachable | — |
| user-management | `user-list` | `#/c/user-list` | AdminUserHubModule | reachable | — |
| user-management | `role-management` | `#/c/role-management` | AdminUserHubModule | reachable | — |
| user-management | `organization` | `#/c/organization` | AdminUserHubModule | reachable | — |
| admin-workspace | `agent-detail` | `#/c/agent-detail/{id}` | AgentDetail | direct-url-only | 菜单无直达子项；需 `/c/agent-detail/{id}` |
| admin-workspace | `resource-audit` | `#/c/resource-audit?type=…` | ResourceAuditList | reachable | — |
| admin-workspace | `agent-audit` | `#/c/agent-audit` | ResourceAuditList（replace 后生效） | redirect | `MainLayout` replace → `#/c/resource-audit?type=agent`（若缺省 `type` 则用该默认值） |
| admin-workspace | `skill-audit` | `#/c/skill-audit` | ResourceAuditList（replace 后生效） | redirect | `MainLayout` replace → `#/c/resource-audit?type=skill`（若缺省 `type` 则用该默认值） |
| admin-workspace | `mcp-audit` | `#/c/mcp-audit` | ResourceAuditList（replace 后生效） | redirect | `MainLayout` replace → `#/c/resource-audit?type=mcp`（若缺省 `type` 则用该默认值） |
| admin-workspace | `app-audit` | `#/c/app-audit` | ResourceAuditList（replace 后生效） | redirect | `MainLayout` replace → `#/c/resource-audit?type=app`（若缺省 `type` 则用该默认值） |
| admin-workspace | `dataset-audit` | `#/c/dataset-audit` | ResourceAuditList（replace 后生效） | redirect | `MainLayout` replace → `#/c/resource-audit?type=dataset`（若缺省 `type` 则用该默认值） |
| monitoring | `monitoring-overview` | `#/c/monitoring-overview` | AdminMonitoringHubModule | reachable | — |
| monitoring | `performance-center` | `#/c/performance-center` | AdminMonitoringHubModule | reachable | — |
| monitoring | `call-logs` | `#/c/call-logs` | AdminMonitoringHubModule | reachable | — |
| monitoring | `trace-center` | `#/c/trace-center` | AdminMonitoringHubModule | reachable | — |
| monitoring | `alert-center` | `#/c/alert-center` | AdminMonitoringHubModule | reachable | — |
| monitoring | `health-governance` | `#/c/health-governance` | AdminMonitoringHubModule | reachable | — |
| system-config | `tag-management` | `#/c/tag-management` | AdminSystemConfigHubModule | reachable | — |
| system-config | `system-params` | `#/c/system-params` | AdminSystemConfigHubModule | reachable | — |
| system-config | `security-settings` | `#/c/security-settings` | AdminSystemConfigHubModule | reachable | — |
| system-config | `network-config` | `#/c/network-config` | AdminSystemConfigHubModule | reachable | — |
| system-config | `rate-limit-policy` | `#/c/rate-limit-policy` | AdminSystemConfigHubModule | reachable | — |
| system-config | `access-control` | `#/c/access-control` | AdminSystemConfigHubModule | reachable | — |
| system-config | `audit-log` | `#/c/audit-log` | AdminSystemConfigHubModule | reachable | — |
| system-config | `sensitive-words` | `#/c/sensitive-words` | AdminSystemConfigHubModule | reachable | — |
| system-config | `announcements` | `#/c/announcements` | AdminSystemConfigHubModule | reachable | — |
| developer-portal | `developer-docs` | `#/c/developer-docs` | PlaceholderView | reachable | — |
| developer-portal | `developer-tools` | `#/c/developer-tools` | PlaceholderView | reachable | — |
| developer-portal | `developer-statistics` | `#/c/developer-statistics` | PlaceholderView | reachable | — |

<!-- AUTO-GENERATED A2.1:END -->

组件/壳层命名以 `MainLayout.tsx` 中 `MainContent` 及 `Admin*HubModule` 为准。

### A2.2 user 全量 page

下列行与 `USER_SIDEBAR_PAGES` **机械一致**（含全部 `*-list` 行）。Hash 真值为 **`#/c/...`**；`#/user/*` 仅兼容重定向。

<!-- AUTO-GENERATED A2.2:BEGIN -->

> 本表由 `scripts/generate-console-route-tables.mjs` 从 `USER_SIDEBAR_PAGES` 生成；请勿手改块内内容。

| sidebarId | page slug | Hash 路径 | 渲染组件 | 状态 | 说明 |
|---|---|---|---|---|---|
| hub | `hub` | `#/c/hub` | ExploreHub | reachable | — |
| workspace | `workspace` | `#/c/workspace` | UserWorkspaceOverview | reachable | — |
| workspace | `profile` | `#/c/profile` | UserSettingsHubPage | reachable | — |
| workspace | `my-api-keys` | `#/c/my-api-keys` | PlaceholderView | reachable | — |
| workspace | `preferences` | `#/c/preferences` | UserSettingsHubPage | reachable | — |
| workspace | `developer-onboarding` | `#/c/developer-onboarding` | DeveloperOnboardingPage | reachable | — |
| workspace | `my-favorites` | `#/c/my-favorites` | MyFavoritesPage | reachable | — |
| workspace | `my-agents-pub` | `#/c/my-agents-pub` | MyPublishHubPage | reachable | — |
| workspace | `resource-market` | `#/c/resource-market` | UserResourceMarketHub | reachable | — |
| workspace | `skill-market` | `#/c/skill-market` | —（replace 后生效） | redirect | replace → `skills-center`（保留 `resourceId` query） |
| workspace | `my-publish-agent` | `#/c/my-publish-agent` | MyPublishListRoute | reachable | — |
| workspace | `my-publish-skill` | `#/c/my-publish-skill` | MyPublishListRoute | reachable | — |
| workspace | `my-publish-mcp` | `#/c/my-publish-mcp` | MyPublishListRoute | reachable | — |
| workspace | `my-publish-app` | `#/c/my-publish-app` | MyPublishListRoute | reachable | — |
| workspace | `my-publish-dataset` | `#/c/my-publish-dataset` | MyPublishListRoute | reachable | — |
| workspace | `resource-center` | `#/c/resource-center?type=…` | ResourceCenterManagementPage | reachable | — |
| workspace | `capability-register` | `#/c/capability-register` | PlaceholderView | reachable | — |
| workspace | `agent-list` | `#/c/agent-list` | ResourceCenterManagementPage（replace 后生效） | redirect | `unifiedResourceCenterPath(role,type)` replace（管理视角走 `resource-catalog`，否则 `resource-center`） |
| workspace | `agent-register` | `#/c/agent-register` | ResourceRegisterPage(agent) | reachable | — |
| workspace | `skill-list` | `#/c/skill-list` | ResourceCenterManagementPage（replace 后生效） | redirect | `unifiedResourceCenterPath(role,type)` replace（管理视角走 `resource-catalog`，否则 `resource-center`） |
| workspace | `skill-register` | `#/c/skill-register` | ResourceRegisterPage(skill) | reachable | — |
| workspace | `mcp-server-list` | `#/c/mcp-server-list` | ResourceCenterManagementPage（replace 后生效） | redirect | `unifiedResourceCenterPath(role,type)` replace（管理视角走 `resource-catalog`，否则 `resource-center`） |
| workspace | `mcp-register` | `#/c/mcp-register` | ResourceRegisterPage(mcp) | reachable | — |
| workspace | `app-list` | `#/c/app-list` | ResourceCenterManagementPage（replace 后生效） | redirect | `unifiedResourceCenterPath(role,type)` replace（管理视角走 `resource-catalog`，否则 `resource-center`） |
| workspace | `app-register` | `#/c/app-register` | ResourceRegisterPage(app) | reachable | — |
| workspace | `dataset-list` | `#/c/dataset-list` | ResourceCenterManagementPage（replace 后生效） | redirect | `unifiedResourceCenterPath(role,type)` replace（管理视角走 `resource-catalog`，否则 `resource-center`） |
| workspace | `dataset-register` | `#/c/dataset-register` | ResourceRegisterPage(dataset) | reachable | — |
| workspace | `usage-records` | `#/c/usage-records` | UsageRecordsPage | reachable | — |
| workspace | `usage-stats` | `#/c/usage-stats` | UsageStatsPage | reachable | — |
| workspace | `developer-applications` | `#/c/developer-applications` | DeveloperApplicationListPage | reachable | — |
| skills-center | `skills-center` | `#/c/skills-center` | SkillMarket / SkillMarketDetailPage | reachable | — |
| mcp-center | `mcp-center` | `#/c/mcp-center` | McpMarket | reachable | — |
| mcp-center | `mcp-market` | `#/c/mcp-market` | —（replace 后生效） | redirect | replace → 对应广场路由或 `resource-market?tab=`（见 `USER_LEGACY_MARKET_PAGE_TO_TAB`） |
| dataset-center | `dataset-center` | `#/c/dataset-center` | DatasetMarket / DatasetMarketDetailPage | reachable | — |
| dataset-center | `dataset-market` | `#/c/dataset-market` | —（replace 后生效） | redirect | replace → 对应广场路由或 `resource-market?tab=`（见 `USER_LEGACY_MARKET_PAGE_TO_TAB`） |
| agents-center | `agents-center` | `#/c/agents-center` | AgentMarket / AgentMarketDetailPage | reachable | — |
| agents-center | `agent-market` | `#/c/agent-market` | —（replace 后生效） | redirect | replace → 对应广场路由或 `resource-market?tab=`（见 `USER_LEGACY_MARKET_PAGE_TO_TAB`） |
| apps-center | `apps-center` | `#/c/apps-center` | AppMarket / AppMarketDetailPage | reachable | — |
| apps-center | `app-market` | `#/c/app-market` | —（replace 后生效） | redirect | replace → 对应广场路由或 `resource-market?tab=`（见 `USER_LEGACY_MARKET_PAGE_TO_TAB`） |
| developer-portal | `developer-docs` | `#/c/developer-docs` | PlaceholderView | reachable | — |
| developer-portal | `developer-tools` | `#/c/developer-tools` | PlaceholderView | reachable | — |
| developer-portal | `developer-statistics` | `#/c/developer-statistics` | DeveloperStatsPage | reachable | — |

<!-- AUTO-GENERATED A2.2:END -->

> **未包含在上表但可达的 slug**（侧栏无入口）：如 `authorized-skills`、`recent-use`、`my-grant-applications` 等，见 **A2.0** 与 `MainLayout` 内 `useEffect` replace。

> **开发者中心子页**：`api-docs` / `sdk-download` / `api-playground` / `mcp-integration` / `developer-statistics` 仅挂在用户壳侧栏；若误打开旧管理书签，`MainLayout` 会 **replace** 到 `#/c/...` 用户路径（见 `DEVELOPER_PORTAL_PAGES`）。

### A2.3 无效路由行为

| 场景 | 结果 |
|---|---|
| `#/c/{unknown}` 或旧 `#/admin|user/{unknown}`（未知 `page`） | `routeValid=false`，`replace` 到该壳默认页（见 `defaultPath` / `inferConsoleRole`） |
| 无管理视图能力却访问管理类 page | 落用户壳或默认页（与 `UserRoleContext` / `inferConsoleRole` 一致） |
| 非 `/c/:page/...` 的 `*` | `Navigate` 到 `/404`（见 `MainLayout` 路由表） |

## A3. 全量交互矩阵（L3，页面级）

> `Net=是` 表示会发起 HTTP 请求；`Net=否` 表示纯前端行为。

### A3.1 全局壳层与公共组件

| 页面/组件 | 交互控件 | Net | 触发结果 |
|---|---|---|---|
| `MainLayout` | 侧栏一级菜单点击 | 否 | 跳转对应默认 page；**手风琴模式**（展开一个自动收起其他） |
| `MainLayout` | 子菜单点击 | 否 | 跳转对应 page slug |
| `MainLayout` | admin/user 视图切换 | 否 | 切换路由根角色 |
| `MainLayout` | 顶栏 Palette 按钮 | 否 | **一键展开**外观与主题面板（无中间菜单层） |
| `MainLayout` | 退出登录 | 是 | `POST /auth/logout` 后清理状态 |
| `MainLayout` | 侧栏用户卡片弹出 | 否 | 仅"退出登录"一个选项 |
| `MainLayout` | 消息铃铛打开 | 是 | 拉取消息列表和未读数 |
| `MessagePanel` | 单条已读/全部已读 | 是 | 更新通知已读状态 |
| `AppearanceMenu` | 主题/字号/字体/动效切换、重置 | 否 | 本地状态与持久化更新 |

### A3.2 auth 与用户设置

| 页面 | 交互控件 | Net | 触发结果 |
|---|---|---|---|
| `LoginPage` | 登录提交、验证码刷新、显示密码 | 是/是/否 | 登录鉴权与 UI 切换 |
| `DeveloperOnboardingPage` | 入驻申请提交、退出登录 | 是 | 无角色用户申请成为开发者 |
| `UserProfile` | 更新资料、改密、发送短信验证码、绑定手机、加载登录历史 | 是 | 账户信息变更与历史查询 |
| `UserSettingsPage` | 通知开关、密码弹窗、绑定手机弹窗、清缓存、导出偏好 | 是/否混合 | 账户行为 + 本地行为 |

### A3.3 admin 业务页

| 页面 | 全量交互 | Net | 备注 |
|---|---|---|---|
| `ResourceCenterManagementPage` | 刷新、搜索、类型/状态筛选、分页、注册、编辑、删除、提审、下线；可切换类型时刷新/注册与类型标签同行 | 是 | 统一资源管理（替代旧 AgentList/SkillList/AppList/DatasetList） |
| `ResourceRegisterPage` | 表单填写、保存、返回 | 是 | 统一资源注册（替代旧 AgentCreate/SkillCreate 等） |
| `ResourceAuditList` | 类型筛选、状态筛选、通过/驳回/发布 | 是 | 统一资源审核 |
| `AgentDetail` | 测试、删除确认、返回 | 是 | 详情页 |
| `AgentMonitoringPage` | 关键词筛选、排序、分页 | 否/部分是 | 页面内多为本地筛选 |
| `AgentTracePage` | trace 查询、展开、选择明细 | 是 | trace 拉取 |
| `ResourceGrantManagementPage` | 资源授权列表、新增授权、撤销授权 | 是 | 资源授权管理 |
| `DeveloperApplicationListPage` | 分页、通过/驳回确认、驳回原因填写 | 是 | 开发者入驻审批 |
| `UserListPage` | 搜索、状态筛选、分页、创建、编辑、删除 | 是 | 用户管理 |
| `RoleListPage` | 搜索、分页、创建、编辑、删除、权限勾选 | 是 | 角色管理 |
| `ApiKeyListPage` | 搜索、分页、创建、复制、撤销 | 是/否混合 | 复制为本地行为 |
| `OrgStructurePage` | 重试加载、节点展开 | 是/否 | 组织树 |
| `RateLimitPage` | 创建、编辑、删除、保存、取消、筛选 | 是 | - |
| `AuditLogPage` | 搜索、行为筛选、分页、导出 | 是 | - |
| `TagManagementPage` | 分类切换、新增、批量导入、删除、展开 | 是 | - |
| `SensitiveWordPage` | 列表、新增、删除、启停切换、分页 | 是 | 敏感词管理 |
| `QuotaManagementPage` | 配额/限流 tab 切换、创建、编辑、启停 | 是 | - |
| `SystemConfigExtraPages` | 参数保存、安全设置保存、网络规则应用、ACL 编辑/发布 | 是 | 关键治理动作 |
| `MonitoringOverviewPage` | 刷新、重试 | 是 | KPI |
| `CallLogPage` | 搜索、状态筛选、分页、重试 | 是 | 调用日志 |
| `AlertMgmtPage` | 搜索、级别筛选、状态筛选、分页、重试 | 是 | 告警管理 |
| `AlertRulesPage` | 新建、编辑、删除、试运行、确认弹窗、分页 | 是 | 规则治理 |
| `PerformanceAnalysisPage` | 时间维度切换、导出、重试 | 是 | 性能分析 |
| `HealthConfigPage` | 搜索、配置编辑、新增、删除、保存/取消 | 是 | 健康检查 |
| `CircuitBreakerPage` | 配置、熔断、恢复、确认弹窗 | 是 | 熔断治理 |
| `ApiDocsPage` | 分类切换、复制、在 Playground 打开 | 否 | 文档页 |
| `SdkDownloadPage` | 下载弹窗、复制安装命令、跳文档 | 否 | 示例页 |
| `ApiPlaygroundPage` | Method 切换、URL 编辑、Header 增删、Body 编辑、发送请求 | 是（fetch） | 默认示例为 `/api/catalog/resources`；历史持久化 localStorage |
| `AnnouncementPage` | 列表、新增公告、删除公告 | 是 | 平台公告 CRUD |
| `DeveloperStatsPage` | KPI 展示、调用趋势图、热门资源、API Key 用量 | 是 | 个人 API 调用统计 |

### A3.4 user 业务页

| 页面 | 全量交互 | Net | 备注 |
|---|---|---|---|
| `ExploreHub` | 跳转市场/提交入口 | 否 | 导航型 |
| `UserWorkspaceOverview` | 数据展示、最近使用等模块 | 是/否 | 以摘要查询为主 |
| `AuthorizedSkillsPage` | 分页、刷新 | 是 | 已授权技能 |
| `UsageRecordsPage` | 「使用记录 / 最近使用」tab、类型与时间筛选、刷新 | 是/否 | 默认 tab 为最近使用；`recent-use` slug 归一本页 |
| `UsageStatsPage` | 加载统计 | 是 | 展示页 |
| `MyFavoritesPage` | tab 切换、取消收藏、使用 | 是/否混合 | 使用部分为导航 |
| `MyPublishHubPage` | 发布总览、跳转资源中心 | 否 | 入口页 |
| `MyAgentList` | 查看详情 | 是/否混合 | - |
| `MySkillList` | 查看详情 | 是/否混合 | - |
| `AgentMarket` | 搜索、分类、排序、详情弹窗、收藏 | 是/否混合 | 通过 `/catalog/resources` 加载 |
| `SkillMarket` | 搜索、分类、详情弹窗、使用弹窗调用、评论交互 | 是/否混合 | 通过 `/catalog/resources` + `/invoke` |
| `AppMarket` | 搜索、详情弹窗、打开应用、评论交互 | 否/部分是 | 通过 `/catalog/resources` 加载 |
| `DatasetMarket` | 搜索、来源筛选、详情弹窗、申请使用确认 | 是 | 通过 `/catalog/resources` 加载 |

---

## B. 第二层：后端对齐真值（实施）

## B1. 环境、网关、请求头真值

### B1.1 Base URL 与前缀

- 基础前缀：`VITE_API_BASE_URL`，默认 `/api`。
- 开发代理：`/api/* -> VITE_API_PROXY_TARGET`（默认 `http://localhost:8080`）。
- 所有业务接口走统一资源链路，旧 `/agents/**` 和 `/v1/*` 已下线。

### B1.2 头部规则

| Header | 注入策略 | 必填性（前端视角） | 适用通道 |
|---|---|---|---|
| `Authorization` | axios 拦截器自动注入 | 控制台业务基本必填 | axios |
| `X-User-Id` | 登录态存在时注入 | 多数业务必填 | axios |
| `X-Username` | 登录态存在时注入 | 可选 | axios |
| `X-Request-Id` | 每请求自动生成 | 自动 | axios |
| `X-Trace-Id` | 每请求自动注入（与 X-Request-Id 联动） | 自动 | axios |
| `X-Api-Key` | localStorage 或市场页填写后注入；无 Key 时执行向请求会被前端/网关拦截 | **强统一**：`POST /catalog/resolve`、`/invoke`、`/invoke-stream` 及 SDK 等须有效 Key | axios |
| `X-Sandbox-Token` | localStorage 读取自动注入（如有） | 沙箱调用必填 | axios |

### B1.3 通道差异

| 通道 | 典型页面/来源 | 401 刷新 | 统一错误封装 |
|---|---|---|---|
| axios | 绝大多数 `src/api/services/**` | 是 | 是 |
| fetch | `ApiPlaygroundPage` | 否 | 否 |

## B2. 权限门禁全量矩阵

### B2.1 菜单级 gate（MainLayout）

| 入口 | 前端权限码 | 可见角色 | 备注 |
|---|---|---|---|
| `user-management` | `user:manage` | `platform_admin`,`dept_admin` | 一级菜单过滤 |
| `monitoring` | `monitor:view` | `platform_admin`,`dept_admin` | 一级菜单过滤 |
| `system-config` | `system:config` | `platform_admin` | 一级菜单过滤 |
| `my-publish` | `agent:create OR skill:create` | `platform_admin`,`dept_admin`,`developer` | user 侧一级菜单过滤 |

### B2.2 子项级 gate（SUB_ITEM_PERM_MAP）

| subItem | 权限码 |
|---|---|
| `agent-audit` | `agent:audit` |
| `skill-audit` | `skill:audit` |
| `resource-grant-management` | `user:manage` |
| `developer-applications` | `user:manage` |

## B3. 全接口真值总表（全部 services）

> `在用证据` 取值 `在用(代码+页面)` / `在用(仅service)` / `预留` / `已下线(stub)`。

### B3.1 认证域

| Service#method | Method | Path | 在用证据 | 触发场景 |
|---|---|---|---|---|
| `authService.getLegalNotices` | GET | `/auth/legal-notices` | 在用(代码+页面) | 登录页隐私条款 |
| `authService.getCaptcha` | GET | `/captcha/generate` | 在用(代码+页面) | 登录页加载/刷新验证码 |
| `authService.verifyCaptcha` | POST | `/captcha/verify` | 预留接口 | 登录流程未调用；后端验证码校验可选 |
| `authService.login` | POST | `/auth/login` | 在用(代码+页面) | 登录提交 |
| `authService.register` | POST | `/auth/register` | 预留接口 | 注册功能尚未开放 |
| `authService.logout` | POST | `/auth/logout` | 在用(代码+页面) | 顶栏退出登录 |
| `authService.getCurrentUser` | GET | `/auth/me` | 在用(代码+页面) | App 启动鉴权恢复（每次有 token 时调用） |
| `authService.refreshToken` | POST | `/auth/refresh` | 内部使用 | 由 `lib/http.ts` 拦截器在 401 时自动调用 |
| `authService.changePassword` | POST | `/auth/change-password` | 在用(代码+页面) | 个人资料改密 |
| `authService.sendSmsCode` | POST | `/auth/send-sms` | 在用(代码+页面) | 绑定手机发送验证码 |
| `authService.bindPhone` | POST | `/auth/bind-phone` | 在用(代码+页面) | 绑定手机提交 |
| `authService.updateProfile` | PUT | `/auth/profile` | 在用(代码+页面) | 个人资料保存 |
| `authService.getLoginHistory` | GET | `/auth/login-history` | 在用(代码+页面) | 个人资料页登录历史 |
| `authService.getAccountInsights` | GET | `/auth/account-insights` | 在用(代码+页面) | 个人资料页安全态势 |
| `authService.listSessions` | GET | `/auth/sessions` | 在用(代码+页面) | 个人资料页登录设备与会话 |
| `authService.revokeSession` | DELETE | `/auth/sessions/{sessionId}` | 在用(代码+页面) | 个人资料页强制注销会话 |

### B3.2 统一资源目录与调用

| Service#method | Method | Path | 在用证据 | 触发场景 |
|---|---|---|---|---|
| `resourceCatalogService.list` | GET | `/catalog/resources` | 在用(代码+页面) | 市场页/管理页资源列表 |
| `resourceCatalogService.getById` | GET | `/catalog/resources/{type}/{id}` | 在用(代码+页面) | 资源详情 |
| `resourceCatalogService.resolve` | POST | `/catalog/resolve` | 在用(代码+页面) | 调用前解析 |
| `invokeService.invoke` | POST | `/invoke` | 在用(代码+页面) | 标准化调用 |

### B3.3 资源注册中心

| Service#method | Method | Path | 在用证据 | 触发场景 |
|---|---|---|---|---|
| `resourceCenterService.listMine` | GET | `/resource-center/resources/mine` | 在用(代码+页面) | 我的资源列表 |
| `resourceCenterService.getById` | GET | `/resource-center/resources/{id}` | 在用(代码+页面) | 资源详情 |
| `resourceCenterService.create` | POST | `/resource-center/resources` | 在用(代码+页面) | 资源注册 |
| `resourceCenterService.update` | PUT | `/resource-center/resources/{id}` | 在用(代码+页面) | 资源编辑 |
| `resourceCenterService.remove` | DELETE | `/resource-center/resources/{id}` | 在用(代码+页面) | 资源删除 |
| `resourceCenterService.submit` | POST | `/resource-center/resources/{id}/submit` | 在用(代码+页面) | 提审 |
| `resourceCenterService.deprecate` | POST | `/resource-center/resources/{id}/deprecate` | 在用(代码+页面) | 下线 |
| `resourceCenterService.createVersion` | POST | `/resource-center/resources/{id}/versions` | 在用(代码+页面) | 创建版本 |
| `resourceCenterService.switchVersion` | POST | `/resource-center/resources/{id}/versions/{v}/switch` | 在用(代码+页面) | 切换版本 |
| `resourceCenterService.listVersions` | GET | `/resource-center/resources/{id}/versions` | 在用(代码+页面) | 版本列表 |

### B3.4 资源授权（已下线）

> **废弃说明**：独立 `/resource-grants` CRUD 与 grant 工单已下线。资源可见性/调用策略现由资源 `access_policy` 与网关校验共同决定。详见后端 `docs/frontend-alignment-handbook.md` §2.9。

| Service#method | Method | Path | 在用证据 | 触发场景 |
|---|---|---|---|---|
| ~~`resourceGrantService.create`~~ | POST | ~~`/resource-grants`~~ | **已下线** | ~~授予授权~~ |
| ~~`resourceGrantService.list`~~ | GET | ~~`/resource-grants`~~ | **已下线** | ~~授权列表~~ |
| ~~`resourceGrantService.revoke`~~ | DELETE | ~~`/resource-grants/{grantId}`~~ | **已下线** | ~~撤销授权~~ |

**替代方案**：使用资源的 `access_policy` 字段配置访问策略，通过 `/catalog/resources` 和 `/resource-center/resources` 管理。

### B3.5 SDK / 沙箱

| Service#method | Method | Path | 在用证据 | 触发场景 |
|---|---|---|---|---|
| `sdkService.listResources` | GET | `/sdk/v1/resources` | 在用(代码+页面) | SDK 资源列表 |
| `sdkService.getResource` | GET | `/sdk/v1/resources/{type}/{id}` | 在用(代码+页面) | SDK 资源详情 |
| `sdkService.resolve` | POST | `/sdk/v1/resolve` | 在用(代码+页面) | SDK 解析 |
| `sdkService.invoke` | POST | `/sdk/v1/invoke` | 在用(代码+页面) | SDK 调用 |
| `sandboxService.createSession` | POST | `/sandbox/sessions` | 在用(代码+页面) | 创建沙箱会话 |
| `sandboxService.listMySessions` | GET | `/sandbox/sessions/mine` | 在用(代码+页面) | 我的沙箱会话 |
| `sandboxService.invoke` | POST | `/sandbox/invoke` | 在用(代码+页面) | 沙箱调用 |

### B3.6 资源审核

| Service#method | Method | Path | 在用证据 | 触发场景 |
|---|---|---|---|---|
| `resourceAuditService.list` | GET | `/audit/resources` | 在用(代码+页面) | 统一资源审核列表 |
| `resourceAuditService.approve` | POST | `/audit/resources/{id}/approve` | 在用(代码+页面) | 审核通过 |
| `resourceAuditService.reject` | POST | `/audit/resources/{id}/reject` | 在用(代码+页面) | 审核驳回 |
| `auditService.listPendingAgents` | GET | `/audit/agents` | 在用(代码+页面) | Agent 过渡审核队列 |
| `auditService.listPendingSkills` | GET | `/audit/skills` | 在用(代码+页面) | Skill 过渡审核队列 |
| `auditService.approve` | POST | `/audit/{type}s/{id}/approve` | 在用(代码+页面) | 过渡审核通过 |
| `auditService.reject` | POST | `/audit/{type}s/{id}/reject` | 在用(代码+页面) | 过渡审核驳回 |

### B3.7 开发者入驻

| Service#method | Method | Path | 在用证据 | 触发场景 |
|---|---|---|---|---|
| `developerApplicationService.create` | POST | `/developer/applications` | 在用(代码+页面) | 用户提交入驻申请 |
| `developerApplicationService.getMine` | GET | `/developer/applications/me` | 在用(代码+页面) | 查询我的申请 |
| `developerApplicationService.list` | GET | `/developer/applications` | 在用(代码+页面) | 管理员查询全部申请 |
| `developerApplicationService.approve` | POST | `/developer/applications/{id}/approve` | 在用(代码+页面) | 审批通过 |
| `developerApplicationService.reject` | POST | `/developer/applications/{id}/reject` | 在用(代码+页面) | 审批驳回 |

### B3.8 通知与评价

| Service#method | Method | Path | 在用证据 | 触发场景 |
|---|---|---|---|---|
| `notificationService.list` | GET | `/notifications` | 在用(代码+页面) | 消息面板打开/刷新 |
| `notificationService.getUnreadCount` | GET | `/notifications/unread-count` | 在用(代码+页面) | 顶栏未读数更新 |
| `notificationService.markRead` | POST | `/notifications/{id}/read` | 在用(代码+页面) | 消息标记已读 |
| `notificationService.markAllRead` | POST | `/notifications/read-all` | 在用(代码+页面) | 全部已读 |
| `reviewService.list` | GET | `/reviews` | 在用(代码+页面) | 市场评价列表 |
| `reviewService.summary` | GET | `/reviews/summary` | 在用(代码+页面) | 评价汇总 |
| `reviewService.create` | POST | `/reviews` | 在用(代码+页面) | 提交评价 |
| `reviewService.toggleHelpful` | POST | `/reviews/{id}/helpful` | 在用(代码+页面) | 评价点赞 |

### B3.9 用户管理

| Service#method | Method | Path | 在用证据 | 触发场景 |
|---|---|---|---|---|
| `userMgmtService.listUsers` | GET | `/user-mgmt/users` | 在用(代码+页面) | 用户列表 |
| `userMgmtService.getUserById` | GET | `/user-mgmt/users/{id}` | 预留接口 | 单用户详情查询；列表页暂未使用 |
| `userMgmtService.createUser` | POST | `/user-mgmt/users` | 在用(代码+页面) | 用户创建 |
| `userMgmtService.updateUser` | PUT | `/user-mgmt/users/{id}` | 在用(代码+页面) | 用户编辑 |
| `userMgmtService.deleteUser` | DELETE | `/user-mgmt/users/{id}` | 在用(代码+页面) | 用户删除 |
| `userMgmtService.getUserOrg` | GET | `/user-mgmt/users/{id}/org` | 预留接口 | 查询用户组织；组织架构页暂未使用 |
| `userMgmtService.bindUserOrg` | PUT | `/user-mgmt/users/{id}/org` | 预留接口 | 绑定用户组织；组织架构页暂未使用 |
| `userMgmtService.unbindUserOrg` | DELETE | `/user-mgmt/users/{id}/org` | 预留接口 | 解绑用户组织；组织架构页暂未使用 |
| `userMgmtService.getUserRoles` | GET | `/user-mgmt/users/{id}/roles` | 预留接口 | 查询用户角色；角色管理页暂未使用 |
| `userMgmtService.bindUserRoles` | POST | `/user-mgmt/users/{id}/roles` | 预留接口 | 绑定角色；角色管理页暂未使用 |
| `userMgmtService.replaceUserRoles` | PUT | `/user-mgmt/users/{id}/roles` | 预留接口 | 替换角色；角色管理页暂未使用 |
| `userMgmtService.removeUserRole` | DELETE | `/user-mgmt/users/{id}/roles/{roleId}` | 预留接口 | 移除角色；角色管理页暂未使用 |
| `userMgmtService.listRoles` | GET | `/user-mgmt/roles` | 在用(代码+页面) | 角色列表 |
| `userMgmtService.createRole` | POST | `/user-mgmt/roles` | 在用(代码+页面) | 角色创建 |
| `userMgmtService.updateRole` | PUT | `/user-mgmt/roles/{id}` | 在用(代码+页面) | 角色编辑 |
| `userMgmtService.deleteRole` | DELETE | `/user-mgmt/roles/{id}` | 在用(代码+页面) | 角色删除 |
| `userMgmtService.listApiKeys` | GET | `/user-mgmt/api-keys` | 在用(代码+页面) | API Key 列表 |
| `userMgmtService.createApiKey` | POST | `/user-mgmt/api-keys` | 在用(代码+页面) | API Key 创建 |
| `userMgmtService.revokeApiKey` | PATCH | `/user-mgmt/api-keys/{id}/revoke` | 在用(代码+页面) | API Key 撤销 |
| `userMgmtService.getOrgTree` | GET | `/user-mgmt/org-tree` | 在用(代码+页面) | 组织树加载 |
| `userMgmtService.getOrgById` | GET | `/user-mgmt/orgs/{id}` | 预留接口 | 单组织节点查询；组织架构页暂未使用 |
| `userMgmtService.createOrg` | POST | `/user-mgmt/orgs` | 在用(代码+页面) | 组织架构页新增部门 |
| `userMgmtService.updateOrg` | PUT | `/user-mgmt/orgs/{id}` | 在用(代码+页面) | 组织架构页编辑部门名称 |
| `userMgmtService.deleteOrg` | DELETE | `/user-mgmt/orgs/{id}` | 在用(代码+页面) | 组织架构页删除部门 |

### B3.10 监控治理

| Service#method | Method | Path | 在用证据 | 触发场景 |
|---|---|---|---|---|
| `monitoringService.getKpis` | GET | `/monitoring/kpis` | 在用(代码+页面) | 监控总览 |
| `monitoringService.listCallLogs` | GET | `/monitoring/call-logs` | 在用(代码+页面) | 调用日志 |
| `monitoringService.listAlerts` | GET | `/monitoring/alerts` | 在用(代码+页面) | 告警页 |
| `monitoringService.listAlertRules` | GET | `/monitoring/alert-rules` | 在用(代码+页面) | 告警规则列表 |
| `monitoringService.getAlertRuleById` | GET | `/monitoring/alert-rules/{id}` | 预留接口 | 单条规则查询；编辑时使用列表数据 |
| `monitoringService.createAlertRule` | POST | `/monitoring/alert-rules` | 在用(代码+页面) | 规则创建 |
| `monitoringService.updateAlertRule` | PUT | `/monitoring/alert-rules/{id}` | 在用(代码+页面) | 规则编辑 |
| `monitoringService.deleteAlertRule` | DELETE | `/monitoring/alert-rules/{id}` | 在用(代码+页面) | 规则删除 |
| `monitoringService.dryRunAlertRule` | POST | `/monitoring/alert-rules/{id}/dry-run` | 在用(代码+页面) | 告警规则页「试跑」按钮 |
| `monitoringService.listTraces` | GET | `/monitoring/traces` | 在用(代码+页面) | Trace 列表 |
| `monitoringService.getPerformanceMetrics` | GET | `/monitoring/performance` | 在用(代码+页面) | 性能分析 |

### B3.11 健康检查与熔断

| Service#method | Method | Path | 在用证据 | 触发场景 |
|---|---|---|---|---|
| `healthService.listHealthConfigs` | GET | `/health/configs` | 在用(代码+页面) | 健康配置列表 |
| `healthService.createHealthConfig` | POST | `/health/configs` | 在用(代码+页面) | 健康检查页「新增检查」按钮 |
| `healthService.updateHealthConfig` | PUT | `/health/configs/{id}` | 在用(代码+页面) | 健康配置保存 |
| `healthService.deleteHealthConfig` | DELETE | `/health/configs/{id}` | 预留接口 | 删除健康配置；页面暂未提供删除入口 |
| `healthService.getSecurityConfig` | GET | `/health/security-config` | 预留接口 | 安全配置；页面暂未使用 |
| `healthService.listCircuitBreakers` | GET | `/health/circuit-breakers` | 在用(代码+页面) | 熔断列表 |
| `healthService.updateCircuitBreaker` | PUT | `/health/circuit-breakers/{id}` | 在用(代码+页面) | 熔断配置 |
| `healthService.manualBreak` | POST | `/health/circuit-breakers/{id}/break` | 在用(代码+页面) | 手动熔断 |
| `healthService.manualRecover` | POST | `/health/circuit-breakers/{id}/recover` | 在用(代码+页面) | 手动恢复 |

### B3.12 看板

| Service#method | Method | Path | 在用证据 | 触发场景 |
|---|---|---|---|---|
| `dashboardService.getAdminOverview` | GET | `/dashboard/admin-overview` | 在用(代码+页面) | 管理概览页（Overview.tsx） |
| `dashboardService.getUserWorkspace` | GET | `/dashboard/user-workspace` | 在用(代码+页面) | 用户工作台摘要 |
| `dashboardService.getMyConsole` | GET | `/dashboard/my-console` | 在用(代码+页面) | BFF 聚合（回退 user-workspace） |
| `dashboardService.getHealthSummary` | GET | `/dashboard/health-summary` | 在用(代码+页面) | 管理概览页健康摘要卡片 |
| `dashboardService.getUsageStats` | GET | `/dashboard/usage-stats` | 在用(代码+页面) | 使用统计页 |
| `dashboardService.getDataReports` | GET | `/dashboard/data-reports` | 在用(代码+页面) | 数据报表页 |
| `dashboardService.getExploreHub` | GET | `/dashboard/explore-hub` | 待后端实现 | 探索发现聚合（B7.1） |
| `dashboardService.getAdminRealtime` | GET | `/dashboard/admin-realtime` | 在用(代码+页面) | 管理概览页实时数据 |
| `dashboardService.getUserDashboard` | GET | `/dashboard/user-dashboard` | 待后端实现 | 用户个人面板（B7.3） |

### B3.13 系统配置

| Service#method | Method | Path | 在用证据 | 触发场景 |
|---|---|---|---|---|
| `systemConfigService.listRateLimits` | GET | `/system-config/rate-limits` | 在用(代码+页面) | 限流规则列表 |
| `systemConfigService.getRateLimitById` | GET | `/system-config/rate-limits/{id}` | 预留接口 | 单条查询；编辑时使用列表数据 |
| `systemConfigService.createRateLimit` | POST | `/system-config/rate-limits` | 在用(代码+页面) | 创建 |
| `systemConfigService.updateRateLimit` | PUT | `/system-config/rate-limits/{id}` | 在用(代码+页面) | 更新 |
| `systemConfigService.deleteRateLimit` | DELETE | `/system-config/rate-limits/{id}` | 在用(代码+页面) | 删除 |
| `systemConfigService.listAuditLogs` | GET | `/system-config/audit-logs` | 在用(代码+页面) | 审计日志 |
| `systemConfigService.getParams` | GET | `/system-config/params` | 在用(代码+页面) | 系统参数 |
| `systemConfigService.updateParams` | PUT | `/system-config/params` | 在用(代码+页面) | 保存参数 |
| `systemConfigService.getSecurity` | GET | `/system-config/security` | 在用(代码+页面) | 安全设置 |
| `systemConfigService.updateSecurity` | PUT | `/system-config/security` | 在用(代码+页面) | 保存安全 |
| `systemConfigService.applyNetworkWhitelist` | POST | `/system-config/network/apply` | 在用(代码+页面) | 网络白名单 |
| `systemConfigService.publishAcl` | POST | `/system-config/acl/publish` | 在用(代码+页面) | ACL 发布 |

### B3.14 配额与运营限流

| Service#method | Method | Path | 在用证据 | 触发场景 |
|---|---|---|---|---|
| `quotaService.listQuotas` | GET | `/quotas` | 在用(代码+页面) | 配额列表 |
| `quotaService.getQuota` | GET | `/quotas/{id}` | 预留接口 | 单条查询；编辑时使用列表数据 |
| `quotaService.createQuota` | POST | `/quotas` | 在用(代码+页面) | 创建 |
| `quotaService.updateQuota` | PUT | `/quotas` | 预留接口 | 更新；页面暂未使用 |
| `quotaService.deleteQuota` | DELETE | `/quotas/{id}` | 预留接口 | 删除；页面暂未使用 |
| `quotaService.listRateLimits` | GET | `/rate-limits` | 在用(代码+页面) | 限流列表 |
| `quotaService.getRateLimit` | GET | `/rate-limits/{id}` | 预留接口 | 单条查询；编辑时使用列表数据 |
| `quotaService.createRateLimit` | POST | `/rate-limits` | 在用(代码+页面) | 创建 |
| `quotaService.deleteRateLimit` | DELETE | `/rate-limits/{id}` | 预留接口 | 删除；页面暂未使用 |
| `quotaService.toggleRateLimit` | PATCH | `/rate-limits/{id}` | 在用(代码+页面) | 启停 |

### B3.15 标签与内容治理

| Service#method | Method | Path | 在用证据 | 触发场景 |
|---|---|---|---|---|
| `tagService.list` | GET | `/tags` | 在用(代码+页面) | 标签列表 |
| `tagService.create` | POST | `/tags` | 在用(代码+页面) | 标签新增 |
| `tagService.remove` | DELETE | `/tags/{id}` | 在用(代码+页面) | 标签删除 |
| `tagService.batchCreate` | POST | `/tags/batch` | 在用(代码+页面) | 标签批量新增 |
| `sensitiveWordService.list` | GET | `/sensitive-words` | 在用(代码+页面) | 敏感词列表 |
| `sensitiveWordService.categories` | GET | `/sensitive-words/categories` | 在用(代码+页面) | 敏感词页分类筛选下拉 |
| `sensitiveWordService.count` | GET | `/sensitive-words/count` | 预留接口 | 计数；页面暂未使用 |
| `sensitiveWordService.create` | POST | `/sensitive-words` | 在用(代码+页面) | 新增 |
| `sensitiveWordService.batchCreate` | POST | `/sensitive-words/batch` | 在用(代码+页面) | 敏感词页「JSON 批量新增」 |
| `sensitiveWordService.update` | PUT | `/sensitive-words/{id}` | 在用(代码+页面) | 更新 |
| `sensitiveWordService.remove` | DELETE | `/sensitive-words/{id}` | 在用(代码+页面) | 删除 |
| `sensitiveWordService.batchRemove` | POST | `/sensitive-words/batch-delete` | 在用(代码+页面) | 敏感词页批量删除 |
| `sensitiveWordService.batchSetEnabled` | PUT | `/sensitive-words/batch` | 在用(代码+页面) | 敏感词页批量启用/禁用 |
| `sensitiveWordService.check` | POST | `/sensitive-words/check` | 预留接口 | 检测；页面暂未使用 |
| `sensitiveWordService.import` | POST | `/sensitive-words/import` | 在用(代码+页面) | 敏感词页文件导入 |
| `sensitiveWordService.importTxt` | POST | `/sensitive-words/import-txt` | 在用(代码+页面) | txt 文件导入 |
| `fileUploadService.upload` | POST | `/files/upload` | 在用(代码+页面) | 个人资料页头像上传 |

### B3.16 用户活动

| Service#method | Method | Path | 在用证据 | 触发场景 |
|---|---|---|---|---|
| `userActivityService.getUsageRecords` | GET | `/user/usage-records` | 在用(代码+页面) | 使用记录 |
| `userActivityService.getFavorites` | GET | `/user/favorites` | 在用(代码+页面) | 收藏列表 |
| `userActivityService.addFavorite` | POST | `/user/favorites` | 在用(代码+页面) | 加入收藏 |
| `userActivityService.removeFavorite` | DELETE | `/user/favorites/{id}` | 在用(代码+页面) | 取消收藏 |
| `userActivityService.getUsageStats` | GET | `/user/usage-stats` | 在用(代码+页面) | 用量统计 |
| `userActivityService.getMyAgents` | GET | `/user/my-agents` | 在用(代码+页面) | 我的 Agent |
| `userActivityService.getMySkills` | GET | `/user/my-skills` | 在用(代码+页面) | 我的 Skill |
| `userActivityService.getAuthorizedSkills` | GET | `/user/authorized-skills` | 在用(代码+页面) | 已授权技能 |
| `userActivityService.getRecentUse` | GET | `/user/recent-use` | 在用(代码+页面) | `UsageRecordsPage`「最近使用」tab |

### B3.17 用户设置

| Service#method | Method | Path | 在用证据 | 触发场景 |
|---|---|---|---|---|
| `userSettingsService.getWorkspace` | GET | `/user-settings/workspace` | 在用(代码+页面) | 偏好设置页加载通知偏好 |
| `userSettingsService.updateWorkspace` | PUT | `/user-settings/workspace` | 在用(代码+页面) | 偏好设置页保存通知偏好 |
| `userSettingsService.listApiKeys` | GET | `/user-settings/api-keys` | 在用(代码+页面) | 个人 API Key 页列表 |
| `userSettingsService.createApiKey` | POST | `/user-settings/api-keys` | 在用(代码+页面) | 个人 API Key 页新建 |
| `userSettingsService.deleteApiKey` | DELETE | `/user-settings/api-keys/{id}` | 在用(代码+页面) | 个人 API Key 页撤销 |
| `userSettingsService.revokeApiKey` | POST | `/user-settings/api-keys/{id}/revoke` | 在用(代码+页面) | 个人 API Key 页撤销（需密码验证） |
| `userSettingsService.rotateApiKey` | POST | `/user-settings/api-keys/{id}/rotate` | 在用(代码+页面) | 个人 API Key 页轮换密钥 |
| `userSettingsService.postInvokeEligibility` | POST | `/user-settings/api-keys/{id}/invoke-eligibility` | 预留接口 | 调用预判；页面暂未使用 |
| `userSettingsService.listResourceGrantsForApiKey` | GET | `/user-settings/api-keys/{apiKeyId}/resource-grants` | 已下线 | 恒返回空列表 |
| `userSettingsService.getStats` | GET | `/user-settings/stats` | 预留接口 | 统计；页面暂未使用 |

### B3.18 已下线（stub/deprecatedWriteError）

| Service | 旧路径 | 现状 |
|---|---|---|
| `agentService` | `/agents/**` | 读操作走 `resourceCatalogService`；写操作抛 410 |
| `skillService` | `/v1/skills/**`、`/v1/mcp-servers/**` | 读操作走 `resourceCatalogService`；写操作抛 410；invoke 走 `invokeService` |
| `smartAppService` | `/v1/apps/**` | 读操作走 `resourceCatalogService`；写操作抛 410 |
| `datasetService` | `/v1/datasets/**` | 读操作走 `resourceCatalogService`；写操作抛 410 |
| `providerService` | `/v1/providers/**` | 读操作走 `resourceCatalogService`；写操作抛 410 |
| `categoryService` | `/v1/categories/**` | 读操作走 `tagService`；写操作抛 410 |
| `versionService` | `/agents/{id}/versions`、`/versions/{id}/*` | 全部返回空数组或抛 410 |

## B4. 状态机与流程约束

### B4.1 统一资源状态（resource-center + audit）

`draft -> pending_review -> published`

异常分支：`rejected`（驳回）、`deprecated`（下线）

| 接口 | 语义 | 状态流转 |
|---|---|---|
| `POST /resource-center/resources/{id}/submit` | 提审 | `draft/rejected/deprecated -> pending_review` |
| `POST /audit/resources/{id}/approve` | 审核通过 | `pending_review -> published` |
| `POST /audit/resources/{id}/reject` | 审核驳回 | `pending_review -> rejected` |
| `POST /resource-center/resources/{id}/deprecate` | 下线 | `published -> deprecated` |

### B4.2 告警与熔断

- AlertRecord：`firing/resolved/silenced`
- CircuitBreaker：`CLOSED/OPEN/HALF_OPEN`

### B4.3 开发者入驻

- `pending -> approved`（通过）或 `pending -> rejected`（驳回）
- 通过后用户获得 `developer` 角色

## B5. 响应与错误映射

### B5.1 统一响应体

```json
{
  "code": 0,
  "message": "ok",
  "data": {}
}
```

### B5.2 分页响应

`data` 为 `{ list, total, page, pageSize }`，附带响应头 `X-Total-Count`。

### B5.3 错误码到前端动作

| 条件 | 前端行为 |
|---|---|
| `code != 0` | 抛 `ApiException` |
| HTTP 200 + `code === 1002` | 调用 `onLogout()` 跳转登录 |
| HTTP 401 | 尝试 refresh token，失败后登出 |
| HTTP 403 或 `code === 1003` | 提示权限不足 |
| HTTP 400 或 `code === 1001` | 显示后端 message |
| HTTP 404 或 `code === 1004` | 提示资源不存在 |
| HTTP 410 + `code === 1004` | 提示接口已下线 |
| HTTP 429 或 `code === 3001` | 频率限制提示 |
| `code === 3002-3005` | 服务繁忙提示 |
| HTTP 5xx 或 `code === 5001` | 服务器错误提示 |
| 网络异常 | 网络异常提示 |

## B6. 废弃/预留清单

| 能力 | 分类 | 现状 |
|---|---|---|
| `/auth/register` | 预留接口 | 注册功能尚未开放 |
| `/captcha/verify` | 预留接口 | 登录流程未调用；后端验证码校验可选 |
| `sensitiveWordService.count/check` | 预留接口 | 页面暂未使用 |
| `userMgmtService` 用户组织/角色绑定相关 | 预留接口 | 组织架构页/角色管理页暂未使用 |
| `healthService.deleteHealthConfig/getSecurityConfig` | 预留接口 | 页面暂未使用 |
| `quotaService.updateQuota/deleteQuota/deleteRateLimit` | 预留接口 | 页面暂未使用 |
| `userSettingsService.getStats` | 预留接口 | 页面暂未使用 |

**以下在最新改造中已接入页面（不再属于预留）：**

| 能力 | 接入页面 | 接入方式 |
|---|---|---|
| `/user-settings/*` | UserSettingsPage | 通知偏好读取/保存 |
| `userSettingsService.listApiKeys/createApiKey/deleteApiKey` | UserPersonalApiKeysPage | 个人 API Key 管理 |
| `userMgmtService` 组织 CRUD | OrgStructurePage | 新建/编辑/删除组织节点 |
| `monitoringService.dryRunAlertRule` | AlertRulesPage | "试跑"按钮调用 API |
| `reviewService.create/toggleHelpful` | SkillMarket / AppMarket | 评价提交和点赞 |
| `resourceCenterService.withdraw` | MyAgentList / MySkillList | 撤回审核 |
| `resourceGrantService.create` | DatasetMarket | 替代旧 applyAccess |
| `fileUploadService.upload` | UserProfile | 头像上传 |
| `healthService.createHealthConfig` | HealthConfigPage | 新增健康检查配置 |
| `dashboardService.getAdminOverview/getHealthSummary` | Overview | 管理概览页 |
| `sensitiveWordService.categories/batchCreate` | SensitiveWordPage | 分类筛选与批量新增 |

**已标记 @deprecated 的死代码文件（19 个，已从 tsconfig 排除）：**

AgentList/AgentCreate/AgentAuditList/AgentVersionPage、SkillList/SkillCreate/SkillDetail/SkillAuditList、AppList/AppCreate/AppDetail、DatasetList/DatasetCreate/DatasetDetail、ProviderList/ProviderCreate、CategoryManagement、SubmitAgent/SubmitSkill

---

## B7. 待后端实现接口清单（前端已定义签名，等待后端实现）

> 以下接口前端 service 层已定义方法签名和 DTO 类型，但后端尚未实现。前端调用时会返回 404 或空数据，属于预期行为。后端实现后前端无需改动即可正常工作。

### 7.1 探索发现聚合

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/dashboard/explore-hub` | 返回 `ExploreHubData`：平台统计、热门资源、最新发布、个性化推荐、平台公告、贡献者排行 |

**响应体 `ExploreHubData`：**
- `platformStats`：`totalAgents/totalSkills/totalApps/totalDatasets/totalUsers/totalCallsToday`
- `trendingResources`：`ExploreResourceItem[]`（按调用量排序 top 10）
- `recentPublished`：`ExploreResourceItem[]`（最新发布 top 10）
- `recommendedForUser`：`ExploreResourceItem[]`（个性化推荐 top 6）
- `announcements`：`AnnouncementItem[]`（平台公告）
- `topContributors`：`ContributorItem[]`（贡献者排行 top 5）

### 7.2 管理员实时看板

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/dashboard/admin-realtime` | 返回 `AdminRealtimeData`：实时 KPI、24h 调用趋势、注册趋势、用户增长、系统健康 |

**响应体 `AdminRealtimeData`：**
- `todayCalls/todayErrors/avgLatencyMs/activeUsers`
- `callTrend`：按小时分桶的调用量（24 条）
- `resourceTrend`：按天的资源注册数（7d）
- `userGrowth`：按天的用户增长（30d）
- `pendingAudits/activeAlerts`
- `topResourcesByCall`：热门资源排行
- `systemHealth`：各组件健康状态

### 7.3 用户个人面板

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/dashboard/user-dashboard` | 返回 `UserDashboardData`：配额用量、资源状态、最近活动、未读通知数 |

**响应体 `UserDashboardData`：**
- `quotaUsage`：`dailyLimit/dailyUsed/monthlyLimit/monthlyUsed`
- `myResources`：`draft/pendingReview/published/total`
- `recentActivity`：最近操作列表（type + resourceName + timestamp）
- `unreadNotifications`

### 7.4 资源统计

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/catalog/resources/{type}/{id}/stats` | 返回 `ResourceStatsVO`：调用量、成功率、评分、收藏数、调用趋势、相关推荐 |

### 7.5 目录增强

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/catalog/resources/trending` | query: `resourceType?, limit?`；返回 `ExploreResourceItem[]` 热门排行 |
| GET | `/catalog/resources/search-suggestions` | query: `q`；返回 `SearchSuggestion[]` 搜索自动完成 |

扩展 `GET /catalog/resources` 查询参数：新增 `sortBy`（callCount/rating/publishedAt/name）、`sortOrder`（asc/desc）、`categoryId`、`tags[]`。

### 7.6 资源撤回

| 方法 | 路径 | 说明 |
|---|---|---|
| POST | `/resource-center/resources/{id}/withdraw` | 状态 `pending_review -> draft`，用于撤回审核 |

### 7.7 标签更新

| 方法 | 路径 | 说明 |
|---|---|---|
| PUT | `/tags/{id}` | body: `{ name?, category? }`；更新标签属性 |

### 7.8 平台公告管理

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/system-config/announcements` | query: `page?, pageSize?`；公告列表 |
| POST | `/system-config/announcements` | body: `AnnouncementCreateRequest`；发布公告 |
| PUT | `/system-config/announcements/{id}` | 编辑公告 |
| DELETE | `/system-config/announcements/{id}` | 删除公告 |

**请求体 `AnnouncementCreateRequest`：**
- `title*`、`summary*`、`content?`、`type`（feature/maintenance/update/notice）、`pinned?`

### 7.9 开发者统计

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/developer/my-statistics` | 返回 `DeveloperStatistics`：个人 API 调用统计 |

**响应体 `DeveloperStatistics`：**
- `totalCalls/todayCalls/errorRate/avgLatencyMs`
- `callsByDay`：按天的调用量（7d）
- `topResources`：个人热门资源
- `apiKeyUsage`：各 API Key 调用情况

### 7.10 活跃会话管理

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/auth/sessions` | 返回 `SessionItem[]`：当前用户活跃会话列表 |
| DELETE | `/auth/sessions/{sessionId}` | 踢下线指定会话 |

**响应体 `SessionItem`：**
- `id/device/os/browser/ip/location/loginAt/lastActiveAt/current`

### 7.11 数据报表扩展

扩展 `GET /dashboard/data-reports` 查询参数：新增 `startDate`、`endDate` 支持自定义日期范围。

---

## C. 维护说明

- 本文档用于"全项目事实对齐 + 后端实施"，不是 PRD。
- 触发更新文件范围：`src/layouts/MainLayout.tsx`、`src/constants/consoleRoutes.ts`、`src/constants/navigation.ts`、`src/lib/http.ts`、`src/api/services/**`、`src/views/**`。
- 文档与代码冲突时，以代码为准，并在 24 小时内修正文档。
- B7 章节为待后端实现的接口清单。后端实现某个接口后，应将对应条目从 B7 移到对应的 B3.x 章节，并标记为"在用"。
