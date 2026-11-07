import type { LessonCard, ReviewResponse } from '@ksoz/shared';
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
  earned: number;
  bestCombo: number;
}

const emptyStats = (): LessonStats => ({
  correct: 0,
  almost: 0,
  wrong: 0,
  queued: 0,
  introduced: 0,
  earned: 0,
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

  const card = computed<LessonCard | null>(() => cards.value[index.value] ?? null);
  const total = computed(() => cards.value.length);
  /** 0..1 для полоски прогресса */
  const progress = computed(() => (total.value ? Math.min(1, index.value / total.value) : 0));

  /** Начинает урок: сначала досылает очередь, потом берёт карточки. startCombo — combo из home. */
  async function start(startCombo = 0, limit = 12) {
    stage.value = 'loading';
    error.value = null;
    stats.value = emptyStats();
    combo.value = startCombo;
    balance.value = null;
    result.value = null;
    index.value = 0;
    try {
      await outbox.flush();
      const lesson = await api.lesson(limit);
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

  function next() {
    if (index.value + 1 >= cards.value.length) {
      index.value = cards.value.length;
      stage.value = 'done';
      return;
    }
    index.value++;
    showCard();
  }

  /** Новое слово показано целиком → первый повтор через 20 минут. */
  async function introduce() {
    const c = card.value;
    if (!c || busy.value) return;
    busy.value = true;
    try {
      await api.introduce(c.word_id);
      stats.value.introduced++;
      haptics.tap();
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

  function reset() {
    stage.value = 'idle';
    cards.value = [];
    index.value = 0;
    result.value = null;
  }

  return {
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
    card,
    total,
    progress,
    start,
    next,
    introduce,
    hint,
    check,
    reset,
  };
});
