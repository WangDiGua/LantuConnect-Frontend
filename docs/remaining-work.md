# 后端剩余工作清单（对照三份主文档）

> 与 **[backend-architecture.md](backend-architecture.md)**（目标）、**[frontend-alignment-handbook.md](frontend-alignment-handbook.md)**（契约）、**[bug-fixes.md](bug-fixes.md)**（问题记录）配合使用。  
> 完成某项后：改代码 → 更新本清单 → 收窄架构文档「实现状态」表与对齐手册 **§9.5**。

## 已落实汇总

### 第一轮（IMPL-001，2026-03-22）

仪表盘 MySQL 聚合、用户「我的」列表、工作区 Redis 持久化、监控 performance 按小时聚合、用户活动统计等。

### 第二轮（IMPL-002，2026-03-21）

- **R1**：`JwtAuthenticationFilter` + `AccessTokenBlacklist`；`application.yml` 中 `lantu.security`。
- **R2（基础）**：`@RequireRole` + `RequireRoleAspect`；`/user-mgmt`、`/system-config` 已挂角色。
- **R3（基础）**：`UserMgmtServiceImpl.listUsers` 对仅 `dept_admin` 按操作者 `menu_id` 过滤。
- **M1**：`POST /v1/skills/{id}/invoke` → HTTP 调用 + 写 `t_call_log` + Resilience4j 熔断。
- **M2**：`send-sms` / `bind-phone` → `t_sms_verify_code` + Redis 频控（mock 短信）。
- **M3**：`language` / `twoStep` → Redis + `/auth/me` 合并展示。
- **M4**：`user-settings/stats` → `tokenUsage`/`storageUsedMb`/`activeSessions` 接聚合。
- **M5**：`lantu.system.integration-mock` 开关 + `network/apply`/`acl/publish` 带 `mock` 标识。
- **L1–L4**：四个定时任务真实逻辑。
- **L5（部分）**：`@RateLimiter("authLogin")` + `@CircuitBreaker("skillInvoke")` + 429 捕获。

### 第三轮（IMPL-003，2026-03-22）

- **四份文档全面同步**：`backend-architecture.md` 实现状态、`frontend-alignment-handbook.md` §3.1/§3.7/§9.4/§9.5/§10/§12、`bug-fixes.md` IMPL-003、本文件。
- **B1/B2**：`GET /auth/login-history` + `LoginHistory` 实体/Mapper + 登录成功写 `t_login_history`。
- **B3**：`@RequireRole` 扩展至 `HealthController`（写操作）、`MonitoringController`（告警规则 CUD）、`AuditController`（审核通过/驳回）。
- **B4**：技能调用 `insertCallLog` 根据请求/响应 body 长度粗估 `inputTokens`/`outputTokens`（每 4 字符 ≈ 1 token），使 `tokenUsage` 统计非零。
- **B5**：`PlatformRoleMapper.selectRolesByUserId` 加 `ORDER BY r.id ASC`，多角色时主角色确定。

## 高优先级（安全与一致性）

| # | 项 | 说明 |
|---|----|------|
| R1b | **生产关闭 X-User-Id 回退** | 设 `lantu.security.allow-header-user-id-fallback: false`，由网关注入身份。 |
| R2b | **`permissions` JSON 方法级鉴权** | 与 `t_platform_role.permissions` 对齐，替代仅 `role_code`。 |

## 中优先级（业务能力）

| # | 项 | 说明 |
|---|----|------|
| M1b | **技能调用鉴权与配额** | 按用户/租户限流、技能可见性校验。 |
| M2b | **真实短信商** | 替换 mock 日志，对账与签名。 |
| M3b | **资料字段落库** | 若需审计/多副本，将语言、两步验证从 Redis 迁 MySQL。 |
| M4b | **会话与存储精确计量** | `activeSessions` 改为真实会话；存储可含上传文件桶。 |
| M6 | **`dept_admin` 资源过滤** | Agent/Skill/Dataset 等列表按部门 `menu_id` 过滤。 |

## 低优先级（定时任务与运营）

| # | 项 | 说明 |
|---|----|------|
| L5b | **更多 Resilience4j 切面** | 对其他外部 HTTP、文件、邮件等统一限流/熔断。 |

## 文档维护约定

- 完成 **R/M/L** 任一条：勾选或删除本表对应行，并更新 **§9.5.2** 与架构文档「未完全实现」表。  
- 若引入新占位接口：必须在对齐手册 **§9.5.2** 增行。
