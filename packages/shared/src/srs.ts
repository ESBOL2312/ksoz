export type Verdict = 'correct' | 'almost' | 'wrong';
export type Phase = 'learning' | 'review';

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

/** Интервалы коротких повторов: шаги 0–3. */
export const LEARNING_STEPS_MS = [20 * MIN, HOUR, 2 * HOUR, 5 * HOUR] as const;
export const EASE_START = 2.5;
export const EASE_MIN = 1.3;
export const LAPSE_EASE_PENALTY = 0.2;

export interface SrsState {
  phase: Phase;
  /** 0–3, значим только в фазе learning */
  step: number;
  ease: number;
  intervalDays: number;
  reps: number;
  lapses: number;
  dueAt: Date;
}

/** Качество ответа по SM-2: 4 — верно без подсказок, 3 — с подсказками или «почти», 0 — ошибка. */
export function quality(verdict: Verdict, hints = 0): 0 | 3 | 4 {
  if (verdict === 'wrong') return 0;
  if (verdict === 'almost' || hints > 0) return 3;
  return 4;
}

export function updateEase(ease: number, q: number): number {
  const d = 5 - q;
  return Math.max(EASE_MIN, ease + 0.1 - d * (0.08 + d * 0.02));
}

/** Состояние слова сразу после показа: первый повтор через 20 минут. */
export function initialState(now: Date): SrsState {
  return {
    phase: 'learning',
    step: 0,
    ease: EASE_START,
    intervalDays: 0,
    reps: 0,
    lapses: 0,
    dueAt: new Date(now.getTime() + LEARNING_STEPS_MS[0]),
  };
}

export function schedule(state: SrsState, verdict: Verdict, now: Date, hints = 0): SrsState {
  const t = now.getTime();
  const q = quality(verdict, hints);

  if (state.phase === 'learning') {
    if (q === 0) {
      return { ...state, step: 0, dueAt: new Date(t + LEARNING_STEPS_MS[0]) };
    }
    const reps = state.reps + 1;
    if (state.step >= LEARNING_STEPS_MS.length - 1) {
      return { ...state, phase: 'review', step: 0, reps, intervalDays: 1, dueAt: new Date(t + DAY) };
    }
    const step = state.step + 1;
    return { ...state, step, reps, dueAt: new Date(t + LEARNING_STEPS_MS[step]!) };
  }

  if (q === 0) {
    return {
      ...state,
      phase: 'learning',
      step: 0,
      reps: 0,
      intervalDays: 0,
      lapses: state.lapses + 1,
      ease: Math.max(EASE_MIN, state.ease - LAPSE_EASE_PENALTY),
      dueAt: new Date(t + LEARNING_STEPS_MS[0]),
    };
  }
  const intervalDays = Math.max(1, Math.round(state.intervalDays * state.ease));
  return {
    ...state,
    reps: state.reps + 1,
    intervalDays,
    ease: updateEase(state.ease, q),
    dueAt: new Date(t + intervalDays * DAY),
  };
}

/** Прогноз для клиента: что будет после ответа и через сколько. */
export function previewNext(state: SrsState, verdict: Verdict, now: Date, hints = 0) {
  const next = schedule(state, verdict, now, hints);
  return { next, inMs: next.dueAt.getTime() - now.getTime() };
}
