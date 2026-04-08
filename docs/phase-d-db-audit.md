# Phase D：数据库未使用对象审计（受控 DROP）

本仓库为前端工程，**不包含** Flyway/SQL 源文件。以下流程在后端仓库（如 `LantuConnect-Backend`）执行。

## 方法

1. **列出库表**：`SHOW TABLES FROM lantu_connect;`（或从 `sql/lantu_connect.sql` 提取 `CREATE TABLE` 表名）。
2. **Java 实体**：在后端 `src` 中搜索 `@TableName("` 与 `@Table(name = "`，得到「有实体」表集合。
3. **原生 SQL**：检索 Mapper XML、`@Select` 字符串中的表名。
4. **差集**：`DB 表 − 实体表 − 仅出现在历史迁移且已 DROP` → **待确认候选**。
5. **人工确认**：业务是否仅由外部系统写入、是否备份任务依赖、是否仅统计用。**禁止**未确认前对生产批量 `DROP`。

## 已知已剔除（Phase A）

- `t_sms_verify_code`：由增量迁移 `V30__drop_sms_verify_code.sql`（后端）与基准脚本更新处理。

## 产出

- 确认无引用后，逐表新增 `V31+__drop_*.sql`，并在发版说明中注明回滚方式（通常需自备份恢复）。
