<script setup lang="ts">
import { AUL_THRESHOLDS } from '@ksoz/shared';
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useClaimTask } from '@/api/mutations';
import { useHome, useMe } from '@/api/queries';
import { AUL_STAGES, num, words } from '@/shared/format';
import CoinPill from '@/shared/ui/CoinPill.vue';
import StreakPill from '@/shared/ui/StreakPill.vue';
import { haptics } from '@/telegram';
import AulScene from './AulScene.vue';
import { wearFrom, type BarysMood } from '@/shared/mascot/mascot';
import DailyTasks from './DailyTasks.vue';
import MyWordsLink from '@/features/lesson/MyWordsLink.vue';

const router = useRouter();
const toast = useToast();
const { data: home, isPending, isError, refetch, isFetching } = useHome();
const { data: me } = useMe();
const claim = useClaimTask();
const claiming = ref<string | null>(null);

const stage = computed(() => Math.min(home.value?.aul_stage ?? 0, AUL_STAGES.length - 1));
const maxed = computed(() => stage.value >= AUL_THRESHOLDS.length);
const nextThreshold = computed(() => AUL_THRESHOLDS[stage.value] ?? AUL_THRESHOLDS[AUL_THRESHOLDS.length - 1]!);
const prevThreshold = computed(() => (stage.value === 0 ? 0 : AUL_THRESHOLDS[stage.value - 1]!));
const barPct = computed(() => {
  if (!home.value) return 0;
  if (maxed.value) return 100;
  const span = nextThreshold.value - prevThreshold.value;
  return Math.max(2, Math.min(100, Math.round(((home.value.review_words - prevThreshold.value) / span) * 100)));
});
const wear = computed(() => wearFrom(home.value?.equipped));

const mode = computed<'review' | 'new' | 'idle'>(() => {
  const h = home.value;
  if (!h) return 'idle';
  if (h.due_count > 0) return 'review';
  return h.new_left_today > 0 ? 'new' : 'idle';
});

const mood = computed<BarysMood>(() => (mode.value === 'review' ? 'wave' : mode.value === 'idle' ? 'happy' : 'idle'));
const say = computed(() => {
  const h = home.value;
  if (!h) return '';
  if (mode.value === 'review') return `Сәлем! <i>${words(h.due_count)}</i> ждут повтора`;
  if (mode.value === 'new') return 'Сәлем! Выучим <i>новые слова</i>?';
  return '<i>Жарайсың!</i> На сегодня всё, отдыхаем';
});

function onClaim(code: string) {
  claiming.value = code;
  claim.mutate(code, {
    onSuccess: (res) => {
      haptics.success();
      toast.add({ title: `+${num(res.reward)} алтын`, description: 'Награда за задание получена', color: 'secondary' });
    },
    onError: () => toast.add({ title: 'Не получилось забрать награду', color: 'error' }),
    onSettled: () => (claiming.value = null),
  });
}
const go = () => router.push('/lesson');
</script>

<template>
  <div class="min-h-full pb-6">
    <div class="flex items-center gap-2 px-4 py-2">
      <RouterLink to="/profile" class="grid size-11 place-items-center" :aria-label="`Профиль, уровень ${me?.level ?? ''}`">
        <span class="grid size-9 place-items-center rounded-full bg-kok-600 text-footnote font-bold text-white ring-2 ring-altyn">
          {{ me?.level ?? '…' }}
        </span>
      </RouterLink>
      <StreakPill :value="home?.streak_current ?? 0" />
      <span class="flex-1" />
      <CoinPill :value="home?.altyn" />
    </div>

    <template v-if="isPending">
      <USkeleton class="mx-4 h-[340px] rounded-card" />
      <div class="mx-4 mt-4 grid gap-3">
        <USkeleton class="h-[50px] rounded-control" />
        <USkeleton class="h-24 rounded-card" />
        <USkeleton class="h-40 rounded-card" />
      </div>
    </template>

    <div v-else-if="isError || !home" class="mx-4 mt-16 grid justify-items-center gap-4 rounded-card bg-surface p-6 text-center">
      <p class="text-body">Не удалось загрузить аул.</p>
      <button type="button" class="btn btn-primary w-full" :disabled="isFetching" @click="refetch()">Повторить</button>
    </div>

    <template v-else>
      <div class="mx-4 overflow-hidden rounded-card">
        <AulScene :stage="stage" :equipped="home.equipped" :wear="wear" :mood="mood" :say="say" />
      </div>

      <section class="grid gap-2 px-4 pt-4">
        <button v-if="mode === 'review'" type="button" class="btn btn-primary w-full" @click="go">
          Повторить {{ words(home.due_count) }}
        </button>
        <button v-else-if="mode === 'new'" type="button" class="btn btn-primary w-full" @click="go">Учить новые слова</button>
        <p v-else class="grid min-h-[50px] place-items-center rounded-control bg-surface text-headline text-label-2">На сегодня всё</p>
        <p class="text-center text-footnote text-label-3">
          <template v-if="mode === 'review' && home.new_left_today > 0">Потом ещё {{ words(home.new_left_today) }} новых на сегодня</template>
          <template v-else-if="mode === 'new'">Новых слов на сегодня: {{ home.new_left_today }}</template>
          <template v-else-if="mode === 'idle'">Следующие слова скоро вернутся на повтор</template>
        </p>
        <MyWordsLink />
      </section>

      <h2 class="mx-4 mt-6 mb-2 text-title3">Твой аул</h2>
      <section class="mx-4 grid gap-2 rounded-card bg-surface px-4 py-3">
        <div class="flex items-baseline justify-between gap-2">
          <span class="text-headline">{{ AUL_STAGES[stage] }}</span>
          <span class="text-footnote text-label-2 tabular-nums">
            {{ maxed ? `${num(home.review_words)} слов` : `${num(home.review_words)} из ${num(nextThreshold)} слов` }}
          </span>
        </div>
        <div
          class="h-2 overflow-hidden rounded-full bg-surface-2"
          role="progressbar"
          aria-label="Рост аула"
          :aria-valuenow="barPct"
          aria-valuemin="0"
          aria-valuemax="100"
        >
          <i class="block h-full rounded-full bg-altyn transition-[width] duration-500" :style="{ width: barPct + '%' }" />
        </div>
        <span class="text-footnote text-label-3">
          {{ maxed ? 'Аул вырос до самого большого' : `Ещё ${words(Math.max(0, nextThreshold - home.review_words))}, и будет «${AUL_STAGES[stage + 1]}»` }}
        </span>
      </section>

      <DailyTasks :tasks="home.tasks" :claiming="claiming" @claim="onClaim" />
    </template>
  </div>
</template>
