# Bug 修复记录

本文档记录后端实现过程中的问题与修复。**若某 Bug 导致接口路径、请求头、响应体或鉴权行为与 [frontend-alignment-handbook.md](frontend-alignment-handbook.md) 不一致**，修复后请 **同步更新对齐手册** 对应章节，并在下表条目中简要注明（例如「已更新对齐手册 §x」）。

**与「未完成功能」的区别**：本文件记录 **已发生且已处理（或待处理）的缺陷**；**占位实现、空数据接口、TODO** 等属于产品与实现差距，见 [backend-architecture.md](backend-architecture.md) 文首 **「后端实现状态说明」** 与对齐手册 **[§9.5](frontend-alignment-handbook.md#95-未完成功能与占位接口)**，**不重复登记为 BUG-xxx**，除非某占位行为被误当作 Bug 修复后再记入本文。

---

## AUDIT-001: 代码审计 — 未完成功能与占位（2026-03-22）

**类型**: 实现审计记录（非缺陷单条）

**说明**: 对仓库 `src/main/java` 检索 `TODO`、`placeholder`、空返回实现后，与三份文档对齐：在 **backend-architecture.md** 增加「后端实现状态说明」；在 **frontend-alignment-handbook.md** 增加 **§9.5**；本文增加本审计条目。

**主要结论摘要**:

- 认证短信/绑号、Skill `invoke`、监控 `performance`、系统 `network/acl`、仪表盘多接口、用户 `my-agents`/`my-skills`、用户设置 workspace 持久化与 stats、部分定时任务等为 **占位或未实现业务**。
- JWT 全局拦截、Resilience4j 注解作用于 HTTP、Token 黑名单参与请求校验等仍为 **架构目标与实现差距**（详见对齐手册 §3、§9.4）。
- 定时任务中 **配额日/月重置、熔断状态巡检** 等已有真实逻辑，与「仅 placeholder 日志」类任务需区分（见对齐手册 §9.5）。

**后续**: 每完成一块真实业务，同步删除或收窄上述文档中的对应行，并在必要时新增 BUG-xxx（若修复了错误行为）。

---

## IMPL-001: 占位逻辑补全 — 仪表盘 / 用户工作台 / 监控 performance 等（2026-03-22）

**类型**: 功能补全（非缺陷修复）

**涉及代码**: `DashboardServiceImpl`、`UserActivityServiceImpl`、`UserSettingsServiceImpl`（Redis 工作区）、`MonitoringServiceImpl.performance`、`MonitoringController`。

**说明**: 将原先空返回或固定 0 的接口改为 **MySQL 聚合 / Redis 持久化**，便于前端展示真实统计。对齐手册 **§9.5**、`backend-architecture.md`「实现状态」表已同步修订。

**仍待后续**: Skill `invoke`、短信、网络/ACL 占位、JWT 过滤器、部分定时任务、Profile 多字段持久化等 —— 见 **[remaining-work.md](remaining-work.md)**。

---

## IMPL-003: 文档同步 + 代码缺口补全 — 登录历史、角色扩展、token 估算、文档四份全面更新（2026-03-22）

**类型**: 功能补全 + 文档同步

**涉及代码**: `LoginHistory` 实体/`LoginHistoryMapper`、`AuthServiceImpl`（loginHistory 分页 + login 写 `t_login_history`）、`AuthController`（`GET /auth/login-history`）、`HealthController`/`MonitoringController`/`AuditController`（`@RequireRole`）、`SkillServiceImpl`（`estimateTokens` token 估算）、`PlatformRoleMapper`（`ORDER BY r.id ASC`）。

**涉及文档**: `backend-architecture.md`（实现状态 7 处更新）、`frontend-alignment-handbook.md`（§3.1/§3.4/§3.7/§9.4/§9.5/§10.1/§10.3/§12/§13 更新）、`remaining-work.md`（第三轮汇总 + 剩余项收窄）、`bug-fixes.md`（本条）。

**说明**: 交叉核对四份文档与实际代码，修正所有「文档说未实现但代码已实现」的过时描述；补齐文档中指定但代码缺失的 `GET /auth/login-history`、管理端 `@RequireRole` 扩展、技能调用 token 估算、角色排序确定性。

---

## IMPL-002: 安全与业务能力补全 — JWT 过滤器、角色切面、技能调用、短信 mock、统计与定时任务（2026-03-21）

**类型**: 功能补全（非缺陷修复）

**涉及代码**: `JwtAuthenticationFilter`、`AccessTokenBlacklist`、`RequireRole`/`RequireRoleAspect`、`SkillServiceImpl.invokeSkill`、`SkillRemoteInvokeService`、`CallLog` 实体与 `CallLogMapper`、`AuthServiceImpl`（短信/资料 Redis）、`UserSettingsServiceImpl.getStats`、`SystemParamFacadeServiceImpl`（integration-mock）、定时任务 `UserRoleCountSyncTask`/`ProviderCountSyncTask`/`HealthCheckTask`/`ExpiredTokenCleanupTask`、`AuthController`（`@RateLimiter`）、`GlobalExceptionHandler`（`RequestNotPermitted`）。

**说明**: `t_call_log` 实体与 **schema** 对齐；仪表盘/监控中原先使用不存在的 `path`/`success` 列的查询已改为 `method`/`status`。详见 **[remaining-work.md](remaining-work.md)** 中「本轮已落实」与仍待项（`permissions` 细粒度、真实短信、生产关闭 X-User-Id 回退等）。

---

## BUG-001: 项目编译失败 — UTF-8 BOM 导致 Java 编译器报 "非法字符 '\ufeff'"

**发现时间**: 2026-03-22

**现象**: 执行 `mvn compile` 时，大量 Java 文件在第 1 行报错：

```
[ERROR] /D:/.../QuotaRateLimit.java:[1,1] 非法字符: '\ufeff'
[ERROR] /D:/.../QuotaRateLimit.java:[1,10] 需要 class、interface、enum 或 record
```

涉及 203 个文件。

**根本原因**: 项目文件由多个子代理（subagent）并行生成，部分子代理在使用 PowerShell `Write` 工具创建文件时，写入了 **UTF-8 with BOM（Byte Order Mark）** 编码。BOM 是 3 个字节 `EF BB BF`（Unicode 字符 `\uFEFF`），出现在文件最开头。

Java 编译器（javac）**不识别 BOM**，将其视为非法字符，导致 `package` 语句解析失败，进而报 "需要 class、interface、enum 或 record"。

**修复方式**: PowerShell 脚本批量去除所有 Java 文件的 BOM：

```powershell
$files = Get-ChildItem -Path "src\main\java" -Filter "*.java" -Recurse
foreach ($f in $files) {
    $bytes = [System.IO.File]::ReadAllBytes($f.FullName)
    if ($bytes.Length -ge 3 -and $bytes[0] -eq 0xEF -and $bytes[1] -eq 0xBB -and $bytes[2] -eq 0xBF) {
        $newBytes = $bytes[3..($bytes.Length-1)]
        [System.IO.File]::WriteAllBytes($f.FullName, $newBytes)
    }
}
```

共修复 203 个文件。

**预防措施**: 后续写文件时使用 `new UTF8Encoding(false)`（不带 BOM 的 UTF-8）或确认工具链默认编码。

---

## BUG-002: 项目编译失败 — User 和 PlatformRole 实体字段与数据库 schema 不匹配

**发现时间**: 2026-03-22

**现象**: 去除 BOM 后重新编译，`AuthServiceImpl.java` 和 `UserMgmtServiceImpl.java` 出现大量 "找不到符号" 错误：

```
AuthServiceImpl.java: 找不到符号 user.getStatus() (Integer vs String)
UserMgmtServiceImpl.java: 找不到符号 user.setPassword(), user.setEmail(), user.getId()
UserMgmtServiceImpl.java: 找不到符号 PlatformRole::getCode, PlatformRole::getName
```

**根本原因**: 项目重构为单体架构时，由多个子代理并行创建不同模块的代码。创建 `auth` 模块实体的子代理和创建 `usermgmt` 模块业务逻辑的子代理各自对 User 实体做了不同的假设：

| 字段 | 数据库 schema (正确) | auth 子代理写的实体 | usermgmt 子代理假设的字段 |
|------|---------------------|-------------------|------------------------|
| 主键 | `user_id BIGINT` | `id` | `user.getId()` |
| 密码 | `password_hash` | `password` | `user.setPassword()` |
| 邮箱 | `mail` | `email` | `user.setEmail()` |
| 手机 | `mobile` | `phone` | `user.setPhone()` |
| 状态 | `status VARCHAR(16)` | 缺失 | `user.getStatus() == 0` (Integer) |

PlatformRole 同样：

| 字段 | 数据库 schema | 实际写入的字段名 | 业务代码引用 |
|------|-------------|----------------|------------|
| 角色编码 | `role_code` | `code` | `PlatformRole::getCode` |
| 角色名称 | `role_name` | `name` | `PlatformRole::getName` |
| 系统内置 | `is_system` | `systemBuiltin` | `role.isSystemBuiltin()` |

**修复方式**:

1. 重写 `User.java` 实体，字段对齐数据库 schema：`userId`, `passwordHash`, `realName`, `mail`, `mobile`, `status(String)` 等
2. 重写 `PlatformRole.java` 实体：`roleCode`, `roleName`, `isSystem` 等
3. 修复 `AuthServiceImpl.java` 中所有字段引用
4. 修复 `UserMgmtServiceImpl.java` 中所有字段引用（`getCode`→`getRoleCode`, `setPassword`→`setPasswordHash` 等）
5. 为 `UpdateUserRequest` DTO 补充缺失的 `status` 字段

**预防措施**: 并行子代理生成代码时，应共享统一的实体定义，或由主代理先创建所有实体，再分发给子代理实现业务逻辑。

---

## BUG-003: JDBC 连接失败 — characterEncoding=utf8mb4 不被 MySQL JDBC 驱动识别

**发现时间**: 2026-03-22

**现象**: 项目启动后，访问数据库相关接口报错：

```
Caused by: java.io.UnsupportedEncodingException: utf8mb4
    at java.base/java.lang.String.lookupCharset(String.java:829)
```

定时任务和 API 请求均无法连接数据库。

**根本原因**: `application.yml` 中的 JDBC URL 使用了 `characterEncoding=utf8mb4`：

```yaml
url: jdbc:mysql://localhost:3306/lantu_connect?characterEncoding=utf8mb4&...
```

`utf8mb4` 是 **MySQL 服务端**的字符集名称，但 Java/JDBC 的 `Charset` 体系中不存在名为 `utf8mb4` 的编码。JDBC 驱动内部调用 `String.getBytes("utf8mb4")` 时抛出 `UnsupportedEncodingException`。

MySQL JDBC 驱动的规则：当 `characterEncoding=UTF-8` 时，驱动会自动协商使用服务端的 `utf8mb4` 字符集，无需显式指定 `utf8mb4`。

**修复方式**:

```yaml
# 修改前
characterEncoding=utf8mb4

# 修改后
characterEncoding=UTF-8
```

**预防措施**: MySQL JDBC URL 中的 `characterEncoding` 参数应使用 Java 标准编码名（`UTF-8`），而非 MySQL 服务端字符集名（`utf8mb4`）。

---

## BUG-004: OrderItem 构造方式不兼容 — MyBatis-Plus 3.5.5

**发现时间**: 2026-03-22

**现象**: `UserMgmtServiceImpl.java` 编译报错：

```
找不到符号: 构造方法 OrderItem(String, boolean)
```

**根本原因**: MyBatis-Plus 3.5.5 中 `OrderItem` 类没有 `new OrderItem(column, asc)` 的公共构造方法。应使用静态工厂方法 `OrderItem.asc(column)` 或 `OrderItem.desc(column)`。

**修复方式**:

```java
// 修改前
page.addOrder(new OrderItem(column, asc));

// 修改后
page.addOrder(asc ? OrderItem.asc(column) : OrderItem.desc(column));
```

---

## BUG-005: 端口占用 — Spring Boot 启动失败 "Port 8080 was already in use"

**发现时间**: 2026-03-22

**现象**: 第二次启动时报错 `Port 8080 was already in use`。

**根本原因**: 第一次启动时由于 JDBC 连接失败，进程未完全退出但仍占用 8080 端口。

**修复方式**:

```powershell
# 查找并杀死占用 8080 端口的进程
Get-NetTCPConnection -LocalPort 8080 | Select-Object OwningProcess -Unique |
    ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }
```
