import { isoWeek } from '@ksoz/shared';
import type { Db } from '../db/client.js';
import { loadBaigeResults, loadCandidates } from './queries.js';
import { isBaigeWindow, pickReminder, type BaigeResult, type ReminderKind } from './rules.js';

export interface SendPayload {
  userId: number;
  kind: ReminderKind;
  period: string;
  n?: number;
  rank?: number;
  total?: number;
}

export const SCAN_QUEUE = 'reminders.scan';
export const SEND_QUEUE = 'reminders.send';

/** Идентификатор «не слать дважды»: пользователь + вид + период. */
export function singletonKeyOf(p: Pick<SendPayload, 'userId' | 'kind' | 'period'>): string {
  return `${p.userId}:${p.kind}:${p.period}`;
}

/** Находит, кому пора написать, и отдаёт задания на отправку в `enqueue`. Возвращает их же. */
export async function runScan(
  db: Db,
  now: Date,
  enqueue: (p: SendPayload) => Promise<void>,
): Promise<SendPayload[]> {
  const users = await loadCandidates(db, now);

  // итоги бәйге считаем только для тех, у кого сейчас воскресное окно
  const byWeek = new Map<string, number[]>();
  for (const u of users) {
    if (isBaigeWindow(now, u.timezone)) {
      const w = isoWeek(now, u.timezone);
      byWeek.set(w, [...(byWeek.get(w) ?? []), u.id]);
    }
  }
  const results = new Map<number, BaigeResult>();
  for (const [week, ids] of byWeek) {
    for (const [id, r] of await loadBaigeResults(db, week, ids)) results.set(id, r);
  }

  const jobs: SendPayload[] = [];
  for (const u of users) {
    u.baige = results.get(u.id) ?? null;
    const due = pickReminder(now, u);
    if (!due) continue;
    const p: SendPayload = { userId: u.id, kind: due.kind, period: due.period };
    if (due.kind === 'short') p.n = u.dueLearning;
    if (due.kind === 'daily') p.n = u.dueTotal;
    if (due.kind === 'baige' && u.baige) {
      p.rank = u.baige.rank;
      p.total = u.baige.total;
    }
    jobs.push(p);
  }
  for (const p of jobs) await enqueue(p);
  return jobs;
}
