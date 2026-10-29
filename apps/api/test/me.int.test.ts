import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { friendships, users } from '../src/db/schema.js';
import { BOT_TOKEN, hasTestDb, makeTestApp, resetDb } from './helpers/app.js';
import { signInitData, tmaHeader } from './helpers/initData.js';

describe.skipIf(!hasTestDb)('GET /health and /v1/me', () => {
  let app: FastifyInstance;
  beforeAll(async () => {
    app = await makeTestApp();
  });
  afterAll(() => app.close());
  beforeEach(() => resetDb(app));

  it('/health checks the db', async () => {
    const res = await app.inject({ url: '/health' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ status: 'ok', db: 'ok' });
  });

  it('rejects missing and invalid auth', async () => {
    expect((await app.inject({ url: '/v1/me' })).statusCode).toBe(401);
    const bad = await app.inject({ url: '/v1/me', headers: { authorization: 'tma hash=00' } });
    expect(bad.statusCode).toBe(401);
    const wrongToken = signInitData('1:other');
    expect(
      (await app.inject({ url: '/v1/me', headers: { authorization: `tma ${wrongToken}` } })).statusCode,
    ).toBe(401);
  });

  it('X-Dev-User is ignored outside development', async () => {
    const res = await app.inject({ url: '/v1/me', headers: { 'x-dev-user': '5' } });
    expect(res.statusCode).toBe(401);
  });

  it('creates the user on first request and returns the profile', async () => {
    const res = await app.inject({
      url: '/v1/me',
      headers: tmaHeader(BOT_TOKEN, { user: { id: 1001, first_name: 'Айгүл', username: 'aigul' } }),
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({
      id: 1001,
      first_name: 'Айгүл',
      username: 'aigul',
      level: 'A1',
      timezone: 'Asia/Almaty',
      altyn: 0,
      is_admin: false,
    });
    const again = await app.inject({ url: '/v1/me', headers: tmaHeader(BOT_TOKEN, { user: { id: 1001 } }) });
    expect(again.statusCode).toBe(200);
    expect(await app.db.select().from(users)).toHaveLength(1);
  });

  it('flags admins from ADMIN_IDS', async () => {
    const res = await app.inject({ url: '/v1/me', headers: tmaHeader(BOT_TOKEN, { user: { id: 9001 } }) });
    expect(res.json().is_admin).toBe(true);
  });

  it('referral creates two friendships only for a new user', async () => {
    await app.inject({ url: '/v1/me', headers: tmaHeader(BOT_TOKEN, { user: { id: 1 } }) });
    await app.inject({
      url: '/v1/me',
      headers: tmaHeader(BOT_TOKEN, { user: { id: 2 }, startParam: 'ref_1' }),
    });
    const [u2] = await app.db.select().from(users).where(eq(users.id, 2));
    expect(u2?.referrerId).toBe(1);
    expect(await app.db.select().from(friendships)).toHaveLength(2);

    // существующий пользователь с ref_ не получает реферера
    await app.inject({ url: '/v1/me', headers: tmaHeader(BOT_TOKEN, { user: { id: 1 }, startParam: 'ref_2' }) });
    const [u1] = await app.db.select().from(users).where(eq(users.id, 1));
    expect(u1?.referrerId).toBeNull();
    // сам себя и несуществующего пригласить нельзя
    await app.inject({ url: '/v1/me', headers: tmaHeader(BOT_TOKEN, { user: { id: 3 }, startParam: 'ref_3' }) });
    await app.inject({ url: '/v1/me', headers: tmaHeader(BOT_TOKEN, { user: { id: 4 }, startParam: 'ref_999' }) });
    expect(await app.db.select().from(friendships)).toHaveLength(2);
  });
});

describe.skipIf(!hasTestDb)('X-Dev-User in development', () => {
  it('works only when NODE_ENV=development', async () => {
    const app = await makeTestApp({ NODE_ENV: 'development' });
    const res = await app.inject({ url: '/v1/me', headers: { 'x-dev-user': '777' } });
    expect(res.statusCode).toBe(200);
    expect(res.json().id).toBe(777);
    await resetDb(app);
    await app.close();
  });
});
