# LantuConnect 后端 · 前端对齐手册

> **版本说明**：本文档以当前仓库 **Spring Boot 实现代码** 与 **`sql/schema.sql` 中预设平台角色** 为准，用于与前端一次性对齐 URL、请求头、响应体、分页、错误处理与 RBAC 展示逻辑。  
> **`docs/backend-architecture.md`** 中部分内容为规划/逆向草稿，若与本文冲突，**以本文 + OpenAPI（Swagger）为准**。

**与其它文档的关系**（见仓库根目录 [README.md](../README.md)「文档体系」）：

- **[backend-architecture.md](backend-architecture.md)**：前端提供的后端开发准则，描述目标架构与接口意图；实现细节与差异以**本文**为准。  
- **[bug-fixes.md](bug-fixes.md)**：后端 Bug 与修复记录；若某 Bug 改变了对外行为，本文相应章节应一并更新，或在 Bug 条目中注明已修订本文的章节。

---

## 目录

1. [阅读约定](#1-阅读约定)
2. [环境与入口](#2-环境与入口)
3. [鉴权、JWT 与请求头](#3-鉴权jwt-与请求头)
4. [统一响应与 HTTP 状态](#4-统一响应与-http-状态)
5. [分页：两种 JSON 结构](#5-分页两种-json-结构)
6. [时间与跨域](#6-时间与跨域)
7. [文件上传](#7-文件上传)
8. [联调账号与最小调用链](#8-联调账号与最小调用链)
9. [平台角色与权限（RBAC）](#9-平台角色与权限rbac)
   - [9.5 未完成功能与占位接口](#95-未完成功能与占位接口)
10. [全量 HTTP 接口清单](#10-全量-http-接口清单)
11. [DTO / 字段易错点](#11-dto--字段易错点)
12. [与架构文档的常见差异](#12-与架构文档的常见差异)
13. [对齐会议 Checklist](#13-对齐会议-checklist)
14. [代码覆盖说明（防遗漏）](#14-代码覆盖说明防遗漏)
15. [附录 A：ResultCode 错误码全表](#15-附录-aresultcode-错误码全表)
16. [附录 B：JSON 类型、时间与软删除](#16-附录-bjson-类型时间与软删除)
17. [附录 C：主要请求体 DTO 字段字典](#17-附录-c主要请求体-dto-字段字典)
18. [附录 D：主要响应实体字段字典](#18-附录-d主要响应实体字段字典)
19. [附录 E：上传文件 URL 与 Nginx](#19-附录-e上传文件-url-与-nginx)
20. [附录 F：列表筛选与排序（服务端行为）](#20-附录-f列表筛选与排序服务端行为)
21. [附录 G：联调排错与边界情况](#21-附录-g联调排错与边界情况)

---

## 1. 阅读约定

| 术语 | 含义 |
|------|------|
| **Base** | `http://{host}:8080/api`（`server.servlet.context-path=/api`） |
| **路径** | 下文「路径」均指 **去掉 Base 后的相对路径**（以 `/` 开头） |
| **权限列** | 「建议权限」来自 `t_platform_role.permissions`；管理端 Controller 已挂 `@RequireRole`（按 `role_code`），**`permissions` 细粒度校验仍待完善**，见 [9.4](#94-实现差距重要) |

---

## 2. 环境与入口

| 项 | 值 |
|----|-----|
| 默认端口 | `8080` |
| Context Path | `/api` |
| OpenAPI JSON | `GET /api/v3/api-docs` |
| Swagger UI | 浏览器打开 **`/api/swagger-ui.html`** |
| Actuator | 挂载在 **同一 context-path** 下；`management.endpoints.web.exposure.include` 当前为 **`health,prometheus,info`**，即常见 URL：`/api/actuator/health`、`/api/actuator/prometheus`、`/api/actuator/info`（业务前端一般不调） |

**前端 axios `baseURL` 建议**：`http://localhost:8080/api`（路径不要再前缀 `/api`）。

**业务接口覆盖**：仓库内 **`@RestController` 共 25 个**（均已在第 10 章按模块列出）；**无独立 WebSocket / GraphQL**；`@RestControllerAdvice` 仅 `GlobalExceptionHandler`（统一异常包装，非业务 URL）。

---

## 3. 鉴权、JWT 与请求头

### 3.1 当前实现要点

- Spring Security 配置仍为 `authorizeHttpRequests(anyRequest().permitAll())`，但 **`JwtAuthenticationFilter`（独立 Servlet 过滤器）** 已在 Security 链之前生效：解析 `Authorization: Bearer`，校验 Redis 黑名单，成功后通过 `RequestWrapper` 注入 `X-User-Id`。
- 白名单路径（`/auth/login`、`/auth/register`、`/auth/refresh`、`/auth/logout`、`/auth/send-sms`、Swagger、Actuator 等）跳过校验。
- 可通过 `lantu.security.allow-header-user-id-fallback`（默认 `true`）控制：当请求无有效 Bearer 时是否仍允许裸 `X-User-Id`。**生产建议设为 `false`**，由网关注入 `X-User-Id` 并禁止客户端伪造。
- **方法级 RBAC**：管理端 Controller（`UserMgmtController`、`SystemParamController`、`HealthController` 写操作、`MonitoringController` 告警规则写、审核写操作）已挂 `@RequireRole`，基于 `t_platform_role.role_code` 校验。

**安全提示**：开发/联调阶段 `allow-header-user-id-fallback=true` 时等于可直接传 `X-User-Id`。前端建议 **始终带 `Authorization: Bearer {token}`**，在生产环境切为强制 JWT。

### 3.2 前端建议拦截器

| 场景 | 建议 Header |
|------|-------------|
| 登录后绝大多数需身份接口 | `Authorization: Bearer {token}`（推荐）或 `X-User-Id: {登录响应 user.id}`（开发回退） |
| 创建 Agent 版本 | **`X-Username: {登录用户名/学工号}`**（必填，见 Agent 版本 POST） |
| 发表评论（可选展示名） | `X-Username` 可选 |
| 登出 | `Authorization: Bearer {accessToken}` |
| 刷新 Token | Body 见 `/auth/refresh`，无需 `X-User-Id` |

### 3.3 登录响应字段（勿与前端臆测字段混用）

`POST /auth/login`、`POST /auth/register` 返回 `data`：

| 字段 | 类型 | 说明 |
|------|------|------|
| `token` | string | Access Token（**不是** `accessToken`） |
| `refreshToken` | string | Refresh Token |
| `expiresIn` | number | 过期秒数（配置项，非绝对时间戳） |
| `user` | object | 见 [11.1](#111-userinfovo) |

### 3.4 主角色 `role` 的确定方式（多角色风险）

- `user.role` 与 JWT 内 `role` Claim 来自 **`resolvePrimaryRoleCode`**：查询 `t_user_role_rel` 关联的 `t_platform_role` 列表，取 **列表第一个**。
- SQL `selectRolesByUserId` 已加 **`ORDER BY r.id ASC`**，多角色时取 `id` 最小的角色为主角色。联调建议仍为：**每个测试账号只绑一个平台角色**。

### 3.5 学校身份 vs 平台角色

- 表 **`t_user.role`**（整型）表示校内身份（学生/教师等），与 **平台 RBAC** 不是同一概念。
- 当前 **`UserInfoVO` 不返回 `t_user.role` 整型**，仅返回平台 **`roleCode`**（字符串）。若前端要展示校内身份，需后端扩展字段或另开接口。

### 3.6 JWT 载荷结构（供联调解码核对）

Access Token（`data.token`）与 Refresh Token 均为 HS256 JWT，常用 Claim：

| Claim | Access | Refresh | 说明 |
|-------|--------|---------|------|
| `sub` | 有 | 有 | 用户 ID 字符串 |
| `username` | 有 | 有 | 登录名（学工号） |
| `role` | 有 | 无 | 平台主角色 `roleCode` |
| `type` | 无 | **`refresh`** | 用于 `refresh` 接口校验 |
| `iat` / `exp` | 有 | 有 | 签发/过期时间 |

过期时间：`application.yml` 中 `jwt.access-token-expiry`、`jwt.refresh-token-expiry`（**秒**）；`LoginResponse.expiresIn` 与 Access 一致。

### 3.7 登出、`/auth/refresh` 与 Redis

- **登出 `POST /auth/logout`**：若带合法 Bearer，会将 **Access Token 的 SHA-256** 写入 Redis，键前缀 `token:blacklist:`，TTL 约为 Access 剩余有效期（与 `jwt.access-token-expiry` 相关）。  
- **黑名单已生效**：`JwtAuthenticationFilter` 在每次非白名单请求时会查询 Redis 黑名单；**已登出的 Token 再次请求将返回 401**。若同时开启了 `allow-header-user-id-fallback`（默认 `true`），无 Bearer 但带 `X-User-Id` 的请求仍可放行（生产建议关闭此回退）。
- **`POST /auth/refresh`**：校验 Refresh 合法且 `type=refresh` 后，会将 **本次 Refresh 的哈希** 记入 Redis（`token:refresh:`），**同一 Refresh 不可重复使用**；成功返回 **新的** `token` + `refreshToken`（**轮换**）。前端必须 **用返回的新 Refresh 替换本地旧值**。

### 3.8 Spring Security 全局策略（影响前端是否带 Cookie）

- **CSRF 关闭**（`csrf.disable`），**无 Session Cookie**（`SessionCreationPolicy.STATELESS`）。  
- 前端采用 **Bearer / 本地存储 Token** 即可，无需处理 CSRF Token（与后续若开启 CSRF 需再对齐）。

---

## 4. 统一响应与 HTTP 状态

### 4.1 成功体结构

```json
{
  "code": 0,
  "message": "ok",
  "data": { },
  "timestamp": 1710000000000
}
```

- **业务成功**：`code === 0`（`ResultCode.SUCCESS`）。
- **判断成功**：务必 **以 `code` 为准**，不要仅看 HTTP 状态码。

### 4.2 常见 HTTP 状态与 `code`

| 情况 | HTTP | `body.code` |
|------|------|-------------|
| 业务异常 `BusinessException` | 多为 **200** | 非 0（自定义或枚举） |
| 参数校验失败 | **400** | `1001`（PARAM_ERROR）等 |
| 静态资源 404（Spring 6） | **404** | `1004`（NOT_FOUND）等 |
| 未捕获异常 | **500** | `5001`（INTERNAL_ERROR） |

完整枚举见后端 `com.lantu.connect.common.result.ResultCode`。

---

## 5. 分页：两种 JSON 结构

### 5.1 `PageResult<T>`（大多数列表）

位于 `data` 内：

| 字段 | 类型 | 说明 |
|------|------|------|
| `list` | array | 数据行 |
| `total` | number | 总条数 |
| `page` | number | 当前页（从 1 开始） |
| `pageSize` | number | 每页条数 |

### 5.2 MyBatis-Plus `Page`（仅通知列表）

`GET /notifications` 的 `data` 为 MP 分页对象，典型字段为：

| 字段 | 说明 |
|------|------|
| `records` | 数据行（**不是** `list`） |
| `total` | 总条数 |
| `current` | 当前页 |
| `size` | 每页条数 |
| `pages` | 总页数 |

**前端需分支处理**，或后续让后端改为统一 `PageResult`。

---

## 6. 时间与跨域

| 配置项 | 值 |
|--------|-----|
| Jackson 时区 | `Asia/Shanghai` |
| 日期时间格式 | `yyyy-MM-dd HH:mm:ss` |
| CORS 允许来源 | `cors.allowed-origins`（**逗号分隔多域名**），默认 `http://localhost:3000` |

### 6.1 CORS 细则（`CorsConfig`）

| 项 | 值 |
|----|-----|
| 匹配路径 | `/**`（含所有业务路径） |
| 允许方法 | `GET, POST, PUT, PATCH, DELETE, OPTIONS` |
| 允许请求头 | `*` |
| `allowCredentials` | `true`（带 Cookie/Authorization 时注意与 `allowedOrigins` 不能随意用 `*`） |
| 预检缓存 | `maxAge=3600`（秒） |
| **暴露给前端的响应头** | `X-Request-Id`、`X-Total-Count` |

说明：**`X-Total-Count` 已在 CORS 中暴露**，但当前业务代码 **未统一在响应中写入该头**（预留）；分页总数请以 **body 内** `PageResult.total` / MP `Page.total` 为准。

### 6.2 链路追踪：`X-Request-Id`（`TraceIdFilter`）

| 行为 | 说明 |
|------|------|
| 请求可带 | `X-Request-Id`：自定义追踪 ID |
| 未带时 | 服务端生成 **32 位十六进制**（无连字符 UUID） |
| 响应必回 | **`X-Request-Id`**：与 MDC `traceId` 一致，便于前后端对日志 |

### 6.3 请求体编码与 JSON

除文件上传外，**建议**统一：`Content-Type: application/json; charset=UTF-8`；UTF-8 与库表 `utf8mb4` 一致。

---

## 7. 文件上传

| 项 | 值 |
|----|-----|
| 路径 | `POST /files/upload` |
| Content-Type | `multipart/form-data` |
| 字段名 | **`file`**（必填） |
| 附加字段 | `category`，默认 `document` |
| 成功 `data` | `{ "url": "...", "fileName": "..." }` |
| 允许扩展名 | 见 `application.yml` → `file.allowed-types` |
| 单文件上限 | `file.max-size-mb`（默认 50MB）；超出会走全局异常 → `FILE_SIZE_EXCEEDED` |
| 整请求上限 | `spring.servlet.multipart.max-request-size`（默认 100MB） |

---

## 8. 联调账号与最小调用链

数据见 **`sql/seed-data.sql`**（密码见脚本注释，一般为 `Admin123`）。

| 登录名（username） | user_id（`X-User-Id`） | 平台角色 role_code |
|--------------------|------------------------|---------------------|
| `admin` | `1` | `platform_admin` |
| `dept_admin` | `2` | `dept_admin` |
| `developer` | `3` | `developer` |
| `testuser` | `4` | `user` |

**最小链**：

1. `POST /auth/login`，Body：`{ "username":"admin", "password":"Admin123" }`
2. 取 `data.user.id` → 后续请求加 `X-User-Id: 1`
3. `GET /agents?page=1&pageSize=20`（列表无需 Header，但创建需要）

```http
POST /api/auth/login
Content-Type: application/json

{"username":"admin","password":"Admin123"}
```

```http
GET /api/agents?page=1&pageSize=10
X-User-Id: 1
```

---

## 9. 平台角色与权限（RBAC）

### 9.1 权威来源

预设角色与 `permissions` JSON 定义在 **`sql/schema.sql`**（`INSERT INTO t_platform_role`）。

### 9.2 权限标识一览（表 B）

| 权限标识 | 含义（产品语义） | 主要对应接口域（建议前端模块） |
|----------|------------------|--------------------------------|
| `agent:view` | 浏览 Agent | `GET /agents`、`GET /agents/{id}`、版本列表等 |
| `agent:create` | 新建 Agent | `POST /agents` |
| `agent:edit` | 编辑 Agent | `PUT /agents/{id}` |
| `agent:delete` | 删除 Agent | `DELETE /agents/{id}` |
| `agent:publish` | 发布/回滚版本 | `POST /versions/{id}/publish`、`rollback` |
| `agent:audit` | 审核 Agent | `/audit/agents*` |
| `skill:view` | 浏览 Skill / MCP | `/v1/skills*`、`/v1/mcp-servers` |
| `skill:create` | 新建 Skill | `POST /v1/skills` |
| `skill:edit` | 编辑 Skill | `PUT /v1/skills/{id}` |
| `skill:delete` | 删除 Skill | `DELETE /v1/skills/{id}` |
| `skill:publish` | 发布 Skill（若流程合并到状态） | 视业务：含 invoke 测试等 |
| `skill:audit` | 审核 Skill | `/audit/skills*` |
| `app:view` | 浏览应用 | `GET /v1/apps*` |
| `app:create` | 新建应用 | `POST /v1/apps` |
| `app:edit` | 编辑应用 | `PUT /v1/apps/{id}` |
| `app:delete` | 删除应用 | `DELETE /v1/apps/{id}` |
| `dataset:view` | 浏览数据集 | `GET /v1/datasets*` |
| `dataset:create` | 新建数据集 | `POST /v1/datasets` |
| `dataset:edit` | 编辑数据集 | `PUT /v1/datasets/{id}` |
| `dataset:delete` | 删除数据集 | `DELETE /v1/datasets/{id}` |
| `provider:manage` | 提供商管理 | `/v1/providers*` |
| `user:manage` | 用户/角色/组织等 | `/user-mgmt/*` |
| `system:config` | 系统参数/安全/模型/配额/限流等 | `/system-config/*`、`/quotas`、`/rate-limits`、`/system-config/rate-limits`、`/system-config/model-configs` |
| `monitor:view` | 监控只读 | `GET /monitoring/*`（写告警规则是否开放见下表） |
| `audit:manage` | 审核操作 | `POST /audit/*` |

**说明**：`monitor:view` 与「创建/修改告警规则」在预设权限里**未单独拆分**；当前 `platform_admin` 拥有全部权限，其他角色无 `system:config` 时，建议前端 **隐藏告警规则写接口**，待产品与后端明确后再放开。

### 9.3 各角色「能干什么」（表 A，与数据库一致）

以下严格对应 `schema.sql` 中 JSON。**未列出的权限即该角色不具备（前端应隐藏或禁用）。**

#### platform_admin（平台管理员）

拥有：`agent:*`、`skill:*`、`app:*`、`dataset:*`、`provider:manage`、`user:manage`、`system:config`、`monitor:view`、`audit:manage`。

**概括**：全平台配置、全资源 CRUD、发布、审核、用户与组织、监控只读、审核通过/驳回。

#### dept_admin（部门管理员）

拥有：

`agent:view,create,edit,audit`（**无** `delete` / `publish`）  
`skill:view,create,edit,audit`（**无** `delete` / `publish`）  
`app:view`（**无** `create` / `edit` / `delete`）  
`dataset:view,create,edit`（**无** `delete`）  
`user:manage`、`monitor:view`

**概括**：本部门语义上的资源管理（**后端是否按部门过滤数据见 [9.4](#94-实现差距重要)**）、可审核 Agent/Skill、可管用户与组织、可看监控；**不能**删除 Agent/Skill、**不能**执行版本发布/回滚、**不能**改应用、**不能**删数据集、**无**提供商与系统配置、**无**平台级审核管理以外的全局配置。

#### developer（开发者）

拥有：

`agent:view,create,edit,publish`（**无** `delete` / `audit`）  
`skill:view,create,edit,publish`（**无** `delete` / `audit`）  
`app:view`  
`dataset:view`（**无** `create` / `edit` / `delete`）

**概括**：开发与发布自己的 Agent/Skill、浏览应用与市场类数据、浏览数据集；**不能**审核、**不能**删除 Agent/Skill、**不能**新建/编辑数据集、**不能**进管理端用户/系统配置。

#### user（普通用户）

拥有：`agent:view`、`skill:view`、`app:view`、`dataset:view`。

**概括**：浏览「市场」类资源；收藏、使用记录、评论、个人设置等 **个人向接口** 在实现上常需 `X-User-Id`，与 `permissions` 数组**无直接一一对应**，建议前端：**登录用户均可访问个人中心相关接口**，与角色数组并行。

### 9.4 实现差距（重要）

1. **`permissions` JSON 细粒度鉴权未做**：`@RequireRole` 仅按 `role_code` 校验（`platform_admin`/`dept_admin` 等），**未逐条比对 `t_platform_role.permissions` 数组**（如 `agent:delete`）。前端仍应按权限数组隐藏按钮。  
2. **`dept_admin` 部门范围**：`/user-mgmt/users` 已对仅 `dept_admin` 按操作者 `menu_id` 过滤；其余资源列表（Agent/Skill/Dataset 等）**未强制按部门过滤**（需后续迭代）。  
3. **双套限流**：`/rate-limits`（配额侧滑窗等）与 `/system-config/rate-limits`（规则 CRUD）并存，含义不同，勿混用。  
4. ~~Access Token 黑名单请求链路不校验~~ → **已修复**：`JwtAuthenticationFilter` 校验 Bearer 时查询 Redis 黑名单，已登出 Token 返回 401。  
5. **Resilience4j**：**部分已挂注解**：`@RateLimiter("authLogin")` 在登录接口、`@CircuitBreaker("skillInvoke")` 在技能出站调用；`GlobalExceptionHandler` 捕获 `RequestNotPermitted` 返回 429。其余外部调用尚未统一挂注解。

### 9.5 未完成功能与占位接口

与 `docs/backend-architecture.md`「后端实现状态说明」同步。下列分为 **已接真实/聚合数据**（可联调展示）与 **仍为占位**。

#### 9.5.1 已完善（可联调）

| 路径 / 范围 | 行为说明 |
|-------------|----------|
| `GET /monitoring/performance` | 基于 `t_call_log` **近 24 小时、按小时**返回 `bucket`、`avgLatencyMs`、`requestCount`；无调用日志时为 `[]`。 |
| `GET /dashboard/admin-overview` | 汇总用户/Agent/Skill/App/Dataset 数量、当日调用次数、待审核数；`charts` 含近 7 日按日调用量。 |
| `GET /dashboard/user-workspace` | `profile` 来自 `t_user`；`recent` 为最近使用记录；`widgets` 含收藏数、未读通知数。 |
| `GET /dashboard/health-summary` | 健康配置数量、OPEN 状态熔断器数量及聚合 `status`。 |
| `GET /dashboard/usage-stats` | `range` 支持 `7d`/`30d` 等简写；`series` 为按日调用与延迟；`breakdown.topPaths` 为热门路径。 |
| `GET /dashboard/data-reports` | 按路径聚合请求量与平均延迟（Top N）。 |
| `GET /user/my-agents`、`GET /user/my-skills` | 按 **`created_by = X-User-Id`** 返回列表（无记录则为 `[]`）。 |
| `GET /user/usage-stats` | `counters` 含总记录数、按 `target_type` 聚合；`trends.last7Days` 为近 7 日按天统计。 |
| `GET/PUT /user-settings/workspace` | **Redis** 持久化（键 `lantu:usersettings:workspace:{userId}`，JSON，**TTL 365 天**），非 DB 表。 |
| `GET /user-settings/stats` | `totalAgents`/`totalWorkflows`/`totalApiCalls` 真实统计；`tokenUsage`（近 30 天 `t_call_log` token 合计，依赖调用写入）、`storageUsedMb`（用户数据集 `file_size`）、`activeSessions`（近 24h 调用条数，非真实会话）。 |
| `POST /v1/skills/{id}/invoke` | **已实现**：读取 `spec_json.url` 发起真实 HTTP POST，写入 `t_call_log`（含 token 粗估），超时/熔断/异常均记录。 |
| `POST /auth/send-sms`、`POST /auth/bind-phone` | **mock 阶段**：验证码写入 `t_sms_verify_code` + Redis 60s 频控，验证码打日志（`[SMS mock]`），**未对接真实短信商**。`bind-phone` 校验验证码后更新 `t_user.mobile`。 |
| `PUT /auth/profile` | `avatar` 写入 `t_user`；`language`/`twoStep` 持久化到 Redis `lantu:user:pref:{userId}`；`/auth/me` 合并展示。 |
| JWT 过滤器 | `JwtAuthenticationFilter` 解析 Bearer + 查黑名单 + 注入 `X-User-Id`。见 §3.1。 |
| `@RequireRole` RBAC | 管理端 Controller 已挂 `role_code` 校验。`permissions` JSON 细粒度校验仍以后续增强为主。 |
| Resilience4j | 登录 `@RateLimiter`、技能出站 `@CircuitBreaker`、`GlobalExceptionHandler` 捕获 429。 |
| 定时任务 | `UserRoleCountSyncTask`（同步 `user_count`）、`ProviderCountSyncTask`（`agent_count`/`skill_count`）、`HealthCheckTask`（HTTP 探测）、`ExpiredTokenCleanupTask`（清理孤立键）**均已实现**。`QuotaDailyResetTask`、`QuotaMonthlyResetTask`、`CircuitBreakerStateTask` 已有真实逻辑。 |
| `GET /auth/login-history` | **已实现**：按 `user_id` 分页查询 `t_login_history`，登录成功时自动写入记录。 |

#### 9.5.2 仍为占位或未完成

| 路径 / 范围 | 行为说明 |
|-------------|----------|
| `POST /system-config/network/apply`、`/acl/publish` | 返回带 `mock` 标识的 JSON（受 `lantu.system.integration-mock` 开关控制），无真实网络/ACL 下发。 |
| `permissions` JSON 细粒度鉴权 | `@RequireRole` 仅按 `role_code` 校验，未逐条比对 `permissions` 数组。见 §9.4。 |
| 短信真实对接 | `send-sms` 为 mock（验证码打日志），未对接短信商。 |
| `dept_admin` 资源过滤 | 仅 `/user-mgmt/users` 按部门过滤；Agent/Skill/Dataset 等列表未强制按部门。 |

---

## 10. 全量 HTTP 接口清单

**表列说明**：**权限**列为「建议前端按 RBAC 控制」的依据，**非后端强制**。

**非 HTTP 能力**：`com.lantu.connect.task` 包内为 **`@Scheduled` 定时任务**，**不对外暴露 REST**；**全部任务均已实现真实逻辑**（角色计数同步、提供商计数同步、健康探测、过期黑名单清理、配额重置、熔断巡检）。监控与 KPI 以 **第 10.7 节接口** 为准。

### 10.1 认证 `/auth`

| 方法 | 路径 | 说明 | Body / Query | 必需 Header | 响应 data | 建议权限 |
|------|------|------|--------------|-------------|-----------|----------|
| POST | `/auth/login` | 登录 | `LoginRequest` | 无 | `LoginResponse` | 公开 |
| POST | `/auth/register` | 注册 | `RegisterRequest` | 无 | `LoginResponse` | 公开 |
| POST | `/auth/logout` | 登出 | 无 | `Authorization: Bearer` | null | 已登录 |
| GET | `/auth/me` | 当前用户 | 无 | `X-User-Id` | `UserInfoVO` | 已登录 |
| POST | `/auth/refresh` | 刷新 | `RefreshTokenRequest` | 无 | `TokenResponse` | 公开 |
| POST | `/auth/change-password` | 改密 | `ChangePasswordRequest` | `X-User-Id` | null | 已登录 |
| PUT | `/auth/profile` | 更新资料 | `ProfileUpdateRequest` | `X-User-Id` | null | 已登录 |
| POST | `/auth/send-sms` | 发短信（mock） | `{"phone":"...", "purpose":"bind_phone"}` | 无 | null | 公开 |
| POST | `/auth/bind-phone` | 绑手机 | `{"phone":"...", "code":"..."}` | `X-User-Id` | null | 已登录 |
| GET | `/auth/login-history` | 登录历史 | `page,pageSize` | `X-User-Id` | `PageResult<LoginHistory>` | 已登录 |

### 10.2 Agent `/agents` + 版本（注意无类前缀）

| 方法 | 路径 | 说明 | Body / Query | 必需 Header | 响应 data | 建议权限 |
|------|------|------|--------------|-------------|-----------|----------|
| GET | `/agents` | 分页列表 | `AgentQueryRequest` | 无 | `PageResult<Agent>` | `agent:view` |
| POST | `/agents` | 创建 | `AgentCreateRequest` | `X-User-Id` | `Agent` | `agent:create` |
| GET | `/agents/{id}` | 详情 | Path `id` | 无 | `Agent` | `agent:view` |
| PUT | `/agents/{id}` | 更新 | `AgentUpdateRequest` | 无 | `Agent` | `agent:edit` |
| DELETE | `/agents/{id}` | 删除 | Path `id` | 无 | null | `agent:delete` |
| GET | `/agents/{agentId}/versions` | 版本列表 | Path | 无 | `List<AgentVersion>` | `agent:view` |
| POST | `/agents/{agentId}/versions` | 新建版本 | `VersionCreateRequest` | **`X-Username`** | `AgentVersion` | `agent:edit` |
| POST | `/versions/{versionId}/publish` | 发布 | Path | 无 | null | `agent:publish` |
| POST | `/versions/{versionId}/rollback` | 回滚 | Path | 无 | null | `agent:publish` |

### 10.3 Skill `/v1/skills`、MCP `/v1/mcp-servers`

| 方法 | 路径 | 说明 | Body / Query | 必需 Header | 响应 data | 建议权限 |
|------|------|------|--------------|-------------|-----------|----------|
| GET | `/v1/skills` | 分页列表 | `SkillQueryRequest` | 无 | `PageResult<Skill>` | `skill:view` |
| POST | `/v1/skills` | 创建 | `SkillCreateRequest` | `X-User-Id` | `Skill` | `skill:create` |
| GET | `/v1/skills/{id}` | 详情 | Path | 无 | `Skill` | `skill:view` |
| PUT | `/v1/skills/{id}` | 更新 | `SkillUpdateRequest` | 无 | `Skill` | `skill:edit` |
| DELETE | `/v1/skills/{id}` | 删除 | Path | 无 | null | `skill:delete` |
| POST | `/v1/skills/{id}/invoke` | 调用技能 | `Map` | `X-User-Id` | `Map`（`result`/`latencyMs`/`statusCode`） | `skill:view` |
| GET | `/v1/mcp-servers` | 已发布 MCP 根 | 无 | 无 | `List<Skill>` | `skill:view` |

### 10.4 应用 `/v1/apps`

| 方法 | 路径 | 说明 | Body / Query | 必需 Header | 响应 data | 建议权限 |
|------|------|------|--------------|-------------|-----------|----------|
| GET | `/v1/apps` | 分页 | `AppQueryRequest` | 无 | `PageResult<SmartApp>` | `app:view` |
| POST | `/v1/apps` | 创建 | `AppCreateRequest` | `X-User-Id` | `SmartApp` | `app:create` |
| GET | `/v1/apps/{id}` | 详情 | Path | 无 | `SmartApp` | `app:view` |
| PUT | `/v1/apps/{id}` | 更新 | `AppUpdateRequest` | 无 | `SmartApp` | `app:edit` |
| DELETE | `/v1/apps/{id}` | 删除 | Path | 无 | null | `app:delete` |

### 10.5 数据集 `/v1/datasets`、提供商 `/v1/providers`、分类 `/v1/categories`、标签 `/tags`

| 方法 | 路径 | 说明 | Body / Query | 必需 Header | 响应 data | 建议权限 |
|------|------|------|--------------|-------------|-----------|----------|
| GET | `/v1/datasets` | 分页 | `DatasetQueryRequest` | 无 | `PageResult<Dataset>` | `dataset:view` |
| POST | `/v1/datasets` | 创建 | `DatasetCreateRequest` | 无 | `Long` id | `dataset:create` |
| GET | `/v1/datasets/{id}` | 详情 | Path | 无 | `Dataset` | `dataset:view` |
| PUT | `/v1/datasets/{id}` | 更新 | `DatasetUpdateRequest` | 无 | null | `dataset:edit` |
| DELETE | `/v1/datasets/{id}` | 删除 | Path | 无 | null | `dataset:delete` |
| POST | `/v1/datasets/{id}/apply` | 权限申请 | Query `reason` | 无 | null | `dataset:view` |
| GET | `/v1/providers` | 分页 | `ProviderQueryRequest` | 无 | `PageResult<Provider>` | `provider:manage` |
| POST | `/v1/providers` | 创建 | `ProviderCreateRequest` | 无 | `Long` | `provider:manage` |
| GET | `/v1/providers/{id}` | 详情 | Path | 无 | `Provider` | `provider:manage` |
| PUT | `/v1/providers/{id}` | 更新 | `ProviderUpdateRequest` | 无 | null | `provider:manage` |
| DELETE | `/v1/providers/{id}` | 删除 | Path | 无 | null | `provider:manage` |
| GET | `/v1/categories` | 分类树 | 无 | 无 | `List<CategoryVO>` | 建议登录用户可读 |
| POST | `/v1/categories` | 创建 | `CategoryCreateRequest` | 无 | `Long` | `system:config` 或运营 |
| PUT | `/v1/categories/{id}` | 更新 | `CategoryUpdateRequest` | 无 | null | 同上 |
| DELETE | `/v1/categories/{id}` | 删除 | Path | 无 | null | 同上 |
| GET | `/tags` | 标签列表 | 无 | 无 | `List<Tag>` | 建议登录用户可读 |
| POST | `/tags` | 创建 | `TagCreateRequest` | 无 | `Long` | 运营/管理员 |
| POST | `/tags/batch` | 批量创建 | `List<TagCreateRequest>` | 无 | `List<Long>` | 同上 |
| DELETE | `/tags/{id}` | 删除 | Path | 无 | null | 同上 |

### 10.6 用户管理 `/user-mgmt`

| 方法 | 路径 | 说明 | Body / Query | 必需 Header | 响应 data | 建议权限 |
|------|------|------|--------------|-------------|-----------|----------|
| GET | `/user-mgmt/users` | 用户分页 | `UserQueryRequest` | 无 | `PageResult<User>` | `user:manage` |
| POST | `/user-mgmt/users` | 创建 | `CreateUserRequest` | 无 | `User` | `user:manage` |
| PUT | `/user-mgmt/users/{id}` | 更新 | `UpdateUserRequest` | 无 | null | `user:manage` |
| DELETE | `/user-mgmt/users/{id}` | 删除 | Path | 无 | null | `user:manage` |
| GET | `/user-mgmt/roles` | 角色列表 | 无 | 无 | `List<PlatformRole>` | `user:manage` |
| POST | `/user-mgmt/roles` | 创建角色 | `RoleCreateRequest` | 无 | `PlatformRole` | `user:manage` |
| PUT | `/user-mgmt/roles/{id}` | 更新角色 | `RoleUpdateRequest` | 无 | null | `user:manage` |
| DELETE | `/user-mgmt/roles/{id}` | 删除角色 | Path | 无 | null | `user:manage` |
| GET | `/user-mgmt/api-keys` | 全局 Key 列表 | 无 | 无 | `List<ApiKey>` | `user:manage` |
| POST | `/user-mgmt/api-keys` | 创建 | `ApiKeyCreateRequest` | 无 | `ApiKeyResponse` | `user:manage` |
| PATCH | `/user-mgmt/api-keys/{id}/revoke` | 吊销 | Path | 无 | null | `user:manage` |
| GET | `/user-mgmt/tokens` | Token 列表 | 无 | 无 | `List<AccessToken>` | `user:manage` |
| POST | `/user-mgmt/tokens` | 创建 | `TokenCreateRequest` | 无 | `TokenResponse` | `user:manage` |
| PATCH | `/user-mgmt/tokens/{id}/revoke` | 吊销 | Path | 无 | null | `user:manage` |
| GET | `/user-mgmt/org-tree` | 组织树 | 无 | 无 | `List<OrgNodeVO>` | `user:manage` |

### 10.7 监控 `/monitoring`

| 方法 | 路径 | 说明 | Query | 必需 Header | 响应 data | 建议权限 |
|------|------|------|-------|-------------|-----------|----------|
| GET | `/monitoring/kpis` | KPI | 无 | 无 | `List<KpiMetric>` | `monitor:view` |
| GET | `/monitoring/performance` | 性能占位 | 无 | 无 | `[]` | `monitor:view` |
| GET | `/monitoring/call-logs` | 调用日志 | `PageQuery` | 无 | `PageResult<CallLog>` | `monitor:view` |
| GET | `/monitoring/alerts` | 告警记录 | `PageQuery` | 无 | `PageResult<AlertRecord>` | `monitor:view` |
| GET | `/monitoring/traces` | 链路 | `PageQuery` | 无 | `PageResult<TraceSpan>` | `monitor:view` |
| POST | `/monitoring/alert-rules` | 创建规则 | `AlertRuleCreateRequest` | 无 | `String` id | `system:config`（建议） |
| PUT | `/monitoring/alert-rules/{id}` | 更新 | `AlertRuleUpdateRequest` | 无 | null | 同上 |
| DELETE | `/monitoring/alert-rules/{id}` | 删除 | Path | 无 | null | 同上 |
| GET | `/monitoring/alert-rules/{id}` | 详情 | Path | 无 | `AlertRule` | `monitor:view` |
| GET | `/monitoring/alert-rules` | 分页 | `page,pageSize,name` | 无 | `PageResult<AlertRule>` | `monitor:view` |

`PageQuery` 字段：`page`、`pageSize`、`keyword`。

### 10.8 健康 `/health`

| 方法 | 路径 | 说明 | Body | 必需 Header | 建议权限 |
|------|------|------|------|-------------|----------|
| GET | `/health/configs` | 配置列表 | 无 | 无 | `system:config` |
| POST | `/health/configs` | 新增 | `HealthConfigUpsertRequest` | 无 | 同上 |
| PUT | `/health/configs/{id}` | 更新 | `HealthConfigUpsertRequest` | 无 | 同上 |
| DELETE | `/health/configs/{id}` | 删除 | 无 | 无 | 同上 |
| GET | `/health/circuit-breakers` | 熔断器列表 | 无 | 无 | 同上 |
| PUT | `/health/circuit-breakers/{id}` | 更新熔断 | `CircuitBreakerUpdateRequest` | 无 | 同上 |
| POST | `/health/circuit-breakers/{id}/break` | 手动打开 | `CircuitBreakerManualRequest` 可选 | 无 | 同上 |
| POST | `/health/circuit-breakers/{id}/recover` | 恢复 | 无 | 无 | 同上 |

### 10.9 系统配置 `/system-config`、配额 `/quotas`、限流

| 方法 | 路径 | 说明 | Body / Query | 建议权限 |
|------|------|------|--------------|----------|
| GET | `/system-config/params` | 系统参数 | 无 | `system:config` |
| PUT | `/system-config/params` | 更新参数 | `SystemParamUpsertRequest` | `system:config` |
| GET | `/system-config/security` | 安全项 | 无 | `system:config` |
| PUT | `/system-config/security` | 更新安全 | `SecuritySettingUpsertRequest` | `system:config` |
| GET | `/system-config/audit-logs` | 审计日志分页 | `AuditLogQueryRequest` | `system:config` |
| POST | `/system-config/network/apply` | 网络申请占位 | 无 | `system:config` |
| POST | `/system-config/acl/publish` | ACL 发布占位 | 无 | `system:config` |
| POST | `/system-config/model-configs` | 创建 | `ModelConfigCreateRequest` | `system:config` |
| PUT | `/system-config/model-configs/{id}` | 更新 | `ModelConfigUpdateRequest` | `system:config` |
| DELETE | `/system-config/model-configs/{id}` | 删除 | Path `id` | `system:config` |
| GET | `/system-config/model-configs/{id}` | 详情 | Path | `system:config` |
| GET | `/system-config/model-configs` | 分页 | `ModelConfigQueryRequest` | `system:config` |
| POST | `/system-config/rate-limits` | 创建规则 | `RateLimitRuleCreateRequest` | `system:config` |
| PUT | `/system-config/rate-limits/{id}` | 更新 | `RateLimitRuleUpdateRequest` | `system:config` |
| DELETE | `/system-config/rate-limits/{id}` | 删除 | Path | `system:config` |
| GET | `/system-config/rate-limits/{id}` | 详情 | Path | `system:config` |
| GET | `/system-config/rate-limits` | 分页 | `page,pageSize,name` | `system:config` |
| POST | `/quotas` | 创建配额 | `QuotaCreateRequest` | `system:config` |
| PUT | `/quotas` | 更新配额 | `QuotaUpdateRequest` | `system:config` |
| DELETE | `/quotas/{id}` | 删除 | Path | `system:config` |
| GET | `/quotas/{id}` | 详情 | Path | `system:config` |
| GET | `/quotas` | 分页 | `page,pageSize,subjectType` | `system:config` |
| POST | `/rate-limits` | 创建配额侧限流 | `QuotaRateLimitCreateRequest` | `system:config` |
| DELETE | `/rate-limits/{id}` | 删除 | Path | `system:config` |
| GET | `/rate-limits/{id}` | 详情 | Path | `system:config` |
| GET | `/rate-limits` | 分页 | `page,pageSize,quotaId` | `system:config` |
| PATCH | `/rate-limits/{id}` | 启用/禁用 | `QuotaRateLimitToggleRequest` | `system:config` |

### 10.10 审核 `/audit`

| 方法 | 路径 | 说明 | Body | 建议权限 |
|------|------|------|------|----------|
| GET | `/audit/agents` | 待审 Agent 分页 | `page,pageSize` | `agent:audit` |
| GET | `/audit/skills` | 待审 Skill 分页 | `page,pageSize` | `skill:audit` |
| POST | `/audit/agents/{id}/approve` | 通过 | 无 | `audit:manage` + `agent:audit` |
| POST | `/audit/skills/{id}/approve` | 通过 | 无 | `audit:manage` + `skill:audit` |
| POST | `/audit/agents/{id}/reject` | 驳回 | `{"reason":"..."}` | `audit:manage` |
| POST | `/audit/skills/{id}/reject` | 驳回 | 同上 | `audit:manage` |

### 10.11 评论 `/reviews`

| 方法 | 路径 | 说明 | Query / Body | 必需 Header | 建议权限 |
|------|------|------|--------------|-------------|----------|
| GET | `/reviews` | 列表 | `targetType`,`targetId` | 无 | 登录用户可读 |
| GET | `/reviews/summary` | 汇总 | 同上 | 无 | 登录用户可读 |
| POST | `/reviews` | 创建 | `ReviewCreateRequest` | `X-User-Id`，`X-Username` 可选 | 登录用户 |
| POST | `/reviews/{id}/helpful` | 有用 | Path | `X-User-Id` | 登录用户 |

### 10.12 用户活动 `/user`

| 方法 | 路径 | 说明 | Query | 必需 Header |
|------|------|------|-------|-------------|
| GET | `/user/usage-records` | 使用记录分页 | `page,pageSize,type` | `X-User-Id` |
| GET | `/user/favorites` | 收藏列表 | 无 | `X-User-Id` |
| POST | `/user/favorites` | 添加收藏 | `FavoriteCreateRequest` | `X-User-Id` |
| DELETE | `/user/favorites/{id}` | 取消收藏 | Path | `X-User-Id` |
| GET | `/user/usage-stats` | 统计 | 无 | `X-User-Id` |
| GET | `/user/my-agents` | 我的 Agent | 无 | `X-User-Id` |
| GET | `/user/my-skills` | 我的 Skill | 无 | `X-User-Id` |

### 10.13 用户设置 `/user-settings`

| 方法 | 路径 | 必需 Header |
|------|------|-------------|
| GET/PUT | `/user-settings/workspace` | `X-User-Id` |
| GET/POST/DELETE | `/user-settings/api-keys` / `.../{id}` | `X-User-Id` |
| GET | `/user-settings/stats` | `X-User-Id` |

### 10.14 通知 `/notifications`

| 方法 | 路径 | Query | 必需 Header | 响应 data 类型 |
|------|------|-------|-------------|----------------|
| GET | `/notifications` | `page,pageSize` | `X-User-Id` | **`Page<Notification>`（MP）** |
| GET | `/notifications/unread-count` | 无 | `X-User-Id` | `{"count":n}` |
| POST | `/notifications/{id}/read` | Path | `X-User-Id` | null |
| POST | `/notifications/read-all` | 无 | `X-User-Id` | null |

### 10.15 仪表盘 `/dashboard`

| 方法 | 路径 | 必需 Header | 建议权限 |
|------|------|-------------|----------|
| GET | `/dashboard/admin-overview` | 无 | `platform_admin` 或管理端 |
| GET | `/dashboard/user-workspace` | `X-User-Id` | 登录用户 |
| GET | `/dashboard/health-summary` | 无 | 管理端 |
| GET | `/dashboard/usage-stats` | Query `range` | 管理端 |
| GET | `/dashboard/data-reports` | Query `range` | 管理端 |

### 10.16 文件 `/files`

见 [第 7 节](#7-文件上传)。

---

## 11. DTO / 字段易错点

### 11.1 `UserInfoVO`

| JSON 字段 | 实际来源（注意） |
|-----------|------------------|
| `id` | `userId` 字符串 |
| **`username`** | **`realName`（真实姓名），不是登录名** |
| `email` | `mail` |
| `phone` | `mobile` |
| `avatar` | `headImage` |
| `nickname` | 当前同 `realName` |
| `role` | 平台 `roleCode`（多角色时不稳定，见 3.4） |
| `department` | 由 `menu_id` 查组织名 |

登录名仅出现在 **`LoginRequest.username`**，前端若要展示学工号需自行缓存登录表单或要求后端扩展字段。

### 11.1.1 用户管理接口返回的 `User` 实体（`/user-mgmt/users`）

列表/详情直接序列化 **`com.lantu.connect.auth.entity.User`**：

| 注意点 | 说明 |
|--------|------|
| 主键字段名 | **`userId`**（不是 `id`） |
| 密码 | `passwordHash` 带 **`@JsonIgnore`**，**不会**出现在 JSON 中 |
| 其它字段 | `username`、`realName`、`mail`、`mobile`、`status` 等与表结构一致（驼峰） |

### 11.2 评论与收藏的 `targetType`

- **后端不校验**枚举：`ReviewService` / 收藏逻辑仅按字符串写入与查询。  
- **建议取值**：与资源类型一致，如 **`agent`**、**`skill`**、**`app`**、**`dataset`**（全小写），避免前后端拼写不一致导致列表为空。

### 11.3 Agent / Skill 状态等枚举

以数据库 `t_agent.status`、`t_skill.status` 及 Swagger 上实体字段说明为准（如 `draft` / `testing` / `published` 等）。

### 11.4 列表接口 Query 参数速查（`GET` 分页/筛选）

以下均为 **Query String**，未列表示无额外筛选（仅分页或无条件）。

| 接口 | Java 绑定类型 | 主要参数（默认值） |
|------|----------------|-------------------|
| `GET /agents` | `AgentQueryRequest` | `page`(1), `pageSize`(20), `keyword`, `status`, `sourceType`, `agentType`, `categoryId` |
| `GET /v1/skills` | `SkillQueryRequest` | `page`(1), `pageSize`(20), `keyword`, `status`, `sourceType`, `parentId`, `categoryId` |
| `GET /v1/apps` | `AppQueryRequest` | `page`(1), `pageSize`(20), `keyword`, `status`, `embedType`, `sourceType`, `categoryId` |
| `GET /v1/datasets` | `DatasetQueryRequest` | `page`(1), `pageSize`(10), `name`, `categoryId`, `providerId`, `status`, `publishStatus` |
| `GET /v1/providers` | `ProviderQueryRequest` | `page`(1), `pageSize`(10), `name`, `type`, `status` |
| `GET /user-mgmt/users` | `UserQueryRequest` | `page`(1), `pageSize`(10), `sortBy`, `sortOrder` |
| `GET /system-config/audit-logs` | `AuditLogQueryRequest` | `page`(1), `pageSize`(20), `userId`, `action` |
| `GET /system-config/model-configs` | `ModelConfigQueryRequest` | `page`(1), `pageSize`(10), `name`, `provider` |
| `GET /monitoring/call-logs` 等 | `PageQuery` | `page`(1), `pageSize`(10), `keyword` |
| `GET /monitoring/alert-rules` | 显式 `@RequestParam` | `page`, `pageSize`, `name` |
| `GET /system-config/rate-limits` | 同上 | `page`, `pageSize`, `name` |
| `GET /quotas` | 同上 | `page`, `pageSize`, `subjectType` |
| `GET /rate-limits` | 同上 | `page`, `pageSize`, `quotaId` |
| `GET /audit/agents` / `skills` | 显式 `@RequestParam` | `page`(1), `pageSize`(20) |
| `GET /notifications` | 显式 `@RequestParam` | `page`(1), `pageSize`(10) |
| `GET /user/usage-records` | 显式 `@RequestParam` | `page`(1), `pageSize`(20), `type` |
| `GET /reviews` | 必填 Query | **`targetType`**, **`targetId`** |
| `GET /dashboard/usage-stats` | 可选 | `range` |
| `GET /dashboard/data-reports` | 可选 | `range` |

### 11.5 认证相关 DTO 校验（与前端表单对齐）

**`LoginRequest`**：`username`、`password` `@NotBlank`；`captcha`、`remember` 可选（**服务端当前未用验证码逻辑**）。

**`RegisterRequest`**：`username` 非空；`email` 符合邮箱格式；`password` 与注册/改密规则一致（≥8 且同时含字母与数字，见 `@Pattern`）；`confirmPassword` 非空且须与 `password` **一致**（否则 `PARAM_ERROR`）；`phone`、`captcha` 可选。  
**注册默认落库**（`AuthServiceImpl`）：`schoolId=1`、`t_user.role=0`（校内身份）、`realName=username`、`status=active`，并自动绑定平台角色 **`user`**（若库中存在该角色）。

**`ChangePasswordRequest`**：`oldPassword` 非空；`newPassword` 规则同注册密码。

**`RefreshTokenRequest`**：`refreshToken` `@NotBlank`。

### 11.6 `LoginResponse` vs `TokenResponse`

| 字段 | `LoginResponse`（登录/注册） | `TokenResponse`（仅 refresh） |
|------|------------------------------|------------------------------|
| `token` | 有 | 有 |
| `refreshToken` | 有 | 有 |
| `expiresIn` | **有**（秒） | **无** |
| `user` | **有** | **无** |

刷新成功后请用新 `token` 替换旧 Access；**`expiresIn` 仍以配置为准或沿用上次登录所知秒数**（可与后端约定是否补充）。

### 11.7 `PUT /auth/profile`（`ProfileUpdateRequest`）

DTO 含 `avatar`、`language`、`twoStep`。**当前实现仅将 `avatar` 写入 `t_user.head_image`**，`language` / `twoStep` **未落库**（前端勿当作已持久化）。

---

## 12. 与架构文档的常见差异

| 架构文档可能描述 | 当前实现 |
|------------------|----------|
| JWT 全局鉴权 | **`JwtAuthenticationFilter` 已实现**（Bearer 解析 + 黑名单 + X-User-Id 回退）；Spring Security 仍为 `permitAll`（JWT 在独立 Filter 完成） |
| 登出即 Token 全局失效 | Redis 黑名单 + **`JwtAuthenticationFilter` 请求链校验**（已登出 Token → 401） |
| Flyway 目录 | 仓库使用 **`sql/schema.sql` + `seed-data.sql`** |
| 部分 Filter/幂等 | 未全部落地 |
| `accessToken` 字段名 | 实为 **`token`** |
| Resilience4j 注解限流/熔断 API | **部分已挂注解**：登录 `@RateLimiter`、技能出站 `@CircuitBreaker`；其余外部调用尚未统一挂 |
| 分页头 `X-Total-Count` | CORS 已暴露，**多数接口未设置** |
| 用户资料多字段 | `avatar` 写 `t_user`，`language`/`twoStep` 写 Redis `lantu:user:pref:{userId}` |

---

## 13. 对齐会议 Checklist

- [x] 是否在后端实现 **JWT 过滤器** 并取消裸 `X-User-Id` 信任链 → 已实现 `JwtAuthenticationFilter`，`allow-header-user-id-fallback` 可关闭回退
- [ ] `permissions` JSON 是否落实到 **细粒度方法级鉴权** → 当前仅按 `role_code`，`permissions` 数组未逐条校验
- [x] 多角色用户：**主角色排序规则** → `selectRolesByUserId` 已加 `ORDER BY r.id ASC`
- [ ] 分页：**通知列表** 是否改为 `PageResult`  
- [ ] 路径：是否统一加 `/v1` 前缀  
- [ ] `/rate-limits` 与 `/system-config/rate-limits` 文档化分工  
- [ ] `UserInfoVO.username` 是否改名为 `displayName` 或增加 `loginName`  
- [ ] `dept_admin` **数据权限**（按 `menu_id`）是否在接口层落地  
- [ ] 是否在网关/过滤器层 **校验 Access Token + 黑名单**  
- [ ] `POST /auth/refresh` 后前端是否 **强制替换 refreshToken**（防重复使用报错）  
- [ ] CORS `allowed-origins` 生产多域名配置是否与运维一致  
- [ ] 是否在响应中真正写入 **`X-Total-Count`**（若前端要从 header 读总数）  

---

## 14. 代码覆盖说明（防遗漏）

以下为仓库中 **全部** `@RestController` 类及其类级别 `@RequestMapping`（与第 10 章一一对应）；若新增 Controller，请同步更新本文档。

| # | Java 类 | 路径前缀（相对 `/api`） |
|---|---------|-------------------------|
| 1 | `AuthController` | `/auth` |
| 2 | `AgentController` | `/agents` |
| 3 | `AgentVersionController` | （无类级前缀）`/agents/{agentId}/versions`、`/versions/{versionId}/...` |
| 4 | `SkillController` | `/v1/skills` |
| 5 | `McpServerController` | `/v1/mcp-servers` |
| 6 | `AppController` | `/v1/apps` |
| 7 | `DatasetController` | `/v1/datasets` |
| 8 | `ProviderController` | `/v1/providers` |
| 9 | `CategoryController` | `/v1/categories` |
| 10 | `TagController` | `/tags` |
| 11 | `UserMgmtController` | `/user-mgmt` |
| 12 | `MonitoringController` | `/monitoring` |
| 13 | `HealthController` | `/health` |
| 14 | `SystemParamController` | `/system-config` |
| 15 | `ModelConfigController` | `/system-config/model-configs` |
| 16 | `RateLimitRuleController` | `/system-config/rate-limits` |
| 17 | `QuotaController` | `/quotas` |
| 18 | `QuotaRateLimitController` | `/rate-limits` |
| 19 | `AuditController` | `/audit` |
| 20 | `ReviewController` | `/reviews` |
| 21 | `UserActivityController` | `/user` |
| 22 | `UserSettingsController` | `/user-settings` |
| 23 | `NotificationController` | `/notifications` |
| 24 | `DashboardController` | `/dashboard` |
| 25 | `FileController` | `/files` |

**其它会参与请求链的组件**（无独立业务路径）：`TraceIdFilter`、`AccessLogFilter`、`GlobalExceptionHandler`、`CorsConfig`、`SecurityConfig`、`AuditLogAspect`（若前端关心审计，只需知道后端可能记日志，无需调接口）。

---

## 15. 附录 A：ResultCode 错误码全表

与 Java 枚举 `com.lantu.connect.common.result.ResultCode` 保持一致。业务代码亦可能使用 **`BusinessException(int code, String message)`** 传入**自定义** `code` / `message`（仍以 HTTP 200 + body 为主），下表为**枚举内建**码。

| code | 常量名 | 默认 message |
|------|--------|----------------|
| 0 | `SUCCESS` | ok |
| 1001 | `PARAM_ERROR` | 参数校验失败 |
| 1002 | `UNAUTHORIZED` | 未认证 |
| 1003 | `FORBIDDEN` | 权限不足 |
| 1004 | `NOT_FOUND` | 资源不存在 |
| 1005 | `CONFLICT` | 资源冲突 |
| 1006 | `DUPLICATE_SUBMIT` | 重复提交 |
| 1007 | `UNSUPPORTED_FILE_TYPE` | 不支持的文件类型 |
| 1008 | `FILE_SIZE_EXCEEDED` | 文件大小超过限制 |
| 2001 | `TOKEN_EXPIRED` | Token 已过期 |
| 2002 | `REFRESH_TOKEN_INVALID` | Refresh Token 无效 |
| 2003 | `ACCOUNT_LOCKED` | 账户已锁定 |
| 2004 | `PASSWORD_ERROR` | 密码错误 |
| 2005 | `SMS_CODE_ERROR` | 短信验证码错误或过期 |
| 2006 | `SMS_RATE_LIMITED` | 短信发送过于频繁 |
| 2007 | `CSRF_FAILED` | CSRF Token 校验失败 |
| 2008 | `SESSION_MISMATCH` | Session 绑定不匹配 |
| 2009 | `OLD_PASSWORD_ERROR` | 旧密码不正确 |
| 3001 | `RATE_LIMITED` | 请求过于频繁 |
| 3002 | `DAILY_QUOTA_EXHAUSTED` | 日配额已耗尽 |
| 3003 | `MONTHLY_QUOTA_EXHAUSTED` | 月配额已耗尽 |
| 3004 | `CIRCUIT_OPEN` | 服务熔断中 |
| 4001 | `ILLEGAL_STATE_TRANSITION` | 非法状态流转 |
| 4002 | `REJECT_REASON_REQUIRED` | 审核驳回原因不能为空 |
| 4003 | `DUPLICATE_NAME` | 同名资源已存在 |
| 4004 | `DUPLICATE_VERSION` | 版本号已存在 |
| 4005 | `CANNOT_DELETE_PUBLISHED` | 不能删除已发布的资源 |
| 4006 | `DATASET_ACCESS_DENIED` | 数据集无访问权限 |
| 4007 | `FAVORITE_EXISTS` | 收藏已存在 |
| 4008 | `CANNOT_REVIEW_OWN` | 不能评论自己创建的资源 |
| 4009 | `CANNOT_DELETE_SYSTEM_ROLE` | 不能删除系统内置角色 |
| 5001 | `INTERNAL_ERROR` | 内部错误 |
| 5002 | `EXTERNAL_SERVICE_ERROR` | 外部服务调用失败 |
| 5003 | `TIMEOUT` | 服务超时 |
| 5004 | `FILE_STORAGE_ERROR` | 文件存储服务异常 |
| 5005 | `MAIL_SEND_ERROR` | 邮件发送失败 |
| 5006 | `SMS_SEND_ERROR` | 短信发送失败 |

**说明**：`message` 可能被 `BusinessException(ResultCode, String)` **覆盖**为更具体中文（如「用户名或密码错误」），前端应 **同时依赖 `code` + `message`** 做提示。

---

## 16. 附录 B：JSON 类型、时间与软删除

### 16.1 时间与 ID

| 类型 | JSON 表现 | 说明 |
|------|-----------|------|
| `LocalDateTime` | 字符串 `"yyyy-MM-dd HH:mm:ss"` | 受 `spring.jackson.date-format` 与 `time-zone` 影响，语义为 **Asia/Shanghai** |
| `Long` / `long` | 数字 | JS 需注意大于 \(2^{53}\) 的整数精度；当前业务 ID 一般在安全范围内 |
| `BigDecimal` | 数字 | 金额/评分等，前端格式化时注意小数位 |
| `Boolean` | `true`/`false` | 库表 `TINYINT(1)` 映射 |

### 16.2 `Map` / JSON 列（`specJson`、`parametersSchema` 等）

后端使用 **JacksonTypeHandler**，请求与响应均为 **JSON 对象**（非字符串）。键名大小写敏感。

### 16.3 BaseEntity（Agent / Skill / Favorite 等）

继承 `BaseEntity` 的实体在 JSON 中通常包含：

| 字段 | 含义 |
|------|------|
| `createTime` | 创建时间 |
| `updateTime` | 更新时间 |
| `deleted` | 逻辑删除标记：**0 正常，1 已删除**（MyBatis-Plus `@TableLogic`） |

查询列表默认 **过滤已删除行**；**不要**依赖前端传 `deleted` 修改删除状态，应使用业务 `DELETE` 接口。

### 16.4 无 `BaseEntity` 的表

如 `t_review`、`t_notification` 等 **无** `deleted` 字段，实体中亦无 `deleted`。

---

## 17. 附录 C：主要请求体 DTO 字段字典

### 17.1 `AgentCreateRequest`（`POST /agents`）

| 字段 | 必填 | 说明 |
|------|------|------|
| `agentName` | 是 | 唯一标识，库表 UNIQUE；仅创建时校验重名 |
| `displayName` | 是 | 展示名 |
| `description` | 是 | 描述 |
| `agentType` | 是 | 如 `http_api`、`builtin`、`mcp`（与库中数据一致即可） |
| `sourceType` | 是 | 如 `cloud`、`internal` |
| `providerId` | 否 | 可空 |
| `categoryId` | 否 | 可空 |
| **`specJson`** | **强烈建议必填** | 库表 `spec_json` **NOT NULL**；若传 `null` 可能导致插入失败。至少传 `{}` |
| `isPublic` | 否 | |
| `icon` | 否 | |
| `maxConcurrency` / `maxSteps` / `temperature` / `systemPrompt` | 否 | |

**服务端默认**：`mode` 固定为 **`SUBAGENT`**；`status` 固定为 **`draft`**（创建后走审核/发布流程）。

### 17.2 `AgentUpdateRequest`（`PUT /agents/{id}`）

**部分更新**：仅 **非 null** 字段写入。若要清空某字段，需与后端约定是否支持空字符串（当前实现为 **null 即不更新**）。

含 `status`、`mode`、`specJson` 及统计类字段等，详见类定义；改 `agentName` 时同样校验全局唯一。

### 17.3 `VersionCreateRequest`（`POST /agents/{agentId}/versions`）

| 字段 | 必填 |
|------|------|
| `version` | 是 |
| `changelog` | 是 |

需 Header **`X-Username`**（写入版本创建者标识）。

### 17.4 `SkillCreateRequest`（`POST /v1/skills`）

| 字段 | 必填 | 说明 |
|------|------|------|
| `agentName` | 是 | Skill 侧仍用此字段作 **唯一标识**（`uk_skill_agent_name`），错误提示文案可能为「agentName 已存在」 |
| `displayName` / `description` / `agentType` / `sourceType` | 是 | |
| `parentId` | 否 | MCP 子技能指向父 Skill ID；根节点为 `null` |
| `categoryId` / `displayTemplate` / `specJson` / `parametersSchema` / `isPublic` / `maxConcurrency` / `icon` | 否 | |
| **`specJson`** | **强烈建议必填** | 库表 **NOT NULL**，建议至少 `{}` |

**服务端默认**：`mode` = **`TOOL`**；`status` = **`draft`**。

### 17.5 `SkillUpdateRequest`（`PUT /v1/skills/{id}`）

规则同 Agent：**null 不更新**；`agentName` 改名单独校验唯一。

### 17.6 `AppCreateRequest`（`POST /v1/apps`）

| 字段 | 必填 |
|------|------|
| `appName` / `displayName` / `description` / `appUrl` / `embedType` / `sourceType` | 是 |
| `icon` / `screenshots` / `categoryId` / `isPublic` | 否 |

### 17.7 `DatasetCreateRequest`（`POST /v1/datasets`）

| 字段 | 必填 | 说明 |
|------|------|------|
| `name` | 是 | |
| `code` | 否 | |
| `description` | 否 | |
| `providerId` | 是 | `@NotNull` |
| `categoryId` / `status` / `publishStatus` / `createdBy` | 否 | |
| `deptIds` / `agentIds` / `tagIds` | 否 | 关联关系，以服务端实现为准 |

### 17.8 `CreateUserRequest`（`POST /user-mgmt/users`）

| 字段 | 必填 | 说明 |
|------|------|------|
| `username` | 是 | 登录名 |
| `password` | 是 | 明文；服务端 BCrypt 存储 |
| `role` | 是 | **平台角色**：传 `role_code`（如 `user`）或 `role_name`（服务端二者兼容查询） |
| `email` / `phone` / `department` | 否 | `department` 为业务字段，与组织树无自动校验 |

### 17.9 `UpdateUserRequest`（`PUT /user-mgmt/users/{id}`）

全部可选；仅非 null 更新。可更新 `password`、`email`、`phone`、`department`、`role`、`status`。

---

## 18. 附录 D：主要响应实体字段字典

### 18.1 `Agent`（列表/详情）

| 字段 | 说明 |
|------|------|
| `id` | 主键 |
| `agentName` / `displayName` / `description` | |
| `agentType` / `mode` / `sourceType` / `status` | `status` 常见：`draft`、`testing`、`published` 等（以库内数据为准） |
| `providerId` / `categoryId` | 可 null |
| `specJson` | JSON 对象 |
| `isPublic` / `icon` / `sortOrder` / `hidden` | |
| `maxConcurrency` / `maxSteps` / `temperature` / `systemPrompt` | |
| `qualityScore` / `avgLatencyMs` / `successRate` / `avgTokenCost` / `callCount` | 统计类 |
| `createdBy` | 创建人 userId |
| `createTime` / `updateTime` / `deleted` | 见 **16.3 节** |

### 18.2 `Skill`

字段与 `Agent` 类似，额外常见字段：`parentId`、`displayTemplate`、`parametersSchema`（JSON 对象）。

### 18.3 `SmartApp`（`t_smart_app`）

重点字段：`appName`、`displayName`、`appUrl`、`embedType`（如 `iframe`、`micro_frontend`）、`screenshots`（JSON 数组）、`status`、`isPublic`、`createdBy` 及 `BaseEntity` 时间/软删。

### 18.4 `Dataset`

注意 Java 实体属性名为 `name` / `code` 等，与库列 `dataset_name` 映射由 ORM 完成；响应 JSON 使用 **驼峰** `name`、`code`。

### 18.5 `Notification`（通知分页 `records` 内）

| 字段 | 说明 |
|------|------|
| `id` | |
| `userId` | 接收人 |
| `type` / `title` / `body` | |
| `sourceType` / `sourceId` | 可选：关联业务来源 |
| `isRead` | 是否已读 |
| `createTime` | 无 `updateTime` / 无 `deleted` |

### 18.6 `Review`

| 字段 | 说明 |
|------|------|
| `id` / `targetType` / `targetId` / `rating` / `comment` | |
| `userId` | 评论人 |
| `userName` / `avatar` | 展示用；创建时 `userName` 来自 `X-Username` 头或空串 |
| `createTime` | |

### 18.7 `Favorite`

`id`、`userId`、`targetType`、`targetId`，以及 `BaseEntity` 的 `createTime`、`updateTime`、`deleted`。

### 18.8 `ReviewSummaryVO`（`GET /reviews/summary`）

| 字段 | 类型 | 说明 |
|------|------|------|
| `avgRating` | number | 平均分 |
| `totalCount` | number | 评论条数 |
| `distribution` | object | 星级 → 条数，如 `{"5": 10, "4": 2}` |

---

## 19. 附录 E：上传文件 URL 与 Nginx

### 19.1 接口返回的 `url` 形态

`FileStorageService` 返回值为 **相对路径**，形如：

```text
/uploads/{category}/yyyy/MM/{uuid}.{ext}
```

例如：`/uploads/document/2026/03/abc....pdf`

### 19.2 与 API `baseURL` 的关系

- 该路径 **不以 `/api` 开头**，与 `context-path=/api` **独立**。
- **Docker 部署**（见仓库根目录 `nginx.conf`）：Nginx 单独挂载

```nginx
location /uploads/ {
    alias /data/lantu/uploads/;
}
```

前端完整访问应为：**站点根** + 相对路径，例如 `https://your-domain/uploads/...`，而不是 `https://your-domain/api/uploads/...`。

### 19.3 本地直连 Spring Boot（无 Nginx）

默认 **未** 配置 Spring MVC 对 `/uploads/**` 的静态映射时，浏览器 **直接 GET `http://localhost:8080/uploads/...` 可能 404**。联调可：

- 同样走 Nginx；或  
- 由前端仅用 URL 存库展示，开发环境临时忽略预览；或  
- 后续由后端增加静态资源映射（若实现需再更新本文档）。

### 19.4 允许扩展名（与配置双处一致）

`FileStorageService` 内置允许：`pdf, docx, csv, json, parquet, xlsx, jpg, jpeg, png, gif, svg`（小写比较）。若 `application.yml` 中 `file.allowed-types` 与代码不一致，**以代码内 `ALLOWED_TYPES` 为准**（当前为硬编码集合）。

---

## 20. 附录 F：列表筛选与排序（服务端行为）

### 20.1 Agent 列表 `GET /agents`

- **keyword**：对 **`displayName`**、**`description`** 做 `LIKE`（OR）。
- **status** / **sourceType** / **agentType** / **categoryId**：精确匹配。
- **排序**：`updateTime` **降序**。

### 20.2 Skill 列表 `GET /v1/skills`

- **keyword**：对 **`displayName`**、**`description`** `LIKE`。
- **status** / **sourceType** / **parentId** / **categoryId**：精确匹配。
- **排序**：`updateTime` **降序**。

### 20.3 MCP Server 列表 `GET /v1/mcp-servers`

服务端固定条件：`parentId IS NULL`、`agentType = 'mcp'`、`status = 'published'`，再按 `sortOrder` 升序、`updateTime` 降序。

### 20.4 用户列表 `GET /user-mgmt/users`

以 `UserMgmtServiceImpl` 为准：

- 若传 **`sortBy`**：再按 **`sortOrder`**（`asc` / 其它视为降序）拼一条 `ORDER BY`；`sortBy` 会 **camelCase → 下划线** 再映射列名（勿传非法列名）。
- **若未传 `sortBy`**：**无显式排序**，顺序 **依赖数据库默认，不要依赖**；需要稳定顺序时请传 `sortBy`（如 `userId`）。

### 20.5 监控 `PageQuery`

**call-logs / alerts / traces** 共用 `page`、`pageSize`、`keyword`；具体对哪些列 `LIKE` 以前端联调时 Swagger 与服务实现为准（实现若变更需同步文档）。

---

## 21. 附录 G：联调排错与边界情况

| 现象 | 可能原因 | 处理 |
|------|-----------|------|
| 登录 200 但 `code=2004` | 用户名或密码错误；或用户 `status=locked` | 检查 seed 密码与账号状态 |
| 注册 200 但 `code=1001` | 密码与确认密码不一致；或邮箱格式错误 | 对齐 [11.5](#115-认证相关-dto-校验与前端表单对齐) |
| `POST /auth/refresh` 报 Refresh 已使用 | 同一 refresh 第二次使用 | **必须保存轮换后的新 refreshToken** |
| 创建 Agent/Skill 5xx 或 SQL 错 | `specJson` 未传导致 DB `NOT NULL` 违反 | Body 内传 `specJson: {}` 或完整配置 |
| `GET /agents` 有数据但详情 404 | id 错误或已软删 | 软删数据默认查不出 |
| 评论列表为空 | `targetType` 大小写或拼写与写入不一致 | 统一小写 `agent`/`skill` 等 |
| 上传成功但前端无法预览 | 使用了 `/api` 前缀去拼 `url` | 使用站点根路径 `/uploads/...` 见 [附录 E](#19-附录-e上传文件-url-与-nginx) |
| 带 `Authorization` 仍「未登录」 | 业务接口不解析 JWT | 业务接口用 **`X-User-Id`** |
| 登出后接口仍可用 | 黑名单未接入过滤器 | 见 [3.7](#37-登出authrefresh-与-redis实现细节与缺口) |
| 分页取错字段 | 通知用 `records`，其它多为 `list` | 见 [第 5 章](#5-分页两种-json-结构) |
| 仪表盘仍与预期大屏不一致 | 已接库表聚合，**非架构全文级运营大屏** | 见 [§9.5.1](#951-已完善相对此前占位实现) |
| `user-settings/stats` 部分指标为 0 | `tokenUsage` 等 **未接计量** | 见 [§9.5.1](#951-已完善相对此前占位实现) |
| `invoke` 永远无真实结果 | Skill 调用 **未接下游** | 见 [§9.5.2](#952-仍为占位或未完成) |

---

**文档维护**：后端接口变更时，请同步更新本章并通知前端；优先保证 **Swagger** 与代码一致。占位接口清单以 **§9.5** 与 `docs/backend-architecture.md`「实现状态」为准，实现完成后请同步删减。
