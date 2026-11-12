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
  <!-- Таб-бар iOS: только навигация, всегда с подписями, выбранная вкладка окрашена акцентом -->
  <nav
    class="grid grid-cols-4 border-t border-separator bg-bar px-2 pt-1.5 text-label-3 backdrop-blur-md"
    style="padding-bottom: calc(4px + var(--tg-safe-bottom))"
    aria-label="Разделы"
  >
    <RouterLink
      v-for="t in tabs"
      :key="t.name"
      :to="t.to"
      class="grid min-h-[49px] content-center justify-items-center gap-0.5 text-caption2 transition-colors"
      :class="route.name === t.name ? 'text-tint' : ''"
      :aria-current="route.name === t.name ? 'page' : undefined"
      @click="haptics.select()"
    >
      <Art :name="t.icon" class="size-[26px]" />
      {{ t.label }}
    </RouterLink>
  </nav>
</template>
