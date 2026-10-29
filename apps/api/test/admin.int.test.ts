import type { FastifyInstance } from 'fastify';
import { inArray } from 'drizzle-orm';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { words } from '../src/db/schema.js';
import { hasTestDb, makeTestApp, resetDb, seedDb } from './helpers/app.js';
import { client } from './helpers/api.js';

describe.skipIf(!hasTestDb)('/admin', () => {
  let app: FastifyInstance;
  beforeAll(async () => {
    await seedDb();
    app = await makeTestApp();
  });
  afterAll(async () => {
    await app.db.delete(words).where(inArray(words.kk, ['тест1', 'тест2', 'тест3', 'тест4']));
    await app.close();
  });
  beforeEach(() => resetDb(app));

  it('is forbidden for non-admins', async () => {
    const u = client(app, 5);
    expect((await u.get('/admin/words')).statusCode).toBe(403);
    expect((await u.raw('POST', '/admin/words/import', 'kk,ru\nx,y', 'text/csv')).statusCode).toBe(403);
    expect((await u.patch('/admin/words/1/status', { status: 'published' })).statusCode).toBe(403);
  });

  it('imports CSV (upsert by kk, draft), then reviews, publishes and sets the image', async () => {
    const admin = client(app, 9001);
    const csv = [
      'kk,ru,level,topic,example_kk,example_ru',
      'тест1,тест один,A2,"test-topic",Бұл тест1. — Это тест1.,',
      '"тест2","с ""кавычками"", и запятой",B1,test-topic|other,"Мысал, бір","Пример, один"',
      'тест3,плохой уровень,Z9,,,',
      ',пусто,A1,,,',
    ].join('\n');
    const res = await admin.raw('POST', '/admin/words/import', csv, 'text/csv');
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({
      created: 2,
      updated: 0,
      errors: [
        { line: 4, error: 'invalid level: Z9' },
        { line: 5, error: 'kk and ru are required' },
      ],
    });

    const list = (await admin.get('/admin/words?q=тест')).json();
    expect(list.total).toBe(2);
    const t2 = list.words.find((w: any) => w.kk === 'тест2');
    expect(t2).toMatchObject({
      ru: 'с "кавычками", и запятой',
      level: 'B1',
      status: 'draft',
      topics: expect.arrayContaining(['test-topic', 'other']),
      examples: [{ kk: 'Мысал, бір', ru: 'Пример, один' }],
    });

    // повторный импорт — upsert, примеры не дублируются
    const again = await admin.raw('POST', '/admin/words/import', csv, 'text/csv');
    expect(again.json()).toMatchObject({ created: 0, updated: 2 });
    expect((await admin.get(`/admin/words/${t2.id}`)).json().examples).toHaveLength(1);

    // черновик не попадает в уроки обычных пользователей
    const user = client(app, 6);
    await user.patch('/v1/me', { level: 'B2' });
    const cards = (await user.get('/v1/lesson?limit=50')).json().cards;
    expect(cards.find((c: any) => c.word_id === t2.id)).toBeUndefined();

    const st = await admin.patch(`/admin/words/${t2.id}/status`, { status: 'published' });
    expect(st.statusCode).toBe(200);
    expect(st.json().status).toBe('published');
    expect((await user.get('/v1/words?level=B1')).json().words.some((w: any) => w.id === t2.id)).toBe(true);

    const img = await admin.post(`/admin/words/${t2.id}/image`, { image_url: 'https://cdn.example.com/t2.png' });
    expect(img.json().image_url).toBe('https://cdn.example.com/t2.png');
    expect((await admin.post(`/admin/words/${t2.id}/image`, { image_url: 'nope' })).statusCode).toBe(400);
    expect((await admin.patch('/admin/words/999999/status', { status: 'draft' })).statusCode).toBe(404);
  });

  it('CRUD with examples and topics', async () => {
    const admin = client(app, 9001);
    const created = await admin.post('/admin/words', {
      kk: 'тест4',
      ru: 'один',
      level: 'A2',
      examples: [{ kk: 'а', ru: 'б' }],
      topics: ['food'],
    });
    expect(created.statusCode).toBe(200);
    const w = created.json();
    expect(w).toMatchObject({ status: 'draft', topics: ['food'], examples: [{ kk: 'а', ru: 'б' }] });
    expect((await admin.post('/admin/words', { kk: 'тест4', ru: 'x' })).statusCode).toBe(409);

    const patched = await admin.patch(`/admin/words/${w.id}`, { ru: 'новый', examples: [], topics: ['animals'] });
    expect(patched.json()).toMatchObject({ ru: 'новый', examples: [], topics: ['animals'], kk: 'тест4' });

    const del = await app.inject({
      method: 'DELETE',
      url: `/admin/words/${w.id}`,
      headers: (await import('./helpers/initData.js')).tmaHeader((await import('./helpers/app.js')).BOT_TOKEN, { user: { id: 9001 } }),
    });
    expect(del.statusCode).toBe(200);
    expect((await admin.get(`/admin/words/${w.id}`)).statusCode).toBe(404);
  });
});
