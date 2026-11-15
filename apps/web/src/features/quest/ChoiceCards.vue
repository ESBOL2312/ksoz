<!--
  Варианты ответа карточками. После выбора: верная — зелёная, неверно выбранная — красная
  с дрожью, остальные гаснут. Пока сервер проверяет (correct = null), выбранная подсвечена синим.
-->
<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(
  defineProps<{
    options: readonly string[];
    picked: string | null;
    /** верный вариант; null — ещё неизвестен (повтор ждёт ответ сервера) */
    correct: string | null;
    disabled?: boolean;
    /** казахские варианты крупнее и с цветом слова */
    lang?: 'kk' | 'ru';
    /** уже выбранные неверные (в диалоге можно выбрать ещё раз) */
    wrong?: readonly string[];
    label?: string;
  }>(),
  { disabled: false, lang: 'kk', wrong: () => [], label: 'Варианты ответа' },
);
const emit = defineEmits<{ pick: [option: string] }>();

/** Длинные фразы — в один столбец, короткие слова — сеткой 2×2. */
const wide = computed(() => props.options.some((o) => [...o].length > 14));
const answered = computed(() => props.picked != null && props.correct != null);

type State = 'idle' | 'pending' | 'right' | 'wrong' | 'dim';
function state(o: string): State {
  if (props.wrong.includes(o)) return 'wrong';
  if (!answered.value) return props.picked === o ? 'pending' : 'idle';
  if (o === props.correct) return 'right';
  if (o === props.picked) return 'wrong';
  return 'dim';
}
const locked = computed(() => props.disabled || props.picked != null);
</script>

<template>
  <div class="grid gap-2.5" :class="wide ? 'grid-cols-1' : 'grid-cols-2'" role="group" :aria-label="label">
    <button
      v-for="o in options"
      :key="o"
      type="button"
      class="choice"
      :class="[`is-${state(o)}`, lang === 'kk' ? 'text-title3' : 'text-headline', wide ? 'min-h-14 justify-start text-left' : 'min-h-[4.5rem] justify-center text-center']"
      :disabled="locked || state(o) === 'wrong'"
      :aria-pressed="picked === o"
      @click="emit('pick', o)"
    >
      <span class="min-w-0 break-words">{{ o }}</span>
      <svg v-if="state(o) === 'right'" class="mark size-5 shrink-0" viewBox="0 0 24 24" aria-label="верно">
        <path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
      <svg v-else-if="state(o) === 'wrong'" class="mark size-5 shrink-0" viewBox="0 0 24 24" aria-label="неверно">
        <path d="M7 7l10 10M17 7L7 17" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" />
      </svg>
    </button>
  </div>
</template>

<style scoped>
.choice {
  position: relative;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 28px 10px 14px;
  border-radius: var(--radius-card);
  border: 2px solid var(--k-separator);
  background: var(--k-surface);
  color: var(--k-label);
  font-weight: 600;
  box-shadow: 0 3px 0 var(--k-surface-shade);
  transition:
    transform 0.08s,
    opacity 0.2s;
}
.choice:active:not(:disabled) {
  transform: translateY(2px) scale(0.98);
}
/* значок не сдвигает текст: в сетке слово остаётся по центру */
.mark {
  position: absolute;
  top: 8px;
  right: 8px;
}
.choice:disabled {
  cursor: default;
}
.is-pending {
  border-color: var(--k-accent);
  color: var(--k-word);
}
.is-right {
  border-color: var(--k-ok);
  color: var(--k-ok-label);
  animation: pop 0.32s ease-out;
}
.is-wrong {
  border-color: var(--k-danger);
  color: var(--k-danger);
  animation: shake 0.35s;
}
.is-dim {
  opacity: 0.45;
}
@keyframes pop {
  40% {
    transform: scale(1.04);
  }
}
</style>
