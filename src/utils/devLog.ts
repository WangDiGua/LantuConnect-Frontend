/**
 * 开发环境诊断输出；生产构建不刷屏控制台。
 * ErrorBoundary、关键不可恢复错误可仍使用 console.error。
 */
const isDev = import.meta.env.DEV;

export const devLog = {
  debug: (...args: unknown[]) => {
    if (isDev) console.debug(...args);
  },
  info: (...args: unknown[]) => {
    if (isDev) console.info(...args);
  },
  warn: (...args: unknown[]) => {
    if (isDev) console.warn(...args);
  },
  error: (...args: unknown[]) => {
    if (isDev) console.error(...args);
  },
};
