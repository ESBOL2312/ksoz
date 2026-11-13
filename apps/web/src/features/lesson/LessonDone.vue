<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import Art from '@/shared/art/Art.vue';
import Barys from '@/shared/mascot/Barys.vue';
import { num, words } from '@/shared/format';
import { useLessonStore } from '@/stores/lesson';
import MyWordsLink from './MyWordsLink.vue';

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
    <div class="grid justify-items-center gap-1 pt-2 text-center">
      <Barys mood="happy" class="-mb-2 w-32" label="Барыс радуется" />
      <h1 class="text-large-title">Сабақ бітті!</h1>
      <span class="mt-1 inline-flex h-9 items-center gap-1.5 rounded-full bg-surface pr-3.5 pl-2 text-headline">
        <Art name="coin" class="size-6" />+{{ num(lesson.stats.earned) }} алтын
      </span>
    </div>

    <dl v-if="hadReviews || !lesson.learned.length" class="grid grid-cols-3 rounded-card bg-surface py-3 text-center">
      <div class="flex flex-col-reverse gap-0.5">
        <dt class="text-footnote text-label-2">верно</dt>
        <dd class="text-title2 text-ok-label">{{ lesson.stats.correct }}</dd>
      </div>
      <div class="flex flex-col-reverse gap-0.5 border-x border-separator">
        <dt class="text-footnote text-label-2">почти</dt>
        <dd class="text-title2 text-altyn-label">{{ lesson.stats.almost }}</dd>
      </div>
      <div class="flex flex-col-reverse gap-0.5">
        <dt class="text-footnote text-label-2">ошибок</dt>
        <dd class="text-title2 text-danger">{{ lesson.stats.wrong }}</dd>
      </div>
    </dl>

    <section v-if="lesson.learned.length" class="grid gap-2" aria-label="Слова на изучении">
      <div class="flex items-baseline justify-between gap-2">
        <h2 class="text-title3">Учишь сейчас</h2>
        <span class="text-footnote text-label-3">написал {{ remembered }} из {{ lesson.learned.length }}</span>
      </div>
      <ul class="group-list">
        <li v-for="w in lesson.learned" :key="w.word_id" class="flex min-h-12 items-center justify-between gap-2 px-4 py-2">
          <span class="min-w-0">
            <b class="text-headline break-words">{{ w.kk }}</b>
            <span class="text-subhead text-label-2"> · {{ w.ru }}</span>
          </span>
          <span class="shrink-0 text-footnote" :class="w.tries === 1 ? 'text-ok-label' : w.tries == null ? 'text-danger' : 'text-altyn-label'">
            {{ triesText(w.tries) }}
          </span>
        </li>
      </ul>
      <p class="text-footnote text-label-3">Первый повтор через 20 минут, потом через 1, 2 и 5 часов.</p>
    </section>

    <MyWordsLink />

    <details v-if="lesson.known.length" class="rounded-card bg-surface px-4 py-3">
      <summary class="flex min-h-6 cursor-pointer items-center text-body text-label-2">Уже знал: {{ words(lesson.known.length) }}</summary>
      <ul class="mt-2 grid gap-1">
        <li v-for="w in lesson.known" :key="w.word_id">
          <b class="text-headline">{{ w.kk }}</b><span class="text-subhead text-label-2"> · {{ w.ru }}</span>
        </li>
      </ul>
      <p class="mt-2 text-footnote text-label-3">Проверим их через месяц.</p>
    </details>

    <ul class="group-list">
      <li class="flex min-h-12 items-center justify-between px-4">
        <span class="text-body">Новых слов</span><span class="text-body text-label-2">{{ words(lesson.stats.introduced) }}</span>
      </li>
      <li class="flex min-h-12 items-center justify-between px-4">
        <span class="text-body">Лучшее комбо</span>
        <span class="flex items-center gap-1 text-body text-label-2"><Art name="flame" class="size-[18px]" />×{{ lesson.stats.bestCombo }}</span>
      </li>
    </ul>

    <p v-if="lesson.stats.queued > 0" class="rounded-card bg-surface px-4 py-3 text-center text-footnote text-label-2">
      {{ lesson.stats.queued }} ответов сохранены без сети, алтын придёт, когда они отправятся.
    </p>

    <div class="mt-auto grid gap-3">
      <button type="button" class="btn btn-primary w-full" @click="lesson.start(lesson.combo)">Ещё урок</button>
      <button type="button" class="btn btn-secondary w-full" @click="router.push('/')">В аул</button>
    </div>
  </div>
</template>
