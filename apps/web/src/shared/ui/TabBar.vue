<script setup lang="ts">
import { useRoute } from 'vue-router';
import Art from '@/shared/art/Art.vue';
import type { ArtName } from '@/shared/art/art';
import { haptics } from '@/telegram';

const route = useRoute();
const tabs: { to: string; name: string; label: string; icon: ArtName }[] = [
  { to: '/', name: 'aul', label: 'Ауыл', icon: 'i-aul' },
  { to: '/lesson', name: 'lesson', label: 'Сабақ', icon: 'i-lesson' },
  { to: '/bazaar', name: 'bazaar', label: 'Базар', icon: 'i-bazaar' },
  { to: '/baige', name: 'baige', label: 'Бәйге', icon: 'i-baige' },
];
</script>

<template>
  <nav
    class="grid grid-cols-4 rounded-t-[22px] border-t border-white/10 bg-night-950/95 px-2 pt-2 text-night-300 shadow-[0_-8px_24px_rgba(5,10,30,0.45)] backdrop-blur-md"
    style="padding-bottom: calc(10px + var(--tg-safe-bottom))"
    aria-label="Разделы"
  >
    <RouterLink
      v-for="t in tabs"
      :key="t.name"
      :to="t.to"
      class="grid justify-items-center gap-1 py-1 text-[11px] font-extrabold transition-colors"
      :class="route.name === t.name ? 'text-gold-400' : ''"
      :aria-current="route.name === t.name ? 'page' : undefined"
      @click="haptics.select()"
    >
      <span
        class="grid h-8 w-14 place-items-center rounded-full transition-all duration-200"
        :class="route.name === t.name ? 'bg-gold-400 text-night-950 shadow-[0_3px_0_var(--color-gold-600)]' : ''"
      >
        <Art :name="t.icon" class="size-6" />
      </span>
      {{ t.label }}
    </RouterLink>
  </nav>
</template>
