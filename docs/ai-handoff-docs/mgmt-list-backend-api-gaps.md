# 管理列表接口：前端能力与文档差距（供后端对齐）

与 `docs/frontend-full-spec.md`、`docs/ai-handoff-docs/02-api-to-page-mapping.md` 对照后的缺口清单；**以实际 Controller / Swagger 为准**时可再核对 `07-controller-coverage-matrix.md`。

| 能力 | 文档/现状 | 建议后端 |
|------|-----------|----------|
| `GET /system-config/announcements` | 规范中多为 `page`、`pageSize` | 若需**服务端**关键词与类型筛选：增加可选 query `keyword?`、`type?`（排序参数按需） |
| `GET /sensitive-words`（或等价列表） | 已有分页 | 若需搜索：确认或补充 `keyword?`，并在 spec 中写清 |
| 其它系统治理列表 | `tags`、`rate-limits`、`quotas`、`audit-logs` 等（~~`model-configs`~~ 已移除） | 对照 `02-api-to-page-mapping`「常用查询参数」：缺 `keyword` / `status` / 时间范围等的一并补参并更新文档 |

前端公告页在接口未支持前对**当前页**数据做本地筛选；分页 `total` 仍以服务端分页为准。
