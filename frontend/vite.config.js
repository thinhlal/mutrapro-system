import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    global: 'globalThis',
  },
  resolve: {
    alias: {
      buffer: 'buffer',
    },
  },
  optimizeDeps: {
    esbuildOptions: {
      define: {
        global: 'globalThis',
      },
    },
  },
  server: {
    proxy: {
      "/klang-api": {
        target: "https://api.klang.io",
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/klang-api/, ""),
      },
    },
  },
});
