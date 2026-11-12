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
  <section class="grid gap-3 rounded-card bg-surface px-4 pt-3 pb-3.5" aria-label="Когда слово вернётся">
    <div class="flex justify-between gap-2 text-subhead">
      <span class="text-label-2">Слово вернётся</span><b class="font-semibold">{{ when }}</b>
    </div>
    <ol class="relative grid grid-cols-5">
      <li class="absolute inset-x-[10%] top-[13px] h-0.5 bg-surface-2" aria-hidden="true" />
      <li class="absolute top-[13px] left-[10%] h-0.5 bg-ok" :style="{ width: `${at * 20}%` }" aria-hidden="true" />
      <li
        v-for="(label, i) in STEP_LABELS"
        :key="label"
        class="relative z-10 grid justify-items-center gap-1 text-caption1"
        :class="i === at ? 'font-semibold text-label' : i < at ? 'text-label-2' : 'text-label-3'"
      >
        <span
          class="grid size-7 place-items-center rounded-full text-footnote font-semibold"
          :class="i < at ? 'bg-ok text-on-ok' : i === at ? 'bg-altyn text-on-altyn ring-[3px] ring-altyn/35' : 'bg-surface-2 text-label-2'"
          aria-hidden="true"
          >{{ dotText(i) }}</span
        >
        {{ label }}
      </li>
    </ol>
  </section>
</template>
