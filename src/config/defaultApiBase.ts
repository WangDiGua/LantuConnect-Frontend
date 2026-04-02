/**
 * 线上常为：`https://域名/factory_ixeo2_8oiuw/regis/`（网关前缀 + 后端 context-path，浏览器里两段都要）
 * 本机直连 Spring、无前缀：`VITE_API_BASE_URL=/regis`
 */
export const GATEWAY_PATH_PREFIX = '/factory_ixeo2_8oiuw' as const;

export const DEFAULT_API_BASE_PATH = `${GATEWAY_PATH_PREFIX}/regis` as const;

/**
 * Vite dev 代理：剥掉网关前缀，使打到本机 8080 的路径为 `/regis/...`
 * 例：`/factory_ixeo2_8oiuw/regis/auth/login` → `/regis/auth/login`
 */
export function devProxyStripGatewayPrefix(path: string): string {
  if (!path.startsWith(GATEWAY_PATH_PREFIX)) return path;
  return path.slice(GATEWAY_PATH_PREFIX.length) || '/';
}
