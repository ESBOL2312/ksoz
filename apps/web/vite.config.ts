import { fileURLToPath, URL } from 'node:url';
import ui from '@nuxt/ui/vite';
import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [
    vue(),
    ui({
      // светлую/тёмную тему выбираем сами по теме Telegram (telegram/webapp.ts)
      colorMode: false,
      ui: {
        colors: {
          primary: 'kok',
          secondary: 'gold',
          success: 'green',
          info: 'kok',
          warning: 'gold',
          error: 'red',
          neutral: 'slate',
        },
      },
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      // общие схемы и SRS берём прямо из исходников, без отдельной сборки
      '@ksoz/shared': fileURLToPath(new URL('../../packages/shared/src/index.ts', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api': {
        target: process.env.API_PROXY_TARGET ?? 'http://localhost:3000',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api/, ''),
      },
    },
  },
  test: {
    environment: 'happy-dom',
  },
});
