<script setup lang="ts">
import { useRouter } from 'vue-router';
import Art from '@/shared/art/Art.vue';
import { num, words } from '@/shared/format';
import { useLessonStore } from '@/stores/lesson';

const lesson = useLessonStore();
const router = useRouter();
</script>

<template>
  <div class="flex flex-1 flex-col gap-4">
    <div class="grid justify-items-center gap-2 pt-4 text-center">
      <Art name="eagle" class="h-20 w-32" />
      <h1 class="font-display text-3xl font-black text-gold-400 [text-shadow:0_4px_0_var(--color-felt-800)]">Сабақ бітті!</h1>
      <div class="mt-1 flex items-center gap-2 rounded-full border-2 border-gold-400 bg-ink py-1.5 pl-2 pr-4 font-display text-xl font-black text-gold-400">
        <Art name="coin" class="size-7" />+{{ num(lesson.stats.earned) }}
      </div>
    </div>

    <div class="grid grid-cols-3 gap-2.5 text-center">
      <div class="rounded-2xl bg-sky-500 py-3 text-white shadow-[0_4px_0_var(--color-sky-600)]">
        <b class="block font-display text-2xl font-black">{{ lesson.stats.correct }}</b>
        <span class="text-xs font-extrabold">верно</span>
      </div>
      <div class="rounded-2xl bg-gold-400 py-3 text-ink shadow-[0_4px_0_var(--color-gold-600)]">
        <b class="block font-display text-2xl font-black">{{ lesson.stats.almost }}</b>
        <span class="text-xs font-extrabold">почти</span>
      </div>
      <div class="rounded-2xl bg-felt-600 py-3 text-white shadow-[0_4px_0_var(--color-felt-800)]">
        <b class="block font-display text-2xl font-black">{{ lesson.stats.wrong }}</b>
        <span class="text-xs font-extrabold">ошибок</span>
      </div>
    </div>

    <div class="grid gap-2 rounded-[18px] bg-night-800 px-4 py-3 text-sm font-extrabold">
      <div class="flex justify-between"><span class="text-night-200">Новых слов</span><b class="text-white">{{ words(lesson.stats.introduced) }}</b></div>
      <div class="flex items-center justify-between">
        <span class="text-night-200">Лучшее комбо</span>
        <b class="flex items-center gap-1 text-gold-400"><Art name="flame" class="size-[18px]" />×{{ lesson.stats.bestCombo }}</b>
      </div>
    </div>

    <p v-if="lesson.stats.queued > 0" class="rounded-2xl bg-night-800 px-4 py-2.5 text-center text-xs font-bold text-night-200">
      {{ lesson.stats.queued }} ответов сохранены без сети, алтын придёт, когда они отправятся.
    </p>

    <div class="mt-auto grid gap-2.5">
      <button type="button" class="chunky chunky-gold w-full px-4 py-[15px] text-[15px]" @click="lesson.start(lesson.combo)">Ещё урок</button>
      <button type="button" class="chunky chunky-night w-full px-4 py-[15px] text-[15px] !text-white" @click="router.push('/')">В аул</button>
    </div>
  </div>
</template>
