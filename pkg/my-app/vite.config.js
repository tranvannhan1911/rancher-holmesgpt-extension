import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    proxy: {
      '/api/chat': {
        target: 'https://holmes.109.237.71.43.sslip.io',
        changeOrigin: false,
        secure: false,
        rewrite: (path) => path.replace(/^\/api\/chat/, '/api/chat'),
      },
    },
  },
});