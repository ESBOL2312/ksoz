<script setup lang="ts">
import Art from '@/shared/art/Art.vue';

/** blanks: вместо перевода показать «_ _ _» по длине слова (в повторе перевод уже есть под картинкой). */
defineProps<{ imageUrl: string | null; ru: string; tall?: boolean; blanks?: number }>();
</script>

<template>
  <div class="relative overflow-hidden" :class="tall ? 'h-44' : 'h-[150px]'">
    <img v-if="imageUrl" :src="imageUrl" :alt="ru" class="size-full object-cover" />
    <div v-else class="ornament grid size-full place-items-center">
      <Art name="horn" class="absolute -left-4 -top-3 size-24 rotate-[-12deg] text-gold-400/25" style="color: #f2b42c" />
      <Art name="horn" class="absolute -bottom-5 -right-3 size-28 rotate-[14deg] text-gold-400/25" style="color: #f2b42c" />
      <span class="relative font-display text-2xl font-black text-white drop-shadow-[0_3px_0_rgba(14,24,56,0.6)]" :class="blanks ? 'tracking-[0.3em]' : ''">{{
        blanks ? '_'.repeat(Math.min(blanks, 14)) : ru
      }}</span>
    </div>
  </div>
</template>

<style scoped>
.ornament {
  background:
    url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='48' height='48' viewBox='0 0 64 64'%3E%3Cpath d='M32 52V36c0-10-10-15-16-10-4 4-1 10 4 8M32 36c0-10 10-15 16-10 4 4 1 10-4 8M32 20V12' fill='none' stroke='%23F2B42C' stroke-opacity='.22' stroke-width='3' stroke-linecap='round'/%3E%3C/svg%3E"),
    linear-gradient(135deg, #203272, #2b5fb8);
}
</style>
