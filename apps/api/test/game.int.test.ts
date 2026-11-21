import { eq } from 'drizzle-orm';
import Fastify, { type FastifyInstance } from 'fastify';
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { registerBot } from '../src/bot/index.js';
import { gameLinkCodes, gameLinks, items, userItems, users, words } from '../src/db/schema.js';
import { AttemptLimiter } from '../src/bot/index.js';
import { client, setUser } from './helpers/api.js';
import { hasTestDb, makeTestApp, resetDb, seedDb, testConfig } from './helpers/app.js';

const secret = { 'x-telegram-bot-api-secret-token': 'dev-webhook-secret' };

/** игра: свои запросы без initData */
function game(app: FastifyInstance, deviceId = randomUUID()) {
  return {
    deviceId,
    newCode: () => app.inject({ method: 'POST', url: '/v1/game/link-codes', payload: { device_id: deviceId } }),
    status: (code: string, device = deviceId) =>
      app.inject({ url: `/v1/game/link-codes/${code}?device_id=${device}` }),
    inventory: (token: string) => app.inject({ url: '/v1/game/inventory', headers: { authorization: `Game ${token}` } }),
    unlink: (token: string) => app.inject({ method: 'DELETE', url: '/v1/game/link', headers: { authorization: `Game ${token}` } }),
  };
}

async function itemId(app: FastifyInstance, kk: string): Promise<number> {
  const [r] = await app.db
    .select({ id: items.id })
    .from(items)
    .innerJoin(words, eq(words.id, items.wordId))
    .where(eq(words.kk, kk));
  return r!.id;
}

describe.skipIf(!hasTestDb)('game link', () => {
  let app: FastifyInstance;
  beforeAll(async () => {
    await seedDb();
    app = await makeTestApp();
  });
  afterAll(() => app.close());
  beforeEach(() => resetDb(app));

  /** код → подтверждение в миниаппе → токен */
  async function link(userId: number, g = game(app)) {
    const code = (await g.newCode()).json().code as string;
    expect((await client(app, userId).post(`/v1/game/link-codes/${code}/confirm`)).statusCode).toBe(200);
    const res = await g.status(code);
    expect(res.statusCode).toBe(200);
    return { g, code, token: res.json().token as string };
  }

  it('full link: code → pending → confirm → token once → inventory', async () => {
    const c = client(app, 101);
    await c.get('/v1/me');
    await setUser(app, 101, { altyn: 240 });
    const chapan = await itemId(app, 'Шапан');
    const takiya = await itemId(app, 'Тақия');
    await app.db.insert(userItems).values([
      { userId: 101, itemId: chapan, equipped: true },
      { userId: 101, itemId: takiya },
    ]);

    const g = game(app);
    const created = await g.newCode();
    expect(created.statusCode).toBe(200);
    const { code, expires_at, bot_url } = created.json();
    expect(code).toMatch(/^\d{6}$/);
    expect(new Date(expires_at).getTime() - Date.now()).toBeGreaterThan(9 * 60_000);
    expect(bot_url).toBe(`https://t.me/ksoz_bot?start=link_${code}`);

    expect((await g.status(code)).json()).toMatchObject({ status: 'pending' });

    expect((await c.post(`/v1/game/link-codes/${code}/confirm`)).json()).toEqual({ ok: true });
    // повторное подтверждение тем же игроком — не ошибка
    expect((await c.post(`/v1/game/link-codes/${code}/confirm`)).statusCode).toBe(200);

    const claimed = await g.status(code);
    expect(claimed.statusCode).toBe(200);
    const body = claimed.json();
    expect(body).toMatchObject({ status: 'confirmed', first_name: 'Test' });
    expect(body.token).toMatch(/^[A-Za-z0-9_-]{43}$/);

    // в базе только хеш
    const [row] = await app.db.select().from(gameLinks);
    expect(row!.tokenHash).not.toBe(body.token);
    expect(row!.tokenHash).toMatch(/^[0-9a-f]{64}$/);

    const inv = await g.inventory(body.token);
    expect(inv.statusCode).toBe(200);
    const json = inv.json();
    expect(json).toMatchObject({ first_name: 'Test', altyn: 240 });
    // без Telegram id и username
    expect(Object.keys(json).sort()).toEqual(['altyn', 'first_name', 'items']);
    expect(JSON.stringify(json)).not.toContain('101');
    expect(json.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: chapan, key: 'chapan', kk: 'Шапан', category: 'kiim', slot: 'body', equipped: true, set: null, rarity: null }),
        expect.objectContaining({ id: takiya, key: 'takiya', equipped: false, image_url: null }),
      ]),
    );
    expect(json.items).toHaveLength(2);

    const [seen] = await app.db.select().from(gameLinks);
    expect(seen!.lastSeenAt).not.toBeNull();
  });

  it('repeated claim: the token is given only once', async () => {
    const { g, code } = await link(102);
    const again = await g.status(code);
    expect(again.statusCode).toBe(409);
    expect(again.json().error).toBe('code_already_claimed');
  });

  it('expired code: status expired, confirm 410', async () => {
    const c = client(app, 103);
    const g = game(app);
    const code = (await g.newCode()).json().code;
    await app.db.update(gameLinkCodes).set({ expiresAt: new Date(Date.now() - 1000) }).where(eq(gameLinkCodes.code, code));
    expect((await g.status(code)).json()).toEqual({ status: 'expired' });
    const res = await c.post(`/v1/game/link-codes/${code}/confirm`);
    expect(res.statusCode).toBe(410);
    expect(res.json().error).toBe('code_expired');
  });

  it('confirmed code expires after the grace period', async () => {
    const g = game(app);
    const code = (await g.newCode()).json().code;
    await client(app, 104).post(`/v1/game/link-codes/${code}/confirm`);
    await app.db
      .update(gameLinkCodes)
      .set({ expiresAt: new Date(Date.now() - 6 * 60_000) })
      .where(eq(gameLinkCodes.code, code));
    expect((await g.status(code)).json()).toEqual({ status: 'expired' });
  });

  it('another device_id cannot see or claim the code', async () => {
    const g = game(app);
    const code = (await g.newCode()).json().code;
    await client(app, 105).post(`/v1/game/link-codes/${code}/confirm`);
    const other = await g.status(code, randomUUID());
    expect(other.statusCode).toBe(404);
    expect(other.json().error).toBe('code_not_found');
    // хозяин кода всё ещё может забрать токен
    expect((await g.status(code)).json().status).toBe('confirmed');
  });

  it('a code confirmed by one user cannot be taken over by another', async () => {
    const code = (await game(app).newCode()).json().code;
    await client(app, 106).post(`/v1/game/link-codes/${code}/confirm`);
    const res = await client(app, 107).post(`/v1/game/link-codes/${code}/confirm`);
    expect(res.statusCode).toBe(409);
    expect(res.json().error).toBe('code_already_used');
    expect((await client(app, 107).post('/v1/game/link-codes/000000/confirm')).statusCode).toBe(404);
  });

  it('a new code for the device cancels the previous unconfirmed one', async () => {
    const g = game(app);
    const first = (await g.newCode()).json().code;
    const second = (await g.newCode()).json().code;
    expect(first).not.toBe(second);
    expect((await g.status(first)).statusCode).toBe(404);
    expect((await g.status(second)).json().status).toBe('pending');
  });

  it('validates input', async () => {
    expect((await app.inject({ method: 'POST', url: '/v1/game/link-codes', payload: { device_id: 'x' } })).statusCode).toBe(400);
    expect((await app.inject({ url: `/v1/game/link-codes/12345?device_id=${randomUUID()}` })).statusCode).toBe(400);
    expect((await app.inject({ url: '/v1/game/link-codes/123456' })).statusCode).toBe(400);
  });

  it('game token: required, cannot be forged, cannot reach tma routes', async () => {
    expect((await app.inject({ url: '/v1/game/inventory' })).statusCode).toBe(401);
    const bad = await game(app).inventory('nope');
    expect(bad.statusCode).toBe(401);
    expect(bad.json().error).toBe('invalid_game_token');

    const { token } = await link(108);
    const headers = { authorization: `Game ${token}` };
    expect((await app.inject({ url: '/v1/me', headers })).statusCode).toBe(401);
    expect((await app.inject({ method: 'POST', url: '/v1/bazaar/purchase', headers, payload: { item_id: 1 } })).statusCode).toBe(401);
    expect((await app.inject({ url: '/v1/game/links', headers })).statusCode).toBe(401);
  });

  it('revoke from the game: DELETE /v1/game/link → token stops working', async () => {
    const { g, token } = await link(109);
    expect((await g.inventory(token)).statusCode).toBe(200);
    expect((await g.unlink(token)).json()).toEqual({ ok: true });
    expect((await g.inventory(token)).statusCode).toBe(401);
    expect((await client(app, 109).get('/v1/game/links')).json()).toEqual({ links: [] });
  });

  it('revoke from the miniapp: list devices, delete one, other user cannot', async () => {
    const a = await link(110);
    const b = await link(110);
    const c = client(app, 110);
    const { links } = (await c.get('/v1/game/links')).json();
    expect(links).toHaveLength(2);
    expect(links[0]).toEqual({ id: expect.any(Number), created_at: expect.any(String), last_seen_at: null });

    const target = (await app.db.select().from(gameLinks).where(eq(gameLinks.deviceId, a.g.deviceId)))[0]!;
    expect((await client(app, 111).del(`/v1/game/links/${target.id}`)).statusCode).toBe(404);
    expect((await c.del(`/v1/game/links/${target.id}`)).json()).toEqual({ ok: true });
    expect((await c.del(`/v1/game/links/${target.id}`)).statusCode).toBe(404);

    expect((await a.g.inventory(a.token)).statusCode).toBe(401);
    expect((await b.g.inventory(b.token)).statusCode).toBe(200);
    expect((await c.get('/v1/game/links')).json().links).toHaveLength(1);
  });

  it('relinking the same device replaces the old link and token', async () => {
    const g = game(app);
    const first = await link(112, g);
    const second = await link(113, g);
    expect((await g.inventory(first.token)).statusCode).toBe(401);
    expect((await g.inventory(second.token)).statusCode).toBe(200);
    const rows = await app.db.select().from(gameLinks).where(eq(gameLinks.deviceId, g.deviceId));
    expect(rows).toHaveLength(1);
    expect(rows[0]!.userId).toBe(113);
  });
});

describe.skipIf(!hasTestDb)('game CORS in production', () => {
  let app: FastifyInstance;
  beforeAll(async () => {
    app = await makeTestApp({
      NODE_ENV: 'production',
      LOG_LEVEL: 'silent',
      WEBHOOK_SECRET: 'prod-secret',
      WEB_ORIGIN: 'https://esbol2312.github.io',
      GAME_ORIGINS: 'https://yer-tostik.vercel.app, https://yer-tostik-*.vercel.app',
    });
  });
  afterAll(() => app.close());

  const preflight = (url: string, origin: string) =>
    app.inject({
      method: 'OPTIONS',
      url,
      headers: { origin, 'access-control-request-method': 'GET', 'access-control-request-headers': 'authorization' },
    });
  const allowed = async (url: string, origin: string) =>
    (await preflight(url, origin)).headers['access-control-allow-origin'] === origin;

  it('game origins reach /v1/game/* only', async () => {
    expect(await allowed('/v1/game/inventory', 'https://yer-tostik.vercel.app')).toBe(true);
    expect(await allowed('/v1/game/inventory', 'https://yer-tostik-git-main-kko.vercel.app')).toBe(true);
    expect(await allowed('/v1/game/inventory', 'https://evil.com')).toBe(false);
    expect(await allowed('/v1/game/inventory', 'https://yer-tostik-a.evil.com.vercel.app')).toBe(false);
    expect(await allowed('/v1/me', 'https://yer-tostik.vercel.app')).toBe(false);
  });

  it('miniapp CORS is unchanged', async () => {
    expect(await allowed('/v1/me', 'https://esbol2312.github.io')).toBe(true);
    expect(await allowed('/v1/game/links', 'https://esbol2312.github.io')).toBe(true);
  });
});

describe.skipIf(!hasTestDb)('game link via the bot', () => {
  let app: FastifyInstance;
  let base: FastifyInstance;
  const calls: { method: string; payload: Record<string, any> }[] = [];

  beforeAll(async () => {
    base = await makeTestApp();
    app = Fastify();
    app.decorate('config', testConfig({ BOT_USERNAME: 'ksoz_bot' }));
    app.decorate('db', base.db);
    registerBot(app, {
      transformer: async (_prev, method, payload) => {
        calls.push({ method, payload: payload as Record<string, any> });
        return { ok: true, result: true } as never;
      },
    });
    await app.ready();
  });
  afterAll(async () => {
    await app.close().catch(() => {});
    await base.close().catch(() => {});
  });
  beforeEach(async () => {
    calls.length = 0;
    await resetDb(base);
  });

  let updateId = 100;
  const from = (id: number) => ({ id, is_bot: false, first_name: `Bot${id}`, username: `u${id}` });
  const command = (text: string, userId: number) =>
    app.inject({
      method: 'POST',
      url: '/bot/webhook',
      headers: secret,
      payload: {
        update_id: updateId++,
        message: {
          message_id: 1,
          date: 1_700_000_000,
          chat: { id: userId, type: 'private', first_name: 'U' },
          from: from(userId),
          text,
          entities: [{ type: 'bot_command', offset: 0, length: text.split(' ')[0]!.length }],
        },
      },
    });
  const press = (data: string, userId: number) =>
    app.inject({
      method: 'POST',
      url: '/bot/webhook',
      headers: secret,
      payload: {
        update_id: updateId++,
        callback_query: {
          id: 'cb1',
          from: from(userId),
          chat_instance: 'ci',
          data,
          message: { message_id: 7, date: 1_700_000_000, chat: { id: userId, type: 'private', first_name: 'U' }, text: '?' },
        },
      },
    });
  const lastText = () => [...calls].reverse().find((c) => c.method === 'sendMessage' || c.method === 'editMessageText')?.payload;

  it('/start link_<code> asks, «Да» creates a new user and confirms the code', async () => {
    const g = game(base);
    const code = (await g.newCode()).json().code;
    await command(`/start link_${code}`, 555);
    const ask = lastText()!;
    expect(ask.text).toContain('Ер Төстік');
    expect(JSON.stringify(ask.reply_markup)).toContain(`glink:${code}`);
    // до нажатия ничего не подтверждено
    expect((await g.status(code)).json().status).toBe('pending');

    await press(`glink:${code}`, 555);
    expect(calls.some((c) => c.method === 'answerCallbackQuery')).toBe(true);
    expect(lastText()!.text).toContain('Готово');

    const [u] = await base.db.select().from(users).where(eq(users.id, 555));
    expect(u).toMatchObject({ firstName: 'Bot555', username: 'u555' });
    const claimed = (await g.status(code)).json();
    expect(claimed).toMatchObject({ status: 'confirmed', first_name: 'Bot555' });
    expect((await g.inventory(claimed.token)).json()).toMatchObject({ first_name: 'Bot555', altyn: 0, items: [] });
  });

  it('/link <code> works the same; /start without link_ still opens the app', async () => {
    const g = game(base);
    const code = (await g.newCode()).json().code;
    await command(`/link ${code}`, 556);
    expect(JSON.stringify(lastText()!.reply_markup)).toContain(`glink:${code}`);
    await press(`glink:${code}`, 556);
    expect((await g.status(code)).json().status).toBe('confirmed');

    calls.length = 0;
    await command('/start ref_42', 556);
    expect(JSON.stringify(lastText()!.reply_markup)).toContain('startapp=ref_42');
  });

  it('unknown, expired and missing codes get a hint instead of the question', async () => {
    await command('/link', 557);
    expect(lastText()!.text).toContain('/link 482913');
    await command('/link 999999', 557);
    expect(lastText()!.text).toContain('не найден');
    await command('/link abc', 557);
    expect(lastText()!.text).toContain('не найден');

    const code = (await game(base).newCode()).json().code;
    await base.db.update(gameLinkCodes).set({ expiresAt: new Date(Date.now() - 1000) }).where(eq(gameLinkCodes.code, code));
    await command(`/start link_${code}`, 557);
    expect(lastText()!.text).toContain('устарел');
  });

  it('pressing «Да» on a code someone else confirmed does not steal it', async () => {
    const g = game(base);
    const code = (await g.newCode()).json().code;
    await command(`/link ${code}`, 558);
    await press(`glink:${code}`, 558);
    await press(`glink:${code}`, 559);
    expect(lastText()!.text).toContain('не найден');
    const [row] = await base.db.select().from(gameLinkCodes).where(eq(gameLinkCodes.code, code));
    expect(row!.userId).toBe(558);
  });

  it('no more than 5 attempts a minute', async () => {
    for (let i = 0; i < 5; i++) await command(`/link 00000${i}`, 560);
    expect(lastText()!.text).toContain('не найден');
    await command('/link 000009', 560);
    expect(lastText()!.text).toContain('Слишком много');
    // другой игрок не затронут
    await command('/link 000009', 561);
    expect(lastText()!.text).toContain('не найден');
  });
});

describe('AttemptLimiter', () => {
  it('allows max attempts per window', () => {
    const l = new AttemptLimiter(2, 1000);
    expect(l.take(1, 0)).toBe(true);
    expect(l.take(1, 10)).toBe(true);
    expect(l.take(1, 20)).toBe(false);
    expect(l.take(1, 1001)).toBe(true);
  });
});
