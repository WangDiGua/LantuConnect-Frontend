# 前端文档枢纽

本目录描述 **当前仓库内前端代码** 的实现基线，与后端交付状态无关。

## 必读

- **[路由与菜单](routes-and-navigation.md)** — 控制台路径、侧栏、`page` slug 及运行时重定向的唯一权威说明。

## 技术栈（与 `package.json` 一致）

- **构建**：Vite 6.x、`type: module`
- **UI**：React 19、TypeScript 5.x、Tailwind CSS 4、DaisyUI 5
- **路由**：React Router 7（`HashRouter`，见 `src/App.tsx`）
- **数据**：TanStack React Query、Zustand、Axios
- **表单与校验**：React Hook Form、Zod

## 源码布局（概要）

| 路径 | 说明 |
|------|------|
| `src/App.tsx` | 入口、QueryClient、`HashRouter`、登录/401/控制台懒加载布局 |
| `src/layouts/MainLayout.tsx` | 控制台壳层、`page` → 视图的 `switch`、路由校验与重定向 |
| `src/constants/consoleRoutes.ts` | `admin`/`user` 侧栏与 `page` 归属、`buildPath` / `defaultPath` / `parseRoute` |
| `src/constants/navigation.ts` | 侧栏分组与子菜单项（展示用） |
| `src/api/services/**` | 按域划分的 API 调用 |
| `src/types/dto/**` | 前端 DTO；Mock 与接口返回值应与此对齐 |
| `src/views/**` | 页面级组件 |
| `src/config/env.ts` | `VITE_API_BASE_URL`、`VITE_TOKEN_KEY`、`VITE_REFRESH_TOKEN_KEY` |

## 环境变量

默认值定义见 [`src/config/env.ts`](../../src/config/env.ts)。本地可在 `.env` / `.env.development` 中覆盖 `VITE_*`。

## 数据模型约定

用户、组织、Agent、Skill、应用、数据集等字段命名以仓库内 **Cursor 规则** 为准：[`.cursor/rules/data-models.mdc`](../../.cursor/rules/data-models.mdc)。

## 与后端联调

接口清单、query 参数与枚举对齐见 **[`docs/frontend-backend-handoff/`](../frontend-backend-handoff/README.md)**，不与本目录路由真值重复维护。
