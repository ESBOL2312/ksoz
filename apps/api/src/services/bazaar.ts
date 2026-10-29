import { LEVELS, initialState, type Level } from '@ksoz/shared';
import { and, asc, eq } from 'drizzle-orm';
import type { Db, Tx } from '../db/client.js';
import { items, userItems, userWords, users, words } from '../db/schema.js';
import { AppError, conflict, notFound } from '../errors.js';
import { applyAltyn } from './altyn.js';

const rank = (l: Level) => LEVELS.indexOf(l);

export async function equippedItems(q: Db | Tx, userId: number) {
  const rows = await q
    .select({
      item_id: items.id,
      category: items.category,
      slot: items.slot,
      kk: words.kk,
      image_url: words.imageUrl,
    })
    .from(userItems)
    .innerJoin(items, eq(items.id, userItems.itemId))
    .innerJoin(words, eq(words.id, items.wordId))
    .where(and(eq(userItems.userId, userId), eq(userItems.equipped, true)))
    .orderBy(asc(items.id));
  return rows;
}

export async function listBazaar(db: Db, user: { id: number; level: Level }) {
  const rows = await db
    .select({
      id: items.id,
      word_id: items.wordId,
      kk: words.kk,
      ru: words.ru,
      category: items.category,
      slot: items.slot,
      price: items.price,
      min_level: items.minLevel,
      image_url: words.imageUrl,
      ownedAt: userItems.acquiredAt,
      equipped: userItems.equipped,
    })
    .from(items)
    .innerJoin(words, eq(words.id, items.wordId))
    .leftJoin(userItems, and(eq(userItems.itemId, items.id), eq(userItems.userId, user.id)))
    .orderBy(asc(items.category), asc(items.price), asc(items.id));
  return {
    items: rows.map(({ ownedAt, equipped, ...r }) => ({
      ...r,
      equipped: equipped ?? false,
      status: ownedAt
        ? ('owned' as const)
        : rank(r.min_level) > rank(user.level)
          ? ('locked_by_level' as const)
          : ('available' as const),
    })),
  };
}

export async function purchaseItem(db: Db, userId: number, itemId: number, now = new Date()) {
  return db.transaction(async (tx) => {
    const [user] = await tx.select().from(users).where(eq(users.id, userId)).for('update');
    if (!user) throw notFound('user_not_found');
    const [item] = await tx.select().from(items).where(eq(items.id, itemId));
    if (!item) throw notFound('item_not_found');
    if (rank(item.minLevel) > rank(user.level)) throw new AppError(403, 'level_too_low');

    const inserted = await tx
      .insert(userItems)
      .values({ userId, itemId, acquiredAt: now })
      .onConflictDoNothing()
      .returning({ itemId: userItems.itemId });
    if (!inserted.length) throw conflict('already_owned');

    const { balance } = await applyAltyn(tx, userId, -item.price, 'purchase', itemId, now);

    const s = initialState(now);
    await tx
      .insert(userWords)
      .values({
        userId,
        wordId: item.wordId,
        phase: s.phase,
        step: s.step,
        ease: s.ease,
        intervalDays: s.intervalDays,
        dueAt: s.dueAt,
        reps: s.reps,
        lapses: s.lapses,
        source: 'bazaar',
        introducedAt: now,
      })
      .onConflictDoNothing();
    const [uw] = await tx
      .select()
      .from(userWords)
      .where(and(eq(userWords.userId, userId), eq(userWords.wordId, item.wordId)));
    return {
      item_id: itemId,
      balance,
      next: { phase: uw!.phase, step: uw!.step, due_at: uw!.dueAt.toISOString() },
    };
  });
}

export async function equipItem(db: Db, userId: number, itemId: number, equipped: boolean) {
  return db.transaction(async (tx) => {
    await tx.select({ id: users.id }).from(users).where(eq(users.id, userId)).for('update');
    const [owned] = await tx
      .select({ slot: items.slot })
      .from(userItems)
      .innerJoin(items, eq(items.id, userItems.itemId))
      .where(and(eq(userItems.userId, userId), eq(userItems.itemId, itemId)));
    if (!owned) throw notFound('item_not_owned');

    if (equipped) {
      const sameSlot = await tx
        .select({ id: items.id })
        .from(items)
        .where(eq(items.slot, owned.slot));
      for (const s of sameSlot) {
        await tx
          .update(userItems)
          .set({ equipped: s.id === itemId })
          .where(and(eq(userItems.userId, userId), eq(userItems.itemId, s.id)));
      }
    } else {
      await tx
        .update(userItems)
        .set({ equipped: false })
        .where(and(eq(userItems.userId, userId), eq(userItems.itemId, itemId)));
    }
    return { equipped: await equippedItems(tx, userId) };
  });
}
