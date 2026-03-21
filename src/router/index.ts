/**
 * 控制台路由约定（HashRouter）:
 * - `/#/` → 根据持久化导航重定向到 `/#/{admin|user}/{page}`
 * - `/#/:role/:page` → 主框架（`MainLayout`），page 直接映射视图
 * - `/#/:role/:page/:id` → 详情页（如 agent-detail）
 * - 解析与校验见 `constants/consoleRoutes.ts`
 */
export { ConsoleHomeRedirect } from './ConsoleHomeRedirect';
