/** 与后端 server.servlet.context-path 一致（默认 /regis） */
const env = {
  VITE_API_BASE_URL: import.meta.env.VITE_API_BASE_URL || '/regis',
  VITE_TOKEN_KEY: import.meta.env.VITE_TOKEN_KEY || 'lantu_access_token',
  VITE_REFRESH_TOKEN_KEY: import.meta.env.VITE_REFRESH_TOKEN_KEY || 'lantu_refresh_token',
} as const;

export { env };
