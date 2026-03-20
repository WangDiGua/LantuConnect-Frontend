import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  const useMock = env.VITE_USE_MOCK === 'true';

  return {
    plugins: [react(), tailwindcss()],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      proxy: useMock
        ? undefined
        : {
            '/api': {
              target: env.VITE_API_PROXY_TARGET || 'http://localhost:8080',
              changeOrigin: true,
              rewrite: (p: string) => p.replace(/^\/api/, ''),
            },
          },
    },
  };
});
