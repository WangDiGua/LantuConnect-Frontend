# 路由与菜单（代码真值）

> 基线源码：`src/constants/consoleRoutes.ts`、`src/constants/navigation.ts`、`src/layouts/MainLayout.tsx`、`src/App.tsx`。  
> 若其它文档与本篇冲突，**以本篇 + 上述源码为准**。

## 路由形态

- 应用使用 **`HashRouter`**（[`src/App.tsx`](../../src/App.tsx)）：浏览器地址栏表现为 `.../index.html#/admin/dashboard` 或 `.../#/user/hub`。
- 控制台路径模式：**`#/:role/:page`** 或 **`#/:role/:page/:id`**，其中 `role` 仅 **`admin`** | **`user`**（见 `parseRoute`、`buildPath`）。
- 默认落地页：`admin` → `#/admin/dashboard`，`user` → `#/user/hub`（`defaultPath`）。

## 角色与控制台

- URL 中的 `role` 决定管理端壳层 vs 用户端壳层；平台角色（如 `platform_admin`）与控制台 `admin` 的映射见 `UserRoleContext` / `canAccessAdminView`，不在此展开。
- **`/admin` 下访问开发者中心子页**（`api-docs`、`sdk-download`、`api-playground`、`developer-statistics`）会被 **重定向到 `/user/...`** 同路径（`DEVELOPER_PORTAL_PAGES`）。

## 已废弃路由

> **重要提示**：以下路由 slug 已废弃，仅作为书签/外链兼容保留。访问时会自动重定向到新路径。

### 废弃路由重定向映射表

#### 1. 旧列表页 → 资源审核页

| 废弃 slug | 重定向目标 | 说明 |
|-----------|------------|------|
| `agent-list` | `resource-audit?type=agent` | 智能体列表 → 智能体审核 |
| `skill-list` | `resource-audit?type=skill` | 技能列表 → 技能审核 |
| `mcp-server-list` | `resource-audit?type=mcp` | MCP服务列表 → MCP审核 |
| `app-list` | `resource-audit?type=app` | 应用列表 → 应用审核 |
| `dataset-list` | `resource-audit?type=dataset` | 数据集列表 → 数据集审核 |

#### 2. 旧审核子路由 → 统一资源审核

| 废弃 slug | 默认 type | 说明 |
|-----------|-----------|------|
| `agent-audit` | `agent` | 智能体审核 → 统一审核（智能体类型） |
| `skill-audit` | `skill` | 技能审核 → 统一审核（技能类型） |
| `mcp-audit` | `mcp` | MCP审核 → 统一审核（MCP类型） |
| `app-audit` | `app` | 应用审核 → 统一审核（应用类型） |
| `dataset-audit` | `dataset` | 数据集审核 → 统一审核（数据集类型） |

#### 3. 统一资源目录迁移

| 废弃 slug | 重定向目标 | 重定向条件 |
|-----------|------------|------------|
| `resource-catalog` | `resource-audit?type=agent` | 仅管理端（`admin` 角色） |

**`resource-catalog` 重定向逻辑说明**：
- **触发条件**：用户角色为 `admin` 且访问 `#/c/resource-catalog`
- **重定向行为**：自动 `replace` 到 `#/c/resource-audit?type=agent`
- **query 参数处理**：若 URL 带有 `?type=xxx`，则保留该参数；否则默认 `type=agent`
- **实现位置**：[`MainLayout.tsx`](../../src/layouts/MainLayout.tsx) 中的 `useEffect` 重定向逻辑

### URL 规范化（`normalizeDeprecatedPage`）

[`MainLayout.tsx`](../../src/layouts/MainLayout.tsx) 在解析 URL 后先规范化 `page`（仅替换 slug，不重写 query）：

| 请求 slug | 规范化为 | 说明 |
|-----------|----------|------|
| `agent-create`, `agent-versions` | `agent-register` | 智能体创建/版本 → 统一注册页 |
| `skill-create` | `skill-register` | 技能创建 → 技能注册页 |
| `app-create` | `app-register` | 应用创建 → 应用注册页 |
| `dataset-create` | `dataset-register` | 数据集创建 → 数据集注册页 |
| `category-management` | `tag-management` | 分类管理 → 标签管理 |
| `submit-agent`, `submit-skill` | `my-agents-pub` | 提交入口 → 我的发布 |
| `my-agents`, `my-skills` | `my-agents-pub` | 旧我的资源 → 我的发布 |
| 其它 | 原样 | 无需规范化 |

随后若 `routePage !== normalizedRoutePage`，会 `replace` 到规范路径。

## 管理端：资源中心与审核

- **「我的」登记与维护**：与开发者一致，走 `#/c/resource-center?type=…`（数据 `created_by = 当前用户`）。
- **全站资源审核**：走 `#/c/resource-audit?type=…`。

上述废弃 URL 进入后由 `useEffect` **replace** 到 canonical 形式（保留或补全 `?type=`）。

## 用户端：统一资源与普通列表

- `#/user/agent-list`（及另外四类 `*-list`）**重定向到** `#/user/resource-center?type=...`（`LEGACY_USER_RESOURCE_PAGES`）。
- `#/user/resource-center` 无 `type` 时补 `?type=agent`。
- 无发布权限的账号访问「我的发布」相关资源页时，会转到 `#/user/hub` 并提示（见 `MainLayout` 内 `canPublishResources` 判断）。

## 侧栏分组（`sidebarId`）与 `page` 归属

与 [`consoleRoutes.ts` `ADMIN_SIDEBAR_PAGES` / `USER_SIDEBAR_PAGES`](../../src/constants/consoleRoutes.ts) 一致。

### Admin

| sidebarId | 包含的 `page` slug（真值见 `ADMIN_SIDEBAR_PAGES`） |
|-----------|-------------------|
| `overview` | `dashboard`, `health-check`, `usage-statistics`, `data-reports` |
| `user-management` | `user-list`, `role-management`, `organization`, `api-key-management`, `developer-applications` |
| `admin-resource-ops` | `resource-audit` 及旧 `*-audit`、`agent-monitoring`、`agent-trace` |
| `admin-workspace` | 与 `USER_SIDEBAR_PAGES.workspace` 一致，并含 `agent-detail`（个人工作台：我的资源中心等） |
| `monitoring` | `monitoring-overview`, `call-logs`, `performance-analysis`（兼容旧链接）, `alert-center`, `alert-management`（兼容旧链接）, `alert-rules`（兼容旧链接）, `health-governance`, `health-config`（兼容旧链接）, `circuit-breaker`（兼容旧链接） |
| `system-config` | `tag-management`, `system-params`, `security-settings`, `network-config`, `rate-limit-policy`, `access-control`, `audit-log`, `sensitive-words`, `announcements` |

子菜单树见 [`navigation.ts`](../../src/constants/navigation.ts)。`#/c/agent-list` 等旧 slug 在管理壳下会 replace 到 `resource-audit`；`findSidebarForPage` 仍依赖 `ADMIN_SIDEBAR_PAGES` 收录这些 slug。

### User

> **真值来源**：`src/constants/consoleRoutes.ts` → `USER_SIDEBAR_PAGES`（下列为摘要；与侧栏树 `navigation.ts` 不一致时以代码为准）。

| sidebarId | 包含的 `page` slug（摘要） |
|-----------|-------------------|
| `hub` | `hub` |
| `workspace` | `workspace`、`usage-records`、`usage-stats`、`my-favorites`、`my-agents-pub`、`resource-center`、五类 `*-list` / `*-register`、`developer-onboarding`、`developer-applications`、`resource-market`、`skill-market`、`my-publish-*` … |
| `skills-center` | `skills-center` |
| `mcp-center` | `mcp-center`、`mcp-market` |
| `dataset-center` | `dataset-center`、`dataset-market` |
| `agents-center` | `agents-center`、`agent-market` |
| `apps-center` | `apps-center`、`app-market` |
| `developer-portal` | `api-docs`、`sdk-download`、`api-playground`、`mcp-integration`、`developer-statistics` |
| `user-settings` | `profile`、`preferences` |

**兼容重定向（`MainLayout`）**：`authorized-skills` → `skills-center`；`my-grant-applications` → `hub`；`recent-use`（normalize）→ `usage-records`。

工作台子菜单里 **`overview` 子项** 映射到 URL `page` **`workspace`**（`subItemToPage`）。

## `MainContent` 渲染矩阵（有效 `page` → 组件）

以下为 **实际参与 `switch` 渲染** 的 slug（管理端 `agent-list` 等在进入前常被重定向为 `resource-audit`；个人列表用 `resource-center`）。

### Admin（`layoutIsAdmin === true`）

| page slug | 渲染组件（概要） |
|-----------|------------------|
| `dashboard` | `Overview` |
| `health-check` | `HealthCheckOverview` |
| `usage-statistics` | `UsageStatsOverview` |
| `data-reports` | `DataReportsPage` |
| `workspace` / `resource-center` / `my-agents-pub` / `usage-*` / `my-favorites` / `resource-market` / `my-publish-*` 等 | 与使用端工作台相同组件族（`UserWorkspaceOverview`、`ResourceCenterManagementPage`…） |
| `agent-register` | `ResourceRegisterPage(agent)` |
| `agent-detail` | `AgentDetail` |
| `agent-monitoring` | `AgentMonitoringPage` |
| `agent-trace` | `AgentTracePage` |
| `skill-register` | `ResourceRegisterPage(skill)` |
| `mcp-register` | `ResourceRegisterPage(mcp)` |
| `resource-audit` | `ResourceAuditList`（`defaultType` 来自 query） |
| `app-register` | `ResourceRegisterPage(app)` |
| `dataset-register` | `ResourceRegisterPage(dataset)` |
| `user-list` / `role-management` / `organization` / `api-key-management` / `resource-grant-management` | `UserManagementModule` |
| `grant-applications` | `GrantApplicationListPage` |
| `developer-applications` | `DeveloperApplicationListPage` |
| `monitoring-overview` / `call-logs` / `performance-analysis` / `alert-center` / `alert-management` / `alert-rules` / `health-governance` / `health-config` / `circuit-breaker` | `MonitoringModule` |
| `category-management` / `tag-management` / … / `announcements` | `SystemConfigModule`（注：`category-management` 会先在 URL 层归一到 `tag-management`；~~`model-config`~~ 已移除） |
| 其它已知 slug | `PlaceholderView` |

**说明**：`category-management` 仅在经过 `normalizeDeprecatedPage` 后以 `tag-management` 渲染；`system-config` 的 `switch` 仍保留 `case 'category-management'` 为兼容。

### User

| page slug | 渲染组件（概要） |
|-----------|------------------|
| `hub` | `ExploreHub` |
| `workspace` | `UserWorkspaceOverview` |
| `resource-center` | `ResourceCenterManagementPage`（用户侧统一资源中心） |
| `agent-list` ~ `dataset-list` | `ResourceCenterManagementPage`（固定对应 `resourceType`） |
| `*-register`（五类） | `ResourceRegisterPage` |
| `authorized-skills` | `AuthorizedSkillsPage` |
| `usage-records` | `UsageRecordsPage`（默认展示「最近使用」tab；`recent-use` 旧 slug 归一至此） |
| `agent-market` ~ `dataset-market` | 各类 Market 页 |
| `my-agents-pub` | `MyPublishHubPage` |
| `my-favorites` | `MyFavoritesPage` |
| `usage-stats` | `UsageStatsPage` |
| `my-grant-applications` | `MyGrantApplicationsPage` |
| `profile` / `preferences` | `UserSettingsHubPage`（不同 `initialTab`） |
| `api-docs` / `sdk-download` / `api-playground` / `developer-statistics` | 开发者中心各页 |
| 其它 | `PlaceholderView` |

## 顶栏主导航（`ConsoleTopNav`）高亮

- 顶栏六项（「探索发现」+ 五类广场）条目均为 **使用端** `domain: 'user'`。高亮条件：`routeRole === item.domain` 且 `activeSidebar === item.id`（或下拉内子项匹配）。
- **管理壳**（`routeRole === 'admin'`）下顶栏仍为上述六项，与当前 `activeSidebar`（如 `system-config`）**不会**在 id 上重合，故 **顶栏六项均可无高亮**，属预期；此前若存在「首项退路」会误把「探索发现」锁为选中，已移除。
- **使用壳**（`routeRole === 'user'`）下：在 Hub 则高亮「探索发现」；在某一广场则高亮对应项；在「个人工作台」等无对应顶栏 id 时顶栏可无高亮。

## 部分子菜单权限裁剪（`SUB_ITEM_PERM_MAP`）

以下 `page` 在管理端侧栏中可 **按权限隐藏**（见 `MainLayout`）：

`role-management`（`role:manage`）、`organization`（`org:manage`）、`api-key-management`（`api-key:manage`）、`resource-grant-management` / `grant-applications`（`resource-grant:manage`）、`developer-applications`（`developer-application:review`）、`alert-rules` / `health-config` / `circuit-breaker`（`system:config`）。  
审核类子项另有 `resourceType` 相关权限位（实现见 `MainLayout` 中 `filteredSubGroupsForSidebarId` 等相关逻辑）。

## 路由变更历史

> 记录重要的路由迁移与命名规范变更，便于追溯和维护。

### 2024-2025：统一资源管理重构

#### 统一资源审核页迁移

**变更背景**：原各类型资源有独立的审核页面（`agent-audit`、`skill-audit` 等），为简化维护和统一体验，合并为单一 `resource-audit` 页面，通过 `?type=` 参数区分资源类型。

| 变更前 | 变更后 | 影响范围 |
|--------|--------|----------|
| `agent-audit` | `resource-audit?type=agent` | 管理端审核入口 |
| `skill-audit` | `resource-audit?type=skill` | 管理端审核入口 |
| `mcp-audit` | `resource-audit?type=mcp` | 管理端审核入口 |
| `app-audit` | `resource-audit?type=app` | 管理端审核入口 |
| `dataset-audit` | `resource-audit?type=dataset` | 管理端审核入口 |

**兼容处理**：旧路由保留为书签兼容，自动重定向到新路径。

#### 统一资源目录迁移

**变更背景**：`resource-catalog` 原为管理端统一资源目录入口，功能与 `resource-audit` 高度重叠，故合并。

| 变更前 | 变更后 | 说明 |
|--------|--------|------|
| `resource-catalog` | `resource-audit?type=agent` | 管理端统一入口 |

**兼容处理**：仅管理端角色访问时触发重定向。

#### 列表页迁移

**变更背景**：管理端原有的独立列表页（`agent-list`、`skill-list` 等）功能与审核页重复，统一迁移到 `resource-audit`。

| 变更前 | 变更后 | 说明 |
|--------|--------|------|
| `agent-list` | `resource-audit?type=agent` | 管理端智能体列表 |
| `skill-list` | `resource-audit?type=skill` | 管理端技能列表 |
| `mcp-server-list` | `resource-audit?type=mcp` | 管理端MCP列表 |
| `app-list` | `resource-audit?type=app` | 管理端应用列表 |
| `dataset-list` | `resource-audit?type=dataset` | 管理端数据集列表 |

### 路由命名规范变更

#### 创建页 → 注册页统一命名

**变更背景**：为统一术语，将「创建」相关页面统一命名为「注册」。

| 旧命名 | 新命名 | 说明 |
|--------|--------|------|
| `agent-create` | `agent-register` | 智能体注册页 |
| `skill-create` | `skill-register` | 技能注册页 |
| `app-create` | `app-register` | 应用注册页 |
| `dataset-create` | `dataset-register` | 数据集注册页 |
| `agent-versions` | `agent-register` | 智能体版本管理合并到注册页 |

#### 分类管理 → 标签管理

**变更背景**：功能定位调整，「分类管理」更名为「标签管理」。

| 旧命名 | 新命名 |
|--------|--------|
| `category-management` | `tag-management` |

#### 我的资源统一入口

**变更背景**：简化用户入口，将分散的「我的」页面统一到「我的发布」。

| 旧命名 | 新命名 | 说明 |
|--------|--------|------|
| `my-agents` | `my-agents-pub` | 我的智能体 |
| `my-skills` | `my-agents-pub` | 我的技能 |
| `submit-agent` | `my-agents-pub` | 提交智能体入口 |
| `submit-skill` | `my-agents-pub` | 提交技能入口 |

### 废弃路由处理策略

1. **保留兼容期**：废弃路由在代码中保留重定向逻辑，确保旧书签/外链可用。
2. **自动重定向**：通过 `normalizeDeprecatedPage` 和 `useEffect` 实现无感迁移。
3. **参数保留**：重定向时保留原有 query 参数（如 `?type=`）。
4. **文档同步**：本章节记录所有废弃路由及其迁移目标。

## 相关 API

- `buildPath(role, page, id?)`、`defaultPath(role)`、`parseRoute(pathname)`、`findSidebarForPage(role, page)`、`pageToSubItem` / `subItemToPage`：`src/constants/consoleRoutes.ts`
- 导航分组：`getNavSubGroups(sidebarId, isAdminRole)` — `src/constants/navigation.ts`
