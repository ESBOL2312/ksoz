import { eq } from 'drizzle-orm';
import Fastify, { type FastifyInstance } from 'fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { registerBot, setWebhook } from '../src/bot/index.js';
import { users } from '../src/db/schema.js';
import { hasTestDb, makeTestApp, resetDb, testConfig } from './helpers/app.js';

const secret = { 'x-telegram-bot-api-secret-token': 'dev-webhook-secret' };

function myChatMember(userId: number, status: 'kicked' | 'member') {
  return {
    update_id: 1,
    my_chat_member: {
      chat: { id: userId, type: 'private', first_name: 'U' },
      from: { id: userId, is_bot: false, first_name: 'U' },
      date: 1_700_000_000,
      old_chat_member: { status: status === 'kicked' ? 'member' : 'kicked', user: { id: 1, is_bot: true, first_name: 'b' } },
      new_chat_member: { status, user: { id: 1, is_bot: true, first_name: 'b' }, ...(status === 'kicked' ? { until_date: 0 } : {}) },
    },
  };
}

describe.skipIf(!hasTestDb)('bot webhook', () => {
  let app: FastifyInstance;
  beforeAll(async () => {
    app = await makeTestApp();
  });
  afterAll(async () => {
    await app.close();
  });
  beforeEach(async () => {
    await resetDb(app);
  });

  const post = (body: unknown, headers: Record<string, string> = secret) =>
    app.inject({ method: 'POST', url: '/bot/webhook', headers, payload: body as object });

  it('rejects a missing or wrong secret with 401', async () => {
    expect((await post(myChatMember(1, 'kicked'), {})).statusCode).toBe(401);
    expect((await post(myChatMember(1, 'kicked'), { 'x-telegram-bot-api-secret-token': 'nope' })).statusCode).toBe(401);
  });

  it('accepts the right secret with 200', async () => {
    const res = await post({ update_id: 5 });
    expect(res.statusCode).toBe(200);
  });

  it('my_chat_member kicked / member toggles users.bot_blocked', async () => {
    await app.db.insert(users).values({ id: 77, firstName: 'U' });
    expect((await post(myChatMember(77, 'kicked'))).statusCode).toBe(200);
    let [u] = await app.db.select().from(users).where(eq(users.id, 77));
    expect(u!.botBlocked).toBe(true);
    expect((await post(myChatMember(77, 'member'))).statusCode).toBe(200);
    [u] = await app.db.select().from(users).where(eq(users.id, 77));
    expect(u!.botBlocked).toBe(false);
  });

  it('unknown user in my_chat_member is ignored', async () => {
    expect((await post(myChatMember(999, 'kicked'))).statusCode).toBe(200);
  });
});

describe.skipIf(!hasTestDb)('bot handlers with a fake Bot API', () => {
  let app: FastifyInstance;
  const calls: { method: string; payload: Record<string, any> }[] = [];

  beforeAll(async () => {
    const base = await makeTestApp();
    app = Fastify();
    app.decorate('config', testConfig({ BOT_USERNAME: 'ksoz_bot', WEBAPP_SHORT_NAME: 'app', MINIAPP_URL: 'https://app.example' }));
    app.decorate('db', base.db);
    registerBot(app, {
      transformer: async (_prev, method, payload) => {
        calls.push({ method, payload: payload as Record<string, any> });
        return { ok: true, result: true } as never;
      },
    });
    await app.ready();
    await base.close().catch(() => {});
  });
  afterAll(async () => {
    await app.close().catch(() => {});
  });
  beforeEach(() => void (calls.length = 0));

  const message = (text: string) => ({
    update_id: 2,
    message: {
      message_id: 1,
      date: 1_700_000_000,
      chat: { id: 5, type: 'private', first_name: 'U' },
      from: { id: 5, is_bot: false, first_name: 'U' },
      text,
      entities: [{ type: 'bot_command', offset: 0, length: text.split(' ')[0]!.length }],
    },
  });
  const send = (text: string) =>
    app.inject({ method: 'POST', url: '/bot/webhook', headers: secret, payload: message(text) });

  it('/start replies with a web_app button', async () => {
    expect((await send('/start')).statusCode).toBe(200);
    const c = calls.find((x) => x.method === 'sendMessage')!;
    expect(c.payload.text).toContain('Сәлем');
    expect(JSON.stringify(c.payload.reply_markup)).toContain('https://app.example');
  });

  it('/start ref_42 forwards the payload via startapp link', async () => {
    await send('/start ref_42');
    const c = calls.find((x) => x.method === 'sendMessage')!;
    expect(JSON.stringify(c.payload.reply_markup)).toContain('https://t.me/ksoz_bot/app?startapp=ref_42');
  });

  it('/help answers', async () => {
    await send('/help');
    expect(calls.some((x) => x.method === 'sendMessage')).toBe(true);
  });
});

describe('setWebhook', () => {
  it('registers PUBLIC_URL/bot/webhook with the secret', async () => {
    let got: any;
    const url = await setWebhook(testConfig({ PUBLIC_URL: 'https://api.example/' }), {
      setWebhook: async (u: string, o: unknown) => {
        got = { u, o };
        return true;
      },
    } as never);
    expect(url).toBe('https://api.example/bot/webhook');
    expect(got.o.secret_token).toBe('dev-webhook-secret');
  });
});
