<script setup lang="ts">
import Art from '@/shared/art/Art.vue';
import { days } from '@/shared/format';

defineProps<{ value: number }>();
</script>

<template>
  <span class="inline-flex items-center gap-1.5 rounded-full bg-night-900/85 py-1 pr-3 pl-1.5 text-sm font-black text-white">
    <Art name="flame" class="size-5" />
    {{ days(value) }}
  </span>
</template>
