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
    class="grid grid-cols-4 border-t-3 border-gold-400 bg-milk px-2 pt-2 text-ink-2"
    style="padding-bottom: calc(10px + var(--tg-safe-bottom))"
    aria-label="Разделы"
  >
    <RouterLink
      v-for="t in tabs"
      :key="t.name"
      :to="t.to"
      class="grid justify-items-center gap-0.5 rounded-xl py-1 text-[11px] font-extrabold transition-transform"
      :class="route.name === t.name ? 'text-felt-600 [&>svg]:-translate-y-0.5' : ''"
      :aria-current="route.name === t.name ? 'page' : undefined"
      @click="haptics.select()"
    >
      <Art :name="t.icon" class="size-6.5" />
      {{ t.label }}
    </RouterLink>
  </nav>
</template>
