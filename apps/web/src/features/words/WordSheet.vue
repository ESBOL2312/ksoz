<script setup lang="ts">
import { MASTERED_INTERVAL_DAYS, type MyWord } from '@ksoz/shared';
import { computed } from 'vue';
import ExampleLine from '@/features/lesson/ExampleLine.vue';
import SrsLine from '@/features/lesson/SrsLine.vue';
import WordPic from '@/features/lesson/WordPic.vue';
import { days, inTime, plural } from '@/shared/format';
import { accuracy, percent, stageText } from './progress';

const props = defineProps<{ word: MyWord | null }>();
const open = defineModel<boolean>('open', { required: true });

const VERDICT = {
  correct: { label: 'верно', cls: 'bg-ok' },
  almost: { label: 'почти', cls: 'bg-altyn' },
  wrong: { label: 'ошибка', cls: 'bg-danger' },
} as const;

const acc = computed(() => (props.word ? accuracy(props.word.answers) : null));
const since = (iso: string) => {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  return d <= 0 ? 'сегодня' : `${days(d)} назад`;
};
</script>

<template>
  <UModal v-model:open="open" :title="word?.kk ?? 'Слово'" :description="word?.ru ?? ''" :ui="{ content: 'bg-canvas text-label', header: 'hidden', body: 'p-0 sm:p-0' }">
    <template #body>
      <div v-if="word" class="grid gap-3 pb-4">
        <div class="overflow-hidden rounded-t-card">
          <WordPic :image-url="word.image_url" :ru="word.ru" />
        </div>
        <div class="grid gap-0.5 px-4 text-center">
          <h2 class="text-title1 text-word">{{ word.kk }}</h2>
          <p class="text-body text-label-2">{{ word.ru }}</p>
        </div>

        <div class="grid gap-3 px-4">
          <SrsLine :next="{ phase: word.phase, step: word.step, due_at: word.due_at }" />

          <section class="grid gap-2 rounded-card bg-surface px-4 py-3" aria-label="Прогресс до «выучено»">
            <div class="flex items-baseline justify-between gap-2 text-subhead">
              <span class="text-label-2">До «выучено»</span><b class="font-semibold">{{ percent(word) }}%</b>
            </div>
            <div class="h-2 overflow-hidden rounded-full bg-surface-2" aria-hidden="true">
              <div class="h-full rounded-full bg-ok" :style="{ width: `${percent(word)}%` }" />
            </div>
            <p class="text-footnote text-label-3">{{ stageText(word) }}. Слово выучено, когда интервал повтора дорастёт до {{ MASTERED_INTERVAL_DAYS }} дня.</p>
          </section>

          <dl class="grid grid-cols-3 rounded-card bg-surface py-3 text-center">
            <div class="flex flex-col-reverse gap-0.5">
              <dt class="text-footnote text-label-2">верно</dt>
              <dd class="text-title2 text-ok-label">{{ word.answers.correct }}</dd>
            </div>
            <div class="flex flex-col-reverse gap-0.5 border-x border-separator">
              <dt class="text-footnote text-label-2">почти</dt>
              <dd class="text-title2 text-altyn-label">{{ word.answers.almost }}</dd>
            </div>
            <div class="flex flex-col-reverse gap-0.5">
              <dt class="text-footnote text-label-2">ошибок</dt>
              <dd class="text-title2 text-danger">{{ word.answers.wrong }}</dd>
            </div>
          </dl>

          <section v-if="word.recent.length" class="grid gap-2 rounded-card bg-surface px-4 py-3" aria-label="Последние ответы">
            <div class="flex items-baseline justify-between gap-2 text-subhead">
              <span class="text-label-2">Последние ответы</span>
              <b v-if="acc != null" class="font-semibold">точность {{ acc }}%</b>
            </div>
            <ol class="flex flex-wrap gap-1.5">
              <li
                v-for="(v, i) in word.recent"
                :key="i"
                class="size-3.5 rounded-full"
                :class="VERDICT[v].cls"
                :title="VERDICT[v].label"
                :aria-label="VERDICT[v].label"
              />
            </ol>
          </section>

          <ul class="group-list">
            <li class="flex min-h-11 items-center justify-between gap-2 px-4">
              <span class="text-body">Следующий повтор</span><span class="text-body text-label-2">{{ inTime(word.due_at) }}</span>
            </li>
            <li class="flex min-h-11 items-center justify-between gap-2 px-4">
              <span class="text-body">Начал учить</span><span class="text-body text-label-2">{{ since(word.introduced_at) }}</span>
            </li>
            <li v-if="word.lapses" class="flex min-h-11 items-center justify-between gap-2 px-4">
              <span class="text-body">Забывал</span>
              <span class="text-body text-label-2">{{ word.lapses }} {{ plural(word.lapses, ['раз', 'раза', 'раз']) }}</span>
            </li>
          </ul>

          <section v-if="word.examples.length" class="grid gap-2 rounded-card bg-surface px-4 py-3" aria-label="Примеры">
            <h3 class="text-subhead text-label-2">Примеры</h3>
            <ExampleLine v-for="(e, i) in word.examples" :key="i" :kk="e.kk" :ru="e.ru" :word="word.kk" />
          </section>

          <button type="button" class="btn btn-secondary w-full" @click="open = false">Закрыть</button>
        </div>
      </div>
    </template>
  </UModal>
</template>
