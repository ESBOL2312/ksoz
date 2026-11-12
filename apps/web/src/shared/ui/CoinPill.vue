<script setup lang="ts">
import Art from '@/shared/art/Art.vue';
import { num } from '@/shared/format';

defineProps<{ value: number | null | undefined }>();
</script>

<template>
  <span
    class="inline-flex h-8 items-center gap-1.5 rounded-full bg-surface pr-3 pl-1.5 text-subhead font-semibold tabular-nums"
    :aria-label="value == null ? 'Алтын' : `Алтын: ${num(value)}`"
  >
    <Art name="coin" class="size-[22px]" />
    {{ value == null ? '…' : num(value) }}
  </span>
</template>
