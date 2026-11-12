<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{ kk: string; ru: string; word?: string | null }>();

/** Разбивает предложение на до/слово/после, чтобы подчеркнуть слово (в т.ч. с окончанием). */
const parts = computed(() => {
  const w = props.word?.trim().toLowerCase();
  const i = w ? props.kk.toLowerCase().indexOf(w) : -1;
  if (!w || i < 0) return null;
  return [props.kk.slice(0, i), props.kk.slice(i, i + w.length), props.kk.slice(i + w.length)] as const;
});
</script>

<template>
  <div class="grid gap-0.5">
    <span class="text-body">
      <template v-if="parts">{{ parts[0] }}<u class="font-semibold decoration-altyn-label decoration-2 underline-offset-[3px]">{{ parts[1] }}</u>{{ parts[2] }}</template>
      <template v-else>{{ kk }}</template>
    </span>
    <span class="text-footnote text-label-2">{{ ru }}</span>
  </div>
</template>
