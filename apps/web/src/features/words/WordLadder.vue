<script setup lang="ts">
import type { MyWord } from '@ksoz/shared';
import { computed } from 'vue';
import { ladder, percent } from './progress';

/** Мини-лесенка в строке списка: 4 коротких повтора + долгие повторы до 21 дня. */
const props = defineProps<{ word: Pick<MyWord, 'phase' | 'step' | 'interval_days'> }>();
const parts = computed(() => ladder(props.word));
</script>

<template>
  <span class="flex w-[72px] gap-0.5" role="img" :aria-label="`Прогресс ${percent(word)}%`">
    <span v-for="(p, i) in parts" :key="i" class="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2">
      <span class="block h-full rounded-full" :class="i === parts.length - 1 ? 'bg-altyn' : 'bg-ok'" :style="{ width: `${p * 100}%` }" />
    </span>
  </span>
</template>
