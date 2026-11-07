<script setup lang="ts">
import { useQueryClient } from '@tanstack/vue-query';
import { onBeforeUnmount, onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import { invalidateAfterLesson, setBalance, useHome } from '@/api';
import Art from '@/shared/art/Art.vue';
import { getWebApp, supports, useBackButton } from '@/telegram';
import { useLessonStore } from '@/stores/lesson';
import IntroCard from './IntroCard.vue';
import LessonDone from './LessonDone.vue';
import QuizCard from './QuizCard.vue';
import ResultPanel from './ResultPanel.vue';

const lesson = useLessonStore();
const router = useRouter();
const qc = useQueryClient();
const home = useHome();

const close = () => void router.push('/');
useBackButton(close);

onMounted(() => {
  if (supports('7.7')) getWebApp()?.disableVerticalSwipes?.();
  void lesson.start(home.data.value?.combo ?? 0);
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
  <div
    class="mx-auto flex min-h-dvh w-full max-w-[430px] flex-col gap-3 px-3.5 pt-3"
    :class="lesson.stage === 'result' ? 'result-bg' : ''"
    style="padding-bottom: calc(16px + var(--tg-safe-bottom))"
  >
    <div v-if="lesson.stage === 'card' || lesson.stage === 'loading'" class="flex items-center gap-2.5">
      <button type="button" class="grid size-[30px] place-items-center text-xl font-black text-night-300" aria-label="Выйти из урока" @click="close">×</button>
      <div class="h-3.5 flex-1 overflow-hidden rounded-full bg-night-800">
        <div
          class="h-full rounded-full bg-sky-500 shadow-[inset_0_-4px_0_rgba(0,0,0,0.15)] transition-[width] duration-300"
          :style="{ width: `${Math.round(lesson.progress * 100)}%` }"
        />
      </div>
      <span class="flex items-center gap-[3px] font-display text-[13px] font-black text-gold-400">
        <Art name="flame" class="size-[18px]" />×{{ lesson.combo }}
      </span>
    </div>

    <div v-if="lesson.stage === 'idle' || lesson.stage === 'loading'" class="grid flex-1 content-start gap-3" aria-busy="true">
      <div class="h-5 w-1/2 animate-pulse rounded-full bg-night-800" />
      <div class="h-56 animate-pulse rounded-3xl bg-night-800" />
      <div class="h-14 animate-pulse rounded-2xl bg-night-800" />
      <div class="h-24 animate-pulse rounded-2xl bg-night-800" />
    </div>

    <template v-else-if="lesson.stage === 'card' && lesson.card">
      <IntroCard v-if="lesson.card.kind === 'new'" :key="lesson.index" :card="lesson.card" />
      <QuizCard v-else :key="lesson.index" :card="lesson.card" />
    </template>

    <ResultPanel v-else-if="lesson.stage === 'result'" />
    <LessonDone v-else-if="lesson.stage === 'done'" />

    <div v-else-if="lesson.stage === 'empty'" class="flex flex-1 flex-col">
      <div class="grid flex-1 content-center justify-items-center gap-3 text-center">
        <Art name="yurt" class="h-32 w-44 animate-[bob_2.4s_ease-in-out_infinite]" />
        <h1 class="font-display text-2xl font-black text-gold-400">Всё повторено</h1>
        <p class="max-w-[17rem] text-sm font-bold text-night-200">Сейчас нечего повторять. Загляни позже, слова скоро вернутся.</p>
      </div>
      <button type="button" class="chunky chunky-gold w-full px-4 py-[15px] text-[15px]" @click="close">В аул</button>
    </div>

    <div v-else-if="lesson.stage === 'error'" class="flex flex-1 flex-col">
      <div class="grid flex-1 content-center justify-items-center gap-3 text-center">
        <Art name="horn" class="size-14" style="color: #f2b42c" />
        <p class="max-w-[17rem] text-sm font-bold text-night-200">
          {{ lesson.error === 'network' ? 'Нет связи с сервером.' : 'Не удалось загрузить урок.' }}
        </p>
      </div>
      <div class="grid gap-2.5">
        <button type="button" class="chunky chunky-gold w-full px-4 py-[15px] text-[15px]" @click="lesson.start(home.data.value?.combo ?? 0)">Повторить</button>
        <button type="button" class="chunky chunky-night w-full px-4 py-[15px] text-[15px] !text-white" @click="close">В аул</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.result-bg {
  background: radial-gradient(circle at 50% 18%, #2b5fb8 0, var(--color-night-900) 60%);
}
</style>
