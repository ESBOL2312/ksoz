import type { QuestDialogLine, QuestItem, QuestLife, QuestReviewCard, QuestStep, QuestStepCompleteResponse, ReviewResponse } from '@ksoz/shared';
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { api } from '@/api/endpoints';
import { ApiError } from '@/api/http';
import { buildChoiceTasks, retryTask, shuffle, type ChoiceTask } from '@/features/quest/logic';
import { haptics } from '@/telegram';
import { useOutboxStore } from './outbox';

/**
 * Этапы шага квеста: вступление Барыса → повтор → новые слова → выбор карточек →
 * «В жизни» → диалог (только у последнего шага) → отправка → итог.
 * Пустые разделы пропускаются.
 */
export type QuestSection = 'review' | 'new' | 'choose' | 'life' | 'dialog';
export type QuestStage = 'idle' | 'loading' | 'error' | 'intro' | QuestSection | 'completing' | 'result';

/** Слово шага на итоговом экране. familiar — уже было в изучении, introduce не вызывали. */
export interface QuestLearned {
  word_id: number;
  kk: string;
  ru: string;
  familiar: boolean;
}

/** Сколько раз максимум задание на выбор вернётся в конец раздела. */
const CHOICE_RETRIES = 2;

const errCode = (e: unknown) => (e instanceof ApiError ? e.code : 'network');

export const useQuestStore = defineStore('quest', () => {
  const outbox = useOutboxStore();

  const slug = ref('');
  const n = ref(0);
  const step = ref<QuestStep | null>(null);
  const stage = ref<QuestStage>('idle');
  const error = ref<string | null>(null);
  const busy = ref(false);
  const sections = ref<QuestSection[]>([]);

  /** Индекс в текущем разделе (повтор, слова, задания, «В жизни»). */
  const index = ref(0);
  /** Выбранная карточка в текущем задании; null — ещё не ответил. */
  const picked = ref<string | null>(null);
  /** Ответ сервера на повтор; null + reviewOffline — ответ ушёл в очередь. */
  const reviewRes = ref<ReviewResponse | null>(null);
  const reviewOffline = ref(false);
  const shownAt = ref(0);

  const tasks = ref<ChoiceTask[]>([]);
  const attempts = new Map<string, number>();

  /** Сколько реплик диалога уже на экране. */
  const dialogShown = ref(0);
  /** Неверные варианты, выбранные на текущей реплике «me». */
  const dialogWrong = ref<string[]>([]);
  const dialogOptions = ref<string[][]>([]);

  const learned = ref<QuestLearned[]>([]);
  const earned = ref(0);
  const mistakes = ref(0);
  const balance = ref<number | null>(null);
  const completeRes = ref<QuestStepCompleteResponse | null>(null);

  const units = ref({ done: 0, total: 0 });
  const progress = computed(() => (units.value.total ? Math.min(1, units.value.done / units.value.total) : 0));

  const reviewCard = computed<QuestReviewCard | null>(() => (stage.value === 'review' ? (step.value?.review[index.value] ?? null) : null));
  const item = computed<QuestItem | null>(() => (stage.value === 'new' ? (step.value?.items[index.value] ?? null) : null));
  const task = computed<ChoiceTask | null>(() => (stage.value === 'choose' ? (tasks.value[index.value] ?? null) : null));
  const life = computed<QuestLife | null>(() => (stage.value === 'life' ? (step.value?.life[index.value] ?? null) : null));
  const dialogLine = computed<QuestDialogLine | null>(() => step.value?.dialog[dialogShown.value] ?? null);
  const dialogDone = computed(() => !!step.value && dialogShown.value >= step.value.dialog.length);

  /** Верный вариант текущего задания (у повтора — после ответа сервера). */
  const correct = computed<string | null>(() => {
    if (stage.value === 'review') return reviewRes.value?.answer ?? null;
    if (stage.value === 'choose') return task.value?.answer ?? null;
    if (stage.value === 'life') return life.value?.answer ?? null;
    return null;
  });
  const answered = computed(() => picked.value != null && !busy.value);
  const isRight = computed(() => {
    if (stage.value === 'review') return reviewRes.value?.verdict === 'correct' || reviewRes.value?.verdict === 'almost';
    return picked.value != null && picked.value === correct.value;
  });
  /** Позиция в текущем разделе и его длина — для подписи «2 из 6». */
  const position = computed(() => {
    const s = step.value;
    const len =
      stage.value === 'review' ? (s?.review.length ?? 0) : stage.value === 'new' ? (s?.items.length ?? 0) : stage.value === 'choose' ? tasks.value.length : stage.value === 'life' ? (s?.life.length ?? 0) : 0;
    return { at: Math.min(index.value + 1, len), of: len };
  });

  function reset() {
    step.value = null;
    stage.value = 'idle';
    error.value = null;
    busy.value = false;
    sections.value = [];
    index.value = 0;
    picked.value = null;
    reviewRes.value = null;
    reviewOffline.value = false;
    tasks.value = [];
    attempts.clear();
    dialogShown.value = 0;
    dialogWrong.value = [];
    dialogOptions.value = [];
    learned.value = [];
    earned.value = 0;
    mistakes.value = 0;
    balance.value = null;
    completeRes.value = null;
    units.value = { done: 0, total: 0 };
  }

  /** Загружает шаг: сначала досылает очередь ответов, чтобы повтор был свежим. */
  async function start(s: string, num: number) {
    reset();
    slug.value = s;
    n.value = num;
    stage.value = 'loading';
    try {
      await outbox.flush();
      const data = await api.questStep(s, num);
      step.value = data;
      tasks.value = buildChoiceTasks(data.items, data.distractors);
      dialogOptions.value = data.dialog.map((l) => (l.who === 'me' ? shuffle(l.options?.length ? l.options : [l.kk]) : []));
      sections.value = (
        [
          ['review', data.review.length],
          ['new', data.items.length],
          ['choose', tasks.value.length],
          ['life', data.life.length],
          ['dialog', data.dialog.length],
        ] as const
      )
        .filter(([, len]) => len > 0)
        .map(([sec]) => sec);
      units.value = {
        done: 0,
        total: data.review.length + data.items.length + tasks.value.length + data.life.length + data.dialog.filter((l) => l.who === 'me').length,
      };
      stage.value = 'intro';
    } catch (e) {
      error.value = errCode(e);
      stage.value = 'error';
    }
  }

  function enter(section: QuestSection | undefined) {
    index.value = 0;
    picked.value = null;
    reviewRes.value = null;
    reviewOffline.value = false;
    error.value = null;
    shownAt.value = Date.now();
    if (!section) {
      void finish();
      return;
    }
    stage.value = section;
  }

  /** «Бастау» на вступлении. */
  function begin() {
    if (stage.value === 'intro') enter(sections.value[0]);
  }

  function sectionLength(): number {
    const s = step.value;
    if (!s) return 0;
    if (stage.value === 'review') return s.review.length;
    if (stage.value === 'new') return s.items.length;
    if (stage.value === 'choose') return tasks.value.length;
    if (stage.value === 'life') return s.life.length;
    return 0;
  }

  /** Следующее задание раздела или следующий раздел. */
  function next() {
    const sec = stage.value as QuestSection;
    if (!sections.value.includes(sec) || sec === 'dialog') return;
    if (sec !== 'new' && picked.value == null && !(sec === 'review' && error.value)) return;
    units.value.done++;
    if (index.value + 1 < sectionLength()) {
      index.value++;
      picked.value = null;
      reviewRes.value = null;
      reviewOffline.value = false;
      error.value = null;
      shownAt.value = Date.now();
      return;
    }
    enter(sections.value[sections.value.indexOf(sec) + 1]);
  }

  /** Повтор: выбранная карточка уходит в POST /v1/reviews с mode=choice. */
  async function pickReview(option: string) {
    const c = reviewCard.value;
    if (!c || busy.value || picked.value != null) return;
    picked.value = option;
    busy.value = true;
    error.value = null;
    haptics.select();
    try {
      const res = await outbox.submit({
        client_id: crypto.randomUUID(),
        word_id: c.word_id,
        input: option,
        hints: 0,
        ms: Math.min(3_600_000, Date.now() - shownAt.value),
        mode: 'choice',
      });
      if (res) {
        reviewRes.value = res;
        balance.value = res.altyn.balance;
        earned.value += res.altyn.earned;
        if (res.verdict === 'wrong') {
          mistakes.value++;
          haptics.error();
        } else haptics.success();
      } else {
        reviewOffline.value = true;
      }
    } catch (e) {
      // 4xx: ответ не принят (слово удалено и т.п.) — можно идти дальше
      error.value = errCode(e);
    } finally {
      busy.value = false;
    }
  }

  /** Новое слово показано: берём в изучение (source=quest). Знакомое — просто дальше. */
  async function introduceItem() {
    const it = item.value;
    if (!it || busy.value) return;
    if (it.state === 'learning') {
      learned.value.push({ word_id: it.word_id, kk: it.kk, ru: it.ru, familiar: true });
      haptics.tap();
      next();
      return;
    }
    busy.value = true;
    error.value = null;
    try {
      await api.introduce(it.word_id, 'quest');
      learned.value.push({ word_id: it.word_id, kk: it.kk, ru: it.ru, familiar: false });
      haptics.tap();
      next();
    } catch (e) {
      error.value = errCode(e);
    } finally {
      busy.value = false;
    }
  }

  /** Выбор карточки: проверка на клиенте. Ошибка — задание вернётся в конец раздела. */
  function pickChoice(option: string) {
    const t = task.value;
    if (!t || picked.value != null) return;
    picked.value = option;
    if (option === t.answer) {
      haptics.success();
      return;
    }
    haptics.error();
    mistakes.value++;
    const base = t.id.split('#')[0]!;
    const tries = (attempts.get(base) ?? 0) + 1;
    attempts.set(base, tries);
    if (tries <= CHOICE_RETRIES) {
      tasks.value.push(retryTask(t, tries));
      units.value.total++;
    }
  }

  /** «В жизни»: выбор слова в пропуск, без SRS и алтына. */
  function pickLife(option: string) {
    const l = life.value;
    if (!l || picked.value != null) return;
    picked.value = option;
    if (option === l.answer) haptics.success();
    else {
      mistakes.value++;
      haptics.error();
    }
  }

  /** Показывает следующую реплику жителя (вызывается экраном с задержкой). */
  function revealNpc() {
    if (stage.value !== 'dialog' || dialogLine.value?.who !== 'npc') return;
    dialogShown.value++;
  }

  /** Ответ в диалоге: верная реплика встаёт в чат, неверная подсвечивается, можно выбрать ещё. */
  function pickDialog(option: string) {
    const line = dialogLine.value;
    if (stage.value !== 'dialog' || !line || line.who !== 'me' || dialogWrong.value.includes(option)) return;
    if (option === line.kk) {
      haptics.success();
      dialogWrong.value = [];
      dialogShown.value++;
      units.value.done++;
      return;
    }
    haptics.error();
    mistakes.value++;
    dialogWrong.value = [...dialogWrong.value, option];
  }

  /** Шаг пройден: POST complete, награда и следующий шаг. Повтор — той же кнопкой при ошибке. */
  async function finish() {
    if (busy.value || stage.value === 'result') return;
    stage.value = 'completing';
    busy.value = true;
    error.value = null;
    try {
      const res = await api.questComplete(slug.value, n.value);
      completeRes.value = res;
      balance.value = res.balance;
      units.value.done = units.value.total;
      haptics.success();
      stage.value = 'result';
    } catch (e) {
      error.value = errCode(e);
    } finally {
      busy.value = false;
    }
  }

  return {
    slug,
    n,
    step,
    stage,
    error,
    busy,
    sections,
    index,
    picked,
    reviewRes,
    reviewOffline,
    tasks,
    dialogShown,
    dialogWrong,
    dialogOptions,
    learned,
    earned,
    mistakes,
    balance,
    completeRes,
    progress,
    reviewCard,
    item,
    task,
    life,
    dialogLine,
    dialogDone,
    correct,
    answered,
    isRight,
    position,
    start,
    begin,
    next,
    pickReview,
    introduceItem,
    pickChoice,
    pickLife,
    revealNpc,
    pickDialog,
    finish,
    reset,
  };
});
