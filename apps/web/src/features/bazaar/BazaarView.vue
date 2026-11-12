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
  <div class="pb-6">
    <div class="flex items-center gap-2 px-4 pt-3 pb-2">
      <h1 class="flex-1 text-large-title">Базар</h1>
      <CoinPill :value="balance" />
    </div>

    <section class="mx-4 flex h-[104px] items-end gap-2 overflow-hidden rounded-card bg-surface pr-4 pl-1">
      <Barys mood="idle" v-bind="wear" class="-mb-5 w-[100px] shrink-0" label="Твой Барыс" />
      <div class="grid gap-1.5 self-center">
        <h2 class="text-headline">Твой Барыс</h2>
        <div v-if="worn.length" class="flex flex-wrap gap-1.5">
          <span v-for="w in worn" :key="w.id" class="rounded-md bg-surface-2 px-2 py-0.5 text-footnote">{{ w.kk }} · {{ w.ru }}</span>
        </div>
        <p v-else class="text-footnote text-label-2">Купи тақию или шапан, и Барыс сразу их наденет</p>
      </div>
    </section>

    <div class="segmented mx-4 mt-4" role="tablist" aria-label="Категории">
      <button
        v-for="[key, label] in cats"
        :key="key"
        type="button"
        role="tab"
        class="segment"
        :aria-selected="cat === key"
        @click="cat = key as typeof cat"
      >
        {{ label }}
      </button>
    </div>
    <p class="mx-4 mt-2 mb-3 text-footnote text-label-3">Каждая покупка добавляет её слово в твои повторы.</p>

    <div v-if="isPending" class="grid grid-cols-2 gap-3 px-4">
      <USkeleton v-for="n in 6" :key="n" class="h-[216px] rounded-card" />
    </div>
    <div v-else-if="isError" class="mx-4 grid gap-4 rounded-card bg-surface p-5 text-center">
      <p class="text-body">Не удалось загрузить базар.</p>
      <button type="button" class="btn btn-primary w-full" :disabled="isFetching" @click="refetch()">Повторить</button>
    </div>
    <p v-else-if="!shown.length" class="px-4 pt-6 text-center text-body text-label-2">Здесь пока пусто.</p>
    <div v-else class="grid grid-cols-2 gap-3 px-4">
      <ItemCard v-for="i in shown" :key="i.id" :item="i" :busy="equipBusyId === i.id" @select="onSelect(i)" />
    </div>

    <PurchaseModal v-model:open="modalOpen" :item="picked" :pending="purchase.isPending.value" @confirm="confirm" />
  </div>
</template>
