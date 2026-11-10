<!--
  Барыс — снежный барс, герой приложения. Один SVG, несколько настроений.
  Надетые вещи из базара (тақия, шапан, етік) рисуются прямо на нём.
-->
<script setup lang="ts">
import { computed } from 'vue';
import type { BarysMood } from './mascot';

const props = withDefaults(
  defineProps<{
    mood?: BarysMood;
    hat?: boolean;
    coat?: boolean;
    boots?: boolean;
    /** дыхание, моргание, хвост; выключить для мелких иконок */
    animated?: boolean;
    label?: string;
  }>(),
  { mood: 'idle', hat: false, coat: false, boots: false, animated: true, label: undefined },
);

const FUR = '#F4F8FA';
const FUR_SHADE = '#DCE6EC';
const SPOT = '#8EA4B0';
const INK = '#0E171D';
const COAT = '#203272';
const GOLD = '#E2B440';

const eyesOpen = computed(() => !['happy', 'sleep'].includes(props.mood));
const armFill = computed(() => (props.coat ? COAT : FUR));

// Поворот рук вокруг плеча: [левая, правая]
const arms = computed<[number, number]>(() => {
  switch (props.mood) {
    case 'happy':
      return [125, -125];
    case 'wave':
      return [16, -125];
    case 'think':
      return [16, 160];
    case 'sad':
      return [6, -6];
    case 'sleep':
      return [34, -34];
    default:
      return [18, -18];
  }
});
// Куда смотрят зрачки
const look = computed(() => (props.mood === 'think' ? { x: 3, y: -4 } : props.mood === 'sad' ? { x: 0, y: 2 } : { x: 1, y: 0 }));
</script>

<template>
  <svg
    viewBox="0 0 200 240"
    class="barys"
    :class="[`mood-${mood}`, { animated }]"
    :role="label ? 'img' : undefined"
    :aria-label="label"
    :aria-hidden="label ? undefined : 'true'"
  >
    <!-- тень -->
    <ellipse cx="100" cy="230" rx="58" ry="7" fill="#000" opacity=".16" />

    <g class="body-g">
      <!-- хвост: толстый, с кольцами, как у настоящего барса -->
      <g class="tail">
        <path d="M128 200 C176 206 192 168 178 136 C170 118 154 120 156 136" fill="none" :stroke="FUR_SHADE" stroke-width="25" stroke-linecap="round" />
        <path d="M128 200 C176 206 192 168 178 136 C170 118 154 120 156 136" fill="none" :stroke="FUR" stroke-width="20" stroke-linecap="round" />
        <path
          d="M128 200 C176 206 192 168 178 136 C170 118 154 120 156 136"
          fill="none"
          :stroke="SPOT"
          stroke-width="20"
          stroke-dasharray="7 15"
          stroke-dashoffset="-12"
          opacity=".85"
        />
        <circle cx="156" cy="136" r="10" :fill="INK" opacity=".75" />
      </g>

      <!-- туловище -->
      <ellipse cx="100" cy="176" rx="44" ry="42" :fill="FUR" :stroke="FUR_SHADE" stroke-width="2" />
      <ellipse cx="100" cy="186" rx="27" ry="27" fill="#fff" />
      <g fill="none" :stroke="SPOT" stroke-width="3">
        <circle cx="68" cy="166" r="5" />
        <circle cx="132" cy="166" r="5" />
        <circle cx="70" cy="194" r="4" />
        <circle cx="130" cy="194" r="4" />
      </g>

      <!-- шапан -->
      <g v-if="coat">
        <path d="M66 142 Q100 132 134 142 L146 200 Q100 214 54 200 Z" :fill="COAT" />
        <path d="M100 140 L84 206 Q100 210 116 206 Z" fill="#fff" />
        <path d="M100 140 L84 206 M100 140 L116 206" :stroke="GOLD" stroke-width="4" stroke-linecap="round" />
        <path d="M54 200 Q100 214 146 200 L144 192 Q100 206 56 192 Z" :fill="GOLD" />
        <path d="M66 176c0-6 6-8 8-4m-8 4c0-6-6-8-8-4M134 176c0-6 6-8 8-4m-8 4c0-6-6-8-8-4" fill="none" :stroke="GOLD" stroke-width="2.4" stroke-linecap="round" />
      </g>

      <!-- лапы / етік -->
      <g v-if="!boots">
        <ellipse cx="78" cy="216" rx="17" ry="11" :fill="FUR" :stroke="FUR_SHADE" stroke-width="2" />
        <ellipse cx="122" cy="216" rx="17" ry="11" :fill="FUR" :stroke="FUR_SHADE" stroke-width="2" />
        <path d="M72 224v-5M79 225v-5M86 224v-5M114 224v-5M121 225v-5M128 224v-5" :stroke="FUR_SHADE" stroke-width="2" stroke-linecap="round" />
      </g>
      <g v-else>
        <g v-for="side in [-1, 1]" :key="side" :transform="side === 1 ? 'translate(200 0) scale(-1 1)' : undefined">
          <rect x="68" y="200" width="22" height="20" rx="5" fill="#6E3A1E" />
          <path d="M60 214 q-4-6 2-6 l6 4 h24 q6 0 6 8 q0 6-6 6 H68 q-10 0-8-12z" fill="#6E3A1E" />
          <path d="M68 205h22" :stroke="GOLD" stroke-width="5" />
          <path d="M66 226h28" stroke="#3B2314" stroke-width="3" stroke-linecap="round" />
          <path d="M74 214c0-4 4-5 5-2m-5 2c0-4-4-5-5-2" fill="none" :stroke="GOLD" stroke-width="1.8" stroke-linecap="round" />
        </g>
      </g>
      <!-- золотой ошейник-тұмар, как на логотипе -->
      <path d="M68 140 Q100 154 132 140 L130 148 Q100 162 70 148 Z" :fill="GOLD" />
      <path d="M93 152 h14 l-7 11 z" :fill="GOLD" stroke="#B98A1F" stroke-width="1.5" stroke-linejoin="round" />
    </g>

    <!-- голова -->
    <g class="head">
      <!-- уши -->
      <circle cx="54" cy="56" r="20" :fill="FUR" :stroke="FUR_SHADE" stroke-width="2" />
      <circle cx="146" cy="56" r="20" :fill="FUR" :stroke="FUR_SHADE" stroke-width="2" />
      <circle cx="55" cy="58" r="11" :fill="GOLD" opacity=".85" />
      <circle cx="145" cy="58" r="11" :fill="GOLD" opacity=".85" />
      <path d="M38 44a20 20 0 0 1 22-8M162 44a20 20 0 0 0-22-8" fill="none" :stroke="INK" stroke-width="4" stroke-linecap="round" opacity=".7" />

      <ellipse cx="100" cy="96" rx="66" ry="56" :fill="FUR" :stroke="FUR_SHADE" stroke-width="2" />
      <!-- пушистые щёки -->
      <path d="M36 108 l-8 6 10 1 -6 8 12-3M164 108 l8 6 -10 1 6 8 -12-3" :fill="FUR" :stroke="FUR_SHADE" stroke-width="1.5" stroke-linejoin="round" />
      <!-- пятна-розетки -->
      <g :fill="SPOT">
        <circle cx="100" cy="52" r="6" />
        <circle cx="84" cy="58" r="4.5" />
        <circle cx="116" cy="58" r="4.5" />
        <circle cx="70" cy="66" r="5" />
        <circle cx="130" cy="66" r="5" />
        <circle cx="44" cy="100" r="5" />
        <circle cx="156" cy="100" r="5" />
        <circle cx="50" cy="120" r="3.5" />
        <circle cx="150" cy="120" r="3.5" />
      </g>

      <!-- мордочка -->
      <ellipse cx="100" cy="122" rx="28" ry="19" fill="#fff" />
      <ellipse cx="66" cy="118" rx="9" ry="6" fill="#F4A29A" opacity=".55" />
      <ellipse cx="134" cy="118" rx="9" ry="6" fill="#F4A29A" opacity=".55" />

      <!-- глаза -->
      <g v-if="eyesOpen" class="eyes">
        <ellipse cx="76" cy="98" rx="12" ry="14" :fill="INK" />
        <ellipse cx="124" cy="98" rx="12" ry="14" :fill="INK" />
        <ellipse :cx="76 + look.x" :cy="99 + look.y" rx="8" ry="10" fill="#3FB6DC" />
        <ellipse :cx="124 + look.x" :cy="99 + look.y" rx="8" ry="10" fill="#3FB6DC" />
        <ellipse :cx="76 + look.x" :cy="100 + look.y" rx="4.5" ry="6.5" :fill="INK" />
        <ellipse :cx="124 + look.x" :cy="100 + look.y" rx="4.5" ry="6.5" :fill="INK" />
        <circle :cx="80 + look.x" :cy="93 + look.y" r="4" fill="#fff" />
        <circle :cx="128 + look.x" :cy="93 + look.y" r="4" fill="#fff" />
        <circle :cx="72 + look.x" :cy="104 + look.y" r="1.8" fill="#fff" />
        <circle :cx="120 + look.x" :cy="104 + look.y" r="1.8" fill="#fff" />
      </g>
      <g v-else-if="mood === 'happy'" fill="none" :stroke="INK" stroke-width="5" stroke-linecap="round">
        <path d="M64 102 Q76 86 88 102" />
        <path d="M112 102 Q124 86 136 102" />
      </g>
      <g v-else fill="none" :stroke="INK" stroke-width="4.5" stroke-linecap="round">
        <path d="M65 100 Q76 108 87 100" />
        <path d="M113 100 Q124 108 135 100" />
      </g>
      <!-- брови -->
      <g v-if="mood === 'sad'" :stroke="INK" stroke-width="4" stroke-linecap="round">
        <path d="M64 80 L84 76" />
        <path d="M136 80 L116 76" />
      </g>
      <g v-else-if="mood === 'think'" :stroke="INK" stroke-width="4" stroke-linecap="round" fill="none">
        <path d="M66 78 Q76 72 86 76" />
        <path d="M114 74 Q124 70 134 74" />
      </g>

      <!-- нос и рот -->
      <path d="M92 112 h16 q2 0 0 3 l-6 6 q-2 2-4 0 l-6-6 q-2-3 0-3z" fill="#E2675B" />
      <g v-if="mood === 'happy' || mood === 'wave'">
        <path d="M86 126 Q100 148 114 126 Z" fill="#7A1F1A" />
        <path d="M92 134 Q100 144 108 134 Q100 130 92 134Z" fill="#F08A7A" />
        <path d="M100 121 v5" :stroke="INK" stroke-width="3" stroke-linecap="round" />
      </g>
      <path v-else-if="mood === 'sad'" d="M88 134 Q100 124 112 134" fill="none" :stroke="INK" stroke-width="3.5" stroke-linecap="round" />
      <path v-else-if="mood === 'think'" d="M92 131 Q100 128 110 132" fill="none" :stroke="INK" stroke-width="3.5" stroke-linecap="round" />
      <path
        v-else
        d="M100 121 v5 M100 126 Q92 136 84 129 M100 126 Q108 136 116 129"
        fill="none"
        :stroke="INK"
        stroke-width="3.5"
        stroke-linecap="round"
      />
      <!-- усы -->
      <g :stroke="SPOT" stroke-width="2" stroke-linecap="round" opacity=".8">
        <path d="M72 122 L48 118 M72 128 L50 132" />
        <path d="M128 122 L152 118 M128 128 L150 132" />
      </g>
      <!-- слеза -->
      <path v-if="mood === 'sad'" d="M64 112 q-5 8 0 11 q5-3 0-11z" fill="#3FB6DC" class="tear" />

      <!-- тақия с пером үкі -->
      <g v-if="hat">
        <path d="M64 54 Q64 22 100 20 Q136 22 136 54 Q100 44 64 54 Z" fill="#C7382B" />
        <path d="M64 54 Q100 44 136 54 L136 46 Q100 36 64 46 Z" fill="#8E2219" />
        <path d="M100 42v-8c0-5-6-6-7-3M100 34c0-5 6-6 7-3M80 46v-5c0-4-5-4-5-2M120 46v-5c0-4 5-4 5-2" fill="none" :stroke="GOLD" stroke-width="2.5" stroke-linecap="round" />
        <path d="M100 21 C94 8 98 0 106 -2 C104 6 108 12 102 21 Z" fill="#fff" stroke="#DCE6EC" stroke-width="1.5" />
      </g>
    </g>

    <!-- руки поверх головы, чтобы поднятые лапы были видны -->
    <g class="arms">
      <!-- руки -->
      <g :transform="`rotate(${arms[0]} 66 154)`">
        <ellipse cx="66" cy="176" rx="12" ry="22" :fill="armFill" :stroke="coat ? 'none' : FUR_SHADE" stroke-width="2" />
        <ellipse cx="66" cy="196" rx="11" ry="9" :fill="FUR" :stroke="FUR_SHADE" stroke-width="2" />
      </g>
      <g class="arm-r" :transform="`rotate(${arms[1]} 134 154)`">
        <g class="arm-r-inner">
          <ellipse cx="134" cy="176" rx="12" ry="22" :fill="armFill" :stroke="coat ? 'none' : FUR_SHADE" stroke-width="2" />
          <ellipse cx="134" cy="196" rx="11" ry="9" :fill="FUR" :stroke="FUR_SHADE" stroke-width="2" />
        </g>
      </g>

    </g>

    <!-- сон -->
    <g v-if="mood === 'sleep'" class="zzz" :fill="'#9EA6D6'" font-family="Unbounded, sans-serif" font-weight="900">
      <text x="150" y="40" font-size="20">z</text>
      <text x="166" y="22" font-size="14">z</text>
      <text x="178" y="8" font-size="10">z</text>
    </g>
    <!-- радость -->
    <g v-if="mood === 'happy'" :fill="GOLD" class="sparks">
      <path d="M22 60 l4 10 10 4 -10 4 -4 10 -4-10 -10-4 10-4z" />
      <path d="M176 70 l3 7 7 3 -7 3 -3 7 -3-7 -7-3 7-3z" />
      <path d="M30 150 l2.5 6 6 2.5 -6 2.5 -2.5 6 -2.5-6 -6-2.5 6-2.5z" />
    </g>
  </svg>
</template>

<style scoped>
.barys {
  overflow: visible;
}
.head,
.body-g,
.tail,
.eyes,
.arm-r-inner,
.zzz,
.sparks,
.tear {
  transform-box: fill-box;
}
.animated .body-g,
.animated .head {
  transform-origin: 50% 100%;
}
.animated .head {
  animation: barys-head 3.2s ease-in-out infinite;
}
.animated .body-g {
  animation: barys-breathe 3.2s ease-in-out infinite;
}
.animated .tail {
  transform-origin: 0% 100%;
  animation: barys-tail 2.6s ease-in-out infinite;
}
.animated .eyes {
  transform-origin: 50% 50%;
  animation: barys-blink 4.5s infinite;
}
.animated.mood-wave .arm-r-inner {
  transform-origin: 50% 0%;
  animation: barys-wave 0.9s ease-in-out infinite;
}
.animated.mood-happy {
  animation: barys-jump 0.9s ease-in-out infinite;
}
.animated .zzz {
  animation: barys-zzz 2.4s ease-in-out infinite;
}
.animated .sparks {
  animation: barys-sparks 1.2s ease-in-out infinite;
}
.animated .tear {
  animation: barys-tear 2s ease-in infinite;
}

@keyframes barys-head {
  50% {
    transform: translateY(2px) rotate(-1.5deg);
  }
}
@keyframes barys-breathe {
  50% {
    transform: scaleY(0.985);
  }
}
@keyframes barys-tail {
  50% {
    transform: rotate(-8deg);
  }
}
@keyframes barys-blink {
  0%,
  94%,
  100% {
    transform: scaleY(1);
  }
  97% {
    transform: scaleY(0.1);
  }
}
@keyframes barys-wave {
  50% {
    transform: rotate(-18deg);
  }
}
@keyframes barys-jump {
  50% {
    transform: translateY(-8px);
  }
}
@keyframes barys-zzz {
  50% {
    transform: translate(4px, -4px);
    opacity: 0.6;
  }
}
@keyframes barys-sparks {
  50% {
    opacity: 0.4;
    transform: scale(0.85);
  }
}
@keyframes barys-tear {
  0% {
    transform: translateY(0);
    opacity: 1;
  }
  100% {
    transform: translateY(10px);
    opacity: 0;
  }
}
</style>
