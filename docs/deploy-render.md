# Деплой на Render + Supabase (бесплатно)

API, бот и воркер напоминаний работают в одном процессе: `node dist/main.js all`
(миграции и сид → HTTP → `setWebhook` → воркер). Бесплатный Render усыпляет сервис после 15 минут
без входящих запросов, поэтому процесс сам раз в 9 минут запрашивает свой публичный `/health`
(`KEEPALIVE_URL`, по умолчанию `RENDER_EXTERNAL_URL/health`). `/health` делает `select 1`,
так что и база не простаивает.

## 1. Supabase

1. Создать проект, регион **Frankfurt (eu-central-1)**.
2. Project → Connect → **Session pooler** (порт 5432). Прямое подключение (`db.<ref>.supabase.co`)
   доступно только по IPv6 — Render к нему не подключится.
3. В конец строки добавить `?sslmode=no-verify` (сертификат Supabase подписан их собственным CA):
   `postgresql://postgres.<ref>:<пароль>@aws-0-eu-central-1.pooler.supabase.com:5432/postgres?sslmode=no-verify`

Transaction pooler (порт 6543) не подходит: pg-boss нужны сессионные возможности.

## 2. Render

1. New → **Blueprint** → репозиторий `ksoz`. Render прочитает `render.yaml`.
2. Заполнить переменные: `DATABASE_URL` (из шага 1), `BOT_TOKEN`, `BOT_USERNAME`,
   `WEB_ORIGIN=https://esbol2312.github.io`, `MINIAPP_URL` (адрес миниаппа на Pages), `ADMIN_IDS`.
   `WEBHOOK_SECRET` — длинная случайная строка только из латиницы, цифр, `_` и `-`
   (другие символы Telegram отклоняет). `PUBLIC_URL` возьмётся из адреса сервиса.
3. Deploy. В логах должно быть `webhook set` и `worker started`; проверить:
   `curl https://ksoz-api.onrender.com/health` → `{"status":"ok","db":"ok"}`.

## 3. Фронтенд на GitHub Pages

На Pages нет прокси `/api`, поэтому миниапп собирается с адресом API:

```sh
VITE_API_URL=https://ksoz-api.onrender.com VITE_BOT_USERNAME=<бот> VITE_DEV_USER= npm run build -w @ksoz/web
```

В BotFather (Bot Settings → Menu Button / Configure Mini App) указать адрес на Pages.

## Запасной пинг

Если сервис всё-таки уснёт (например, после рестарта Render), разбудит его любой запрос:
сообщение боту или открытие миниаппа (первый ответ ~1 минута). Для надёжности можно
добавить внешний пинг `/health` каждые 10 минут на cron-job.org или UptimeRobot.
