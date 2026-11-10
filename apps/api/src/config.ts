import { z } from 'zod';

const csvNumbers = z
  .string()
  .default('')
  .transform((s) =>
    s
      .split(',')
      .map((x) => x.trim())
      .filter(Boolean)
      .map(Number),
  )
  .pipe(z.array(z.number().int()));

const DEV_WEBHOOK_SECRET = 'dev-webhook-secret';

const EnvSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().default(3000),
    DATABASE_URL: z.string().min(1),
    BOT_TOKEN: z.string().min(1),
    BOT_USERNAME: z.string().default('ksoz_bot'),
    WEBAPP_SHORT_NAME: z.string().default('app'),
    // Telegram принимает secret_token только из A-Z, a-z, 0-9, _ и - (1–256 символов)
    WEBHOOK_SECRET: z
      .string()
      .regex(/^[A-Za-z0-9_-]{1,256}$/, 'WEBHOOK_SECRET: only A-Z, a-z, 0-9, _ and - (Telegram secret_token)')
      .default(DEV_WEBHOOK_SECRET),
    WEB_ORIGIN: z.string().default('http://localhost:5173'),
    PUBLIC_URL: z.string().default('http://localhost:3000'),
    MINIAPP_URL: z.string().default('http://localhost:5173'),
    ADMIN_IDS: csvNumbers,
    LOG_LEVEL: z.string().default('info'),
    /** если задан — serve раз в KEEPALIVE_MINUTES запрашивает этот URL (бесплатный Render засыпает через 15 мин) */
    KEEPALIVE_URL: z.union([z.literal('').transform(() => undefined), z.string().url()]).optional(),
    KEEPALIVE_MINUTES: z.coerce.number().positive().default(9),
    /** пул соединений приложения и pg-boss (на бесплатном Supabase Session pooler — 15 на всё) */
    DB_POOL_MAX: z.coerce.number().int().positive().default(10),
    BOSS_POOL_MAX: z.coerce.number().int().positive().default(10),
    /** режим all: при старте регистрировать webhook бота (PUBLIC_URL/bot/webhook) */
    SET_WEBHOOK_ON_START: z
      .enum(['true', 'false', '1', '0', ''])
      .default('')
      .transform((v) => v === 'true' || v === '1'),
  })
  .refine((e) => e.NODE_ENV !== 'production' || e.WEBHOOK_SECRET !== DEV_WEBHOOK_SECRET, {
    message: 'WEBHOOK_SECRET must be set in production',
    path: ['WEBHOOK_SECRET'],
  });

export type Config = z.infer<typeof EnvSchema>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  // На Render адрес сервиса приходит в RENDER_EXTERNAL_URL — используем его как дефолт.
  const renderUrl = env.RENDER_EXTERNAL_URL;
  if (renderUrl) {
    env = {
      ...env,
      PUBLIC_URL: env.PUBLIC_URL || renderUrl,
      KEEPALIVE_URL: env.KEEPALIVE_URL || `${renderUrl.replace(/\/$/, '')}/health`,
    };
  }
  const parsed = EnvSchema.safeParse(env);
  if (!parsed.success) {
    throw new Error(`Invalid environment:\n${z.prettifyError(parsed.error)}`);
  }
  return parsed.data;
}
