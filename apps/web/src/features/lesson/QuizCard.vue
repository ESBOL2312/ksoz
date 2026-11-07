<script setup lang="ts">
import type { LessonCard } from '@ksoz/shared';
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import Art from '@/shared/art/Art.vue';
import { plural, STEP_LABELS } from '@/shared/format';
import { haptics } from '@/telegram';
import { useLessonStore } from '@/stores/lesson';
import KazakhKeys from './KazakhKeys.vue';
import WordPic from './WordPic.vue';

const props = defineProps<{ card: LessonCard }>();
const lesson = useLessonStore();
const field = ref<HTMLInputElement | null>(null);
const shake = ref(false);

const chip = computed(() =>
  props.card.phase === 'learning'
    ? `Повтор ${props.card.step + 1} из 4 · ${STEP_LABELS[props.card.step] ?? ''}`
    : 'Повторение',
);
const left = computed(() => props.card.length - [...lesson.input].length);
const lenText = computed(() =>
  left.value > 0 ? `ещё ${left.value} ${plural(left.value, ['буква', 'буквы', 'букв'])}` : 'готово',
);
const errorText = computed(() =>
  lesson.error === 'network' ? 'Нет связи. Проверь сеть и попробуй ещё раз.' : lesson.error ? 'Не получилось проверить. Попробуй ещё раз.' : '',
);

onMounted(() => field.value?.focus({ preventScroll: true }));
watch(
  () => lesson.error,
  (e) => {
    if (!e) return;
    shake.value = false;
    void nextTick(() => (shake.value = true));
  },
);

async function put(text: string, del = false) {
  const el = field.value;
  const v = lesson.input;
  const a = el?.selectionStart ?? v.length;
  const b = el?.selectionEnd ?? v.length;
  let pos: number;
  if (del) {
    const from = a === b ? Math.max(0, a - 1) : a;
    lesson.input = v.slice(0, from) + v.slice(b);
    pos = from;
  } else {
    lesson.input = v.slice(0, a) + text + v.slice(b);
    pos = a + text.length;
  }
  haptics.select();
  await nextTick();
  el?.focus({ preventScroll: true });
  el?.setSelectionRange(pos, pos);
}

const canCheck = computed(() => !!lesson.input.trim() && !lesson.busy);
function submit() {
  if (canCheck.value) void lesson.check();
}
</script>

<template>
  <div class="flex flex-1 flex-col gap-3">
    <div class="flex items-center justify-between text-xs font-extrabold text-night-200">
      <span>Слово {{ lesson.index + 1 }} из {{ lesson.total }}</span>
      <span class="rounded-full bg-felt-600 px-2.5 py-[3px] text-white">{{ chip }}</span>
    </div>

    <div class="card-milk overflow-hidden rounded-3xl" style="box-shadow: 0 6px 0 var(--color-milk-2)">
      <WordPic :image-url="card.image_url" :ru="card.ru" :blanks="card.length" />
      <div class="grid gap-0.5 px-4 pb-3.5 pt-3">
        <small class="text-xs font-extrabold text-ink-2">Напиши по-казахски</small>
        <b class="font-display text-[22px] font-bold">{{ card.ru }}</b>
      </div>
    </div>

    <div>
      <div
        class="flex h-14 items-center gap-2 rounded-2xl border-[3px] bg-white px-3.5 text-ink"
        :class="[errorText ? 'border-felt-600' : 'border-sky-500', shake ? 'animate-[shake_0.35s]' : '']"
        @animationend="shake = false"
      >
        <input
          ref="field"
          v-model="lesson.input"
          type="text"
          inputmode="text"
          enterkeyhint="done"
          autocapitalize="off"
          autocorrect="off"
          spellcheck="false"
          autocomplete="off"
          aria-label="Ответ по-казахски"
          class="min-w-0 flex-1 bg-transparent font-display text-[22px] font-bold tracking-[0.02em] text-ink caret-felt-600 outline-none"
          @keydown.enter.prevent="submit"
        />
        <span class="shrink-0 whitespace-nowrap text-xs font-extrabold text-ink-2">{{ lenText }}</span>
      </div>
      <div class="min-h-[18px] pt-1 text-center text-xs font-extrabold text-felt-300">{{ errorText }}</div>
    </div>

    <KazakhKeys @key="(l) => put(l)" @del="put('', true)" />

    <div class="mt-auto grid grid-cols-[auto_1fr] gap-2.5 pt-1">
      <button
        type="button"
        class="chunky chunky-night flex items-center gap-1.5 px-4 text-[13px] font-black"
        :disabled="lesson.busy"
        @pointerdown.prevent
        @click="lesson.hint()"
      >
        <Art name="horn" class="size-[18px]" style="color: #f2b42c" />Подсказка
      </button>
      <button
        type="button"
        class="chunky chunky-sky px-4 py-[15px] text-[15px]"
        :disabled="!canCheck"
        @pointerdown.prevent
        @click="submit"
      >
        Тексеру
      </button>
    </div>
  </div>
</template>
