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
const SUBTITLES = { correct: 'Верно, так держать', almost: 'Почти: есть опечатка', wrong: 'Посмотри, как правильно' } as const;
</script>

<template>
  <div class="flex flex-1 flex-col gap-4">
    <!-- ответ ушёл в очередь -->
    <template v-if="lesson.savedOffline || !res">
      <div class="grid flex-1 content-center justify-items-center gap-3 text-center">
        <Barys mood="think" class="w-32" />
        <h1 class="text-title2">Ответ сохранён</h1>
        <p class="max-w-[18rem] text-body text-label-2">Отправим, когда появится сеть.</p>
      </div>
      <button type="button" class="btn btn-primary w-full" @click="lesson.next()">Дальше</button>
    </template>

    <template v-else>
      <div class="relative flex items-end gap-2 pt-2">
        <Art v-if="res.verdict !== 'wrong' && res.altyn.earned > 0" name="coin" class="absolute top-2 left-[40%] size-6 animate-[fly_2.6s_ease-in-out_infinite]" />
        <Barys :key="res.verdict" :mood="MOODS[res.verdict]" class="-mb-1 w-[120px] shrink-0" />
        <div class="grid gap-1.5 pb-3">
          <h1 class="text-large-title" :class="res.verdict === 'wrong' ? 'text-danger' : res.verdict === 'correct' ? 'text-ok-label' : 'text-altyn-label'">
            {{ TITLES[res.verdict] }}
          </h1>
          <span class="text-subhead text-label-2">{{ SUBTITLES[res.verdict] }}</span>
          <span v-if="res.altyn.earned > 0" class="inline-flex h-8 items-center gap-1.5 justify-self-start rounded-full bg-surface pr-3 pl-1.5 text-subhead font-semibold">
            <Art name="coin" class="size-[22px]" />+{{ res.altyn.earned }} алтын
          </span>
          <span v-else-if="res.altyn.lost > 0" class="inline-flex h-8 items-center gap-1.5 justify-self-start rounded-full bg-surface pr-3 pl-1.5 text-subhead font-semibold text-danger">
            <Art name="coin" class="size-[22px] opacity-60" />−{{ res.altyn.lost }} алтын
          </span>
        </div>
      </div>

      <section v-if="res.verdict !== 'correct'" class="grid gap-2.5 rounded-card bg-surface px-4 py-3" aria-label="Сравнение ответа">
        <div class="flex items-center gap-3">
          <span class="w-[5.5rem] shrink-0 text-footnote text-label-3">Ты написал</span>
          <span class="flex text-title2 font-semibold">
            <span v-for="(ch, i) in mine" :key="i" :class="fixPos.has(i) && 'text-danger line-through decoration-2'">{{ ch }}</span>
          </span>
        </div>
        <div class="flex items-center gap-3">
          <span class="w-[5.5rem] shrink-0 text-footnote text-label-3">Верно</span>
          <span class="flex text-title2 font-semibold">
            <span v-for="(ch, i) in answer" :key="i" :class="fixPos.has(i) && 'rounded bg-altyn px-0.5 text-on-altyn'">{{ ch }}</span>
          </span>
        </div>
      </section>

      <article class="grid gap-3 rounded-card bg-surface p-4">
        <div class="flex items-baseline justify-between gap-2">
          <b class="text-title2 break-all text-word">{{ res.answer }}</b>
          <span class="shrink-0 text-body text-label-2">{{ lesson.card?.ru }}</span>
        </div>
        <div v-if="res.examples.length" class="grid gap-3 border-t border-separator pt-3">
          <ExampleLine v-for="(e, i) in res.examples" :key="i" :kk="e.kk" :ru="e.ru" :word="res.answer" />
        </div>
      </article>

      <p v-if="lesson.round === 'practice' && res.verdict !== 'correct'" class="text-center text-footnote text-label-2">
        Это тренировка, алтын не снимается. Слово ещё раз попадётся в конце закрепления.
      </p>
      <SrsLine :next="res.next" />

      <div class="mt-auto grid gap-2">
        <p v-if="res.altyn.earned > 0" class="text-center text-footnote text-label-3">
          {{ res.altyn.base }} за слово + {{ res.altyn.combo }} за комбо
        </p>
        <button type="button" class="btn btn-primary w-full" @click="lesson.next()">Дальше</button>
      </div>
    </template>
  </div>
</template>
