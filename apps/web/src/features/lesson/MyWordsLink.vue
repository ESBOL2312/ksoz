<script setup lang="ts">
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useMyWords } from '@/api';
import { words } from '@/shared/format';
import { useLessonStore } from '@/stores/lesson';

/** Строка-переход со страницы урока на экран «Мои слова». */
const router = useRouter();
const route = useRoute();
const lesson = useLessonStore();
const q = useMyWords();

const total = computed(() => q.data.value?.words.length ?? null);
const due = computed(() => q.data.value?.words.filter((w) => w.group === 'due').length ?? 0);

function open() {
  // с итога урока возвращаемся к итогу; из аула — ничего не держим
  lesson.keepOnReturn = route.name === 'lesson';
  void router.push('/words');
}
</script>

<template>
  <button type="button" class="flex min-h-14 w-full items-center gap-3 rounded-card bg-surface px-4 py-2 text-left active:bg-surface-2" @click="open">
    <span class="grid size-9 shrink-0 place-items-center rounded-control bg-tint/12 text-tint" aria-hidden="true">
      <svg width="20" height="20" viewBox="0 0 24 24"><path d="M5 6h14M5 12h14M5 18h9" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" /></svg>
    </span>
    <span class="grid min-w-0 flex-1">
      <span class="text-body">Мои слова</span>
      <span class="text-footnote text-label-2">
        <template v-if="total == null">Слова на изучении и их прогресс</template>
        <template v-else>
          Учишь {{ words(total) }}<template v-if="due"> · <span class="text-danger">{{ due }} пора повторить</span></template>
        </template>
      </span>
    </span>
    <svg width="8" height="14" viewBox="0 0 8 14" class="shrink-0 text-label-3" aria-hidden="true">
      <path d="M1.5 1.5L6.5 7l-5 5.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
    </svg>
  </button>
</template>
