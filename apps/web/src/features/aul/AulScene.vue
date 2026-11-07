<script setup lang="ts">
import Art from '@/shared/art/Art.vue';

defineProps<{ extraYurt: boolean; extraHorse: boolean; tag: string }>();
</script>

<template>
  <div class="scene" aria-hidden="true">
    <div class="sun" />
    <svg class="hills" viewBox="0 0 360 160" preserveAspectRatio="none">
      <path d="M0 70 Q60 30 130 60 T260 50 T360 60 V160 H0Z" fill="#B68B4C" opacity=".55" />
      <path d="M0 100 Q90 70 180 92 T360 86 V160 H0Z" fill="#8FB04F" />
      <path d="M0 130 Q120 110 240 124 T360 120 V160 H0Z" fill="#7DAA45" />
    </svg>
    <Art v-if="extraYurt" name="yurt" class="yurt2" />
    <Art name="yurt" class="ghost" />
    <Art name="yurt" class="yurt" />
    <Art name="horse" class="horse" />
    <Art v-if="extraHorse" name="horse" class="horse2" />
    <Art name="hero" class="hero" />
    <div class="tag" v-html="tag" />
  </div>
</template>

<style scoped>
.scene {
  position: relative;
  height: 300px;
  overflow: hidden;
}
.sun {
  position: absolute;
  left: 50%;
  top: 50px;
  width: 120px;
  height: 120px;
  margin-left: -60px;
  border-radius: 50%;
  background: radial-gradient(circle, #fff3c4 0 45%, rgba(255, 243, 196, 0) 70%);
}
.hills {
  position: absolute;
  inset: auto 0 0 0;
  width: 100%;
  height: 160px;
}
.yurt { position: absolute; left: 118px; bottom: 58px; width: 170px; }
.yurt2 { position: absolute; left: -20px; bottom: 86px; width: 90px; opacity: 0.85; }
.ghost { position: absolute; right: -14px; bottom: 88px; width: 80px; opacity: 0.5; }
.horse { position: absolute; left: 14px; bottom: 36px; width: 96px; }
.horse2 { position: absolute; left: 150px; bottom: 14px; width: 60px; transform: scaleX(-1); opacity: 0.9; }
.hero { position: absolute; left: 96px; bottom: 22px; width: 84px; animation: bob 2.4s ease-in-out infinite; }
.tag {
  position: absolute;
  right: 16px;
  bottom: 120px;
  max-width: 55%;
  background: var(--color-milk);
  color: var(--color-ink);
  border-radius: 12px;
  padding: 6px 10px;
  font-size: 12px;
  font-weight: 800;
  box-shadow: 0 3px 0 var(--color-milk-2);
}
.tag::after {
  content: '';
  position: absolute;
  left: 18px;
  bottom: -6px;
  border: 6px solid transparent;
  border-top-color: var(--color-milk);
  border-bottom: 0;
}
.tag :deep(i) { font-style: normal; color: var(--color-felt-600); }
</style>
