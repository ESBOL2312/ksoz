<script setup lang="ts">
import { MASTERED_INTERVAL_DAYS, type MyWord } from '@ksoz/shared';
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useMyWords } from '@/api';
import Barys from '@/shared/mascot/Barys.vue';
import { inTime, words as wordsText } from '@/shared/format';
import { haptics, useBackButton } from '@/telegram';
import { useLessonStore } from '@/stores/lesson';
import WordLadder from './WordLadder.vue';
import WordSheet from './WordSheet.vue';
import { stageText } from './progress';

const router = useRouter();
const lesson = useLessonStore();
const q = useMyWords();

const back = () => (window.history.state?.back ? router.back() : void router.push('/'));
const hasTgBack = useBackButton(back);

const GROUPS = [
  { key: 'due', title: 'Пора повторить', hint: 'Ответь на них в уроке, пока не забылись.' },
  { key: 'learning', title: 'Учу', hint: 'Короткие повторы: 20 минут, 1, 2 и 5 часов.' },
  { key: 'review', title: 'Закрепляю', hint: `Долгие повторы, интервал растёт до ${MASTERED_INTERVAL_DAYS} дня.` },
] as const;

const list = computed(() => q.data.value?.words ?? []);
const groups = computed(() =>
  GROUPS.map((g) => ({ ...g, words: list.value.filter((w) => w.group === g.key) })).filter((g) => g.words.length),
);
const count = (key: MyWord['group']) => list.value.filter((w) => w.group === key).length;

const picked = ref<MyWord | null>(null);
const sheetOpen = ref(false);
function pick(w: MyWord) {
  haptics.select();
  picked.value = w;
  sheetOpen.value = true;
}

const dueCount = computed(() => count('due'));

/** «Повторить все»: сразу открывает повторение всех слов, которые пора повторить. */
function repeat(onlyDue = dueCount.value > 0) {
  lesson.keepOnReturn = false;
  void router.push(onlyDue ? { path: '/lesson', query: { only: 'review' } } : '/lesson');
}
</script>

<template>
  <section class="mx-auto w-full max-w-[430px]">
    <div class="grid h-11 grid-cols-[1fr_auto_1fr] items-center px-2">
      <button v-if="!hasTgBack" type="button" class="btn-plain justify-self-start px-2 text-body" @click="back">
        <svg width="12" height="20" viewBox="0 0 12 20" class="mr-1" aria-hidden="true">
          <path d="M10 2L2 10l8 8" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
        Назад
      </button>
      <span v-else />
      <h1 class="text-headline">Мои слова</h1>
      <span />
    </div>

    <div v-if="q.isPending.value" class="mx-4 mt-2 grid gap-3" aria-busy="true">
      <div class="h-20 animate-pulse rounded-card bg-surface" />
      <div class="h-48 animate-pulse rounded-card bg-surface" />
      <div class="h-32 animate-pulse rounded-card bg-surface" />
    </div>

    <div v-else-if="q.isError.value" class="grid justify-items-center gap-3 px-4 pt-12 text-center">
      <Barys mood="sad" class="w-32" />
      <h2 class="text-title2">Не удалось загрузить слова</h2>
      <button type="button" class="btn btn-primary w-full" @click="q.refetch()">Повторить</button>
    </div>

    <div v-else-if="!list.length" class="grid justify-items-center gap-3 px-4 pt-10 text-center">
      <Barys mood="think" class="w-32" />
      <h2 class="text-title2">Пока нечего учить</h2>
      <p class="max-w-[18rem] text-body text-label-2">
        <template v-if="q.data.value?.mastered">Все {{ wordsText(q.data.value.mastered) }} уже выучены. </template>
        Начни урок, и новые слова появятся здесь.
      </p>
      <button type="button" class="btn btn-primary w-full" @click="repeat(false)">Начать урок</button>
    </div>

    <div v-else class="grid gap-5 px-4 pt-2" :class="dueCount ? '' : 'pb-8'">
      <dl class="grid grid-cols-4 rounded-card bg-surface py-3 text-center">
        <div class="flex flex-col-reverse gap-0.5">
          <dt class="text-caption1 text-label-2">повторить</dt>
          <dd class="text-title2 text-danger">{{ count('due') }}</dd>
        </div>
        <div class="flex flex-col-reverse gap-0.5 border-l border-separator">
          <dt class="text-caption1 text-label-2">учу</dt>
          <dd class="text-title2">{{ count('learning') }}</dd>
        </div>
        <div class="flex flex-col-reverse gap-0.5 border-l border-separator">
          <dt class="text-caption1 text-label-2">закрепляю</dt>
          <dd class="text-title2 text-altyn-label">{{ count('review') }}</dd>
        </div>
        <div class="flex flex-col-reverse gap-0.5 border-l border-separator">
          <dt class="text-caption1 text-label-2">выучено</dt>
          <dd class="text-title2 text-ok-label">{{ q.data.value?.mastered ?? 0 }}</dd>
        </div>
      </dl>

      <section v-for="g in groups" :key="g.key" class="grid gap-2" :aria-label="g.title">
        <div class="flex items-baseline justify-between gap-2 px-1">
          <h2 class="text-title3">{{ g.title }}</h2>
          <span class="text-footnote text-label-3">{{ wordsText(g.words.length) }}</span>
        </div>
        <ul class="group-list">
          <li v-for="w in g.words" :key="w.word_id">
            <button type="button" class="flex min-h-14 w-full items-center gap-3 px-4 py-2 text-left active:bg-surface-2" @click="pick(w)">
              <span class="grid min-w-0 flex-1 gap-0.5">
                <span class="min-w-0">
                  <b class="text-headline break-words">{{ w.kk }}</b>
                  <span class="text-subhead text-label-2"> · {{ w.ru }}</span>
                </span>
                <span class="text-footnote text-label-3">{{ stageText(w) }}</span>
              </span>
              <span class="grid shrink-0 justify-items-end gap-1.5">
                <span class="text-footnote" :class="g.key === 'due' ? 'font-semibold text-danger' : 'text-label-2'">{{ inTime(w.due_at) }}</span>
                <WordLadder :word="w" />
              </span>
              <svg width="8" height="14" viewBox="0 0 8 14" class="shrink-0 text-label-3" aria-hidden="true">
                <path d="M1.5 1.5L6.5 7l-5 5.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
            </button>
          </li>
        </ul>
        <p class="px-1 text-footnote text-label-3">{{ g.hint }}</p>
      </section>
    </div>

    <div
      v-if="dueCount"
      class="sticky bottom-0 mt-4 bg-gradient-to-t from-canvas from-70% to-transparent px-4 pt-4"
      style="padding-bottom: calc(12px + var(--tg-safe-bottom))"
    >
      <button type="button" class="btn btn-primary w-full" @click="repeat()">Повторить все · {{ wordsText(dueCount) }}</button>
    </div>

    <WordSheet v-model:open="sheetOpen" :word="picked" />
  </section>
</template>
