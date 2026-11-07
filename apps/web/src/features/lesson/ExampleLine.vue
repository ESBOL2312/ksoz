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
  <div class="grid gap-0.5 border-l-4 border-gold-400 pl-2.5">
    <span class="text-[15px] font-black">
      <template v-if="parts">{{ parts[0] }}<u class="decoration-gold-400 decoration-[3px] underline-offset-[3px]">{{ parts[1] }}</u>{{ parts[2] }}</template>
      <template v-else>{{ kk }}</template>
    </span>
    <span class="text-[13px] font-bold text-ink-2">{{ ru }}</span>
  </div>
</template>
