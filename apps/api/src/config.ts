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
    WEBHOOK_SECRET: z.string().default(DEV_WEBHOOK_SECRET),
    WEB_ORIGIN: z.string().default('http://localhost:5173'),
    PUBLIC_URL: z.string().default('http://localhost:3000'),
    MINIAPP_URL: z.string().default('http://localhost:5173'),
    ADMIN_IDS: csvNumbers,
    LOG_LEVEL: z.string().default('info'),
  })
  .refine((e) => e.NODE_ENV !== 'production' || e.WEBHOOK_SECRET !== DEV_WEBHOOK_SECRET, {
    message: 'WEBHOOK_SECRET must be set in production',
    path: ['WEBHOOK_SECRET'],
  });

export type Config = z.infer<typeof EnvSchema>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const parsed = EnvSchema.safeParse(env);
  if (!parsed.success) {
    throw new Error(`Invalid environment:\n${z.prettifyError(parsed.error)}`);
  }
  return parsed.data;
}
