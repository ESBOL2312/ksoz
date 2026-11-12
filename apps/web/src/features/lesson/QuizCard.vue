<script setup lang="ts">
import type { LessonCard } from '@ksoz/shared';
import { computed, nextTick, ref, watch } from 'vue';
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
  lesson.round === 'practice'
    ? 'Закрепление'
    : props.card.phase === 'learning'
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
  // Фокус только по тапу пользователя: если поле не в фокусе, кнопки букв
  // дописывают в конец и не открывают системную клавиатуру.
  const focused = !!el && document.activeElement === el;
  const v = lesson.input;
  const a = focused ? (el.selectionStart ?? v.length) : v.length;
  const b = focused ? (el.selectionEnd ?? v.length) : v.length;
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
  if (!focused) return;
  await nextTick();
  el.setSelectionRange(pos, pos);
}

const canCheck = computed(() => !!lesson.input.trim() && !lesson.busy);
function submit() {
  if (canCheck.value) void lesson.check();
}
</script>

<template>
  <div class="flex flex-1 flex-col gap-3">
    <div class="flex items-center justify-between gap-2">
      <span class="text-footnote text-label-2">Слово {{ lesson.index + 1 }} из {{ lesson.total }}</span>
      <span class="rounded-full bg-surface-2 px-2.5 py-0.5 text-footnote font-medium">{{ chip }}</span>
    </div>

    <article class="flex items-stretch overflow-hidden rounded-card bg-surface">
      <WordPic :image-url="card.image_url" :ru="card.ru" compact />
      <div class="grid content-center gap-0.5 p-4">
        <span class="text-footnote text-label-2">Напиши по-казахски</span>
        <b class="text-title2">{{ card.ru }}</b>
        <span class="text-footnote tracking-[0.3em] text-label-2" :aria-label="`${card.length} ${plural(card.length, ['буква', 'буквы', 'букв'])}`">{{
          '_'.repeat(Math.min(card.length, 14))
        }}</span>
      </div>
    </article>

    <div class="grid gap-1.5">
      <label for="quiz-answer" class="text-footnote text-label-2">Ответ</label>
      <div
        class="flex h-14 items-center gap-2 rounded-control border-2 bg-surface px-3.5"
        :class="[errorText ? 'border-danger' : 'border-accent', shake ? 'animate-[shake_0.35s]' : '']"
        @animationend="shake = false"
      >
        <input
          id="quiz-answer"
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
          placeholder="Напиши слово"
          class="min-w-0 flex-1 bg-transparent text-title2 font-semibold text-label caret-accent outline-none placeholder:font-normal placeholder:text-label-3"
          @keydown.enter.prevent="submit"
        />
        <span class="shrink-0 whitespace-nowrap text-footnote text-label-2">{{ lenText }}</span>
      </div>
      <p class="min-h-[18px] text-center text-footnote text-danger" aria-live="polite">{{ errorText }}</p>
    </div>

    <KazakhKeys @key="(l) => put(l)" @del="put('', true)" />

    <div class="mt-auto grid grid-cols-[auto_1fr] gap-3 pt-1">
      <button type="button" class="btn btn-secondary font-medium" :disabled="lesson.busy" @pointerdown.prevent @click="lesson.hint()">
        <Art name="horn" class="size-5 text-altyn-label" />Подсказка
      </button>
      <button type="button" class="btn btn-primary" :disabled="!canCheck" @pointerdown.prevent @click="submit">Тексеру</button>
    </div>
  </div>
</template>
