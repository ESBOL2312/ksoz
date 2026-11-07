<script setup lang="ts">
const emit = defineEmits<{ key: [letter: string]; del: [] }>();
const LETTERS = ['ә', 'ғ', 'қ', 'ң', 'ө', 'ұ', 'ү', 'і', 'һ'];
</script>

<template>
  <div class="grid grid-cols-5 gap-[7px]">
    <button
      v-for="l in LETTERS"
      :key="l"
      type="button"
      class="h-11 rounded-xl bg-milk font-display text-[19px] font-bold text-ink shadow-[0_4px_0_var(--color-milk-2)] transition-transform active:translate-y-[3px] active:shadow-[0_1px_0_var(--color-milk-2)]"
      @pointerdown.prevent
      @click="emit('key', l)"
    >
      {{ l }}
    </button>
    <button
      type="button"
      class="h-11 rounded-xl bg-night-800 font-display text-base font-bold text-white shadow-[0_4px_0_#0e1838] transition-transform active:translate-y-[3px] active:shadow-[0_1px_0_#0e1838]"
      aria-label="Стереть"
      @pointerdown.prevent
      @click="emit('del')"
    >
      ⌫
    </button>
  </div>
</template>
