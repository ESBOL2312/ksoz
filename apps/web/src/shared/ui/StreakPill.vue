<script setup lang="ts">
import Art from '@/shared/art/Art.vue';
import { days } from '@/shared/format';

defineProps<{ value: number }>();
</script>

<template>
  <span class="inline-flex h-8 items-center gap-1 rounded-full bg-surface pr-3 pl-2 text-subhead font-semibold" :aria-label="`Серия: ${days(value)}`">
    <Art name="flame" class="size-5" />
    {{ days(value) }}
  </span>
</template>
