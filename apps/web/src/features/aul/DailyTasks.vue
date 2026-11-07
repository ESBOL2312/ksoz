<script setup lang="ts">
import type { DailyTask } from '@ksoz/shared';
import Art from '@/shared/art/Art.vue';
import { TASK_TITLES, num } from '@/shared/format';

defineProps<{ tasks: DailyTask[]; claiming: string | null }>();
defineEmits<{ claim: [code: string] }>();

const title = (code: string) => TASK_TITLES[code] ?? { title: code, hint: '' };
const pct = (t: DailyTask) => Math.min(100, Math.round((t.progress / Math.max(1, t.target)) * 100));
const ready = (t: DailyTask) => t.progress >= t.target && !t.claimed;
</script>

<template>
  <section class="mx-3.5 mt-3 mb-4 grid gap-2">
    <h2 class="mt-1 font-display text-[13px] font-bold text-gold-400">Тапсырмалар на сегодня</h2>
    <p v-if="!tasks.length" class="rounded-[14px] bg-night-800 px-3 py-3 text-sm font-bold text-night-300">
      Заданий пока нет. Загляни завтра.
    </p>
    <div
      v-for="t in tasks"
      :key="t.code"
      class="grid grid-cols-[28px_1fr_auto] items-center gap-2.5 rounded-[14px] bg-night-800 px-3 py-2.5"
    >
      <span
        class="grid size-7 place-items-center rounded-[9px] border-[3px]"
        :class="t.claimed || t.progress >= t.target ? 'border-sky-500 bg-sky-500' : 'border-night-600'"
      >
        <svg v-if="t.claimed || t.progress >= t.target" width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
          <path d="M2 7l3.5 3.5L12 3" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </span>
      <span class="min-w-0 text-[13px] leading-tight font-extrabold" :class="t.claimed && 'opacity-60'">
        {{ title(t.code).title }}
        <small class="block text-[11px] font-bold text-night-300">
          {{ t.claimed ? 'Награда получена' : `${title(t.code).hint}${title(t.code).hint ? ' · ' : ''}${Math.min(t.progress, t.target)} из ${t.target}` }}
        </small>
        <span v-if="!t.claimed && t.progress < t.target" class="mt-1.5 block h-[5px] overflow-hidden rounded-full bg-night-700">
          <i class="block h-full bg-gold-400" :style="{ width: pct(t) + '%' }" />
        </span>
      </span>
      <button
        v-if="ready(t)"
        type="button"
        class="chunky chunky-gold flex items-center gap-1 px-3 py-1.5 text-xs"
        :disabled="claiming === t.code"
        @click="$emit('claim', t.code)"
      >
        Забрать +{{ num(t.reward) }}
        <Art name="coin" class="size-4" />
      </button>
      <span v-else class="flex items-center gap-0.5 text-[13px] font-black text-gold-400" :class="t.claimed && 'opacity-50'">
        +{{ num(t.reward) }}
        <Art name="coin" class="size-4" />
      </span>
    </div>
  </section>
</template>
