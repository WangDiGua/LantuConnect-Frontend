import { DEFAULT_API_BASE_PATH } from './defaultApiBase';

/** 与线上 API 根路径一致（默认 `/regis`，与静态资源子路径无关） */
export { DEFAULT_API_BASE_PATH };

const env = {
  VITE_API_BASE_URL: import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE_PATH,
  VITE_TOKEN_KEY: import.meta.env.VITE_TOKEN_KEY || 'lantu_access_token',
  VITE_REFRESH_TOKEN_KEY: import.meta.env.VITE_REFRESH_TOKEN_KEY || 'lantu_refresh_token',
} as const;

export { env };
