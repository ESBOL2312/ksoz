<script setup lang="ts">
import type { ReviewResponse } from '@ksoz/shared';
import { computed } from 'vue';
import { inTime, STEP_LABELS } from '@/shared/format';

const props = defineProps<{ next: ReviewResponse['next'] }>();

/** Индекс точки, на которой стоит слово: learning → шаг, review → последняя. */
const at = computed(() => (props.next.phase === 'learning' ? props.next.step : 4));
const when = computed(() => inTime(props.next.due_at));
const dotText = (i: number) => (i < at.value ? '✓' : i === 4 ? '∞' : String(i + 1));
</script>

<template>
  <div class="grid gap-2.5 rounded-[18px] bg-night-800 px-3.5 py-3">
    <div class="flex justify-between text-xs font-extrabold text-night-200">
      <span>Когда слово вернётся</span><b class="text-white">{{ when }}</b>
    </div>
    <div class="relative grid grid-cols-5">
      <div class="absolute inset-x-[10%] top-[11px] h-1 rounded bg-night-700" />
      <div class="absolute left-[10%] top-[11px] h-1 rounded bg-sky-500" :style="{ width: `${at * 20}%` }" />
      <div
        v-for="(label, i) in STEP_LABELS"
        :key="label"
        class="relative z-10 grid justify-items-center gap-1 text-[11px] font-extrabold"
        :class="i < at ? 'text-white' : i === at ? 'text-gold-400' : 'text-night-300'"
      >
        <i
          class="grid size-[26px] place-items-center rounded-full border-[3px] border-night-800 text-[13px] not-italic"
          :class="i < at ? 'bg-sky-500 text-white' : i === at ? 'bg-gold-400 text-ink shadow-[0_0_0_3px_rgba(242,180,44,0.35)]' : 'bg-night-700 text-white'"
        >{{ dotText(i) }}</i>
        {{ label }}
      </div>
    </div>
  </div>
</template>
