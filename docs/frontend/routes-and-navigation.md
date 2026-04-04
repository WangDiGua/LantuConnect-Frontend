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

## `normalizeDeprecatedPage`（仅替换 slug，不重写 query）

[`MainLayout.tsx`](../../src/layouts/MainLayout.tsx) 在解析 URL 后先规范化 `page`：

| 请求 slug | 规范化为 |
|-----------|----------|
| `agent-create`, `agent-versions` | `agent-register` |
| `skill-create` | `skill-register` |
| `app-create` | `app-register` |
| `dataset-create` | `dataset-register` |
| `category-management` | `tag-management` |
| `submit-agent`, `submit-skill` | `my-agents-pub` |
| `my-agents`, `my-skills` | `my-agents-pub` |
| 其它 | 原样 |

随后若 `routePage !== normalizedRoutePage`，会 `replace` 到规范路径。

## 管理端：兼容 URL 再定向（统一资源与审核）

下列 **URL 仍可作为书签/外链**，进入后由 `useEffect` **replace** 到 canonical 形式（保留或补全 `?type=`）：

**旧列表页 → `resource-catalog`**

| 旧 path slug | 重定向 target |
|--------------|---------------|
| `agent-list` | `#/admin/resource-catalog?type=agent` |
| `skill-list` | `#/admin/resource-catalog?type=skill` |
| `mcp-server-list` | `#/admin/resource-catalog?type=mcp` |
| `app-list` | `#/admin/resource-catalog?type=app` |
| `dataset-list` | `#/admin/resource-catalog?type=dataset` |

**旧审核子路由 → `resource-audit`**

| 旧 path slug | 默认 `type`（可被 query 覆盖） |
|--------------|--------------------------------|
| `agent-audit` | `agent` |
| `skill-audit` | `skill` |
| `mcp-audit` | `mcp` |
| `app-audit` | `app` |
| `dataset-audit` | `dataset` |

**资源目录默认 type**：访问 `#/admin/resource-catalog` 且无 `type` 时，会补 `?type=agent`。

## 用户端：统一资源与普通列表

- `#/user/agent-list`（及另外四类 `*-list`）**重定向到** `#/user/resource-center?type=...`（`LEGACY_USER_RESOURCE_PAGES`）。
- `#/user/resource-center` 无 `type` 时补 `?type=agent`。
- 无发布权限的账号访问「我的发布」相关资源页时，会转到 `#/user/hub` 并提示（见 `MainLayout` 内 `canPublishResources` 判断）。

## 侧栏分组（`sidebarId`）与 `page` 归属

与 [`consoleRoutes.ts` `ADMIN_SIDEBAR_PAGES` / `USER_SIDEBAR_PAGES`](../../src/constants/consoleRoutes.ts) 一致。

### Admin

| sidebarId | 包含的 `page` slug |
|-----------|-------------------|
| `overview` | `dashboard`, `health-check`, `usage-statistics`, `data-reports` |
| `resource-management` | `resource-catalog`, `agent-register`, `agent-monitoring`, `agent-trace`, `agent-detail`, `skill-register`, `mcp-register`, `app-register`, `dataset-register`, `agent-list`, `skill-list`, `mcp-server-list`, `app-list`, `dataset-list` |
| `audit-center` | `resource-audit`, `agent-audit`, `skill-audit`, `mcp-audit`, `app-audit`, `dataset-audit` |
| `provider-management` | `provider-list`, `provider-create` |
| `user-management` | `user-list`, `role-management`, `organization`, `api-key-management`, `resource-grant-management`, `grant-applications`, `developer-applications` |
| `monitoring` | `monitoring-overview`, `call-logs`, `performance-analysis`, `alert-management`, `alert-rules`, `health-config`, `circuit-breaker` |
| `system-config` | `tag-management`, `security-settings`, `quota-management`, `rate-limit-policy`, `access-control`, `audit-log`, `sensitive-words`, `announcements` |

子菜单文案与图标见 [`navigation.ts`](../../src/constants/navigation.ts) 中 `ADMIN_*_GROUPS`。管理端 **资源** 侧栏在 UI 上以「统一资源中心 + Agent 运维」分组展示；`agent-list` 等为历史 slug，仍挂在 `resource-management` 下以便 `findSidebarForPage` 校验。

### User

| sidebarId | 包含的 `page` slug |
|-----------|-------------------|
| `hub` | `hub` |
| `workspace` | `workspace`, `authorized-skills`, `my-favorites`, `quick-access` |
| `marketplace` | `agent-market`, `skill-market`, `mcp-market`, `app-market`, `dataset-market` |
| `my-publish` | `my-agents-pub`, `resource-center`, `agent-list`, `agent-register`, `skill-list`, `skill-register`, `mcp-server-list`, `mcp-register`, `app-list`, `app-register`, `dataset-list`, `dataset-register` |
| `developer-portal` | `api-docs`, `sdk-download`, `api-playground`, `developer-statistics` |
| `my-space` | `usage-records`, `recent-use`, `usage-stats`, `my-grant-applications` |
| `user-settings` | `profile`, `preferences` |

工作台子菜单里 **`overview` 子项** 映射到 URL `page` **`workspace`**（`subItemToPage`）。

## `MainContent` 渲染矩阵（有效 `page` → 组件）

以下为 **实际参与 `switch` 渲染** 的 slug（管理端 `agent-list` 等在进入前已被重定向为 `resource-catalog`，不会以旧 slug 渲染管理端内容）。

### Admin（`layoutIsAdmin === true`）

| page slug | 渲染组件（概要） |
|-----------|------------------|
| `dashboard` | `Overview` |
| `health-check` | `HealthCheckOverview` |
| `usage-statistics` | `UsageStatsOverview` |
| `data-reports` | `DataReportsPage` |
| `resource-catalog` | `ResourceCenterManagementPage`（`allowTypeSwitch`，`type` 来自 query） |
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
| `provider-list` / `provider-create` | `ProviderManagementPage` |
| `grant-applications` | `GrantApplicationListPage` |
| `developer-applications` | `DeveloperApplicationListPage` |
| `monitoring-overview` / `call-logs` / `performance-analysis` / `alert-management` / `alert-rules` / `health-config` / `circuit-breaker` | `MonitoringModule` |
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
| `quick-access` | `QuickAccess` |
| `recent-use` | `UsageRecordsPage(initialView="recent")` |
| `agent-market` ~ `dataset-market` | 各类 Market 页 |
| `my-agents-pub` | `MyPublishHubPage` |
| `usage-records` | `UsageRecordsPage(initialView="records")` |
| `my-favorites` | `MyFavoritesPage` |
| `usage-stats` | `UsageStatsPage` |
| `my-grant-applications` | `MyGrantApplicationsPage` |
| `profile` / `preferences` | `UserSettingsHubPage`（不同 `initialTab`） |
| `api-docs` / `sdk-download` / `api-playground` / `developer-statistics` | 开发者中心各页 |
| 其它 | `PlaceholderView` |

## 部分子菜单权限裁剪（`SUB_ITEM_PERM_MAP`）

以下 `page` 在管理端侧栏中可 **按权限隐藏**（见 `MainLayout`）：

`provider-list`（`provider:view`）、`provider-create`（`provider:manage`）、`role-management`（`role:manage`）、`organization`（`org:manage`）、`api-key-management`（`api-key:manage`）、`resource-grant-management` / `grant-applications`（`resource-grant:manage`）、`developer-applications`（`developer-application:review`）、`alert-rules` / `health-config` / `circuit-breaker`（`system:config`）。  
审核类子项另有 `resourceType` 相关权限位（实现见 `ConsoleSidebar` / 相关逻辑）。

## 相关 API

- `buildPath(role, page, id?)`、`defaultPath(role)`、`parseRoute(pathname)`、`findSidebarForPage(role, page)`、`pageToSubItem` / `subItemToPage`：`src/constants/consoleRoutes.ts`
- 导航分组：`getNavSubGroups(sidebarId, isAdminRole)` — `src/constants/navigation.ts`
