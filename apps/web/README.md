# @ksoz/web

Telegram-миниапп «Сөз ауылы»: Vite + Vue 3 + Nuxt UI 4 + Tailwind CSS 4 + TanStack Query + Pinia + axios.
Архитектура: https://claude.ai/artifact/4mN9nk7oZGmdXDtkXYZr6G, макеты: https://claude.ai/artifact/3BL2ihtTBcwbo3C6nEtRJv.

```sh
npm run dev -w @ksoz/web        # :5173, /api → localhost:3000, вне Telegram X-Dev-User: 42
npm run typecheck -w @ksoz/web
npm run test -w @ksoz/web
npm run build -w @ksoz/web      # dist/
```

Общие схемы и SRS подключаются из `packages/shared/src` напрямую (алиас в vite.config.ts), сборка shared не нужна.
