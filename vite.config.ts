import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  const proxyTarget = env.VITE_API_PROXY_TARGET || 'http://localhost:8080';

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
      },
    },
    server: {
      port: 5173,
      hmr: process.env.DISABLE_HMR !== 'true',
      proxy: {
        '/api': {
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
            if (id.includes('node_modules/echarts')) return 'echarts';
            if (id.includes('node_modules/three')) return 'three';
            if (id.includes('node_modules/bytemd') || id.includes('node_modules/@bytemd')) return 'bytemd';
            if (id.includes('node_modules/framer-motion')) return 'framer-motion';
            if (id.includes('node_modules/prism-react-renderer') || id.includes('node_modules/prismjs')) return 'prism';
          },
        },
      },
    },
  };
});
