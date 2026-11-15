<!-- Новое слово или фраза шага: крупно по-казахски, перевод, подсказка Барыса и пример. -->
<script setup lang="ts">
import type { QuestItem } from '@ksoz/shared';
import Barys from '@/shared/mascot/Barys.vue';
import ExampleLine from '@/features/lesson/ExampleLine.vue';

const props = defineProps<{ item: QuestItem }>();

function play() {
  if (!props.item.audio_url) return;
  void new Audio(props.item.audio_url).play().catch(() => {});
}
</script>

<template>
  <article class="enter-up overflow-hidden rounded-card bg-surface">
    <div class="relative grid min-h-36 place-items-center overflow-hidden bg-sky-art px-4 pt-6 pb-10">
      <img v-if="item.image_url" :src="item.image_url" :alt="item.ru" class="absolute inset-0 size-full object-cover" />
      <div class="absolute inset-x-[-10%] -bottom-16 h-28 rounded-[50%] bg-[#9cc25a]" aria-hidden="true" />
      <span
        v-if="item.state === 'learning'"
        class="absolute top-3 left-3 rounded-full bg-white/90 px-2.5 py-0.5 text-footnote font-medium text-[#1a7f37]"
      >Уже знакомо</span>
      <span v-else class="absolute top-3 left-3 rounded-full bg-white/90 px-2.5 py-0.5 text-footnote font-medium text-[#0a72b5]">
        {{ item.kind === 'phrase' ? 'Новая фраза' : 'Новое слово' }}
      </span>
      <span v-if="!item.image_url" class="relative max-w-[15rem] pr-10 text-center text-title2 break-words text-white drop-shadow-[0_2px_0_rgba(8,38,59,0.45)]">
        {{ item.ru }}
      </span>
      <Barys mood="idle" :animated="false" class="absolute -right-3 -bottom-12 w-[104px]" />
    </div>
    <div class="grid gap-3 p-4">
      <div class="flex items-start justify-between gap-3">
        <div class="grid gap-0.5">
          <b class="text-title1 break-words text-word">{{ item.kk }}</b>
          <span class="text-body text-label-2">{{ item.ru }}</span>
        </div>
        <button
          v-if="item.audio_url"
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
      <div v-if="item.note" class="flex items-start gap-2.5 rounded-control bg-surface-2 p-3">
        <Barys mood="think" :animated="false" class="-my-1 w-9 shrink-0" />
        <p class="text-subhead"><b class="font-semibold">Когда говорят:</b> {{ item.note }}</p>
      </div>
      <div v-if="item.examples.length" class="grid gap-3 border-t border-separator pt-3">
        <ExampleLine v-for="(e, i) in item.examples" :key="i" :kk="e.kk" :ru="e.ru" :word="item.kk" />
      </div>
    </div>
  </article>
</template>
