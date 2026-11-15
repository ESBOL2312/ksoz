<script setup lang="ts">
import { computed, nextTick, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useHome, useQuests } from '@/api';
import Barys from '@/shared/mascot/Barys.vue';
import { wearFrom } from '@/shared/mascot/mascot';
import { haptics, useBackButton } from '@/telegram';
import QuestTrail from './QuestTrail.vue';

const route = useRoute();
const router = useRouter();
const toast = useToast();
const { data, isPending, isError, refetch, isFetching } = useQuests();
const home = useHome();
const wear = computed(() => wearFrom(home.data.value?.equipped));

/** /quest/:slug — этот квест; /quest — первый непройденный (или первый). */
const quest = computed(() => {
  const list = data.value?.quests ?? [];
  const slug = route.params.slug ? String(route.params.slug) : null;
  if (slug) return list.find((q) => q.slug === slug) ?? null;
  return list.find((q) => !q.completed) ?? list[0] ?? null;
});
const current = computed(() => quest.value?.steps.find((s) => s.status === 'current') ?? null);
const blocked = computed(() => quest.value?.current_blocked === 'daily_limit');
const pct = computed(() => (quest.value?.steps_total ? Math.round((quest.value.steps_done / quest.value.steps_total) * 100) : 0));

const back = () => void router.push('/');
/** в Telegram — системная кнопка «назад», вне его — своя */
const tgBack = useBackButton(back);

function open(n: number) {
  if (!quest.value) return;
  haptics.tap();
  void router.push(`/quest/${encodeURIComponent(quest.value.slug)}/${n}`);
}
function locked(n: number) {
  haptics.warning();
  toast.add({ title: `Шаг ${n} пока закрыт`, description: 'Сначала пройди предыдущие шаги', color: 'neutral' });
}

// показать текущую остановку, если тропа длиннее экрана
watch(
  () => quest.value?.slug,
  async (s) => {
    if (!s) return;
    await nextTick();
    const el = document.querySelector('[data-current]');
    // прокручиваем, только если текущая остановка ниже экрана (под кнопкой «Продолжить»)
    const over = el ? el.getBoundingClientRect().bottom - (window.innerHeight - 140) : 0;
    if (over > 0) window.scrollBy({ top: over });
  },
  { immediate: true },
);
</script>

<template>
  <div class="mx-auto min-h-dvh w-full max-w-[430px] px-4 pt-2" style="padding-bottom: calc(24px + var(--tg-safe-bottom))">
    <div v-if="!tgBack" class="-ml-3 flex items-center">
      <button type="button" class="btn-plain gap-1 px-3" aria-label="В аул" @click="back">
        <svg width="12" height="20" viewBox="0 0 12 20" aria-hidden="true">
          <path d="M10 2L2 10l8 8" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
        Аул
      </button>
    </div>

    <template v-if="isPending">
      <USkeleton class="mt-2 h-8 w-1/2 rounded-full" />
      <USkeleton class="mt-3 h-24 rounded-card" />
      <USkeleton class="mt-4 h-[600px] rounded-card" />
    </template>

    <div v-else-if="isError || !quest" class="mt-16 grid justify-items-center gap-4 rounded-card bg-surface p-6 text-center">
      <Barys mood="sad" class="w-28" />
      <p class="text-body">{{ isError ? 'Не удалось загрузить квест.' : 'Квест не найден.' }}</p>
      <button v-if="isError" type="button" class="btn btn-primary w-full" :disabled="isFetching" @click="refetch()">Повторить</button>
      <button v-else type="button" class="btn btn-primary w-full" @click="back">В аул</button>
    </div>

    <template v-else>
      <header class="grid gap-1 pt-1">
        <span class="text-footnote font-medium text-label-2 uppercase">Квест</span>
        <h1 class="text-large-title">{{ quest.title_kk }}</h1>
        <p class="text-body text-label-2">{{ quest.title_ru }}</p>
      </header>

      <section class="mt-3 grid gap-2 rounded-card bg-surface p-4">
        <p class="text-subhead"><b class="font-semibold">Цель:</b> {{ quest.goal_ru }}</p>
        <div class="flex items-baseline justify-between gap-2">
          <span class="text-footnote text-label-2">{{ quest.completed ? 'Все шаги пройдены' : `Шаг ${current?.n ?? quest.steps_done + 1} из ${quest.steps_total}` }}</span>
          <span class="text-footnote text-label-3 tabular-nums">{{ quest.steps_done }}/{{ quest.steps_total }}</span>
        </div>
        <div class="h-2 overflow-hidden rounded-full bg-surface-2" role="progressbar" aria-label="Прогресс квеста" :aria-valuenow="pct" aria-valuemin="0" aria-valuemax="100">
          <i class="block h-full origin-left rounded-full bg-ok transition-transform duration-500" :style="{ transform: `scaleX(${pct / 100})` }" />
        </div>
      </section>

      <section v-if="blocked && !quest.completed" class="mt-3 flex items-center gap-3 rounded-card bg-surface p-3">
        <Barys mood="sleep" :animated="false" class="w-12 shrink-0" />
        <div class="grid gap-1">
          <p class="text-subhead">Новые слова на сегодня закончились. Шаг {{ current?.n }} откроется завтра.</p>
          <RouterLink to="/lesson?only=review" class="text-subhead font-medium text-tint">А пока можно повторить слова</RouterLink>
        </div>
      </section>

      <QuestTrail class="mt-4" :quest="quest" :hat="wear.hat" :coat="wear.coat" :boots="wear.boots" @open="open" @locked="locked" />

      <button
        v-if="current && !blocked"
        type="button"
        class="btn btn-primary sticky bottom-[calc(12px+var(--tg-safe-bottom))] mt-2 w-full"
        @click="open(current.n)"
      >
        {{ quest.steps_done ? 'Продолжить' : 'Бастау' }} · шаг {{ current.n }}
      </button>
    </template>
  </div>
</template>
