<script setup lang="ts">
const emit = defineEmits<{ key: [letter: string]; del: [] }>();
const LETTERS = ['ә', 'ғ', 'қ', 'ң', 'ө', 'ұ', 'ү', 'і', 'һ'];
</script>

<template>
  <div class="grid grid-cols-5 gap-2" aria-label="Казахские буквы">
    <button
      v-for="l in LETTERS"
      :key="l"
      type="button"
      class="h-12 rounded-key bg-key text-title3 text-label shadow-[0_3px_0_var(--k-key-shade)] transition-transform active:translate-y-[2px] active:shadow-[0_1px_0_var(--k-key-shade)]"
      @pointerdown.prevent
      @click="emit('key', l)"
    >
      {{ l }}
    </button>
    <button
      type="button"
      class="grid h-12 place-items-center rounded-key bg-surface-2 text-label shadow-[0_3px_0_var(--k-surface-shade)] transition-transform active:translate-y-[2px] active:shadow-[0_1px_0_var(--k-surface-shade)]"
      aria-label="Стереть"
      @pointerdown.prevent
      @click="emit('del')"
    >
      <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M9 5h11v14H9l-6-7z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" />
        <path d="M12 9.5l5 5M17 9.5l-5 5" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
      </svg>
    </button>
  </div>
</template>
