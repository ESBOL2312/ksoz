<script setup lang="ts">
import Art from '@/shared/art/Art.vue';
import { num } from '@/shared/format';

defineProps<{ value: number | null | undefined }>();
</script>

<template>
  <span
    class="inline-flex items-center gap-1.5 rounded-full bg-night-900/85 py-1 pr-3 pl-1 text-sm font-black tabular-nums text-white"
    aria-label="Алтын"
  >
    <Art name="coin" class="size-6" />
    {{ value == null ? '…' : num(value) }}
  </span>
</template>
