import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import type { Plugin } from 'vite';
import { defineConfig, loadEnv } from 'vite';
import { DEFAULT_API_BASE_PATH, STATIC_DEPLOY_PATH_PREFIX } from './src/config/defaultApiBase';

/** 静态资源 `base`（须以 / 结尾）；与 API 根路径无关 */
function normalizeAppBase(raw: string | undefined, useProdStaticSubpath: boolean): string {
  const v = raw?.trim();
  if (v) {
    if (v === '/') return '/';
    const s = v.startsWith('/') ? v : `/${v}`;
    return s.endsWith('/') ? s : `${s}/`;
  }
  return useProdStaticSubpath ? `${STATIC_DEPLOY_PATH_PREFIX}/` : '/';
}

/** 生产环境注入基础 CSP（与 Hash SPA + Google Fonts + 同源 API 代理对齐） */
function contentSecurityPolicyPlugin(mode: string, env: Record<string, string>): Plugin {
  /** 前后端不同源时请在 .env.production 设置 VITE_API_BASE_URL 完整 origin，否则 connect-src 仅同源 'self' */
  let connectExtras = 'https://fonts.googleapis.com https://fonts.gstatic.com ws: wss:';
  const api = env.VITE_API_BASE_URL || '';
  try {
    if (/^https?:\/\//i.test(api)) {
      connectExtras += ` ${new URL(api).origin}`;
    }
  } catch {
    /* 保持默认 */
  }

  const directives = [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' data: https: blob:",
    "font-src 'self' https://fonts.gstatic.com data:",
    `connect-src 'self' ${connectExtras}`,
    "worker-src 'self' blob:",
    "base-uri 'self'",
    "form-action 'self'",
    /** frame-ancestors 仅在 HTTP 响应头中生效，写在 meta 里会被浏览器忽略且控制台告警 */
    "upgrade-insecure-requests",
  ];
  const csp = directives.join('; ');

  return {
    name: 'lantu-content-security-policy',
    transformIndexHtml(html) {
      if (mode !== 'production') return html;
      if (html.includes('http-equiv="Content-Security-Policy"')) return html;
      return html.replace(/<head>/i, `<head>\n    <meta http-equiv="Content-Security-Policy" content="${csp.replace(/"/g, '&quot;')}" />`);
    },
  };
}

export default defineConfig(({ mode }) => {
  /** no-strict：仍用 development 的 .env（API 代理等）；关闭 StrictMode 见下方 define */
  const env = mode === 'no-strict' ? loadEnv('development', '.', '') : loadEnv(mode, '.', '');
  const proxyTarget = env.VITE_API_PROXY_TARGET || 'http://localhost:8080';
  const apiBase = (env.VITE_API_BASE_URL || DEFAULT_API_BASE_PATH).replace(/\/$/, '');
  /* 仅生产包默认挂载到与网关相同前缀下；本地 dev 默认根路径，需要时可在 .env.development 设 VITE_APP_BASE_PATH */
  const useProdStaticPrefix = mode === 'production';
  const base = normalizeAppBase(env.VITE_APP_BASE_PATH, useProdStaticPrefix);

  return {
    base,
    define:
      mode === 'no-strict'
        ? { 'import.meta.env.VITE_DISABLE_STRICT_MODE': JSON.stringify('true') }
        : undefined,
    plugins: [react(), tailwindcss(), contentSecurityPolicyPlugin(mode, env)],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
      },
    },
    server: {
      port: 5173,
      hmr: process.env.DISABLE_HMR !== 'true',
      proxy: {
        [apiBase]: {
          target: proxyTarget,
          changeOrigin: true,
        },
      },
    },
    build: {
      outDir: 'dist',
      sourcemap: false,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules/react-dom') || id.includes('node_modules/react/')) return 'react-vendor';
            if (id.includes('node_modules/@tanstack/react-query')) return 'query-vendor';
            if (id.includes('node_modules/react-router')) return 'router-vendor';
            if (id.includes('node_modules/@tanstack')) return 'tanstack-vendor';
            if (id.includes('node_modules/echarts')) return 'echarts';
            if (id.includes('node_modules/three')) return 'three';
            if (id.includes('node_modules/bytemd') || id.includes('node_modules/@bytemd')) return 'bytemd';
            if (id.includes('node_modules/framer-motion')) return 'framer-motion';
            if (id.includes('node_modules/prism-react-renderer') || id.includes('node_modules/prismjs')) return 'prism';
            if (id.includes('node_modules/lucide-react')) return 'icons-vendor';
            if (id.includes('node_modules/zod')) return 'zod-vendor';
          },
        },
      },
    },
  };
});
