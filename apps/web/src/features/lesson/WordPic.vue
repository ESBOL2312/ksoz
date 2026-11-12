<script setup lang="ts">
import Barys from '@/shared/mascot/Barys.vue';

/** compact: узкая картинка слева от вопроса (в повторе), tall: высокая шапка карточки нового слова. */
defineProps<{ imageUrl: string | null; ru: string; tall?: boolean; compact?: boolean }>();
</script>

<template>
  <div class="relative shrink-0 overflow-hidden bg-sky-art" :class="compact ? 'w-28' : tall ? 'h-44' : 'h-[150px]'">
    <img v-if="imageUrl" :src="imageUrl" :alt="ru" class="size-full object-cover" />
    <div v-else-if="compact" class="grid size-full min-h-[112px] place-items-center">
      <Barys mood="think" :animated="false" class="w-24 translate-y-4" />
    </div>
    <div v-else class="relative grid size-full place-items-center pr-20">
      <div class="absolute inset-x-0 -bottom-16 h-28 rounded-[50%] bg-[#9cc25a]" aria-hidden="true" />
      <span class="relative px-4 text-center text-title2 text-white drop-shadow-[0_2px_0_rgba(8,38,59,0.45)]">{{ ru }}</span>
      <Barys mood="idle" :animated="false" class="absolute -right-3 w-[120px]" :class="tall ? '-bottom-10' : '-bottom-12'" />
    </div>
  </div>
</template>
