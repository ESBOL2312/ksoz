import type { ReviewBody, ReviewResponse } from '@ksoz/shared';
import { defineStore } from 'pinia';
import { computed, ref, watch } from 'vue';
import { api } from '@/api/endpoints';
import { ApiError } from '@/api/http';
import { getWebApp, safeLocal, supports } from '@/telegram';
import { useSessionStore } from './session';

export type PendingReview = Required<ReviewBody>;

/**
 * Ответы, которые ещё не дошли до сервера. Хранятся в localStorage и досылаются
 * с тем же client_id: сервер идемпотентен и не начислит алтын дважды.
 */
export const useOutboxStore = defineStore('outbox', () => {
  const session = useSessionStore();
  const storageKey = computed(() => `ksoz.outbox.${session.userKey}`);
  const items = ref<PendingReview[]>(load(storageKey.value));
  const flushing = ref(false);

  watch(storageKey, (k) => (items.value = load(k)));
  watch(
    items,
    (list) => {
      safeLocal(() => localStorage.setItem(storageKey.value, JSON.stringify(list)));
      // пока есть неотправленные ответы, Telegram спросит перед закрытием
      if (supports('6.2')) {
        const wa = getWebApp()!;
        if (list.length) wa.enableClosingConfirmation();
        else wa.disableClosingConfirmation();
      }
    },
    { deep: true },
  );

  function remove(clientId: string) {
    items.value = items.value.filter((i) => i.client_id !== clientId);
  }

  /**
   * Отправляет ответ. Ответ сервера → ReviewResponse. Сбой сети или 5xx → null (ответ остался в очереди).
   * 4xx → ответ выкидывается из очереди, ошибка пробрасывается.
   */
  async function submit(body: PendingReview): Promise<ReviewResponse | null> {
    items.value = [...items.value, body];
    try {
      const res = await api.review(body);
      remove(body.client_id);
      return res;
    } catch (e) {
      if (e instanceof ApiError && !e.isNetwork && e.status !== 429) {
        remove(body.client_id);
        throw e;
      }
      return null;
    }
  }

  /** Досылает очередь по одному. Возвращает число отправленных. */
  async function flush(): Promise<number> {
    if (flushing.value || !items.value.length) return 0;
    flushing.value = true;
    let sent = 0;
    try {
      for (const item of [...items.value]) {
        try {
          await api.review(item);
          remove(item.client_id);
          sent++;
        } catch (e) {
          if (e instanceof ApiError && (e.isNetwork || e.status === 429)) break;
          remove(item.client_id); // 4xx: слово удалено и т.п., повтор не поможет
        }
      }
    } finally {
      flushing.value = false;
    }
    return sent;
  }

  return { items, flushing, submit, flush, remove };
});

function load(key: string): PendingReview[] {
  const raw = safeLocal(() => localStorage.getItem(key));
  if (!raw) return [];
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}
