import { eq } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { randomUUID } from 'node:crypto';
import { users, words } from '../../src/db/schema.js';
import { BOT_TOKEN } from './app.js';
import { tmaHeader } from './initData.js';

export function client(app: FastifyInstance, id: number) {
  const headers = () => tmaHeader(BOT_TOKEN, { user: { id } });
  return {
    id,
    get: (url: string) => app.inject({ method: 'GET', url, headers: headers() }),
    post: (url: string, payload?: unknown) => app.inject({ method: 'POST', url, headers: headers(), payload: payload as object }),
    patch: (url: string, payload?: unknown) => app.inject({ method: 'PATCH', url, headers: headers(), payload: payload as object }),
    raw: (method: 'POST', url: string, body: string, contentType: string) =>
      app.inject({ method, url, headers: { ...headers(), 'content-type': contentType }, payload: body }),
    review: (word_id: number, input: string, extra: Record<string, unknown> = {}) =>
      app.inject({
        method: 'POST',
        url: '/v1/reviews',
        headers: headers(),
        payload: { client_id: randomUUID(), word_id, input, hints: 0, ms: 1000, ...extra },
      }),
  };
}

export async function wordId(app: FastifyInstance, kk: string): Promise<number> {
  const [w] = await app.db.select({ id: words.id }).from(words).where(eq(words.kk, kk));
  if (!w) throw new Error(`no seeded word ${kk}`);
  return w.id;
}

export async function setUser(app: FastifyInstance, id: number, patch: Partial<typeof users.$inferInsert>) {
  await app.db.update(users).set(patch).where(eq(users.id, id));
}
