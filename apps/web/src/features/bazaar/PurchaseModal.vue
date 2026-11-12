<script setup lang="ts">
import type { BazaarItem } from '@/api/endpoints';
import Art from '@/shared/art/Art.vue';
import { artForItem } from '@/shared/art/art';
import { num } from '@/shared/format';

defineProps<{ item: BazaarItem | null; pending?: boolean }>();
const open = defineModel<boolean>('open', { required: true });
defineEmits<{ confirm: [] }>();
</script>

<template>
  <UModal v-model:open="open" title="Покупка" :description="item ? `${item.kk}, ${item.ru}` : ''" :ui="{ content: 'bg-surface text-label', header: 'hidden' }">
    <template #body>
      <div v-if="item" class="grid gap-3 text-center">
        <div class="mx-auto grid h-28 w-40 place-items-center rounded-card bg-surface-2">
          <img v-if="item.image_url" :src="item.image_url" :alt="item.kk" class="max-h-24 object-contain" />
          <Art v-else :name="artForItem(item.kk, item.category)" class="h-24 w-full" />
        </div>
        <div>
          <div class="text-title2">{{ item.kk }}</div>
          <div class="text-body text-label-2">{{ item.ru }}</div>
        </div>
        <p class="text-subhead text-label-2">После покупки слово «{{ item.kk }}» попадёт в повторы: спросим через 20 минут.</p>
        <div class="grid gap-1">
          <button type="button" class="btn btn-primary w-full" :disabled="pending" @click="$emit('confirm')">
            Купить за {{ num(item.price) }}
            <Art name="coin" class="size-5" />
          </button>
          <button type="button" class="btn-plain w-full" @click="open = false">Отмена</button>
        </div>
      </div>
    </template>
  </UModal>
</template>
