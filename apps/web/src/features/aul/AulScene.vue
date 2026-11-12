<script setup lang="ts">
import { computed } from 'vue';
import Art from '@/shared/art/Art.vue';
import Barys from '@/shared/mascot/Barys.vue';
import type { BarysMood, BarysWear } from '@/shared/mascot/mascot';
import { sceneFrom } from '@/shared/mascot/mascot';
import { useSky } from '@/shared/sky/sky';

const props = defineProps<{
  stage: number;
  equipped: readonly { kk: string; slot: string }[];
  wear: BarysWear;
  mood: BarysMood;
  /** реплика Барыса; <i>…</i> выделяется */
  say: string;
}>();

const scene = computed(() => sceneFrom(props.equipped));
/** Юрты растут вместе с аулом: 0 — пустая степь с костром, дальше по одной. */
const yurts = computed(() => Math.min(3, props.stage) + (scene.value.house ? 1 : 0));
const far = computed(() => Math.max(0, Math.min(4, props.stage - 3)));

// Небо живёт по местному времени: рассвет, день, закат, ночь
const sky = useSky();
const PHASES = ['dawn', 'day', 'dusk', 'night'] as const;
const night = computed(() => sky.value.phase === 'night');
/** дуга: x — доля ширины, y — высота над горизонтом (0..1) → top в px */
const orb = (o: { x: number; y: number }) => ({ left: `calc(${o.x * 100}% - 32px)`, top: `${132 - o.y * 92}px` });

// Звёзды: детерминированная россыпь, чтобы не прыгали при перерисовке
const stars = Array.from({ length: 46 }, (_, i) => {
  const r = (n: number) => ((Math.sin(i * 12.9898 + n * 78.233) * 43758.5453) % 1 + 1) % 1;
  return { x: r(1) * 100, y: r(2) * 150, s: 1 + r(3) * 2.2, d: r(4) * 4 };
});
const fireflies = [
  { x: 30, y: 60, d: 0 },
  { x: 62, y: 34, d: 1.3 },
  { x: 86, y: 70, d: 2.1 },
  { x: 18, y: 28, d: 2.8 },
];
</script>

<template>
  <div class="scene" :class="`is-${sky.phase}`" :data-phase="sky.phase" aria-hidden="true">
    <!-- небо: четыре слоя, активный проявляется плавно -->
    <div v-for="p in PHASES" :key="p" class="sky" :class="[`sky-${p}`, { on: sky.phase === p }]" />

    <!-- звёзды и падающая звезда -->
    <div class="stars" :class="{ on: night || sky.phase === 'dusk' }">
      <i v-for="(st, i) in stars" :key="i" :style="{ left: st.x + '%', top: st.y + 'px', width: st.s + 'px', height: st.s + 'px', animationDelay: st.d + 's' }" />
      <b class="shooting" />
    </div>

    <!-- солнце и луна идут по дуге -->
    <div v-if="sky.sun" class="sun" :style="orb(sky.sun)" />
    <svg v-if="sky.moon" class="moon" :style="orb(sky.moon)" viewBox="0 0 64 64">
      <mask id="aul-moon-mask">
        <rect width="64" height="64" fill="#fff" />
        <circle cx="44" cy="24" r="19" fill="#000" />
      </mask>
      <circle cx="32" cy="32" r="22" fill="#FFF6D8" mask="url(#aul-moon-mask)" />
      <circle cx="22" cy="38" r="3" fill="#EADFB8" />
      <circle cx="27" cy="46" r="2" fill="#EADFB8" />
    </svg>
    <svg class="cloud c1" viewBox="0 0 120 40"><path d="M14 36h92a14 14 0 0 0-6-27 22 22 0 0 0-40-6 16 16 0 0 0-28 9 12 12 0 0 0-18 24z" fill="var(--cloud)" /></svg>
    <svg class="cloud c2" viewBox="0 0 120 40"><path d="M14 36h92a14 14 0 0 0-6-27 22 22 0 0 0-40-6 16 16 0 0 0-28 9 12 12 0 0 0-18 24z" fill="var(--cloud)" /></svg>

    <!-- горы Алатау -->
    <svg class="layer mountains" viewBox="0 0 400 140" preserveAspectRatio="none">
      <path d="M0 140V78L46 40l30 22 48-52 44 44 26-18 52 46 40-40 50 34 34-20 30 22v84Z" style="fill: var(--m1)" />
      <path d="M124 10l-22 24 10-2 8 8 10-10 12 8 6-4zM248 34l-16 16 8-1 8 6 8-6 10 4zM46 40l-18 15 9-1 7 5 8-6 8 3z" style="fill: var(--snow)" />
      <path d="M0 140V100l40-26 40 20 56-34 50 30 44-22 60 32 44-18 66 26v32Z" style="fill: var(--m2)" />
      <path d="M136 60l-14 10 7 0 6 4 6-4 8 2zM296 66l-12 9 7-1 5 3 6-3 7 1z" style="fill: var(--snow2)" />
    </svg>

    <!-- холмы -->
    <svg class="layer hills" viewBox="0 0 400 120" preserveAspectRatio="none">
      <path d="M0 40 Q80 10 170 34 T400 26 V120 H0Z" style="fill: var(--h1)" />
      <path d="M0 74 Q110 46 220 66 T400 60 V120 H0Z" style="fill: var(--h2)" />
      <path d="M0 98 Q140 82 260 94 T400 90 V120 H0Z" style="fill: var(--h3)" />
    </svg>

    <!-- дальние юрты большого аула -->
    <Art v-for="n in far" :key="'f' + n" name="yurt" class="far" :style="{ left: `${4 + (n - 1) * 15}%` }" />

    <!-- юрты -->
    <Art v-if="yurts >= 3" name="yurt" class="yurt y3" />
    <Art v-if="yurts >= 2" name="yurt" class="yurt y2" />
    <Art v-if="yurts >= 1" name="yurt" class="yurt y1" />
    <Art v-if="yurts >= 4" name="yurt" class="yurt y4" />
    <svg v-if="yurts === 0" class="fire" viewBox="0 0 60 60">
      <ellipse cx="30" cy="52" rx="22" ry="5" fill="#000" opacity=".15" />
      <path d="M12 52l36-10M12 42l36 10" stroke="#6E3A1E" stroke-width="6" stroke-linecap="round" />
      <path class="flame" d="M30 8c4 10 14 14 14 26a14 14 0 0 1-28 0c0-7 4-11 7-14 0 5 2 7 4 7 0-7-2-12 3-19z" fill="#FF7A2F" />
      <path d="M30 26c2 5 7 7 7 12a7 7 0 0 1-14 0c0-3 2-5 3-6 1 2 2 3 4 3 0-3-1-6 0-9z" fill="#FFD25A" />
    </svg>

    <!-- животные и вещи -->
    <Art v-if="scene.horse" name="horse" class="horse" />
    <Art v-if="scene.sheep" name="sheep" class="sheep" />
    <Art v-if="scene.tea" name="tea" class="tea" />

    <Barys class="barys" :mood="mood" v-bind="wear" />
    <Art v-if="scene.cat" name="cat" class="cat" />

    <!-- сумеречный свет поверх сцены, свет из юрты и светлячки ночью -->
    <div class="tint" />
    <div v-if="night && yurts >= 1" class="glow" />
    <template v-if="night">
      <i v-for="(f, i) in fireflies" :key="'ff' + i" class="firefly" :style="{ left: f.x + '%', bottom: f.y + 'px', animationDelay: f.d + 's' }" />
    </template>

    <div class="bubble" v-html="say" />
  </div>
</template>

<style scoped>
.scene {
  position: relative;
  height: 340px;
  overflow: hidden;
  --m1: #9db8cc;
  --m2: #7e9db6;
  --snow: #fff;
  --snow2: #eaf2f7;
  --h1: #9cc25a;
  --h2: #84b24a;
  --h3: #74a23f;
  --cloud: #fff;
  --tint: transparent;

  background: #4bb8de;
}
.scene.is-dawn {
  --m1: #a49ac0; --m2: #8380ae; --snow: #ffe9e4; --snow2: #f6d9dc;
  --h1: #9ab85c; --h2: #80a24a; --h3: #6f933f; --cloud: #ffd9d2;
  --tint: rgba(120, 60, 120, 0.1);
}
.scene.is-dusk {
  --m1: #8a76a6; --m2: #6a5f92; --snow: #ffd6c4; --snow2: #f1c2bd;
  --h1: #869e4c; --h2: #6d8a40; --h3: #5c7a36; --cloud: #ffc2a8;
  --tint: rgba(110, 30, 60, 0.16);

}
.scene.is-night {
  --m1: #2f4170; --m2: #22325c; --snow: #c4d2ee; --snow2: #9fb2da;
  --h1: #35543a; --h2: #2b4731; --h3: #223a28; --cloud: #4b5a8c;
  --tint: rgba(8, 14, 48, 0.42);

}
.mountains path, .hills path, .cloud path { transition: fill 1.2s; }

.sky { position: absolute; inset: 0; opacity: 0; transition: opacity 1.5s; }
.sky.on { opacity: 1; }
.sky-dawn { background: linear-gradient(#3b4f9c 0, #9a7fc0 30%, #f39fae 55%, #ffd29a 78%); }
.sky-day { background: linear-gradient(#4bb8de 0, #8fd3ec 38%, #d9f0f2 62%, #fde7b8 80%); }
.sky-dusk { background: linear-gradient(#22306e 0, #6a4c9c 28%, #e0688a 52%, #ffb066 76%); }
.sky-night { background: radial-gradient(ellipse at 70% 0%, #2a3f86 0, transparent 60%), linear-gradient(#070d29 0, #111c4a 45%, #1d2d63 75%); }

.stars { position: absolute; inset: 0; opacity: 0; transition: opacity 1.5s; }
.stars.on { opacity: 1; }
.is-dusk .stars { opacity: 0.45; }
.stars i { position: absolute; border-radius: 50%; background: #fff; box-shadow: 0 0 4px #fff; animation: twinkle 3.2s ease-in-out infinite; }
.shooting {
  position: absolute; top: 30px; left: 70%; width: 70px; height: 2px; border-radius: 2px;
  background: linear-gradient(90deg, #fff, transparent); opacity: 0; transform: rotate(-20deg);
  animation: shoot 9s ease-in 3s infinite;
}
.is-dusk .shooting { display: none; }

.tint { position: absolute; inset: 0; background: var(--tint); transition: background 1.5s; pointer-events: none; }
.glow {
  position: absolute; left: calc(42% + 84px); bottom: 62px; width: 90px; height: 70px; margin-left: -45px; border-radius: 50%;
  background: radial-gradient(closest-side, rgba(255, 196, 92, 0.75), rgba(255, 170, 60, 0.25) 55%, transparent);
  mix-blend-mode: screen; animation: breathe 3s ease-in-out infinite;
}
.firefly {
  position: absolute; width: 5px; height: 5px; border-radius: 50%; background: #fff6a0;
  box-shadow: 0 0 8px 3px rgba(255, 240, 120, 0.7); animation: firefly 4s ease-in-out infinite;
}
.moon { position: absolute; width: 64px; height: 64px; filter: drop-shadow(0 0 16px rgba(255, 246, 216, 0.55)); transition: left 60s linear, top 60s linear; }
.layer {
  position: absolute;
  left: 0;
  width: 100%;
}
.mountains {
  bottom: 96px;
  height: 140px;
}
.hills {
  bottom: 0;
  height: 132px;
}
.sun {
  position: absolute;
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: #fff4c2;
  box-shadow: 0 0 0 12px rgba(255, 244, 194, 0.35), 0 0 0 26px rgba(255, 244, 194, 0.18);
  transition: left 60s linear, top 60s linear, background 1.5s;
}
.is-dawn .sun, .is-dusk .sun {
  background: #ffd27a;
  box-shadow: 0 0 0 14px rgba(255, 190, 110, 0.35), 0 0 0 34px rgba(255, 160, 100, 0.18), 0 0 80px 30px rgba(255, 150, 90, 0.35);
}
.cloud {
  position: absolute;
  opacity: 0.9;
  animation: drift 26s linear infinite alternate;
}
.c1 { left: 6%; top: 74px; width: 84px; }
.c2 { left: 52%; top: 104px; width: 58px; opacity: 0.7; animation-duration: 34s; }

.far { position: absolute; bottom: 118px; width: 40px; opacity: 0.75; }
.yurt { position: absolute; }
.y1 { left: 42%; bottom: 58px; width: 168px; }
.y2 { right: -26px; bottom: 92px; width: 96px; }
.y3 { left: -18px; bottom: 98px; width: 84px; }
.y4 { left: 26%; bottom: 104px; width: 70px; }
.fire { position: absolute; left: 50%; bottom: 46px; width: 54px; }
.fire .flame { transform-origin: 50% 100%; transform-box: fill-box; animation: flicker 0.6s ease-in-out infinite alternate; }

.horse { position: absolute; right: 2%; bottom: 22px; width: 104px; }
.sheep { position: absolute; left: 3%; bottom: 52px; width: 64px; }
.tea { position: absolute; left: 45%; bottom: 22px; width: 56px; }
.cat { position: absolute; left: 35%; bottom: 26px; width: 44px; }
.barys { position: absolute; left: 5%; bottom: 28px; width: 132px; }

.bubble {
  position: absolute;
  left: 37%;
  right: 12px;
  top: 100px;
  background: #fff;
  color: #0f1b24;
  border-radius: 12px;
  padding: 8px 12px;
  font-size: var(--text-subhead);
  line-height: var(--text-subhead--line-height);
  font-weight: 500;
  box-shadow: 0 4px 0 rgba(14, 23, 29, 0.12);
  animation: pop 0.4s cubic-bezier(0.2, 1.4, 0.4, 1) both 0.2s;
}
.bubble::after {
  content: '';
  position: absolute;
  left: 4px;
  bottom: -9px;
  border: 10px solid transparent;
  border-top-color: #fff;
  border-left-color: #fff;
  border-bottom: 0;
  transform: skewX(20deg);
}
.bubble :deep(i) { font-style: normal; font-weight: 600; color: #0a72b5; }

@keyframes twinkle { 50% { opacity: 0.25; transform: scale(0.7); } }
@keyframes shoot { 0%, 92% { opacity: 0; transform: translate(0, 0) rotate(-20deg); } 94% { opacity: 1; } 100% { opacity: 0; transform: translate(-160px, 60px) rotate(-20deg); } }
@keyframes breathe { 50% { opacity: 0.7; } }
@keyframes firefly { 0%, 100% { opacity: 0; transform: translate(0, 0); } 30%, 70% { opacity: 1; } 50% { transform: translate(10px, -12px); } }
@keyframes drift { to { transform: translateX(24px); } }
@keyframes flicker { to { transform: scale(0.9, 1.08); } }
@keyframes pop { from { opacity: 0; transform: scale(0.6) translateY(8px); } }
</style>
