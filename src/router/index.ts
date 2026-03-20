/**
 * 控制台路由约定：
 * - `/` → 根据持久化导航重定向到 `/c/{admin|user}/...`
 * - `/c/:role/:sidebar/:sub` → 主框架（`MainLayout`），`sub` 在无子菜单时为 `__root__`；「我的 Agent」下为子项 id
 * - 解析与校验见 `constants/consoleRoutes.ts`
 */
export { ConsoleHomeRedirect } from './ConsoleHomeRedirect';
