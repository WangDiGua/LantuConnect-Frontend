/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** 为 true 时不使用 React StrictMode（开发环境避免 effect 双跑、接口双请求） */
  readonly VITE_DISABLE_STRICT_MODE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
