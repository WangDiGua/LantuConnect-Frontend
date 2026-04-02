/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** 为 true 时不使用 React StrictMode（开发环境避免 effect 双跑、接口双请求） */
  readonly VITE_DISABLE_STRICT_MODE?: string;
  /** 后端上下文路径，须与 server.servlet.context-path 一致，默认 /regis */
  readonly VITE_API_BASE_URL?: string;
  /** dev server 代理目标，默认 http://localhost:8080 */
  readonly VITE_API_PROXY_TARGET?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
