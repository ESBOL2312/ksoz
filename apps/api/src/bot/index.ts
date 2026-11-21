import { Bot, InlineKeyboard, type Api, type Context } from 'grammy';
import type { Transformer } from 'grammy';
import type { Update, UserFromGetMe } from 'grammy/types';
import { eq } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import type { Config } from '../config.js';
import type { Db } from '../db/client.js';
import { users } from '../db/schema.js';
import { AppError } from '../errors.js';
import { checkLinkCode, confirmLinkCode } from '../services/game.js';
import { formatStats, userStats } from '../services/stats.js';
import { getOrCreateUser } from '../services/users.js';

export const WEBHOOK_PATH = '/bot/webhook';
export const ALLOWED_UPDATES = ['message', 'my_chat_member', 'callback_query'] as const;

export interface BotOptions {
  /** подмена вызовов Bot API (тесты) */
  transformer?: Transformer;
}

const START_PAYLOAD_RE = /^[A-Za-z0-9_-]{1,64}$/;
const START_LINK_RE = /^link_(\S*)$/;
const LINK_CODE_RE = /^\d{6}$/;
const LINK_CALLBACK_RE = /^glink:(\d{6})$/;

/** Не больше `max` попыток ввода кода за минуту на одного игрока (в памяти процесса). */
export class AttemptLimiter {
  private hits = new Map<number, number[]>();
  constructor(
    private readonly max = 5,
    private readonly windowMs = 60_000,
  ) {}
  take(userId: number, now = Date.now()): boolean {
    const recent = (this.hits.get(userId) ?? []).filter((t) => now - t < this.windowMs);
    if (recent.length >= this.max) {
      this.hits.set(userId, recent);
      return false;
    }
    recent.push(now);
    this.hits.set(userId, recent);
    if (this.hits.size > 10_000) {
      for (const [id, ts] of this.hits) if (!ts.some((t) => now - t < this.windowMs)) this.hits.delete(id);
    }
    return true;
  }
}

const LINK_TEXT = {
  ask: 'Ер Төстік ойынын қосамыз ба?\nПодключить игру «Ер Төстік»?',
  usage: 'Ойындағы 6 санды кодты жаз: /link 482913\nНапиши код из игры: /link 482913',
  notFound: 'Код табылмады. Ойындағы сандарды тексер.\nКод не найден. Проверь цифры в игре.',
  expired: 'Кодтың уақыты өтті. Ойыннан жаңа код ал.\nКод устарел. Получи новый код в игре.',
  tooMany: 'Тым көп әрекет. Бір минуттан кейін қайталап көр.\nСлишком много попыток. Попробуй через минуту.',
  done: 'Дайын! Ойынға орал.\nГотово! Возвращайся в игру.',
};

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

  const attempts = new AttemptLimiter();
  // нажатия «Да» считаем отдельно: callback_data тоже можно подделать
  const presses = new AttemptLimiter();

  /** /start link_<код> и /link <код>: проверяем код и спрашиваем «Подключить?» с кнопкой «Да». */
  const askLink = async (ctx: Context, raw: string) => {
    if (!ctx.from) return;
    const code = raw.trim();
    if (!code) return void (await ctx.reply(LINK_TEXT.usage));
    if (!attempts.take(ctx.from.id)) return void (await ctx.reply(LINK_TEXT.tooMany));
    if (!LINK_CODE_RE.test(code)) return void (await ctx.reply(LINK_TEXT.notFound));
    const state = await checkLinkCode(db, code);
    if (state === 'expired') return void (await ctx.reply(LINK_TEXT.expired));
    if (state !== 'pending') return void (await ctx.reply(LINK_TEXT.notFound));
    await ctx.reply(LINK_TEXT.ask, { reply_markup: new InlineKeyboard().text('Иә / Да', `glink:${code}`) });
  };

  bot.command('link', (ctx) => askLink(ctx, ctx.match));

  bot.callbackQuery(LINK_CALLBACK_RE, async (ctx) => {
    const code = ctx.match[1]!;
    const from = ctx.from;
    if (!presses.take(from.id)) {
      await ctx.answerCallbackQuery({ text: LINK_TEXT.tooMany });
      return;
    }
    // как первый GET /v1/me: игрок мог ещё ни разу не открывать миниапп
    await getOrCreateUser(
      db,
      { id: from.id, first_name: from.first_name, username: from.username, language_code: from.language_code },
      null,
    );
    let text = LINK_TEXT.done;
    try {
      await confirmLinkCode(db, from.id, code);
    } catch (e) {
      if (!(e instanceof AppError)) throw e;
      text = e.code === 'code_expired' ? LINK_TEXT.expired : LINK_TEXT.notFound;
    }
    await ctx.answerCallbackQuery();
    await ctx.editMessageText(text);
  });

  bot.command('start', async (ctx) => {
    const link = START_LINK_RE.exec(ctx.match.trim());
    if (link) return askLink(ctx, link[1]!);
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

  // только для ADMIN_IDS; остальным — обычная подсказка, чтобы команда не светилась
  bot.command('stats', async (ctx) => {
    if (!ctx.from || !config.ADMIN_IDS.includes(ctx.from.id)) return hint(ctx);
    await ctx.reply(formatStats(await userStats(db)));
  });

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
