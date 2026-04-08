# 控制台信息架构（与实现对齐摘要）

## 用户侧（`/user`）

- **发现**：顶栏 / 各资源中心（Skills、MCP、数据集、Agent、应用）+ `hub`。
- **我的**：侧栏单项「我的」聚合原「工作台 + 资源与资产」；子分组见 `USER_MY_CONSOLE_GROUPS`（`src/constants/navigation.ts`）。
- **开发者中心**：独立侧栏项；**个人资料 / 偏好设置** 由顶栏右侧头像菜单进入（无侧栏「个人设置」一级）。

个人首页数据：`dashboardService.getMyConsole()`（优先 `GET /dashboard/my-console`，失败回退 `GET /dashboard/user-workspace`）。

## 管理侧（`/admin`）

- **运营总览**：侧栏单入口；页内 Tab 切换「数据概览 / 健康 / 使用统计 / 数据报表」（`AdminOverviewModule`）。
- **资源与运营**：统一资源中心、审核、**运行诊断**（监控 + 追踪合一）、Provider（列表与新建仍在页面内操作，侧栏不再单独「新建」项）。
- **用户与权限**：侧栏单入口；页内 Tab 覆盖用户 / 角色 / 组织 / API Key / Token / 资源授权 / 授权审批 / 入驻审批（`AdminUserHubModule`）。
- **监控与运维**：侧栏单入口；页内 Tab 覆盖原监控子页（`AdminMonitoringHubModule`）。
- **平台配置**：侧栏单入口；页内 Tab 覆盖原系统配置子页（`AdminSystemConfigHubModule`）。

路由映射与书签：`src/constants/consoleRoutes.ts` 中 `ADMIN_SIDEBAR_PAGES`、`pageToSubItem` / `subItemToPage`。

## 后端蓝图

后端文档 `docs/frontend-alignment-playbook/01-menu-and-page-blueprints.md` 应在后端仓库同步更新本节路由说明。
