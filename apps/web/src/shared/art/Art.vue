<script setup lang="ts">
import { ART, type ArtName } from './art';

defineProps<{ name: ArtName; label?: string }>();
</script>

<template>
  <svg :viewBox="ART[name]" :role="label ? 'img' : undefined" :aria-label="label" :aria-hidden="label ? undefined : 'true'">
    <use :href="`#art-${name}`" />
  </svg>
</template>
