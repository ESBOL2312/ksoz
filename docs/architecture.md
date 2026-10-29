# Архитектура бэкенда ksoz

Источник: документ «Архитектура бэкенда ksoz» (claude.ai/artifact/Mf4L3iRv8uoEATZL2t2W5M). Здесь его рабочая копия для разработки.

Один сервис на TypeScript (Fastify) + PostgreSQL, принимает запросы миниаппа и бота, плюс отдельный процесс-воркер для напоминаний. Без Redis и микросервисов.

## Что закрывает бэкенд
- Прогресс между устройствами: состояние каждого слова у каждого пользователя.
- Проверка ответа на сервере (сравнение, «почти верно», подсказки), иначе алтын и рейтинг накрутят.
- Экономика: алтын, комбо, базар, аул, задания дня, серия.
- Словарь: уровни A1–B2, темы, картинки, примеры, статус проверки носителем.
- Бот: напоминания о повторах (20 мин, 1 ч, 2 ч, 5 ч, дальше SRS) и о серии.
- Соревнования (v2): друзья по приглашению, недельная бәйге по друзьям/городу/Казахстану.

## Стек
| Слой | Выбор |
|---|---|
| Язык | TypeScript, Node.js 22 |
| HTTP | Fastify + zod |
| Бот | grammY через webhook, тот же процесс, что API |
| База | PostgreSQL 16 |
| ORM и миграции | Drizzle |
| Фоновые задачи | pg-boss (очередь в той же Postgres) |
| Медиа | S3-совместимое хранилище + CDN (в БД только URL) |
| Логи | pino JSON, `/health` |

Монорепо:
- `apps/web` — миниапп (позже: Vue 3 + Nuxt UI + Tailwind CSS + axios). Сейчас только заглушка.
- `apps/api` — API, бот и воркер: один код, два режима запуска `serve` и `worker`.
- `packages/shared` — SRS, проверка ответа, типы API (общие для фронта и бэка).

## Модель данных
Ключ пользователя — Telegram id (bigint).

Словарь:
- `words`: id, kk, kk_latn, ru, en, level (A1–B2), image_url, audio_url, status (draft / reviewed / published).
- `word_examples`: id, word_id, kk, ru, position.
- `topics` (slug, name_kk, name_ru), `word_topics` (word_id, topic_id).
- `items`: id, word_id, category (kiim / uy / mal / aspap), price, min_level, slot. Товар базара всегда привязан к слову.
- `cities`: id, name_kk, name_ru.

Пользователь и прогресс:
- `users`: id (= Telegram id), first_name, username, language_code, level, city_id, timezone, altyn, combo, streak_current, streak_best, last_active_day, aul_stage, notify (jsonb), referrer_id, bot_blocked, created_at. altyn — кеш баланса, меняется только вместе с записью в журнале.
- `user_words`: PK (user_id, word_id), phase (learning / review), step (0–3), ease, interval_days, due_at, reps, lapses, source (lesson / bazaar), introduced_at, last_reviewed_at. Индекс (user_id, due_at).
- `reviews`: id, client_id (uuid, unique), user_id, word_id, input, verdict (correct / almost / wrong), hints, ms, step_before, due_before, due_after, altyn, created_at.
- `friendships`: user_id, friend_id, created_at (две строки на пару).

Экономика:
- `altyn_ledger`: id, user_id, delta, reason (review / task / purchase / prize), ref_id, created_at. Сумма = users.altyn.
- `user_items`: user_id, item_id, equipped, acquired_at.
- `daily_tasks`: user_id, day, code, progress, target, reward, claimed_at. Три задания создаются при первом входе за день.
- `weekly_scores`: PK (week, user_id), city_id, score. Индексы (week, score), (week, city_id, score).
- `notification_log`: user_id, kind, sent_at.

Правило алтына: любое изменение баланса — одна транзакция: строка в `altyn_ledger` + изменение `users.altyn` (с блокировкой строки / проверкой на минус) + очки в `weekly_scores`.

## Авторизация (Telegram initData)
Заголовок `Authorization: tma <initData>`.
1. Разобрать initData как query string, вынуть `hash`.
2. Остальные пары отсортировать по ключу, склеить `key=value` через `\n` — data_check_string.
3. secret = HMAC_SHA256(key="WebAppData", msg=bot_token); hash = hex(HMAC_SHA256(key=secret, msg=data_check_string)). Сравнить через timingSafeEqual.
4. Отклонить, если `auth_date` старше 24 часов.
5. `user.id` — id пользователя; при первом запросе создать `users`, из `start_param` (`ref_<id>`) взять реферала. Дружба создаётся только для нового пользователя.

Ещё: токен бота только в env сервера; при `NODE_ENV=development` допускается заголовок `X-Dev-User: <telegram id>`; админка — тот же initData + `ADMIN_IDS`; лимит запросов на пользователя (например, 60 ответов/мин); CORS только с домена миниаппа (`WEB_ORIGIN`).

## API (`/v1`, JSON)
| Метод и путь | Что делает | Версия |
|---|---|---|
| GET /v1/me | создаёт пользователя при первом заходе, отдаёт профиль | 1 |
| PATCH /v1/me | уровень, город, часовой пояс, напоминания | 1 |
| GET /v1/home | алтын, серия, ступень аула, надетые вещи, сколько слов к повтору, задания дня | 1 |
| GET /v1/lesson?limit=12 | очередь: сначала due_at ≤ now, потом новые в пределах дневного лимита. Для повтора — картинка и перевод без казахского слова | 1 |
| POST /v1/lesson/introduce | новое слово показано целиком, первый повтор через 20 мин | 1 |
| POST /v1/lesson/hint | следующая буква, считает подсказки | 1 |
| POST /v1/reviews | проверяет ответ, сдвигает SRS, начисляет алтын и комбо | 1 |
| GET /v1/words?level=&topic= | словарь с состоянием каждого слова у пользователя | 1 |
| GET /v1/topics | темы и уровни | 1 |
| GET /v1/bazaar | товары: куплено, доступно, закрыто по уровню | 1 |
| POST /v1/bazaar/purchase | списывает алтын, выдаёт вещь, ставит её слово в повторы | 1 |
| POST /v1/inventory/equip | надеть или снять вещь | 1 |
| POST /v1/tasks/{code}/claim | награда за задание дня | 1 |
| POST /v1/import/local | один раз переносит прогресс из localStorage прототипа (сопоставление по казахскому слову) | 1 |
| GET /v1/baige?scope=friends\|city\|kz | рейтинг недели, моё место, приз | 2 |
| GET /v1/invite | ссылка «Позвать друга» | 2 |
| POST /bot/webhook | апдейты Telegram, проверка `X-Telegram-Bot-Api-Secret-Token` | 1 |
| /admin/* | CRUD слов, импорт CSV, статус reviewed/published, загрузка картинок | 1 |

`client_id` делает POST /v1/reviews идемпотентным: повтор вернёт тот же результат и не начислит алтын дважды.

```
POST /v1/reviews
{ "client_id": "8f0c…", "word_id": 412, "input": "буркіт", "hints": 0, "ms": 5400 }

200 OK
{ "verdict": "almost", "answer": "бүркіт", "fix": [{ "pos": 1, "expected": "ү" }],
  "altyn": { "base": 15, "combo": 3, "earned": 22, "balance": 1840 },
  "next": { "phase": "learning", "step": 2, "due_at": "2026-10-29T14:52:00Z" },
  "examples": [{ "kk": "Бүркіт тау үстінде қалықтап ұшып жүр.", "ru": "Беркут парит над горами." }] }
```

## SRS
Сервер решает; клиент показывает прогноз той же функцией из `packages/shared`. `due_at` — timestamptz.
1. learning, шаги 0–3: интервалы 20 мин, 1 ч, 2 ч, 5 ч. Верно → следующий шаг, ошибка → шаг 0.
2. review: после четвёртого верного короткого повтора интервал 1 день, дальше SM-2 из прототипа: интервал × ease (старт 2.5, не ниже 1.3).
3. Ошибка в review: lapses + 1, ease − 0.2, слово в learning на шаг 0.

| Результат ввода | q | Алтын |
|---|---|---|
| верно без подсказок | 4 | база × комбо |
| верно с подсказками | 3 | меньше за каждую подсказку |
| почти верно (русские буквы вместо ә ғ қ ң ө ұ ү і һ) | 3 | половина, комбо не растёт |
| неверно | 0 | 0, комбо сбрасывается |

Нормализация: нижний регистр, trim, Unicode NFC. «Почти верно»: обе строки в «русскую проекцию» (ә→а, ғ→г, қ→к, ң→н, ө→о, ұ и ү→у, і→и, һ→х) и сравнить снова; позиции расхождений → `fix`.

День пользователя (лимит новых слов, серия, задания) считается по его часовому поясу (фронт шлёт `Intl…timeZone`, по умолчанию Asia/Almaty). Полного офлайна нет; фронт досылает очередь ответов с `client_id`.

## Бот и напоминания
Воркер раз в минуту ищет, кому пора написать, и ставит сообщения в очередь; бот шлёт их с кнопкой, открывающей миниапп.
| Напоминание | Когда | Ограничения |
|---|---|---|
| Короткий повтор (20 мин–5 ч) | due_at наступил | если включено; не чаще раза в час |
| Повторы дня | есть слова к повтору, утром по местному времени | одно в день |
| Серия сгорает | 20:00 местного, сегодня не занимался | одно в день |
| Итоги бәйге (v2) | воскресенье, после закрытия недели | раз в неделю |

Тихие часы 22:00–9:00 местного. Не быстрее 25 сообщений/с. 403 от Telegram → `bot_blocked = true`, больше не пишем.

## Деплой
Docker Compose: postgres, api (`serve`), worker. Позже Caddy, бэкапы, GitHub Actions.

## Решения по открытым вопросам (временные значения по умолчанию, вынесены в конфиг)
- «Почти верно» двигает слово вперёд с половинной наградой, комбо не растёт.
- После ошибки слово откатывается на шаг 0.
- Алтын: база 10; комбо-множитель 1 + 0.1 × min(combo, 10); минус 30% базы за каждую подсказку (не ниже 0). Лимит новых слов в день 10. Цены базара — в сиде.
- Платежи Telegram Stars не делаем.
