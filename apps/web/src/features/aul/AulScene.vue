<script setup lang="ts">
import { computed } from 'vue';
import Art from '@/shared/art/Art.vue';
import Barys from '@/shared/mascot/Barys.vue';
import type { BarysMood, BarysWear } from '@/shared/mascot/mascot';
import { sceneFrom } from '@/shared/mascot/mascot';

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
</script>

<template>
  <div class="scene" aria-hidden="true">
    <!-- небо -->
    <div class="sun" />
    <svg class="cloud c1" viewBox="0 0 120 40"><path d="M14 36h92a14 14 0 0 0-6-27 22 22 0 0 0-40-6 16 16 0 0 0-28 9 12 12 0 0 0-18 24z" fill="#fff" /></svg>
    <svg class="cloud c2" viewBox="0 0 120 40"><path d="M14 36h92a14 14 0 0 0-6-27 22 22 0 0 0-40-6 16 16 0 0 0-28 9 12 12 0 0 0-18 24z" fill="#fff" /></svg>

    <!-- горы Алатау -->
    <svg class="layer mountains" viewBox="0 0 400 140" preserveAspectRatio="none">
      <path d="M0 140V78L46 40l30 22 48-52 44 44 26-18 52 46 40-40 50 34 34-20 30 22v84Z" fill="#9DB8CC" />
      <path d="M124 10l-22 24 10-2 8 8 10-10 12 8 6-4zM248 34l-16 16 8-1 8 6 8-6 10 4zM46 40l-18 15 9-1 7 5 8-6 8 3z" fill="#fff" />
      <path d="M0 140V100l40-26 40 20 56-34 50 30 44-22 60 32 44-18 66 26v32Z" fill="#7E9DB6" />
      <path d="M136 60l-14 10 7 0 6 4 6-4 8 2zM296 66l-12 9 7-1 5 3 6-3 7 1z" fill="#EAF2F7" />
    </svg>

    <!-- холмы -->
    <svg class="layer hills" viewBox="0 0 400 120" preserveAspectRatio="none">
      <path d="M0 40 Q80 10 170 34 T400 26 V120 H0Z" fill="#9CC25A" />
      <path d="M0 74 Q110 46 220 66 T400 60 V120 H0Z" fill="#84B24A" />
      <path d="M0 98 Q140 82 260 94 T400 90 V120 H0Z" fill="#74A23F" />
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

    <div class="bubble" v-html="say" />
  </div>
</template>

<style scoped>
.scene {
  position: relative;
  height: 340px;
  overflow: hidden;
  background: linear-gradient(#4bb8de 0, #8fd3ec 38%, #d9f0f2 62%, #fde7b8 80%);
}
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
  right: 22px;
  top: 62px;
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: #fff4c2;
  box-shadow: 0 0 0 12px rgba(255, 244, 194, 0.35), 0 0 0 26px rgba(255, 244, 194, 0.18);
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
  color: var(--color-ink);
  border-radius: 16px;
  padding: 8px 12px;
  font-size: 13px;
  line-height: 1.3;
  font-weight: 800;
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
.bubble :deep(i) { font-style: normal; color: var(--color-felt-600); }

@keyframes drift { to { transform: translateX(24px); } }
@keyframes flicker { to { transform: scale(0.9, 1.08); } }
@keyframes pop { from { opacity: 0; transform: scale(0.6) translateY(8px); } }
</style>
