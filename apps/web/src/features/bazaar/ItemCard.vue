<script setup lang="ts">
import type { BazaarItem } from '@/api/endpoints';
import Art from '@/shared/art/Art.vue';
import { artForItem } from '@/shared/art/art';
import { num } from '@/shared/format';

defineProps<{ item: BazaarItem; busy?: boolean }>();
defineEmits<{ select: [] }>();
</script>

<template>
  <div class="card-milk relative grid gap-1 rounded-[20px] p-2.5 text-left" :class="{ 'opacity-90': item.status === 'locked_by_level' }">
    <div class="grid h-[84px] place-items-center overflow-hidden rounded-[14px] bg-milk-2" :class="{ 'grayscale brightness-[.6]': item.status === 'locked_by_level' }">
      <img v-if="item.image_url" :src="item.image_url" :alt="item.kk" class="max-h-[74px] max-w-[90%] object-contain" />
      <Art v-else :name="artForItem(item.kk, item.category)" class="max-h-[74px] max-w-[90%] h-[74px] w-full" />
    </div>
    <b class="font-display text-sm leading-tight font-bold">{{ item.kk }}</b>
    <span class="-mt-0.5 text-xs font-bold text-ink-2">{{ item.ru }}</span>
    <button
      type="button"
      class="chunky mt-1 flex min-h-9 items-center justify-center gap-1.5 rounded-xl px-2 py-1.5 text-sm font-black tabular-nums"
      :class="{
        'chunky-gold': item.status === 'available',
        'chunky-sky': item.status === 'owned',
        'bg-ink-2 text-white shadow-[0_3px_0_#3a3556]': item.status === 'locked_by_level',
      }"
      :disabled="busy"
      @click="$emit('select')"
    >
      <template v-if="item.status === 'owned'">{{ item.equipped ? 'Надето' : 'Надеть' }}</template>
      <template v-else-if="item.status === 'locked_by_level'">С уровня {{ item.min_level }}</template>
      <template v-else>
        <Art name="coin" class="size-[18px]" />{{ num(item.price) }}
      </template>
    </button>
  </div>
</template>
