<!--
  Тропа квеста: остановки-шаги змейкой сверху вниз. Пройденные — зелёные с галочкой,
  текущая — синяя с пульсом и Барысом рядом, закрытые — серые с замком. В конце — юрта-цель.
-->
<script setup lang="ts">
import type { QuestSummary } from '@ksoz/shared';
import { computed } from 'vue';
import Art from '@/shared/art/Art.vue';
import Barys from '@/shared/mascot/Barys.vue';
import { trailPath, trailPoints } from './logic';

const props = defineProps<{ quest: QuestSummary; hat?: boolean; coat?: boolean; boots?: boolean }>();
const emit = defineEmits<{ open: [n: number]; locked: [n: number] }>();

const points = computed(() => trailPoints(props.quest.steps.length + 1));
const stops = computed(() => props.quest.steps.map((s, i) => ({ ...s, ...points.value[i]! })));
const height = computed(() => (points.value.at(-1)?.y ?? 0) + 72);
const fullPath = computed(() => trailPath(points.value));
/** Пройденная часть тропы: до текущей остановки (или до юрты, если квест пройден). */
const donePath = computed(() => {
  const cur = props.quest.steps.findIndex((s) => s.status === 'current');
  const upto = props.quest.completed ? points.value.length : cur < 0 ? 0 : cur + 1;
  return trailPath(points.value.slice(0, upto));
});
const goal = computed(() => points.value.at(-1)!);
const blocked = computed(() => props.quest.current_blocked === 'daily_limit');

function tap(s: (typeof stops.value)[number]) {
  if (s.status === 'locked') emit('locked', s.n);
  else emit('open', s.n);
}
</script>

<template>
  <div class="relative w-full" :style="{ height: `${height}px` }">
    <svg class="absolute inset-0 size-full" :viewBox="`0 0 100 ${height}`" preserveAspectRatio="none" aria-hidden="true">
      <path :d="fullPath" fill="none" stroke="var(--k-surface-shade)" stroke-width="10" stroke-linecap="round" vector-effect="non-scaling-stroke" />
      <path
        :d="fullPath"
        fill="none"
        stroke="var(--k-surface)"
        stroke-width="3"
        stroke-dasharray="2 12"
        stroke-linecap="round"
        vector-effect="non-scaling-stroke"
      />
      <path v-if="donePath" :d="donePath" fill="none" stroke="var(--k-ok)" stroke-width="10" stroke-linecap="round" vector-effect="non-scaling-stroke" />
    </svg>

    <ol class="contents">
      <li
        v-for="s in stops"
        :key="s.n"
        class="absolute flex w-[58%] items-center gap-3"
        :class="s.x < 50 ? 'flex-row' : 'flex-row-reverse text-right'"
        :style="{ top: `${s.y}px`, left: s.x < 50 ? `calc(${s.x}% - 32px)` : undefined, right: s.x >= 50 ? `calc(${100 - s.x}% - 32px)` : undefined, transform: 'translateY(-50%)' }"
        :data-current="s.status === 'current' || undefined"
      >
        <button
          type="button"
          class="stop relative grid size-16 shrink-0 place-items-center rounded-full text-title2"
          :class="`is-${s.status}`"
          :aria-label="`Шаг ${s.n}: ${s.title_kk}, ${s.title_ru}. ${s.status === 'done' ? 'Пройден' : s.status === 'current' ? (blocked ? 'Откроется завтра' : 'Текущий') : 'Закрыт'}`"
          :aria-current="s.status === 'current' ? 'step' : undefined"
          @click="tap(s)"
        >
          <span v-if="s.status === 'current' && !blocked" class="pulse absolute inset-0 rounded-full" aria-hidden="true" />
          <svg v-if="s.status === 'done'" class="size-7" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
          <svg v-else-if="s.status === 'locked'" class="size-6" viewBox="0 0 24 24" aria-hidden="true">
            <rect x="5" y="10.5" width="14" height="10" rx="2.5" fill="currentColor" />
            <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" fill="none" stroke="currentColor" stroke-width="2.4" />
          </svg>
          <span v-else class="relative">{{ s.n }}</span>
          <span
            v-if="s.status === 'current' && blocked"
            class="absolute -bottom-2 rounded-full bg-altyn px-2 py-px text-caption2 text-on-altyn"
            aria-hidden="true"
          >завтра</span>
        </button>
        <span class="grid min-w-0 gap-0.5">
          <b class="text-headline break-words" :class="s.status === 'locked' && 'text-label-3'">{{ s.title_kk }}</b>
          <span class="text-footnote break-words" :class="s.status === 'locked' ? 'text-label-3' : 'text-label-2'">{{ s.title_ru }}</span>
        </span>
        <Barys
          v-if="s.status === 'current'"
          :mood="blocked ? 'sleep' : 'wave'"
          :hat="hat"
          :coat="coat"
          :boots="boots"
          :animated="false"
          class="barys-bob pointer-events-none absolute -top-2 w-14"
          :class="s.x < 50 ? '-left-14' : '-right-14'"
        />
      </li>
    </ol>

    <div
      class="absolute grid -translate-x-1/2 -translate-y-1/2 justify-items-center gap-0.5 text-center"
      :style="{ top: `${goal.y}px`, left: `${goal.x}%` }"
      :aria-label="quest.completed ? 'Цель достигнута' : 'Цель квеста'"
    >
      <Art name="yurt" class="w-24" :class="!quest.completed && 'opacity-60 grayscale'" />
      <span class="text-caption1 text-label-2">{{ quest.completed ? 'Пройдено!' : 'Мақсат' }}</span>
    </div>
  </div>
</template>

<style scoped>
.stop {
  font-weight: 700;
  transition: transform 0.08s;
}
.stop:active {
  transform: translateY(2px) scale(0.96);
}
.is-done {
  background: var(--k-ok);
  color: var(--k-on-ok);
  box-shadow: 0 4px 0 color-mix(in srgb, var(--k-ok) 60%, black);
}
.is-current {
  background: var(--k-accent);
  color: var(--k-on-accent);
  box-shadow: 0 4px 0 var(--k-accent-shade);
}
.is-locked {
  background: var(--k-surface-2);
  color: var(--k-label-3);
  box-shadow: 0 4px 0 var(--k-surface-shade);
}
.pulse {
  border: 3px solid var(--k-accent);
  animation: pulse 1.8s ease-out infinite;
}
@keyframes pulse {
  0% {
    opacity: 0.8;
    transform: scale(1);
  }
  100% {
    opacity: 0;
    transform: scale(1.55);
  }
}
.barys-bob {
  animation: bob 2.4s ease-in-out infinite;
}
</style>
