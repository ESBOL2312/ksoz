<script setup lang="ts">
import type { BazaarItem } from '@/api/endpoints';
import Art from '@/shared/art/Art.vue';
import { artForItem } from '@/shared/art/art';
import { num } from '@/shared/format';

defineProps<{ item: BazaarItem; busy?: boolean }>();
defineEmits<{ select: [] }>();
</script>

<template>
  <div class="grid content-start gap-0.5 rounded-card bg-surface p-2">
    <div class="mb-1.5 grid h-[88px] place-items-center overflow-hidden rounded-control bg-surface-2">
      <img
        v-if="item.image_url"
        :src="item.image_url"
        :alt="item.kk"
        class="max-h-[74px] max-w-[90%] object-contain"
        :class="{ 'opacity-50 grayscale': item.status === 'locked_by_level' }"
      />
      <Art v-else :name="artForItem(item.kk, item.category)" class="h-[74px] w-full" :class="{ 'opacity-50 grayscale': item.status === 'locked_by_level' }" />
    </div>
    <b class="text-headline">{{ item.kk }}</b>
    <span class="text-footnote text-label-2">{{ item.ru }}</span>
    <button
      type="button"
      class="btn mt-1.5 min-h-11 px-2 text-subhead tabular-nums"
      :class="{
        'btn-primary': item.status === 'available',
        'bg-ok text-on-ok': item.status === 'owned' && item.equipped,
        'btn-secondary': item.status === 'owned' && !item.equipped,
        'bg-surface-2 text-label-2': item.status === 'locked_by_level',
      }"
      :disabled="busy"
      :aria-label="item.status === 'available' ? `Купить за ${num(item.price)} алтын` : undefined"
      @click="$emit('select')"
    >
      <template v-if="item.status === 'owned'">
        <svg v-if="item.equipped" width="16" height="16" viewBox="0 0 14 14" aria-hidden="true">
          <path d="M2 7l3.5 3.5L12 3" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
        {{ item.equipped ? 'Надето' : 'Надеть' }}
      </template>
      <template v-else-if="item.status === 'locked_by_level'">
        <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
          <rect x="5" y="11" width="14" height="10" rx="2" fill="none" stroke="currentColor" stroke-width="2" />
          <path d="M8 11V8a4 4 0 0 1 8 0v3" fill="none" stroke="currentColor" stroke-width="2" />
        </svg>
        С уровня {{ item.min_level }}
      </template>
      <template v-else><Art name="coin" class="size-5" />{{ num(item.price) }}</template>
    </button>
  </div>
</template>
