import { DEFAULT_API_BASE_PATH } from './defaultApiBase';

/** 与线上 API 根路径一致（默认 `网关前缀/regis`；仅 `/regis` 表示本机直连） */
export { DEFAULT_API_BASE_PATH };

const env = {
  VITE_API_BASE_URL: import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE_PATH,
  VITE_TOKEN_KEY: import.meta.env.VITE_TOKEN_KEY || 'lantu_access_token',
  VITE_REFRESH_TOKEN_KEY: import.meta.env.VITE_REFRESH_TOKEN_KEY || 'lantu_refresh_token',
} as const;

export { env };
