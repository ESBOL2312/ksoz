<!-- Монетки и конфетти при завершении шага. Только transform/opacity; при reduced-motion скрыто. -->
<script setup lang="ts">
import Art from '@/shared/art/Art.vue';

const COINS = Array.from({ length: 10 }, (_, i) => {
  const a = (i / 10) * Math.PI * 2 + 0.3;
  const r = 70 + (i % 3) * 22;
  return { x: Math.round(Math.cos(a) * r), y: Math.round(Math.sin(a) * r * 0.8 - 30), d: (i % 4) * 60 };
});
const COLORS = ['#fec50c', '#3cb4e7', '#34c759', '#ff8a80', '#ffd84a', '#0a72b5'];
const CONFETTI = Array.from({ length: 16 }, (_, i) => {
  const a = (i / 16) * Math.PI * 2;
  const r = 90 + (i % 4) * 18;
  return { x: Math.round(Math.cos(a) * r), y: Math.round(Math.sin(a) * r - 40), rot: (i * 47) % 360, c: COLORS[i % COLORS.length], d: (i % 5) * 40 };
});
</script>

<template>
  <div class="burst pointer-events-none absolute inset-0 overflow-visible" aria-hidden="true">
    <i
      v-for="(p, i) in CONFETTI"
      :key="`c${i}`"
      class="confetti"
      :style="{ '--x': `${p.x}px`, '--y': `${p.y}px`, '--r': `${p.rot}deg`, background: p.c, animationDelay: `${p.d}ms` }"
    />
    <span v-for="(p, i) in COINS" :key="i" class="coin" :style="{ '--x': `${p.x}px`, '--y': `${p.y}px`, animationDelay: `${p.d}ms` }">
      <Art name="coin" class="size-6" />
    </span>
  </div>
</template>

<style scoped>
.coin,
.confetti {
  position: absolute;
  top: 45%;
  left: 50%;
  opacity: 0;
  animation: burst 1.3s cubic-bezier(0.2, 0.7, 0.3, 1) forwards;
}
.confetti {
  width: 7px;
  height: 11px;
  border-radius: 2px;
}
@keyframes burst {
  0% {
    opacity: 0;
    transform: translate(-50%, -50%) scale(0.4);
  }
  15% {
    opacity: 1;
  }
  70% {
    opacity: 1;
    transform: translate(calc(-50% + var(--x)), calc(-50% + var(--y))) rotate(var(--r, 0deg)) scale(1);
  }
  100% {
    opacity: 0;
    transform: translate(calc(-50% + var(--x)), calc(-50% + var(--y) + 40px)) rotate(var(--r, 0deg)) scale(0.9);
  }
}
@media (prefers-reduced-motion: reduce) {
  .burst {
    display: none;
  }
}
</style>
