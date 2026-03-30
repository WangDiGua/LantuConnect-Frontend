# 前端功能缺口矩阵（路由 × API × 筛选 × CRUD）

与 [管理端列表 UI 巡检与后端接口建议](./frontend-management-ui-audit-and-backend-api-requests.md) 互补：本文档按**侧栏 / 路由**列出主要页面的数据流形态与缺口；**接线状态**会随前端实现更新。

**图例**

| 标记 | 含义 |
|------|------|
| `serverPaged` | 列表分页与筛选主要由服务端完成 |
| `serverPage_clientFilter` | 已请求分页，但部分筛选仍在浏览器内存（待收敛） |
| `clientOnly` | 全量或单页数据在浏览器内过滤 / 分页 |
| `stub` | 占位或未接真实读接口 |

---

## 管理端 · 总览 / 资源（`admin`）

| 路由 page | 主要组件 | 列表/数据 API | 数据流 | 备注 |
|-----------|----------|---------------|--------|------|
| dashboard | Overview 等 | `dashboard.service` | 混合 | 视卡片而定 |
| health-check | 健康看板 | 多种 | serverPaged | — |
| usage-statistics | 用量统计 | `user-activity` / `dashboard` | 混合 | — |
| data-reports | 数据报表 | `dashboard` 等 | 混合 | — |
| agent-list / skill-list / mcp-server-list / app-list / dataset-list | 资源列表 | `agent` / `skill` / `smart-app` / `dataset` + `keyword` | serverPaged | 行内操作图标风见审计文档 |
| *-register / *-detail | 注册与详情 | 各 resource API | CRUD | — |
| *-audit | ResourceAuditList | `resourceAuditService` | serverPaged | 支持 keyword |
| provider-list / provider-create | ProviderManagementPage | `providerService` | serverPaged | — |

---

## 管理端 · 用户与权限

| 路由 page | 主要组件 | 列表/数据 API | 数据流 | 备注 |
|-----------|----------|---------------|--------|------|
| user-list / role-management / api-key-management / resource-grant-management | UserManagementModule | `userMgmtService` | serverPaged | Token 页见下行 |
| organization | OrgStructurePage | `getOrgTree` + `createOrg` / `updateOrg` / `deleteOrg` | 树 CRUD | 表单 Modal 改善父节点选择 |
| grant-applications | GrantApplicationListPage | `grantApplicationService.listPending` + **`keyword`** | serverPaged | 应与后端 query 一致 |
| developer-applications | DeveloperApplicationListPage | `developerApplicationService.list` + **`keyword`** | serverPaged | 防抖请求 |

---

## 管理端 · 监控

| 路由 page | 主要组件 | 列表/数据 API | 数据流 | 备注 |
|-----------|----------|---------------|--------|------|
| monitoring-overview | MonitoringOverviewPage | `monitoringService.getKpis` 等 | serverPaged | — |
| call-logs | CallLogPage | `listCallLogs` + **keyword/status** | serverPaged | 筛选项透传 query |
| performance-analysis | PerformanceAnalysisPage | `getPerformanceMetrics` | serverPaged | `PerformanceMetric.service` 优先分桶 |
| alert-management | AlertMgmtPage | `listAlerts` + **keyword/severity/status** | serverPaged | 同上 |
| alert-rules | AlertRulesPage | `listAlertRules` + mutations | CRUD | — |
| health-config | HealthConfigPage | `healthService` | CRUD | — |
| circuit-breaker | CircuitBreakerPage | `healthService` | CRUD | — |

---

## 管理端 · 系统配置

| 路由 page | 主要组件 | 列表/数据 API | 数据流 | 备注 |
|-----------|----------|---------------|--------|------|
| category-management | CategoryManagement | `categoryService` | CRUD | — |
| tag-management | TagManagementPage | `tagService` | CRUD | — |
| model-config / rate-limit-policy | ModelConfigPage / RateLimitPage | `systemConfigService` | CRUD | — |
| security-settings / 系统参数 | SystemConfigExtraPages | `getSecurity` / `getParams` | CRUD | — |
| quota-management | **QuotaManagementPage**（完整列表+弹窗） | `quotaService` | CRUD | **菜单已指向此页** |
| access-control | AccessControlPage | **`getAclRules`** + `publishAcl` | serverPaged + 写 | 曾用本地假数据初始化，已改为拉取 `/system-config/acl` |
| audit-log | AuditLogPage | `listAuditLogs` + **keyword / action / result** | serverPaged | 导出 CSV 为当前页数据 |
| sensitive-words | SensitiveWordPage | `sensitiveWordService` + **keyword / category / enabled** | serverPaged | 行内编辑（分类/severity/启停）；词面改需后端扩展 PUT |
| announcements | AnnouncementPage | `listAnnouncements` + **keyword / type** | serverPaged | — |

**未接入路由的组件**：`SystemConfigExtraPages.tsx` 内 `SystemQuotaPage` 为简化单表单，**未被** `SystemConfigModule` 引用；避免与 `QuotaManagementPage` 混淆。

---

## 用户控制台（`user`）摘要

| 区域 | 典型数据流 | 备注 |
|------|------------|------|
| hub / workspace / market* | `catalog` / `explore` | 多为 serverPaged + 少量客户端 tag 过滤 |
| resource-center | ResourceCenterManagementPage | serverPaged + keyword |
| my-grant-applications | MyGrantApplicationsPage | `grantApplicationService.listMine` | — |
| api-key-management（子项） | ApiKeyListPage 等 | `listApiKeys` | serverPaged |
| token 管理（若侧栏可达） | TokenListPage | **`GET /user-mgmt/tokens`** | serverPaged；后端需实现分页与 keyword/status |

---

## 后端待确认路径（与当前前端对齐）

以下路径以前端调用为准，若后端不同请改 `src/api/services/*.ts` 一处即可：

- 审计日志扩展 query：`keyword`、`result`（`failure` / `success`）、已有 `action`
- 调用日志 / 告警列表：`keyword`、`status` 或 `severity`
- ACL：`GET /system-config/acl` 返回规则数组或 `{ rules: [...] }`
- Token：`GET /user-mgmt/tokens`、`PATCH /user-mgmt/tokens/:id/revoke`

---

## 维护

更新实现后请同步修改本文档对应行的「数据流」列，并在 [审计文档](./frontend-management-ui-audit-and-backend-api-requests.md) 顶部「前端接线状态」段落下备注日期。

| 日期 | 说明 |
|------|------|
| 2026-03-30 | 已接线：公告/授权/入驻/审计关键词与筛选；监控调用日志与告警 query；Token 分页与撤销；ACL GET；性能指标 `service` 字段优先；组织架构 Modal 创建/编辑。 |
