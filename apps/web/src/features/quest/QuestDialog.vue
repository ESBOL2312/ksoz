<!--
  Итоговый диалог последнего шага: реплики жителя появляются по одной, на своих
  репликах пользователь выбирает верный ответ карточкой.
-->
<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue';
import Barys from '@/shared/mascot/Barys.vue';
import { useQuestStore } from '@/stores/quest';
import ChoiceCards from './ChoiceCards.vue';

const quest = useQuestStore();
const npc = computed(() => quest.step?.npc ?? 'Житель аула');
const lines = computed(() => quest.step?.dialog.slice(0, quest.dialogShown) ?? []);
const waiting = computed(() => quest.dialogLine?.who === 'npc');
const reduced = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

const end = ref<HTMLElement | null>(null);
let timer: ReturnType<typeof setTimeout> | undefined;

watch(
  () => [quest.dialogShown, quest.stage] as const,
  () => {
    clearTimeout(timer);
    if (quest.stage === 'dialog' && waiting.value) {
      // первая реплика сразу, дальше — пауза «печатает…»
      timer = setTimeout(() => quest.revealNpc(), quest.dialogShown === 0 ? 400 : reduced ? 500 : 1100);
    }
    void nextTick(() => end.value?.scrollIntoView({ block: 'end', behavior: reduced ? 'auto' : 'smooth' }));
  },
  { immediate: true },
);
onBeforeUnmount(() => clearTimeout(timer));
</script>

<template>
  <div class="flex flex-1 flex-col gap-3">
    <div class="flex items-center gap-3 rounded-card bg-surface p-3">
      <span class="grid size-11 shrink-0 place-items-center rounded-full bg-kok-600 text-headline text-white" aria-hidden="true">{{ npc.charAt(0) }}</span>
      <div class="grid">
        <b class="text-headline">{{ npc }}</b>
        <span class="text-footnote text-label-2">Твой первый разговор: выбирай свои реплики</span>
      </div>
    </div>

    <ol class="grid content-start gap-2" aria-live="polite" aria-label="Диалог">
      <li v-for="(l, i) in lines" :key="i" class="bubble-in flex" :class="l.who === 'me' ? 'justify-end' : 'justify-start'">
        <div
          class="grid max-w-[82%] gap-0.5 px-3.5 py-2"
          :class="l.who === 'me' ? 'rounded-[18px] rounded-br-md bg-accent text-on-accent' : 'rounded-[18px] rounded-bl-md bg-surface'"
        >
          <span v-if="l.who === 'npc'" class="text-caption1 text-label-2">{{ npc }}</span>
          <span class="text-body font-medium">{{ l.kk }}</span>
          <span class="text-footnote" :class="l.who === 'me' ? 'opacity-80' : 'text-label-2'">{{ l.ru }}</span>
        </div>
      </li>
      <li v-if="waiting && quest.dialogShown > 0" class="flex justify-start" aria-label="печатает">
        <span class="typing flex gap-1 rounded-[18px] rounded-bl-md bg-surface px-4 py-3"><i /><i /><i /></span>
      </li>
    </ol>
    <div ref="end" />

    <div class="mt-auto grid gap-2 pt-2">
      <template v-if="quest.dialogLine?.who === 'me'">
        <p class="text-center text-footnote text-label-2">Что ответишь?</p>
        <ChoiceCards
          :key="quest.dialogShown"
          :options="quest.dialogOptions[quest.dialogShown] ?? []"
          :picked="null"
          :correct="null"
          :wrong="quest.dialogWrong"
          label="Твой ответ"
          @pick="quest.pickDialog"
        />
        <p class="min-h-[18px] text-center text-footnote text-danger" aria-live="polite">
          {{ quest.dialogWrong.length ? 'Не совсем. Попробуй другой ответ' : '' }}
        </p>
      </template>
      <template v-else-if="quest.dialogDone">
        <div class="flex items-center justify-center gap-2">
          <Barys mood="happy" class="w-16" />
          <p class="text-headline">Ты поговорил сам!</p>
        </div>
        <button type="button" class="btn btn-primary w-full" :disabled="quest.busy" @click="quest.finish()">Аяқтау</button>
      </template>
    </div>
  </div>
</template>

<style scoped>
.bubble-in {
  animation: bubble 0.28s ease-out both;
}
@keyframes bubble {
  from {
    opacity: 0;
    transform: translateY(8px) scale(0.96);
  }
}
.typing i {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--k-label-3);
  animation: dot 1s infinite ease-in-out;
}
.typing i:nth-child(2) {
  animation-delay: 0.15s;
}
.typing i:nth-child(3) {
  animation-delay: 0.3s;
}
@keyframes dot {
  50% {
    opacity: 0.35;
    transform: translateY(-3px);
  }
}
</style>
