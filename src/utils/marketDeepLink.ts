/**
 * 用户端市集深链请使用 `buildUserResourceMarketUrl`（`constants/consoleRoutes`）。
 * Skill/MCP/数据集/Agent/应用已分别落在独立路由；旧 `resource-market?tab=` 仍可能经 MainLayout 重定向。
 */
export { buildUserResourceMarketUrl } from '../constants/consoleRoutes';
