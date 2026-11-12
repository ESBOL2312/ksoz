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
  <section class="mx-4 mt-6">
    <h2 class="mb-2 text-title3">Задания на сегодня</h2>
    <p v-if="!tasks.length" class="rounded-card bg-surface px-4 py-3 text-body text-label-2">Заданий пока нет. Загляни завтра.</p>
    <ul v-else class="group-list">
      <li v-for="t in tasks" :key="t.code" class="flex min-h-[60px] items-center gap-3 py-2.5 pr-3 pl-4">
        <span
          class="grid size-6 shrink-0 place-items-center rounded-full"
          :class="t.claimed ? 'bg-surface-2 text-label-3' : t.progress >= t.target ? 'bg-ok text-on-ok' : 'border-2 border-label-3'"
          aria-hidden="true"
        >
          <svg v-if="t.claimed || t.progress >= t.target" width="14" height="14" viewBox="0 0 14 14">
            <path d="M2 7l3.5 3.5L12 3" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </span>
        <span class="grid min-w-0 flex-1 gap-0.5">
          <span class="text-body" :class="t.claimed && 'text-label-2'">{{ title(t.code).title }}</span>
          <span v-if="t.claimed" class="text-footnote text-label-3">Награда получена</span>
          <span v-else-if="t.progress >= t.target" class="text-footnote text-label-3">Готово, {{ t.target }} из {{ t.target }}</span>
          <span v-else class="flex items-center gap-2">
            <span class="h-1 flex-1 overflow-hidden rounded-full bg-surface-2"><i class="block h-full bg-altyn" :style="{ width: pct(t) + '%' }" /></span>
            <span class="text-footnote text-label-3 tabular-nums">{{ t.progress }} из {{ t.target }}</span>
          </span>
        </span>
        <button
          v-if="ready(t)"
          type="button"
          class="btn btn-reward min-h-9 shrink-0 rounded-key px-3 text-subhead"
          :disabled="claiming === t.code"
          @click="$emit('claim', t.code)"
        >
          Забрать +{{ num(t.reward) }}
        </button>
        <span v-else-if="!t.claimed" class="flex shrink-0 items-center gap-1 text-subhead font-semibold text-altyn-label">
          +{{ num(t.reward) }}<Art name="coin" class="size-4" label="алтын" />
        </span>
      </li>
    </ul>
  </section>
</template>
