/**
 * 静态前端可能挂在网关子路径下（与 Vite `base` / `VITE_APP_BASE_PATH` 一致），
 * 但接口根路径一般为后端的 context-path 本身，不含该段（默认 `/regis`）。
 */
export const STATIC_DEPLOY_PATH_PREFIX = '/factory_ixeo2_8oiuw' as const;

/** 浏览器请求 API 的根路径（与 server.servlet.context-path 等一致） */
export const DEFAULT_API_BASE_PATH = '/regis' as const;
