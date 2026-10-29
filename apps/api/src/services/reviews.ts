import {
  checkAnswer,
  computeReward,
  localDay,
  schedule,
  type ReviewBody,
  type ReviewResponse,
  type SrsState,
} from '@ksoz/shared';
import { and, eq } from 'drizzle-orm';
import type { Db } from '../db/client.js';
import { reviews, userWords, users, words } from '../db/schema.js';
import { conflict, notFound } from '../errors.js';
import { applyAltyn } from './altyn.js';
import { nextStreak, refreshAulStage } from './economy.js';
import { examplesFor } from './lesson.js';
import { ensureDailyTasks, progressTask } from './tasks.js';

function isUniqueViolation(e: unknown): boolean {
  const err = e as { code?: string; cause?: { code?: string } };
  return err?.code === '23505' || err?.cause?.code === '23505';
}

export async function submitReview(
  db: Db,
  userId: number,
  body: ReviewBody,
  now = new Date(),
): Promise<ReviewResponse> {
  try {
    return await db.transaction(async (tx) => {
      // блокировка пользователя: сериализует его ответы (combo, идемпотентность)
      const [user] = await tx.select().from(users).where(eq(users.id, userId)).for('update');
      if (!user) throw notFound('user_not_found');

      const [dup] = await tx.select().from(reviews).where(eq(reviews.clientId, body.client_id));
      if (dup) {
        if (dup.userId !== userId || !dup.result) throw conflict('client_id_conflict');
        return dup.result as ReviewResponse;
      }

      const [uw] = await tx
        .select()
        .from(userWords)
        .where(and(eq(userWords.userId, userId), eq(userWords.wordId, body.word_id)))
        .for('update');
      if (!uw) throw notFound('word_not_learned');
      const [word] = await tx.select().from(words).where(eq(words.id, body.word_id));
      if (!word) throw notFound('word_not_found');

      const check = checkAnswer(body.input, word.kk);
      const before: SrsState = {
        phase: uw.phase,
        step: uw.step,
        ease: uw.ease,
        intervalDays: uw.intervalDays,
        reps: uw.reps,
        lapses: uw.lapses,
        dueAt: uw.dueAt,
      };
      const after = schedule(before, check.verdict, now, body.hints);
      const reward = computeReward(check.verdict, body.hints, user.combo);

      const [review] = await tx
        .insert(reviews)
        .values({
          clientId: body.client_id,
          userId,
          wordId: body.word_id,
          input: body.input,
          verdict: check.verdict,
          hints: body.hints,
          ms: body.ms,
          stepBefore: uw.step,
          dueBefore: uw.dueAt,
          dueAfter: after.dueAt,
          altyn: reward.earned,
          createdAt: now,
        })
        .returning({ id: reviews.id });

      let balance = user.altyn;
      if (reward.earned > 0) {
        balance = (await applyAltyn(tx, userId, reward.earned, 'review', review!.id, now)).balance;
      }

      await tx
        .update(userWords)
        .set({
          phase: after.phase,
          step: after.step,
          ease: after.ease,
          intervalDays: after.intervalDays,
          reps: after.reps,
          lapses: after.lapses,
          dueAt: after.dueAt,
          lastReviewedAt: now,
        })
        .where(and(eq(userWords.userId, userId), eq(userWords.wordId, body.word_id)));

      await tx
        .update(users)
        .set({ combo: reward.nextCombo, ...nextStreak(user, now, user.timezone) })
        .where(eq(users.id, userId));

      const day = localDay(now, user.timezone);
      await ensureDailyTasks(tx, userId, day);
      await progressTask(tx, userId, day, 'review_20', { inc: 1 });
      await progressTask(tx, userId, day, 'streak_5', { atLeast: reward.nextCombo });
      if (before.phase !== after.phase) await refreshAulStage(tx, userId);

      const examples = (await examplesFor(tx, [word.id])).get(word.id) ?? [];
      const result: ReviewResponse = {
        verdict: check.verdict,
        answer: word.kk,
        fix: check.fix,
        altyn: { base: reward.base, combo: reward.comboBonus, earned: reward.earned, balance },
        next: { phase: after.phase, step: after.step, due_at: after.dueAt.toISOString() },
        examples,
      };
      await tx.update(reviews).set({ result }).where(eq(reviews.id, review!.id));
      return result;
    });
  } catch (e) {
    // тот же client_id параллельно записал другой пользователь
    if (isUniqueViolation(e)) throw conflict('client_id_conflict');
    throw e;
  }
}

