<script setup lang="ts">
import { computed } from 'vue';
import Art from '@/shared/art/Art.vue';
import Barys from '@/shared/mascot/Barys.vue';
import { useLessonStore } from '@/stores/lesson';
import ExampleLine from './ExampleLine.vue';
import SrsLine from './SrsLine.vue';

const lesson = useLessonStore();
const res = computed(() => lesson.result);
const fixPos = computed(() => new Set(res.value?.fix.map((f) => f.pos) ?? []));
const mine = computed(() => [...lesson.lastInput]);
const answer = computed(() => [...(res.value?.answer ?? '')]);

const TITLES = { correct: 'Дұрыс!', almost: 'Дерлік!', wrong: 'Қате' } as const;
const MOODS = { correct: 'happy', almost: 'think', wrong: 'sad' } as const;
</script>

<template>
  <div class="flex flex-1 flex-col gap-3">
    <!-- ответ ушёл в очередь -->
    <template v-if="lesson.savedOffline || !res">
      <div class="grid flex-1 content-center justify-items-center gap-3 text-center">
        <Barys mood="think" class="w-32" />
        <p class="max-w-[17rem] font-display text-lg font-bold leading-snug">Ответ сохранён, отправим, когда появится сеть</p>
      </div>
      <button type="button" class="chunky chunky-gold w-full px-4 py-[15px] text-[15px]" @click="lesson.next()">Дальше</button>
    </template>

    <template v-else>
      <div class="relative grid h-[170px] grid-cols-[132px_1fr] items-end">
        <div v-if="res.verdict !== 'wrong'" class="rays pointer-events-none absolute -top-[50px] -left-[64px] size-[260px] animate-[spin_18s_linear_infinite] rounded-full" />
        <Barys :key="res.verdict" :mood="MOODS[res.verdict]" class="relative w-[132px]" />
        <template v-if="res.verdict !== 'wrong' && res.altyn.earned > 0">
          <Art name="coin" class="absolute left-[44%] top-3 size-[26px] animate-[fly_2.6s_ease-in-out_infinite]" />
          <Art name="coin" class="absolute right-3 top-6 size-5 animate-[fly_2.6s_ease-in-out_0.5s_infinite]" />
          <Art name="coin" class="absolute bottom-16 right-[10%] size-[18px] animate-[fly_2.6s_ease-in-out_1s_infinite]" />
        </template>
        <div class="relative grid justify-items-center gap-3 pb-4">
          <h2
            class="-rotate-[4deg] font-display text-[40px] leading-none font-black"
            :class="res.verdict === 'wrong' ? 'text-felt-400 [text-shadow:0_5px_0_var(--color-felt-950)]' : 'text-gold-400 [text-shadow:0_5px_0_var(--color-felt-800)]'"
          >
            {{ TITLES[res.verdict] }}
          </h2>
          <div
            v-if="res.altyn.earned > 0"
            class="flex items-center gap-1.5 rounded-full border-2 border-gold-400 bg-ink py-[5px] pl-1.5 pr-3.5 font-display text-lg font-black text-gold-400"
          >
            <Art name="coin" class="size-[26px]" />+{{ res.altyn.earned }}
          </div>
        </div>
      </div>

      <div v-if="res.altyn.earned > 0" class="-mt-1 flex flex-wrap justify-center gap-x-1.5 text-xs font-extrabold text-night-200">
        <span>{{ res.altyn.base }} за слово</span>
        <span>+ {{ res.altyn.combo }} комбо</span>
        <span>= <b class="text-gold-400">{{ res.altyn.earned }} алтын</b></span>
      </div>

      <div v-if="res.verdict !== 'correct'" class="grid gap-2 rounded-[18px] bg-night-800 px-3.5 py-3">
        <div class="flex items-center gap-2.5">
          <span class="w-[4.5rem] shrink-0 text-xs font-extrabold text-night-300">Ты написал</span>
          <span class="flex font-display text-xl font-bold">
            <span v-for="(ch, i) in mine" :key="i" :class="fixPos.has(i) ? 'text-felt-400 underline decoration-2 underline-offset-4' : 'text-white'">{{ ch }}</span>
          </span>
        </div>
        <div class="flex items-center gap-2.5">
          <span class="w-[4.5rem] shrink-0 text-xs font-extrabold text-night-300">Верно</span>
          <span class="flex font-display text-xl font-bold">
            <span v-for="(ch, i) in answer" :key="i" :class="fixPos.has(i) ? 'text-gold-400 underline decoration-2 underline-offset-4' : 'text-white'">{{ ch }}</span>
          </span>
        </div>
      </div>

      <div class="card-milk grid gap-2.5 rounded-[22px] px-4 py-3.5" style="box-shadow: 0 6px 0 var(--color-milk-2)">
        <div class="flex items-baseline justify-between gap-2">
          <b class="break-all font-display text-[26px] font-black text-felt-600">{{ res.answer }}</b>
          <span class="shrink-0 font-extrabold text-ink-2">{{ lesson.card?.ru }}</span>
        </div>
        <ExampleLine v-for="(e, i) in res.examples" :key="i" :kk="e.kk" :ru="e.ru" :word="res.answer" />
      </div>

      <SrsLine :next="res.next" />

      <button type="button" class="chunky chunky-gold mt-auto w-full px-4 py-[15px] text-[15px]" @click="lesson.next()">Дальше</button>
    </template>
  </div>
</template>

<style scoped>
.rays {
  background: repeating-conic-gradient(rgba(242, 180, 44, 0.22) 0 10deg, transparent 10deg 20deg);
  -webkit-mask: radial-gradient(circle, #000 25%, transparent 68%);
  mask: radial-gradient(circle, #000 25%, transparent 68%);
}
</style>
