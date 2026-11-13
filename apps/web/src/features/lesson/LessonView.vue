<script setup lang="ts">
import { useQueryClient } from '@tanstack/vue-query';
import { computed, onBeforeUnmount, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { invalidateAfterLesson, setBalance, useHome } from '@/api';
import Art from '@/shared/art/Art.vue';
import Barys from '@/shared/mascot/Barys.vue';
import { words } from '@/shared/format';
import { getWebApp, supports, useBackButton } from '@/telegram';
import { useLessonStore } from '@/stores/lesson';
import IntroCard from './IntroCard.vue';
import LessonDone from './LessonDone.vue';
import MyWordsLink from './MyWordsLink.vue';
import QuizCard from './QuizCard.vue';
import ResultPanel from './ResultPanel.vue';

const lesson = useLessonStore();
const router = useRouter();
const route = useRoute();

/** /lesson?only=review — «Повторить все» из «Моих слов»: все слова, которые пора повторить, без новых. */
const reviewOnly = route.query.only === 'review';
const begin = () => lesson.start(home.data.value?.combo ?? 0, reviewOnly ? 50 : 12, reviewOnly ? 'review' : undefined);
const qc = useQueryClient();

/** Что попало в закрепление: новые слова и повторы без «Вспомнил». */
const practiceText = computed(() => {
  const n = lesson.learned.length;
  const m = lesson.again.length;
  const tail = 'Напиши каждое по-казахски, так они лучше запомнятся.';
  if (n && m) return `Ты взял в изучение ${words(n)} и не вспомнил ${words(m)}. ${tail}`;
  if (m) return `Ты не вспомнил ${words(m)}. Попробуй написать их ещё раз по-казахски.`;
  return `Ты взял в изучение ${words(n)}. ${tail}`;
});
const home = useHome();

const close = () => void router.push('/');
useBackButton(close);

onMounted(() => {
  if (supports('7.7')) getWebApp()?.disableVerticalSwipes?.();
  // вернулись из «Моих слов» на итог урока: показываем его, а не новый урок
  const keep = lesson.keepOnReturn && (lesson.stage === 'done' || lesson.stage === 'empty');
  lesson.keepOnReturn = false;
  if (!keep) void begin();
});
onBeforeUnmount(() => {
  if (supports('7.7')) getWebApp()?.enableVerticalSwipes?.();
});

watch(
  () => lesson.stage,
  (s) => {
    if (s !== 'done') return;
    invalidateAfterLesson(qc);
    if (lesson.balance != null) setBalance(qc, lesson.balance);
  },
);
</script>

<template>
  <div class="mx-auto flex min-h-dvh w-full max-w-[430px] flex-col gap-3 px-4 pt-2" style="padding-bottom: calc(16px + var(--tg-safe-bottom))">
    <div v-if="lesson.stage === 'card' || lesson.stage === 'loading'" class="-ml-3 flex items-center gap-2">
      <button type="button" class="grid size-11 shrink-0 place-items-center text-label-2" aria-label="Выйти из урока" @click="close">
        <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" />
        </svg>
      </button>
      <div
        class="h-2 flex-1 overflow-hidden rounded-full bg-surface-2"
        role="progressbar"
        aria-label="Прогресс урока"
        :aria-valuenow="Math.round(lesson.progress * 100)"
        aria-valuemin="0"
        aria-valuemax="100"
      >
        <div class="h-full rounded-full bg-accent transition-[width] duration-300" :style="{ width: `${Math.round(lesson.progress * 100)}%` }" />
      </div>
      <span class="flex items-center gap-0.5 text-subhead font-semibold text-altyn-label" :aria-label="`Комбо ${lesson.combo}`">
        <Art name="flame" class="size-5" />×{{ lesson.combo }}
      </span>
    </div>

    <div v-if="lesson.stage === 'idle' || lesson.stage === 'loading'" class="grid flex-1 content-start gap-3" aria-busy="true">
      <div class="h-5 w-1/2 animate-pulse rounded-full bg-surface" />
      <div class="h-56 animate-pulse rounded-card bg-surface" />
      <div class="h-14 animate-pulse rounded-control bg-surface" />
      <div class="h-24 animate-pulse rounded-card bg-surface" />
    </div>

    <template v-else-if="lesson.stage === 'card' && lesson.card">
      <IntroCard v-if="lesson.card.kind === 'new'" :key="lesson.index" :card="lesson.card" />
      <QuizCard v-else :key="lesson.index" :card="lesson.card" />
    </template>

    <div v-else-if="lesson.stage === 'practice-intro'" class="flex flex-1 flex-col">
      <div class="grid flex-1 content-center justify-items-center gap-3 text-center">
        <Barys mood="think" class="w-36" />
        <h1 class="text-title1">Теперь проверим</h1>
        <p class="max-w-[19rem] text-body text-label-2">{{ practiceText }}</p>
        <p class="text-footnote text-label-3">Алтын за тренировку не начисляется.</p>
      </div>
      <div class="grid gap-2">
        <button type="button" class="btn btn-primary w-full" @click="lesson.beginPractice()">Проверить себя</button>
        <button type="button" class="btn-plain w-full text-label-2" @click="lesson.skipPractice()">Пропустить</button>
      </div>
    </div>

    <ResultPanel v-else-if="lesson.stage === 'result'" />
    <LessonDone v-else-if="lesson.stage === 'done'" />

    <div v-else-if="lesson.stage === 'empty'" class="flex flex-1 flex-col">
      <div class="grid flex-1 content-center justify-items-center gap-3 text-center">
        <Barys mood="sleep" class="w-40" />
        <h1 class="text-title1">Всё повторено</h1>
        <p class="max-w-[18rem] text-body text-label-2">Сейчас нечего повторять. Загляни позже, слова скоро вернутся.</p>
      </div>
      <div class="grid gap-3">
        <MyWordsLink />
        <button type="button" class="btn btn-primary w-full" @click="close">В аул</button>
      </div>
    </div>

    <div v-else-if="lesson.stage === 'error'" class="flex flex-1 flex-col">
      <div class="grid flex-1 content-center justify-items-center gap-3 text-center">
        <Barys mood="sad" class="w-36" />
        <h1 class="text-title2">{{ lesson.error === 'network' ? 'Нет связи с сервером' : 'Не удалось загрузить урок' }}</h1>
        <p class="max-w-[18rem] text-body text-label-2">Проверь интернет и попробуй ещё раз.</p>
      </div>
      <div class="grid gap-3">
        <button type="button" class="btn btn-primary w-full" @click="begin()">Повторить</button>
        <button type="button" class="btn btn-secondary w-full" @click="close">В аул</button>
      </div>
    </div>
  </div>
</template>
