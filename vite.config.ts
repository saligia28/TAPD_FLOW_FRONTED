import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: false, // 如果端口被占用，自动尝试下一个可用端口
    host: true, // 监听所有地址
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
      '/node-api': {
        target: 'http://127.0.0.1:3400',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/node-api/, ''),
      },
    },
  },
  preview: {
    host: '0.0.0.0',
    port: 5173,
  },
});
