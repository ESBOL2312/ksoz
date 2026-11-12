<script setup lang="ts">
import type { LessonCard } from '@ksoz/shared';
import { useLessonStore } from '@/stores/lesson';
import ExampleLine from './ExampleLine.vue';
import WordPic from './WordPic.vue';

const props = defineProps<{ card: LessonCard }>();
const lesson = useLessonStore();

function play() {
  if (!props.card.audio_url) return;
  void new Audio(props.card.audio_url).play().catch(() => {});
}
</script>

<template>
  <div class="flex flex-1 flex-col gap-4">
    <article class="overflow-hidden rounded-card bg-surface">
      <WordPic :image-url="card.image_url" :ru="card.ru" tall />
      <div class="grid gap-4 p-4">
        <div class="flex items-start justify-between gap-3">
          <div class="grid gap-0.5">
            <span class="text-footnote text-label-2">Новое слово</span>
            <b class="text-title1 break-words text-word">{{ card.kk }}</b>
            <span class="text-body text-label-2">{{ card.ru }}</span>
          </div>
          <button
            v-if="card.audio_url"
            type="button"
            class="grid size-11 shrink-0 place-items-center rounded-full bg-inverse text-on-inverse active:opacity-70"
            aria-label="Прослушать произношение"
            @click="play"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor" />
              <path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
            </svg>
          </button>
        </div>
        <div v-if="card.examples.length" class="grid gap-3 border-t border-separator pt-3">
          <ExampleLine v-for="(e, i) in card.examples" :key="i" :kk="e.kk" :ru="e.ru" :word="card.kk" />
        </div>
      </div>
    </article>

    <p v-if="lesson.error" class="text-center text-footnote text-danger">Не получилось сохранить. Попробуй ещё раз.</p>
    <div class="mt-auto grid gap-2">
      <button type="button" class="btn btn-primary w-full" :disabled="lesson.busy" @click="lesson.introduce()">Түсіндім</button>
      <p class="text-center text-footnote text-label-3">Проверим в конце урока, потом через 20 минут</p>
      <button type="button" class="btn-plain w-full text-label-2" :disabled="lesson.busy" @click="lesson.skipKnown()">Уже знаю это слово</button>
    </div>
  </div>
</template>
