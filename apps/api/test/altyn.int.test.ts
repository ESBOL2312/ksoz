import type { FastifyInstance } from 'fastify';
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { altynLedger, users, weeklyScores } from '../src/db/schema.js';
import { applyAltyn } from '../src/services/altyn.js';
import { hasTestDb, makeTestApp, resetDb } from './helpers/app.js';

describe.skipIf(!hasTestDb)('applyAltyn', () => {
  let app: FastifyInstance;
  beforeAll(async () => {
    app = await makeTestApp();
  });
  afterAll(() => app.close());
  beforeEach(async () => {
    await resetDb(app);
    await app.db.insert(users).values({ id: 1, firstName: 'A' });
  });

  it('adds, records ledger and weekly score only for positive deltas', async () => {
    const now = new Date('2026-10-29T10:00:00Z');
    await app.db.transaction((tx) => applyAltyn(tx, 1, 20, 'review', 'r1', now));
    await app.db.transaction((tx) => applyAltyn(tx, 1, -5, 'purchase', 7, now));
    const [u] = await app.db.select().from(users).where(eq(users.id, 1));
    expect(u?.altyn).toBe(15);
    expect(await app.db.select().from(altynLedger)).toHaveLength(2);
    const [ws] = await app.db.select().from(weeklyScores);
    expect(ws).toMatchObject({ week: '2026-W44', userId: 1, score: 20 });
  });

  it('rejects overdraft without side effects', async () => {
    await expect(app.db.transaction((tx) => applyAltyn(tx, 1, -1, 'purchase'))).rejects.toMatchObject({
      code: 'insufficient_altyn',
    });
    expect(await app.db.select().from(altynLedger)).toHaveLength(0);
  });

  it('serializes concurrent spends', async () => {
    await app.db.transaction((tx) => applyAltyn(tx, 1, 10, 'prize'));
    const spend = () => app.db.transaction((tx) => applyAltyn(tx, 1, -10, 'purchase'));
    const results = await Promise.allSettled([spend(), spend(), spend()]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    const [u] = await app.db.select().from(users).where(eq(users.id, 1));
    expect(u?.altyn).toBe(0);
  });
});
