# 文档索引（LantuConnect 前端仓库）

## 从哪里读起

1. **[前端实现真值](frontend/README.md)** — 技术栈、`src/` 结构、环境与类型约定。
2. **[路由与菜单权威说明](frontend/routes-and-navigation.md)** — `page` slug、`#/admin|user/...`、侧栏分组、重定向与兼容 URL。**凡与菜单/路由有关的争议，以本文档与源码为准。**
3. **[前端 ↔ 后端协作](frontend-backend-handoff/README.md)** — 接口对照、query/枚举缺口、管理端接线清单；**正文以联调协作为主**，不替代上面的前端路由真值。

## 按主题

| 主题 | 文档 |
|------|------|
| 前端全量说明（交互/接口证据，部分内容可能滞后） | [frontend-full-spec.md](frontend-full-spec.md)（文首注明以 `frontend/routes-and-navigation.md` 为准） |
| 菜单与闭环流程（产品与测试） | [frontend-menu-process-molecular-spec.md](frontend-menu-process-molecular-spec.md) |
| 资源注册-审核-授权-调用（业务与后端路径说明） | [resource-registration-authorization-invocation-guide.md](resource-registration-authorization-invocation-guide.md) |
| 资源注册运行手册 | [frontend-resource-registration-runbook.md](frontend-resource-registration-runbook.md) |
| 前后端对齐规格与验收 | [frontend-backend-alignment-spec.md](frontend-backend-alignment-spec.md)、[frontend-backend-alignment-acceptance.md](frontend-backend-alignment-acceptance.md) |
| 给 AI 的改造输入（编号系列 + 副本） | [ai-handoff-docs/README.md](ai-handoff-docs/README.md) |

## 重复文档说明

以下文件在仓库根目录仅有 **stub**，完整内容在 `frontend-backend-handoff/`：

- [frontend-completion-before-backend.md](frontend-completion-before-backend.md)
- [frontend-feature-gap-matrix.md](frontend-feature-gap-matrix.md)
- [frontend-management-ui-audit-and-backend-api-requests.md](frontend-management-ui-audit-and-backend-api-requests.md)
