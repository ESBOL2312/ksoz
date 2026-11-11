<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import Art from '@/shared/art/Art.vue';
import Barys from '@/shared/mascot/Barys.vue';
import { num, words } from '@/shared/format';
import { useLessonStore } from '@/stores/lesson';

const lesson = useLessonStore();
const router = useRouter();

/** были ли в уроке настоящие повторы (с алтыном) */
const hadReviews = computed(() => {
  const s = lesson.stats;
  return s.correct + s.almost + s.wrong + s.queued > 0;
});
const remembered = computed(() => lesson.learned.filter((w) => w.tries != null).length);
const triesText = (t: number | null) => (t == null ? 'повторим' : t === 1 ? 'с первого раза' : `с ${t}-й попытки`);
</script>

<template>
  <div class="flex flex-1 flex-col gap-4">
    <div class="grid justify-items-center gap-2 pt-4 text-center">
      <div class="relative grid place-items-center">
        <div class="rays pointer-events-none absolute size-[240px] animate-[spin_18s_linear_infinite] rounded-full" />
        <Barys mood="happy" class="relative w-36" label="Барыс радуется" />
      </div>
      <h1 class="font-display text-3xl font-black text-gold-400 [text-shadow:0_4px_0_var(--color-felt-800)]">Сабақ бітті!</h1>
      <div class="mt-1 flex items-center gap-2 rounded-full border-2 border-gold-400 bg-ink py-1.5 pl-2 pr-4 font-display text-xl font-black text-gold-400">
        <Art name="coin" class="size-7" />+{{ num(lesson.stats.earned) }}
      </div>
    </div>

    <div v-if="hadReviews || !lesson.learned.length" class="grid grid-cols-3 gap-2.5 text-center">
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

    <section v-if="lesson.learned.length" class="grid gap-2 rounded-[18px] bg-night-800 px-4 py-3" aria-label="Слова на изучении">
      <div class="flex items-baseline justify-between gap-2 text-sm font-extrabold">
        <span class="text-white">Учишь сейчас</span>
        <span class="text-night-200">написал {{ remembered }} из {{ lesson.learned.length }}</span>
      </div>
      <ul class="grid gap-1.5">
        <li v-for="w in lesson.learned" :key="w.word_id" class="flex items-baseline justify-between gap-2">
          <span class="min-w-0">
            <b class="break-words font-display text-[17px] font-bold text-white">{{ w.kk }}</b>
            <span class="text-sm font-bold text-night-200"> · {{ w.ru }}</span>
          </span>
          <span class="shrink-0 text-xs font-extrabold" :class="w.tries === 1 ? 'text-sky-400' : w.tries == null ? 'text-felt-300' : 'text-gold-400'">
            {{ triesText(w.tries) }}
          </span>
        </li>
      </ul>
      <p class="text-xs font-bold text-night-300">Первый повтор через 20 минут, потом через 1, 2 и 5 часов.</p>
    </section>

    <details v-if="lesson.known.length" class="rounded-[18px] bg-night-800 px-4 py-3 text-sm font-extrabold">
      <summary class="cursor-pointer text-night-200">Уже знал: {{ words(lesson.known.length) }}</summary>
      <ul class="mt-2 grid gap-1">
        <li v-for="w in lesson.known" :key="w.word_id">
          <b class="font-display font-bold text-white">{{ w.kk }}</b><span class="font-bold text-night-200"> · {{ w.ru }}</span>
        </li>
      </ul>
      <p class="mt-2 text-xs font-bold text-night-300">Проверим их через месяц.</p>
    </details>

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

<style scoped>
.rays {
  background: repeating-conic-gradient(rgba(242, 180, 44, 0.2) 0 10deg, transparent 10deg 20deg);
  -webkit-mask: radial-gradient(circle, #000 25%, transparent 68%);
  mask: radial-gradient(circle, #000 25%, transparent 68%);
}
</style>
