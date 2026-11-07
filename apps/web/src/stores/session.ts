import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { DEV_USER } from '@/api/http';
import { cloudGet, cloudSet, getWebApp, initWebApp } from '@/telegram';

const ONBOARDED_KEY = 'ksoz_onboarded';

/** Telegram-контекст и флаги клиента. Серверные данные (me, home) — в TanStack Query. */
export const useSessionStore = defineStore('session', () => {
  const inTelegram = ref(false);
  const platform = ref('web');
  const startParam = ref<string | null>(null);
  const unauthorized = ref(false);
  const onboarded = ref<boolean | null>(null);

  /** Telegram id: из initDataUnsafe (только для ключей localStorage; сервер берёт id из подписи). */
  const userKey = computed(() => String(getWebApp()?.initDataUnsafe.user?.id ?? `dev${DEV_USER}`));

  async function init() {
    const wa = initWebApp();
    inTelegram.value = !!wa;
    platform.value = wa?.platform ?? 'web';
    startParam.value = wa?.initDataUnsafe.start_param ?? null;
    onboarded.value = (await cloudGet(ONBOARDED_KEY)) === '1';
  }

  async function markOnboarded() {
    onboarded.value = true;
    await cloudSet(ONBOARDED_KEY, '1');
  }

  return { inTelegram, platform, startParam, unauthorized, onboarded, userKey, init, markOnboarded };
});
