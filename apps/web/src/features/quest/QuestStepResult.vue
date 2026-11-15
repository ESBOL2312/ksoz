<!-- Итог шага: награда, выученные слова, следующий шаг или карта квеста. -->
<script setup lang="ts">
import { computed } from 'vue';
import Art from '@/shared/art/Art.vue';
import Barys from '@/shared/mascot/Barys.vue';
import { num, words } from '@/shared/format';
import { useQuestStore } from '@/stores/quest';
import CoinBurst from './CoinBurst.vue';

const quest = useQuestStore();
const emit = defineEmits<{ next: [n: number]; map: [] }>();

const res = computed(() => quest.completeRes);
const fresh = computed(() => quest.learned.filter((w) => !w.familiar).length);
const title = computed(() => (res.value?.quest_completed ? 'Квест пройден!' : 'Қадам өтті!'));
const subtitle = computed(() => {
  if (res.value?.quest_completed) return 'Теперь ты можешь познакомиться по-казахски. Жарайсың!';
  if (fresh.value) return `Ты взял в изучение ${words(fresh.value)}. Повторим их через 20 минут.`;
  return 'Шаг пройден, так держать.';
});
</script>

<template>
  <div class="flex flex-1 flex-col gap-4">
    <div class="relative grid justify-items-center gap-1 pt-4 text-center">
      <CoinBurst v-if="(res?.reward ?? 0) > 0" />
      <Barys mood="happy" class="relative -mb-2 w-32" label="Барыс радуется" />
      <h1 class="relative text-large-title">{{ title }}</h1>
      <p class="relative max-w-[19rem] text-body text-label-2">{{ subtitle }}</p>
      <span v-if="res && res.reward > 0" class="reward mt-2 inline-flex h-9 items-center gap-1.5 rounded-full bg-surface pr-3.5 pl-2 text-headline">
        <Art name="coin" class="size-6" />+{{ num(res.reward) }} алтын
      </span>
      <span v-if="quest.earned > 0" class="text-footnote text-label-3">и ещё +{{ num(quest.earned) }} за повтор</span>
    </div>

    <section v-if="quest.learned.length" class="grid gap-2" aria-label="Слова шага">
      <h2 class="text-title3">Слова шага</h2>
      <ul class="group-list">
        <li v-for="w in quest.learned" :key="w.word_id" class="flex min-h-12 items-center justify-between gap-2 px-4 py-2">
          <span class="min-w-0">
            <b class="text-headline break-words">{{ w.kk }}</b>
            <span class="text-subhead text-label-2"> · {{ w.ru }}</span>
          </span>
          <span class="shrink-0 text-footnote" :class="w.familiar ? 'text-label-3' : 'text-ok-label'">{{ w.familiar ? 'уже знал' : 'новое' }}</span>
        </li>
      </ul>
    </section>

    <div class="mt-auto grid gap-2 pt-2">
      <button v-if="res?.next_step" type="button" class="btn btn-primary w-full" @click="emit('next', res.next_step)">
        Следующий шаг
      </button>
      <button type="button" class="w-full" :class="res?.next_step ? 'btn-plain' : 'btn btn-primary'" @click="emit('map')">К карте квеста</button>
    </div>
  </div>
</template>

<style scoped>
.reward {
  animation: reward-pop 0.5s 0.2s ease-out both;
}
@keyframes reward-pop {
  from {
    opacity: 0;
    transform: scale(0.6);
  }
  60% {
    transform: scale(1.08);
  }
}
</style>
