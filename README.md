# ksoz

Telegram-миниапп для изучения казахских слов. Спецификация: [docs/architecture.md](docs/architecture.md), прототип: [docs/prototype/index.html](docs/prototype/index.html).

## Структура

```
apps/
  api/            Fastify + Drizzle + pg-boss + grammY (режимы serve / worker / migrate / seed)
    src/config.ts         env через zod
    src/db/               schema.ts, client.ts, migrate.ts, seed.ts; SQL-миграции в apps/api/drizzle/
    src/auth/initData.ts  проверка Telegram initData
    src/plugins/auth.ts   request.user, X-Dev-User, рефералы, requireAdmin
    src/services/         бизнес-логика (altyn.ts — единственный способ менять баланс)
    src/routes/           HTTP-роуты; новые плагины добавляются в routes/index.ts
    src/bot/              registerBot(app) — webhook бота
    src/worker/           startWorker(ctx) — напоминания (pg-boss)
    test/                 интеграционные тесты и хелперы
  web/            заглушка (позже Vue 3 + Nuxt UI + Tailwind CSS + axios)
packages/
  shared/         @ksoz/shared: SRS, проверка ответа, алтын, дни/недели, zod-схемы API
```

## Запуск в Docker

```sh
docker compose up --build
```

Поднимутся `postgres`, одноразовый `migrate` (миграции + сид слов), `api` на :3000 и `worker`.
Без файла `.env` работают значения для разработки (`NODE_ENV=development`, токен-заглушка);
в этом режиме можно ходить без Telegram:

```sh
curl localhost:3000/health
curl -H 'X-Dev-User: 42' localhost:3000/v1/me
```

Для настоящего бота скопируйте `.env.example` в `.env` и задайте `BOT_TOKEN`, `WEBHOOK_SECRET`, `WEB_ORIGIN` и др.

## Локальная разработка

```sh
npm install
docker run -d --name ksoz-pg-test -e POSTGRES_PASSWORD=postgres -p 5433:5432 postgres:16-alpine
docker exec ksoz-pg-test psql -U postgres -c 'create database ksoz_test'
cp .env.example .env            # DATABASE_URL указывает на локальную БД
npm run build
npm run dev                     # tsx watch, нужен DATABASE_URL и BOT_TOKEN в окружении
node apps/api/dist/main.js migrate && node apps/api/dist/main.js seed
```

Команды: `npm run build`, `npm run typecheck` (он же `lint`), `npm test`.

Миграции: после правки `apps/api/src/db/schema.ts` выполните `npm run db:generate -w @ksoz/api` и закоммитьте новые файлы из `apps/api/drizzle/`.

## Админка и картинки

`/admin/*` доступен пользователям из `ADMIN_IDS`. `POST /admin/words/:id/image` принимает `{ "image_url": "https://..." }` — файл в S3 админка/CDN загружает отдельно, бэкенд хранит только URL. `POST /admin/words/import` принимает CSV (`Content-Type: text/csv`, колонки `kk,ru,level,topic,example_kk,example_ru`; `topic` — slug, несколько через `|`) и ставит словам статус `draft`.

## Тесты

Юнит-тесты (`@ksoz/shared`, проверка initData) не требуют БД. Интеграционным нужен Postgres в `DATABASE_URL_TEST`; без него они пропускаются.

```sh
export DATABASE_URL_TEST=postgres://postgres:postgres@localhost:5433/ksoz_test
npm test
```

Всё в контейнерах (Postgres поднимается сам):

```sh
docker compose -f docker-compose.test.yml up --build --abort-on-container-exit --exit-code-from test
```

## Переменные окружения

| Переменная | По умолчанию | Назначение |
|---|---|---|
| `DATABASE_URL` | — (обязательна) | строка подключения к Postgres |
| `DATABASE_URL_TEST` | — | БД для интеграционных тестов |
| `BOT_TOKEN` | — (обязательна) | токен бота; подпись initData проверяется им |
| `BOT_USERNAME` | `ksoz_bot` | для ссылок-приглашений |
| `WEBAPP_SHORT_NAME` | `app` | короткое имя миниаппа в BotFather |
| `WEBHOOK_SECRET` | `dev-webhook-secret` | `X-Telegram-Bot-Api-Secret-Token`; в production обязателен свой |
| `WEB_ORIGIN` | `http://localhost:5173` | CORS (в development разрешён любой origin) |
| `PUBLIC_URL` | `http://localhost:3000` | публичный URL API (для webhook) |
| `MINIAPP_URL` | `http://localhost:5173` | URL миниаппа для кнопок бота |
| `ADMIN_IDS` | пусто | Telegram id админов через запятую |
| `NODE_ENV` | `development` | `development` включает заголовок `X-Dev-User` |
| `PORT` | `3000` | порт API |
| `LOG_LEVEL` | `info` | уровень pino |
