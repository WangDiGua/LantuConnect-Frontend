# 前后端对齐验收报告（最终版）

更新时间：2026-03-24

## 1) 改动点（按模块）

- 全局契约层（`src/lib/http.ts`）
  - 统一注入 `X-User-Id`、`X-Username`、`X-Request-Id`、`X-Trace-Id`。
  - 增加强约束校验：`/invoke`、`/sdk/v1/*`、`/sandbox/*`、~~`/resource-grants*`~~（已废弃） 的必填 Header 缺失时前置抛错。
  - 统一错误码映射：覆盖 `401/1002`、`403/1003`、`400/1001`、`404/1004`、`410+1004`、`429/3001`、`3002~3005`、`500/5001`。
  - 分页契约兜底：`PageResult.total` 缺失时从响应头 `X-Total-Count` 回填。

- 类型与 DTO（`src/types/api.ts`、`src/types/dto/catalog.ts` 等）
  - 新增统一资源目录/解析/调用/授权/沙箱/SDK DTO。
  - 原页面消费类型切换到 `PageResult(list,total,page,pageSize)` 模式。

- 服务层迁移（`src/api/services/*.ts`）
  - 新增统一网关链路服务：
    - `resource-catalog.service.ts`
    - `invoke.service.ts`
    - `resource-grant.service.ts`
    - `sandbox.service.ts`
    - `sdk.service.ts`
  - 旧资源写接口全部下线：在旧 service 中统一返回 `ApiException(410 + 1004)`，并给出“迁移到统一网关接口”提示。
  - 旧资源读接口改为转发至 `catalog/resources*` 与 `catalog/resolve`。

- 路由与导航（`src/layouts/MainLayout.tsx`、`src/constants/navigation.ts`、`src/constants/consoleRoutes.ts`）
  - 删除已下线页面入口（创建页/旧提交流程/provider/category 旧入口）。
  - 新增 `resource-grant-management` 导航能力。
  - 增加旧 slug 平滑迁移：
    - 旧 slug 先规范化，再做路由有效性校验。
    - 访问旧 slug 时自动替换为新 slug（`replace` 跳转），避免回落默认首页导致体验断层。

- 页面侧迁移（`src/views/**`）
  - 开发者文档、Playground、SDK 示例已切换到 `/api` 基础路径和统一网关示例。
  - 市场页与发布页入口调整为“探索/我的发布”路径，移除旧提交路径依赖。
  - 新增资源授权管理页 `ResourceGrantManagementPage` 并接入 ~~`/resource-grants*`~~（已废弃，下线时间：2026-04）。**替代方案**：使用 `/resource-center/resources` 进行资源管理。

## 2) 接口清单（保留 / 迁移 / 下线）

### A. 保留（继续使用）

- 认证与用户：`/auth/*`（登录、刷新、登出、资料、改密、绑手机、登录历史）
- 消息通知：`/notifications`、`/notifications/unread-count`
- 用户域：`/user/*`
- 用户管理：`/user-mgmt/*`
- 监控与健康：`/monitoring/*`、`/health/*`
- 系统配置：`/system-config/*`、`/quotas`、`/rate-limits`
- 看板：`/dashboard/*`
- 评论审核：`/reviews/*`、`/audit/*`（过渡保留）
- 沙箱与 SDK：`/sandbox/*`、`/sdk/v1/*`

### B. 统一网关新增主链路（已接入）

- 目录：`GET /catalog/resources`、`GET /catalog/resources/{type}/{id}`
- 解析：`POST /catalog/resolve`
- 调用：`POST /invoke`
- ~~授权：`POST /resource-grants`、`GET /resource-grants`、`DELETE /resource-grants/{grantId}`~~（已废弃，下线时间：2026-04）
- 沙箱：`POST /sandbox/sessions`、`GET /sandbox/sessions/mine`、`POST /sandbox/invoke`
- SDK：`GET /sdk/v1/resources`、`GET /sdk/v1/resources/{type}/{id}`、`POST /sdk/v1/resolve`、`POST /sdk/v1/invoke`

### C. 迁移/下线（前端已替换）

- 资源旧域接口：
  - `agents/**`、`v1/skills/**`、`v1/mcp-servers/**`、`v1/apps/**`、`v1/datasets/**`
  - `v1/providers/**`、`v1/categories/**`
  - `agents/{id}/versions`、`versions/*`
- 对应前端处理：
  - 读操作迁移到 `catalog/resources*` / `catalog/resolve`。
  - 写操作统一下线并显式返回 `410 + 1004`。

## 3) 页面级对账表（按文档 3.1 / 3.2 slug）

标记说明：`已完成` = 已对齐或按文档过渡策略落地；`过渡` = 当前仍走保留过渡链路，后续可继续收敛。

### 3.1 admin 侧

- `dashboard` -> `/dashboard/admin-overview`：已完成
- `health-check` -> `/dashboard/health-summary`,`/health/configs`：已完成
- `usage-statistics` -> `/dashboard/usage-stats`：已完成
- `data-reports` -> `/dashboard/data-reports`：已完成
- `agent-list` -> `/catalog/resources?resourceType=agent`：已完成
- `agent-create`（下线）-> 归并 `agent-register`：已完成（旧 slug 自动重定向）
- `agent-audit`（迁移）-> `/audit/agents`（过渡）：过渡
- `agent-versions`（下线）-> 归并 `agent-list`：已完成（旧 slug 自动重定向）
- `agent-monitoring`（迁移）-> `/monitoring/*`：已完成
- `agent-trace`（迁移）-> `/monitoring/traces`：已完成
- `agent-detail`（下线）-> `/catalog/resources/{type}/{id}`：已完成
- `skill-list` -> `/catalog/resources?resourceType=skill`：已完成
- `skill-create`（下线）-> 归并 `skill-register`：已完成（旧 slug 自动重定向）
- `skill-audit`（迁移）-> `/audit/skills`（过渡）：过渡
- `mcp-server-list`（补齐）-> `/resource-center/resources?resourceType=mcp`：已完成（独立 MCP 注册中心）
- `app-list` -> `/catalog/resources?resourceType=app`：已完成
- `app-create`（下线）-> 归并 `app-register`：已完成（旧 slug 自动重定向）
- `dataset-list` -> `/catalog/resources?resourceType=dataset`：已完成
- `dataset-create`（下线）-> 归并 `dataset-register`：已完成（旧 slug 自动重定向）
- `provider-list`（下线）-> 归并 `resource-grant-management`：已完成（旧 slug 自动重定向）
- `provider-create`（下线）-> 归并 `resource-grant-management`：已完成（旧 slug 自动重定向）
- `user-list` -> `/user-mgmt/users*`：已完成
- `role-management` -> `/user-mgmt/roles*`：已完成
- `organization` -> `/user-mgmt/org*`：已完成
- `api-key-management` -> `/user-mgmt/api-keys*`：已完成
- `resource-grant-management` -> ~~`/resource-grants*`~~（已废弃）：**已下线**（替代方案：使用 `/resource-center/resources` 管理资源）
- `monitoring-overview` -> `/monitoring/kpis`：已完成
- `call-logs` -> `/monitoring/call-logs`：已完成
- `performance-analysis` -> `/monitoring/performance`：已完成
- `alert-management` -> `/monitoring/alerts`：已完成
- `alert-rules` -> `/monitoring/alert-rules*`：已完成
- `health-config` -> `/health/configs*`：已完成
- `circuit-breaker` -> `/health/circuit-breakers*`：已完成
- `category-management`（下线）-> 归并 `tag-management`：已完成（旧 slug 自动重定向）
- `tag-management` -> `/tags*`：已完成
- ~~`model-config` -> `/system-config/model-configs*`~~：**已移除**（全栈下线，勿再集成该路径）
- `security-settings` -> `/system-config/security`：已完成
- `quota-management` -> `/quotas*`,`/rate-limits*`：已完成
- `rate-limit-policy` -> `/system-config/rate-limits*`：已完成
- `access-control` -> `/system-config/acl/publish` + ~~`/resource-grants*`~~（已废弃）：已完成
- `audit-log` -> `/system-config/audit-logs`：已完成
- `api-docs`：已完成（示例已切换新链路）
- `sdk-download`：已完成（示例已切换新链路）
- `api-playground`：已完成（默认示例为 `/catalog/*` 与 `/invoke`）

### 3.2 user 侧

- `hub`：已完成
- `workspace` -> `/dashboard/user-workspace`：已完成
- `my-agents` -> `/user/my-agents`（过渡）：过渡
- `authorized-skills` -> `/user/authorized-skills`：已完成
- `my-favorites` -> `/user/favorites*`：已完成
- `quick-access`：已移除独立页；旧链归一到 `workspace`
- `recent-use`：侧栏已合并至 `usage-records`；旧链 normalize → `usage-records`；`/user/recent-use` 接口仍用于最近列表
- `agent-market` -> `/catalog/resources + /invoke`：已完成
- `skill-market` -> `/catalog/resources + /invoke`：已完成
- `app-market` -> `/catalog/resources + /invoke`：已完成
- `dataset-market` -> `/catalog/resources + /invoke`：已完成
- `my-agents-pub`（迁移）-> 统一资源“我的发布”：已完成（入口与文案已调整）
- `resource-center`（新增）-> `/resource-center/resources/mine`：已完成（developer 可在 user 侧直接进入）
- `user/agent-list|skill-list|mcp-server-list|app-list|dataset-list`（新增）-> `/resource-center/resources/mine?resourceType=*`：已完成
- `user/agent-register|skill-register|mcp-register|app-register|dataset-register`（新增）-> `/resource-center/resources*`：已完成
- `my-skills` -> `/user/my-skills`（过渡）：过渡
- `submit-agent`（下线）-> 归并 `my-agents` / `agent-market`：已完成（旧 slug 自动重定向）
- `submit-skill`（下线）-> 归并 `my-skills` / `skill-market`：已完成（旧 slug 自动重定向）
- `usage-records` -> `/user/usage-records`：已完成
- `usage-stats` -> `/user/usage-stats`：已完成
- `profile` -> `/auth/profile` 等：已完成
- `preferences` -> `/user-settings/workspace`：已完成

## 4) 自测结果

### 构建与类型检查

- `npm run build`：通过
- `npm run lint`（`tsc --noEmit`）：通过

### 统一资源注册闭环自测（runbook）

- MCP 资源：`mcp-register` 页面完成 URL/协议校验（非法 URL 会阻断提交），支持保存草稿与保存后提审。
- 五类资源注册：`agent-register` / `skill-register` / `mcp-register` / `app-register` / `dataset-register` 全部接入 `/resource-center/resources*`。
- 我的资源管理：`agent-list` / `skill-list` / `mcp-server-list` / `app-list` / `dataset-list` 已统一接入 `/resource-center/resources/mine`，并支持提审、下线、版本创建/切换。
- 审核链路：`agent-audit` 与 `skill-audit` 已统一到 `/audit/resources`，支持 `approve/reject/publish`。
- 占位页替换：`authorized-skills` 已接 `/user/authorized-skills`；最近使用并入 `usage-records` 页内 tab，`/user/recent-use` 仍为列表接口；`my-agents-pub` 已改为发布总览页。

### 契约对齐核验

- Header 契约：已在请求拦截器与路径级强约束中校验。
- 分页契约：已支持 `PageResult` + `X-Total-Count` 兜底。
- 错误码契约：已统一映射并落到对应前端动作。
- 旧接口清理：资源旧写接口已全部下线并显式报 `410 + 1004`。

### UX 与可用性核验

- 旧页面 slug 访问可平滑跳转到新 slug。
- 已下线入口已从导航移除，避免用户误入无效流程。
- 样式体系保持现状，仅调整信息架构与交互流。
- developer 角色在 `user` 视图域可见“统一资源中心”，无需切换到 `admin` 视图域。
- 普通 user 手动访问统一资源路由会自动回退到 `user/hub`，避免无权限空白页。

## 5) 遗留风险与后续建议

- 后端跨域若需前端读取 `X-Trace-Id`，需确保 `exposedHeaders` 包含该头；当前以 `X-Request-Id` 可兜底。
- `audit` 与 `my-*` 部分能力仍处于“过渡保留”态，后续可继续向统一资源审核/我的发布模型收敛。
- 建议补 1 轮真实联调回归（登录、目录检索、resolve、invoke、grant、sandbox、sdk）并沉淀 API Mock 用例集。

## 6) 本机联调回归记录（2026-03-24）

### 6.1 环境可达性与未认证行为（已实测）

- `GET http://localhost:8080/api/auth/me` -> `401`
- `GET http://localhost:8080/api/resource-center/resources/mine` -> `401`
- `GET http://localhost:8080/api/audit/resources` -> `401`
- `POST http://localhost:8080/api/resource-center/resources`（无 token）-> `{"code":1002,"message":"未认证","data":null}`
- `POST http://localhost:8080/api/audit/resources/1/approve`（无 token）-> `{"code":1002,"message":"未认证","data":null}`

结论：后端联调环境在线，认证拦截与错误码契约（`1002`）符合总规。

### 6.2 待完成闭环（需要测试凭证）

以下步骤需有效登录态与角色权限（developer + admin）后继续：

- 创建（MCP/Skill/Agent/App/Dataset）-> 提审 -> 审核通过 -> 发布 -> 下线
- 版本创建/切换/查询（`/resource-center/resources/{id}/versions*`）
- 目录查询与解析（`/catalog/resources*`、`/catalog/resolve`）
- 调用链路（`/invoke`：需 `X-Api-Key`）
- ~~授权链路（`/resource-grants*`）~~（已废弃，下线时间：2026-04）

缺失信息：测试账号（开发者/管理员）或可用 Bearer Token、可调用的 `X-Api-Key`。

