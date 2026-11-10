<script setup lang="ts">
import Barys from '@/shared/mascot/Barys.vue';

/** blanks: вместо перевода показать «_ _ _» по длине слова (в повторе перевод уже есть под картинкой). */
defineProps<{ imageUrl: string | null; ru: string; tall?: boolean; blanks?: number }>();
</script>

<template>
  <div class="relative overflow-hidden" :class="tall ? 'h-44' : 'h-[150px]'">
    <img v-if="imageUrl" :src="imageUrl" :alt="ru" class="size-full object-cover" />
    <div v-else class="ornament relative grid size-full place-items-center pr-20">
      <span
        class="relative px-4 text-center font-display text-2xl font-black text-white drop-shadow-[0_3px_0_rgba(14,40,70,0.45)]"
        :class="blanks ? 'tracking-[0.3em]' : ''"
        >{{ blanks ? '_'.repeat(Math.min(blanks, 14)) : ru }}</span
      >
      <Barys
        :mood="blanks ? 'think' : 'idle'"
        :animated="false"
        class="absolute -right-3 w-[120px]"
        :class="tall ? '-bottom-10' : '-bottom-12'"
      />
    </div>
  </div>
</template>

<style scoped>
.ornament {
  background:
    url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='48' height='48' viewBox='0 0 64 64'%3E%3Cpath d='M32 52V36c0-10-10-15-16-10-4 4-1 10 4 8M32 36c0-10 10-15 16-10 4 4 1 10-4 8M32 20V12' fill='none' stroke='%23ffffff' stroke-opacity='.16' stroke-width='3' stroke-linecap='round'/%3E%3C/svg%3E"),
    radial-gradient(circle at 80% 100%, rgba(255, 255, 255, 0.35), transparent 50%),
    linear-gradient(150deg, #3fb6dc, #1f7fae);
}
</style>
