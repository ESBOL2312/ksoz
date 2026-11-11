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
  <div class="flex flex-1 flex-col gap-3">
    <div class="card-milk overflow-hidden rounded-3xl">
      <WordPic :image-url="card.image_url" :ru="card.ru" tall />
      <div class="grid gap-3 p-4">
        <div class="flex items-start justify-between gap-2">
          <div class="grid gap-1">
            <small class="text-xs font-extrabold text-ink-2">Новое слово</small>
            <b class="break-words font-display text-[32px] font-black leading-tight text-felt-600">{{ card.kk }}</b>
            <span class="text-lg font-extrabold text-ink-2">{{ card.ru }}</span>
          </div>
          <button
            v-if="card.audio_url"
            type="button"
            class="chunky chunky-night grid size-12 shrink-0 place-items-center text-xl"
            aria-label="Прослушать"
            @click="play"
          >
            ▶
          </button>
        </div>
        <ExampleLine v-for="(e, i) in card.examples" :key="i" :kk="e.kk" :ru="e.ru" :word="card.kk" />
      </div>
    </div>

    <p v-if="lesson.error" class="text-center text-xs font-extrabold text-felt-300">Не получилось сохранить. Попробуй ещё раз.</p>
    <div class="mt-auto grid gap-2">
      <button type="button" class="chunky chunky-gold w-full px-4 py-[15px] text-[15px]" :disabled="lesson.busy" @click="lesson.introduce()">
        Түсіндім
      </button>
      <p class="text-center text-xs font-bold text-night-300">Проверим в конце урока, потом через 20 минут</p>
      <button
        type="button"
        class="w-full py-2 text-sm font-extrabold text-night-200 underline-offset-4 active:underline disabled:opacity-50"
        :disabled="lesson.busy"
        @click="lesson.skipKnown()"
      >
        Уже знаю это слово
      </button>
    </div>
  </div>
</template>
