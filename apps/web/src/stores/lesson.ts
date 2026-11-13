import { checkAnswer, LEARNING_STEPS_MS, nextHint, type LessonCard, type ReviewResponse } from '@ksoz/shared';
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { api } from '@/api/endpoints';
import { ApiError } from '@/api/http';
import { haptics } from '@/telegram';
import { useOutboxStore } from './outbox';

export type LessonStage =
  | 'idle'
  | 'loading'
  | 'empty' // нечего повторять и новых слов на сегодня нет
  | 'card' // карточка: новое слово или ввод ответа
  | 'practice-intro' // переход к закреплению новых слов
  | 'result' // экран награды после ответа
  | 'done' // итог урока
  | 'error';

export interface LessonStats {
  correct: number;
  almost: number;
  wrong: number;
  /** ответы, сохранённые в очередь без ответа сервера */
  queued: number;
  introduced: number;
  /** новые слова, отмеченные «Уже знаю» */
  skipped: number;
  earned: number;
  /** снято за ошибки */
  lost: number;
  bestCombo: number;
}

/** Раунд урока: основные карточки или закрепление только что изученных слов. */
export type LessonRound = 'main' | 'practice';

/** Новое слово, которое пользователь взял в изучение в этом уроке. */
export interface LearnedWord {
  word_id: number;
  kk: string;
  ru: string;
  /** когда слово вернётся на первый повтор */
  due_at: string;
  /** с какой попытки написал в закреплении; null — ещё не написал */
  tries: number | null;
}

/** Слово из основного раунда, которое пользователь не отметил «Вспомнил». */
export interface AgainWord {
  word_id: number;
  kk: string;
  ru: string;
  /** когда слово вернётся по SRS — как ответил сервер */
  next: ReviewResponse['next'];
  /** примеры из ответа сервера: в карточке повтора их нет, чтобы не подсказать слово */
  examples: ReviewResponse['examples'];
}

/** Сколько раз максимум слово вернётся в закрепление, если не вспомнил. */
const PRACTICE_RETRIES = 2;

function shuffle<T>(list: T[]): T[] {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

const emptyStats = (): LessonStats => ({
  correct: 0,
  almost: 0,
  wrong: 0,
  queued: 0,
  introduced: 0,
  skipped: 0,
  earned: 0,
  lost: 0,
  bestCombo: 0,
});

/** Состояние текущего урока. Проверка ответа и SRS — только на сервере. */
export const useLessonStore = defineStore('lesson', () => {
  const outbox = useOutboxStore();

  const stage = ref<LessonStage>('idle');
  const cards = ref<LessonCard[]>([]);
  const index = ref(0);
  const input = ref('');
  const hints = ref(0);
  const shownAt = ref(0);
  const busy = ref(false);
  const error = ref<string | null>(null);
  /** ответ сервера на последний ответ; null + savedOffline — ответ ушёл в очередь */
  const result = ref<ReviewResponse | null>(null);
  const savedOffline = ref(false);
  const lastInput = ref('');
  const combo = ref(0);
  const balance = ref<number | null>(null);
  const stats = ref<LessonStats>(emptyStats());
  const round = ref<LessonRound>('main');
  /** новые слова, взятые в изучение в этом уроке (по порядку показа) */
  const learned = ref<LearnedWord[]>([]);
  /** новые слова, отмеченные «Уже знаю» в этом уроке */
  const known = ref<{ word_id: number; kk: string; ru: string }[]>([]);
  /** повторы, на которых не нажал «Вспомнил»: предложим их ещё раз в конце урока */
  const again = ref<AgainWord[]>([]);
  /**
   * Не начинать урок заново при возврате на страницу урока:
   * ставится при переходе с итога урока в «Мои слова», чтобы вернуться к итогу.
   */
  const keepOnReturn = ref(false);
  /** попытки по словам в закреплении */
  const tries = new Map<number, number>();

  const card = computed<LessonCard | null>(() => cards.value[index.value] ?? null);
  const total = computed(() => cards.value.length);
  /** 0..1 для полоски прогресса */
  const progress = computed(() => (total.value ? Math.min(1, index.value / total.value) : 0));

  /** Начинает урок: сначала досылает очередь, потом берёт карточки. startCombo — combo из home. */
  async function start(startCombo = 0, limit = 12, only?: 'review') {
    stage.value = 'loading';
    error.value = null;
    stats.value = emptyStats();
    combo.value = startCombo;
    balance.value = null;
    result.value = null;
    index.value = 0;
    round.value = 'main';
    learned.value = [];
    known.value = [];
    again.value = [];
    tries.clear();
    try {
      await outbox.flush();
      const lesson = await api.lesson(limit, only);
      cards.value = lesson.cards;
      if (!lesson.cards.length) {
        stage.value = 'empty';
        return;
      }
      showCard();
    } catch (e) {
      error.value = e instanceof ApiError ? e.code : 'network';
      stage.value = 'error';
    }
  }

  function showCard() {
    input.value = '';
    hints.value = 0;
    result.value = null;
    savedOffline.value = false;
    shownAt.value = Date.now();
    stage.value = 'card';
  }

  /**
   * Переход к следующей карточке. remembered — нажал ли пользователь «Вспомнил»
   * после проверки. Если нет, слово ещё раз попадётся в конце урока
   * (в закреплении) или в конце закрепления. Ответ, ушедший в очередь без сети,
   * проверить на клиенте нечем, поэтому такое слово не повторяется.
   */
  function next(remembered = true) {
    const c = card.value;
    const res = result.value;
    if (!remembered && c && res && c.kind === 'review') {
      if (round.value === 'practice') {
        if ((tries.get(c.word_id) ?? 0) <= PRACTICE_RETRIES) cards.value.push(c);
      } else if (!again.value.some((w) => w.word_id === c.word_id)) {
        again.value.push({ word_id: c.word_id, kk: res.answer, ru: c.ru, next: res.next, examples: res.examples });
      }
    }
    if (index.value + 1 >= cards.value.length) {
      if (round.value === 'main' && (learned.value.length || again.value.length)) {
        startPractice();
        return;
      }
      index.value = cards.value.length;
      stage.value = 'done';
      return;
    }
    index.value++;
    showCard();
  }

  /**
   * Закрепление: в конце урока пользователь ещё раз пишет по-казахски новые
   * слова и повторы, на которых не нажал «Вспомнил». Это тренировка без алтына
   * и без изменений SRS: слово вернётся тогда, когда решил сервер. Слова уже
   * известны клиенту, поэтому ответ проверяется здесь же.
   */
  function startPractice() {
    const byId = new Map(cards.value.map((c) => [c.word_id, c]));
    const fresh = learned.value
      .map((w) => byId.get(w.word_id))
      .filter((c): c is LessonCard => !!c)
      .map((c) => ({ ...c, kind: 'review' as const, phase: 'learning' as const, step: 0 }));
    const repeat = again.value
      .map((w): LessonCard | null => {
        const c = byId.get(w.word_id);
        return c ? { ...c, kk: w.kk, length: [...w.kk].length, examples: w.examples } : null;
      })
      .filter((c): c is LessonCard => !!c);
    cards.value = shuffle([...fresh, ...repeat]);
    round.value = 'practice';
    index.value = 0;
    result.value = null;
    stage.value = 'practice-intro';
  }

  function beginPractice() {
    if (stage.value === 'practice-intro') showCard();
  }

  /** Пропустить закрепление и сразу перейти к итогу. */
  function skipPractice() {
    index.value = cards.value.length;
    stage.value = 'done';
  }

  /** Новое слово показано целиком → первый повтор через 20 минут. */
  async function introduce() {
    const c = card.value;
    if (!c || busy.value) return;
    busy.value = true;
    try {
      const res = await api.introduce(c.word_id);
      stats.value.introduced++;
      if (c.kk) {
        learned.value.push({ word_id: c.word_id, kk: c.kk, ru: c.ru, due_at: res.next.due_at, tries: null });
      }
      haptics.tap();
      next();
    } catch (e) {
      error.value = e instanceof ApiError ? e.code : 'network';
    } finally {
      busy.value = false;
    }
  }

  /** «Уже знаю»: слово не учим, проверим через месяц. */
  async function skipKnown() {
    const c = card.value;
    if (!c || c.kind !== 'new' || busy.value) return;
    busy.value = true;
    error.value = null;
    try {
      await api.known(c.word_id);
      stats.value.skipped++;
      if (c.kk) known.value.push({ word_id: c.word_id, kk: c.kk, ru: c.ru });
      haptics.select();
      next();
    } catch (e) {
      error.value = e instanceof ApiError ? e.code : 'network';
    } finally {
      busy.value = false;
    }
  }

  /** Следующая буква: подставляется в поле ввода. */
  async function hint() {
    const c = card.value;
    if (!c || busy.value) return;
    if (round.value === 'practice' && c.kk) {
      input.value = nextHint(c.kk, hints.value);
      hints.value++;
      haptics.select();
      return;
    }
    busy.value = true;
    try {
      const res = await api.hint(c.word_id, hints.value);
      hints.value = res.hints_used;
      input.value = res.hint;
      haptics.select();
    } catch (e) {
      error.value = e instanceof ApiError ? e.code : 'network';
    } finally {
      busy.value = false;
    }
  }

  /** «Тексеру»: отправляет ответ, показывает награду. */
  async function check() {
    const c = card.value;
    const text = input.value.trim();
    if (!c || !text || busy.value) return;
    if (round.value === 'practice') {
      checkPractice(c, text);
      return;
    }
    busy.value = true;
    error.value = null;
    lastInput.value = text;
    try {
      const res = await outbox.submit({
        client_id: crypto.randomUUID(),
        word_id: c.word_id,
        input: text,
        hints: hints.value,
        ms: Math.min(3_600_000, Date.now() - shownAt.value),
      });
      if (res) {
        result.value = res;
        balance.value = res.altyn.balance;
        stats.value.earned += res.altyn.earned;
        stats.value.lost += res.altyn.lost ?? 0;
        if (res.verdict === 'correct') {
          stats.value.correct++;
          combo.value++;
          haptics.success();
        } else if (res.verdict === 'almost') {
          stats.value.almost++;
          haptics.warning();
        } else {
          stats.value.wrong++;
          combo.value = 0;
          haptics.error();
        }
        stats.value.bestCombo = Math.max(stats.value.bestCombo, combo.value);
      } else {
        savedOffline.value = true;
        stats.value.queued++;
      }
      stage.value = 'result';
    } catch (e) {
      error.value = e instanceof ApiError ? e.code : 'network';
    } finally {
      busy.value = false;
    }
  }

  /** Ответ в закреплении: проверка на клиенте, без алтына и без SRS. */
  function checkPractice(c: LessonCard, text: string) {
    const kk = c.kk ?? '';
    const w = learned.value.find((l) => l.word_id === c.word_id);
    const a = again.value.find((l) => l.word_id === c.word_id);
    const attempt = (tries.get(c.word_id) ?? 0) + 1;
    tries.set(c.word_id, attempt);
    error.value = null;
    lastInput.value = text;
    const res = checkAnswer(text, kk);
    if (res.verdict === 'correct') {
      if (w && w.tries == null) w.tries = attempt;
      haptics.success();
    } else if (res.verdict === 'almost') {
      haptics.warning();
    } else {
      haptics.error();
    }
    result.value = {
      verdict: res.verdict,
      answer: kk,
      fix: res.fix,
      altyn: { base: 0, combo: 0, earned: 0, lost: 0, balance: balance.value ?? 0 },
      next: a?.next ?? {
        phase: 'learning',
        step: 0,
        due_at: w?.due_at ?? new Date(Date.now() + LEARNING_STEPS_MS[0]).toISOString(),
      },
      examples: c.examples,
    };
    stage.value = 'result';
  }

  function reset() {
    stage.value = 'idle';
    cards.value = [];
    index.value = 0;
    result.value = null;
    round.value = 'main';
    learned.value = [];
    known.value = [];
    again.value = [];
    tries.clear();
  }

  return {
    keepOnReturn,
    stage,
    cards,
    index,
    input,
    hints,
    busy,
    error,
    result,
    savedOffline,
    lastInput,
    combo,
    balance,
    stats,
    round,
    learned,
    known,
    again,
    card,
    total,
    progress,
    start,
    next,
    beginPractice,
    skipPractice,
    introduce,
    skipKnown,
    hint,
    check,
    reset,
  };
});
