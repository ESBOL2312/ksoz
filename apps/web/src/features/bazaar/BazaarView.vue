<script setup lang="ts">
import { computed, ref } from 'vue';
import { useToast } from '@nuxt/ui/composables';
import { ApiError } from '@/api/http';
import { useBazaar, useHome } from '@/api/queries';
import { useEquip, usePurchase } from '@/api/mutations';
import type { BazaarItem } from '@/api/endpoints';
import { haptics } from '@/telegram';
import CoinPill from '@/shared/ui/CoinPill.vue';
import Barys from '@/shared/mascot/Barys.vue';
import { wearFrom } from '@/shared/mascot/mascot';
import { CATEGORY_LABELS, num } from '@/shared/format';
import ItemCard from './ItemCard.vue';
import PurchaseModal from './PurchaseModal.vue';

const toast = useToast();
const { data, isPending, isError, refetch, isFetching } = useBazaar();
const { data: home } = useHome();
const purchase = usePurchase();
const equip = useEquip();

const cat = ref<'all' | keyof typeof CATEGORY_LABELS>('all');
const cats = [['all', 'Всё'], ...Object.entries(CATEGORY_LABELS)] as [string, string][];
const items = computed(() => data.value?.items ?? []);
const shown = computed(() => (cat.value === 'all' ? items.value : items.value.filter((i) => i.category === cat.value)));
const worn = computed(() => items.value.filter((i) => i.equipped));
const balance = computed(() => home.value?.altyn);
const wear = computed(() => wearFrom(worn.value));

const picked = ref<BazaarItem | null>(null);
const modalOpen = ref(false);
const equipBusyId = ref<number | null>(null);

function onSelect(item: BazaarItem) {
  if (item.status === 'locked_by_level') {
    haptics.warning();
    toast.add({ title: `Откроется с уровня ${item.min_level}`, description: 'Учи слова, и уровень вырастет.', color: 'warning' });
    return;
  }
  if (item.status === 'owned') {
    equipBusyId.value = item.id;
    equip.mutate(
      { itemId: item.id, equipped: !item.equipped },
      {
        onSuccess: () => haptics.select(),
        onError: () => { haptics.error(); toast.add({ title: 'Не получилось надеть', description: 'Попробуй ещё раз.', color: 'error' }); },
        onSettled: () => { equipBusyId.value = null; },
      },
    );
    return;
  }
  if (balance.value != null && balance.value < item.price) {
    haptics.error();
    toast.add({ title: `Не хватает ${num(item.price - balance.value)} алтына.`, description: 'Пройди урок, чтобы заработать.', color: 'error' });
    return;
  }
  picked.value = item;
  modalOpen.value = true;
}

function confirm() {
  const item = picked.value;
  if (!item) return;
  purchase.mutate(item.id, {
    onSuccess: () => {
      haptics.success();
      modalOpen.value = false;
      toast.add({ title: `${item.kk} теперь твой · новое слово в повторах`, color: 'success' });
    },
    onError: (e) => {
      haptics.error();
      modalOpen.value = false;
      const code = e instanceof ApiError ? e.code : '';
      const title =
        code === 'insufficient_altyn' ? 'Не хватает алтына. Пройди урок, чтобы заработать.'
        : code === 'already_owned' ? 'Эта вещь уже у тебя'
        : e instanceof ApiError && (e.status === 403 || e.status === 409) ? 'Эта вещь пока недоступна'
        : 'Не получилось купить. Попробуй ещё раз.';
      toast.add({ title, color: 'error' });
      void refetch();
    },
  });
}
</script>

<template>
  <div class="pb-4">
    <div class="flex items-center gap-2 px-3.5 py-2.5">
      <h1 class="font-display text-xl font-black text-gold-400">Базар</h1>
      <span class="flex-1" />
      <CoinPill :value="balance" />
    </div>

    <div class="showcase mx-3.5 grid grid-cols-[124px_1fr] items-end gap-3 overflow-hidden rounded-[22px] px-2 pt-3">
      <Barys mood="idle" v-bind="wear" class="-mb-1 w-[124px]" label="Твой Барыс" />
      <div class="grid gap-2 pb-4">
        <h2 class="font-display text-base font-bold text-white">Твой Барыс</h2>
        <div v-if="worn.length" class="flex flex-wrap gap-1.5">
          <span v-for="w in worn" :key="w.id" class="rounded-[9px] bg-milk px-2 py-0.5 text-xs font-extrabold text-ink">
            {{ w.kk }} <em class="font-bold text-ink-2 not-italic">{{ w.ru }}</em>
          </span>
        </div>
        <p v-else class="text-xs font-bold text-sky-100">Купи тақию или шапан, и Барыс сразу их наденет</p>
      </div>
    </div>

    <div class="flex gap-1.5 overflow-x-auto px-3.5 pt-3 pb-1 [scrollbar-width:none]" role="tablist">
      <button
        v-for="[key, label] in cats"
        :key="key"
        type="button"
        role="tab"
        :aria-selected="cat === key"
        class="flex-none rounded-full px-3.5 py-1.5 text-[13px] font-extrabold"
        :class="cat === key ? 'bg-gold-400 text-ink' : 'bg-night-800 text-night-200'"
        @click="cat = key as typeof cat"
      >
        {{ label }}
      </button>
    </div>
    <p class="mx-3.5 mt-1.5 text-xs font-bold text-night-300">Каждая покупка добавляет её слово в твои повторы.</p>

    <div v-if="isPending" class="grid grid-cols-2 gap-2.5 px-3.5 pt-2.5">
      <USkeleton v-for="n in 6" :key="n" class="h-[190px] rounded-[20px]" />
    </div>
    <div v-else-if="isError" class="mx-3.5 mt-4 grid gap-3 rounded-2xl bg-night-800 p-4 text-center">
      <p class="font-bold">Не удалось загрузить базар.</p>
      <button type="button" class="chunky chunky-gold px-4 py-2.5 text-sm" :disabled="isFetching" @click="refetch()">Повторить</button>
    </div>
    <div v-else-if="!shown.length" class="px-3.5 pt-6 text-center text-sm font-bold text-night-300">Здесь пока пусто.</div>
    <div v-else class="grid grid-cols-2 gap-2.5 px-3.5 pt-2.5">
      <ItemCard v-for="i in shown" :key="i.id" :item="i" :busy="equipBusyId === i.id" @select="onSelect(i)" />
    </div>

    <PurchaseModal v-model:open="modalOpen" :item="picked" :pending="purchase.isPending.value" @confirm="confirm" />
  </div>
</template>

<style scoped>
.showcase {
  background:
    radial-gradient(circle at 22% 70%, rgba(255, 255, 255, 0.28), transparent 45%),
    linear-gradient(160deg, #3fb6dc, #1f7fae);
  box-shadow: 0 5px 0 #165767;
}
</style>
