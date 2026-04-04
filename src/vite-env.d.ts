/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** 为 true 时启用 React StrictMode（开发态会双跑 effect，易见接口重复请求；默认不启用） */
  readonly VITE_ENABLE_STRICT_MODE?: string;
  /** API 根路径（一般为后端 context-path，如 /regis），默认见 src/config/defaultApiBase.ts */
  readonly VITE_API_BASE_URL?: string;
  /** dev server 代理目标，默认 http://localhost:8080 */
  readonly VITE_API_PROXY_TARGET?: string;
  /**
   * 前端静态资源公共路径（Vite `base`），须以 / 开头，建议以 / 结尾；生产未设时默认与网关前缀一致。
   * 例：`/factory_ixeo2_8oiuw/` → 资源为 `https://域名/factory_ixeo2_8oiuw/assets/...`（API 仍用 VITE_API_BASE_URL，可仅为 `/regis`）
   */
  readonly VITE_APP_BASE_PATH?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
