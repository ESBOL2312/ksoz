<script setup lang="ts">
import { useQueryClient } from '@tanstack/vue-query';
import { computed, onBeforeUnmount, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { invalidateAfterLesson, isDevFallback, onUnauthorized, useMe, usePatchMe } from '@/api';
import ArtSprite from '@/shared/art/ArtSprite.vue';
import Barys from '@/shared/mascot/Barys.vue';
import TabBar from '@/shared/ui/TabBar.vue';
import { useOutboxStore } from '@/stores/outbox';
import { useSessionStore } from '@/stores/session';

const session = useSessionStore();
const outbox = useOutboxStore();
const route = useRoute();
const router = useRouter();
const qc = useQueryClient();

const blocked = computed(() => !session.inTelegram && !isDevFallback());
const botLink = `https://t.me/${import.meta.env.VITE_BOT_USERNAME || 'ksoz_bot'}`;

const me = useMe();
const patchMe = usePatchMe();

// Часовой пояс устройства: день, серия и задания считаются по нему
watch(
  () => me.data.value,
  (m) => {
    if (!m) return;
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz && tz !== m.timezone && !patchMe.isPending.value) patchMe.mutate({ timezone: tz });
  },
  { once: true },
);

// Первый вход: выбор уровня и перенос прогресса прототипа
watch(
  () => [session.onboarded, me.data.value] as const,
  ([onboarded, m]) => {
    if (onboarded === false && m && route.name !== 'welcome') void router.replace('/welcome');
  },
  { immediate: true },
);

async function flushOutbox() {
  if (document.visibilityState !== 'visible') return;
  if ((await outbox.flush()) > 0) invalidateAfterLesson(qc);
}

let offUnauthorized: () => void = () => {};
onMounted(() => {
  offUnauthorized = onUnauthorized(() => (session.unauthorized = true));
  window.addEventListener('online', flushOutbox);
  document.addEventListener('visibilitychange', flushOutbox);
  void flushOutbox();
});
onBeforeUnmount(() => {
  offUnauthorized();
  window.removeEventListener('online', flushOutbox);
  document.removeEventListener('visibilitychange', flushOutbox);
});
</script>

<template>
  <UApp :toaster="{ position: 'top-center', duration: 2600 }">
    <ArtSprite />

    <main
      v-if="blocked || session.unauthorized"
      class="grid min-h-dvh place-content-center justify-items-center gap-4 px-6 text-center"
    >
      <Barys :mood="session.unauthorized ? 'sleep' : 'wave'" class="w-40" />
      <h1 class="font-display text-2xl font-black text-gold-400">Сөз ауылы</h1>
      <p class="max-w-xs text-night-200">
        {{
          session.unauthorized
            ? 'Сессия истекла. Закройте миниапп и откройте его снова из бота.'
            : 'Миниапп работает внутри Telegram. Откройте его через бота.'
        }}
      </p>
      <a v-if="!session.unauthorized" :href="botLink" class="chunky chunky-gold px-6 py-3">Открыть бота</a>
    </main>

    <div v-else class="flex min-h-dvh flex-col" style="padding-top: var(--tg-safe-top)">
      <div class="flex-1">
        <RouterView v-slot="{ Component }">
          <Transition name="fade" mode="out-in">
            <component :is="Component" />
          </Transition>
        </RouterView>
      </div>
      <TabBar v-if="route.meta.tabs" class="sticky bottom-0 z-10" />
    </div>
  </UApp>
</template>

<style>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.12s;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
