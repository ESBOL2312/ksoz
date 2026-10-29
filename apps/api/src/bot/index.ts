import { Bot, InlineKeyboard, type Api, type Context } from 'grammy';
import type { Transformer } from 'grammy';
import type { Update, UserFromGetMe } from 'grammy/types';
import { eq } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import type { Config } from '../config.js';
import type { Db } from '../db/client.js';
import { users } from '../db/schema.js';

export const WEBHOOK_PATH = '/bot/webhook';
export const ALLOWED_UPDATES = ['message', 'my_chat_member'] as const;

export interface BotOptions {
  /** подмена вызовов Bot API (тесты) */
  transformer?: Transformer;
}

const START_PAYLOAD_RE = /^[A-Za-z0-9_-]{1,64}$/;

function botInfo(config: Config): UserFromGetMe {
  const id = Number(config.BOT_TOKEN.split(':')[0]);
  return {
    id: Number.isFinite(id) ? id : 0,
    is_bot: true,
    first_name: 'ksoz',
    username: config.BOT_USERNAME,
    can_join_groups: false,
    can_read_all_group_messages: false,
    supports_inline_queries: false,
    can_connect_to_business: false,
    has_main_web_app: false,
    can_manage_bots: false,
    supports_join_request_queries: false,
    has_topics_enabled: false,
    allows_users_to_create_topics: false,
  };
}

/** Кнопка в миниапп: с start-параметром — ссылкой t.me/<bot>/<app>?startapp=..., иначе web_app. */
export function openAppKeyboard(config: Config, payload?: string): InlineKeyboard {
  if (payload && START_PAYLOAD_RE.test(payload)) {
    const url = `https://t.me/${config.BOT_USERNAME}/${config.WEBAPP_SHORT_NAME}?startapp=${encodeURIComponent(payload)}`;
    return new InlineKeyboard().url('Ашу / Открыть', url);
  }
  return new InlineKeyboard().webApp('Ашу / Открыть', config.MINIAPP_URL);
}

export function createBot(config: Config, db: Db, opts: BotOptions = {}): Bot {
  // botInfo задан, поэтому getMe не вызывается и бот создаётся даже с токеном-заглушкой
  const bot = new Bot(config.BOT_TOKEN, { botInfo: botInfo(config) });
  if (opts.transformer) bot.api.config.use(opts.transformer);

  bot.command('start', async (ctx) => {
    await ctx.reply(
      'Сәлем! Қазақ сөздерін бірге үйренейік.\nПривет! Давай учить казахские слова вместе.',
      { reply_markup: openAppKeyboard(config, ctx.match.trim() || undefined) },
    );
  });

  const hint = async (ctx: Context) => {
    await ctx.reply(
      'Сөздерді қосымшада үйренеміз. Хабарландыруларды қосымшаның баптауларынан өзгертуге болады.\n' +
        'Учим слова в приложении. Напоминания можно настроить в настройках приложения.',
      { reply_markup: openAppKeyboard(config) },
    );
  };
  bot.command('help', hint);
  bot.command('settings', hint);

  bot.on('my_chat_member', async (ctx) => {
    const u = ctx.myChatMember;
    if (u.chat.type !== 'private') return;
    const status = u.new_chat_member.status;
    if (status === 'kicked') {
      await db.update(users).set({ botBlocked: true }).where(eq(users.id, u.chat.id));
    } else if (status === 'member') {
      await db.update(users).set({ botBlocked: false }).where(eq(users.id, u.chat.id));
    }
  });

  return bot;
}

/** POST /bot/webhook: апдейты Telegram, защищённые секретом в заголовке. */
export function registerBot(app: FastifyInstance, opts: BotOptions = {}): void {
  const bot = createBot(app.config, app.db, opts);

  app.post(WEBHOOK_PATH, { config: { rateLimit: false } }, async (req, reply) => {
    if (req.headers['x-telegram-bot-api-secret-token'] !== app.config.WEBHOOK_SECRET) {
      return reply.status(401).send({ error: 'unauthorized' });
    }
    try {
      await bot.handleUpdate(req.body as Update);
    } catch (err) {
      // 200, чтобы Telegram не повторял апдейт бесконечно
      req.log.error({ err }, 'bot update failed');
    }
    return { ok: true };
  });
}

/** `main.ts set-webhook`: регистрирует PUBLIC_URL/bot/webhook у Telegram с секретом. */
export async function setWebhook(config: Config, api?: Pick<Api, 'setWebhook'>): Promise<string> {
  const url = `${config.PUBLIC_URL.replace(/\/$/, '')}${WEBHOOK_PATH}`;
  const target = api ?? new Bot(config.BOT_TOKEN).api;
  await target.setWebhook(url, {
    secret_token: config.WEBHOOK_SECRET,
    allowed_updates: [...ALLOWED_UPDATES],
  });
  return url;
}
