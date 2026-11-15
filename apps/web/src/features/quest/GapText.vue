<!-- Фраза с пропуском ___. С answer — пропуск заполнен (со строчной буквы в середине фразы). -->
<script setup lang="ts">
import { computed } from 'vue';
import { answerInText, splitGap } from './logic';

const props = defineProps<{ text: string; answer?: string | null }>();
const parts = computed(() => splitGap(props.text));
const filled = computed(() => (props.answer ? answerInText(props.text, props.answer) : null));
</script>

<template>
  <p class="text-title2 leading-snug break-words">
    <template v-if="parts">
      {{ parts.before
      }}<span
        v-if="filled"
        class="gap-fill text-word underline [text-decoration-skip-ink:none] decoration-altyn decoration-[3px] underline-offset-4"
        >{{ filled }}</span
      ><span v-else class="mx-0.5 inline-block w-16 translate-y-1 border-b-[3px] border-accent" aria-label="пропуск" />{{ parts.after }}
    </template>
    <template v-else>{{ text }}</template>
  </p>
</template>

<style scoped>
.gap-fill {
  display: inline-block;
  animation: drop-in 0.25s ease-out;
}
@keyframes drop-in {
  from {
    opacity: 0;
    transform: translateY(-6px);
  }
}
</style>
