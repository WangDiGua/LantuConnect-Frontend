# 前端补全优先 · 与后端对接分工（整合说明）

本文档汇总 **管理端** 在「先把前端交互与请求形状补全，再让后端落库与检索」策略下的状态，避免各页零散说明。更细的接口巡检见 [frontend-management-ui-audit-and-backend-api-requests.md](./frontend-management-ui-audit-and-backend-api-requests.md) 与 [frontend-feature-gap-matrix.md](./frontend-feature-gap-matrix.md)。

---

## 1. 原则

| 层级 | 责任 |
|------|------|
| **前端** | 列表工具栏具备与业务匹配的 **检索 / 筛选 / 分页请求参数**；表格行具备 **基础 CRUD 或等价操作**（查看、编辑、删除、启停等）；请求体与 query 与 `src/types/dto/` 及 `*.service.ts` 对齐。 |
| **后端** | 对应用 query **在服务端过滤并返回与 `total` 一致的语义**；PUT/PATCH 体字段与 OpenAPI 或对齐 spec 一致；若不支持某参数，应明确返回或文档说明，避免前端误以为「已筛选全库」。 |

---

## 2. 敏感词管理（本次已补前端）

**页面**：`src/views/systemConfig/SensitiveWordPage.tsx`  
**服务**：`src/api/services/sensitive-word.service.ts`

| 能力 | 前端状态 | 后端需确认 / 建议 |
|------|----------|-------------------|
| 关键词检索 | 工具栏搜索框；`GET /sensitive-words` 传 `keyword`（可选） | 若当前网关未识别 `keyword`，请增加对 `word`（或约定字段）的模糊匹配，并使分页 `total` 为筛选后总数。 |
| 分类筛选 | `LantuSelect`；传 `category`（已有） | 与现有实现一致即可。 |
| 启用/禁用筛选 | 传 `enabled`（已有） | 与现有实现一致即可。 |
| 编辑 | 「编辑」胶囊按钮；弹窗可改 **分类、severity、启用**；调用 `PUT /sensitive-words/{id}` | `SensitiveWordUpdateRequest` 当前 **不含 `word`**；若产品要求改词面，请扩展后端 Update 与 DTO 后再接表单项。 |
| 删除 / 行内启停 | 已有 | 不变。 |

分类下拉的选项来源：列表拉取成功后顺带请求 `GET /sensitive-words/categories` 刷新，与筛选条件联动。

---

## 3. 全站管理页：仍建议巡检的类别（不含本文件逐条实现）

以下在 [功能缺口矩阵](./frontend-feature-gap-matrix.md) 或 [巡检文档](./frontend-management-ui-audit-and-backend-api-requests.md) 中已有说明，后续排期可按「缺检索 / 缺行内编辑」逐项勾选：

- 工具栏仍为 `flex-wrap` 或未带搜索的列表页（如部分监控、Token、用户权限大图）。
- 控制台资源列表（Agent/App/Dataset/Skill）行内操作仍为图标态，若需与管理配置页完全统一，需产品确认后改 UI。

---

## 4. 变更记录

| 日期 | 说明 |
|------|------|
| 2026-03-30 | 新增：敏感词页工具栏检索 + 分类/状态筛选 + 编辑弹窗；`list` 增加 `keyword` query；本整合文档首版。 |
