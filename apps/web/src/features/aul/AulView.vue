<script setup lang="ts">
import { AUL_THRESHOLDS } from '@ksoz/shared';
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useClaimTask } from '@/api/mutations';
import { useHome, useMe } from '@/api/queries';
import { AUL_STAGES, num, plural, words } from '@/shared/format';
import CoinPill from '@/shared/ui/CoinPill.vue';
import StreakPill from '@/shared/ui/StreakPill.vue';
import { haptics } from '@/telegram';
import AulScene from './AulScene.vue';
import DailyTasks from './DailyTasks.vue';

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
const visibleSteps = computed(() => {
  const s = stage.value;
  const from = Math.max(0, Math.min(s - 1, AUL_STAGES.length - 4));
  return AUL_STAGES.slice(from, from + 4).map((name, i) => ({ name, now: from + i === s }));
});

const extraYurt = computed(() => !!home.value?.equipped.some((e) => e.category === 'uy'));
const extraHorse = computed(() => !!home.value?.equipped.some((e) => e.category === 'mal'));
const horseItem = computed(() => home.value?.equipped.find((e) => e.category === 'mal'));
const tag = computed(() =>
  horseItem.value ? `Это <i>${horseItem.value.kk}</i>, твой скакун` : 'Это <i>тұлпар</i>, твой скакун',
);

const mode = computed<'review' | 'new' | 'idle'>(() => {
  const h = home.value;
  if (!h) return 'idle';
  if (h.due_count > 0) return 'review';
  return h.new_left_today > 0 ? 'new' : 'idle';
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
  <div class="aul-body min-h-full">
    <div class="flex items-center gap-2 px-3.5 py-2.5">
      <RouterLink
        to="/profile"
        class="grid size-[34px] place-items-center rounded-full bg-felt-600 font-display text-xs font-black text-white ring-[3px] ring-gold-400"
        aria-label="Профиль"
      >
        {{ me?.level ?? '…' }}
      </RouterLink>
      <StreakPill :value="home?.streak_current ?? 0" />
      <span class="flex-1" />
      <CoinPill :value="home?.altyn" />
    </div>

    <template v-if="isPending">
      <USkeleton class="h-[300px] rounded-none" />
      <div class="mx-3.5 mt-3 grid gap-3">
        <USkeleton class="h-24 rounded-[20px]" />
        <USkeleton class="h-14 rounded-[18px]" />
        <USkeleton class="h-14 rounded-[14px]" />
        <USkeleton class="h-14 rounded-[14px]" />
      </div>
    </template>

    <div v-else-if="isError || !home" class="mx-3.5 mt-24 grid justify-items-center gap-3 rounded-[20px] bg-night-800 p-6 text-center">
      <p class="text-sm font-bold">Не удалось загрузить аул.</p>
      <button type="button" class="chunky chunky-gold px-6 py-3 text-sm" :disabled="isFetching" @click="refetch()">
        Повторить
      </button>
    </div>

    <template v-else>
      <AulScene :extra-yurt="extraYurt" :extra-horse="extraHorse" :tag="tag" />

      <section class="card-milk relative mx-3.5 -mt-1.5 grid gap-2 rounded-[20px] px-3.5 py-3">
        <div class="flex items-baseline justify-between gap-2">
          <h1 class="font-display text-[15px] font-bold">{{ AUL_STAGES[stage] }}</h1>
          <span class="text-xs font-bold text-ink-2">
            {{ maxed ? `${num(home.review_words)} слов` : `${num(home.review_words)} / ${num(nextThreshold)}` }}
          </span>
        </div>
        <div class="h-3 overflow-hidden rounded-full bg-milk-2" role="progressbar" :aria-valuenow="barPct" aria-valuemin="0" aria-valuemax="100">
          <i
            class="block h-full rounded-full transition-[width] duration-500"
            :style="{
              width: barPct + '%',
              background: 'repeating-linear-gradient(-45deg, #c7382b 0 8px, #d9493b 8px 16px)',
            }"
          />
        </div>
        <div class="flex justify-between text-[11px] font-extrabold text-ink-2">
          <span v-for="s in visibleSteps" :key="s.name" :class="s.now && 'text-felt-600'">{{ s.name }}</span>
        </div>
      </section>

      <section class="grid gap-2 px-3.5 pt-4 pb-1.5">
        <button v-if="mode === 'review'" type="button" class="chunky chunky-gold w-full px-4 py-4 text-[15px]" @click="go">
          Повторить {{ words(home.due_count) }}
        </button>
        <button v-else-if="mode === 'new'" type="button" class="chunky chunky-gold w-full px-4 py-4 text-[15px]" @click="go">
          Учить новые слова
        </button>
        <div v-else class="chunky chunky-night w-full px-4 py-4 text-center text-[15px]">На сегодня всё</div>

        <div class="flex flex-wrap justify-center gap-1.5">
          <span v-if="home.due_count > 0" class="rounded-full bg-felt-600 px-2.5 py-0.5 text-[11px] font-extrabold text-white">
            {{ home.due_count }} {{ plural(home.due_count, ['слово ждёт', 'слова ждут', 'слов ждут']) }} повтора
          </span>
          <span v-if="home.new_left_today > 0" class="rounded-full bg-night-800 px-2.5 py-0.5 text-[11px] font-extrabold text-night-200">
            Новых сегодня ещё {{ home.new_left_today }}
          </span>
          <span
            v-if="mode === 'idle'"
            class="rounded-full bg-night-800 px-2.5 py-0.5 text-[11px] font-extrabold text-night-200"
          >
            Следующие слова скоро вернутся
          </span>
        </div>

        <div v-if="home.equipped.length" class="flex flex-wrap justify-center gap-1.5 pt-1">
          <span v-for="e in home.equipped" :key="e.item_id" class="rounded-lg bg-milk px-2 py-0.5 text-xs font-extrabold text-ink">
            {{ e.kk }}
          </span>
        </div>
      </section>

      <DailyTasks :tasks="home.tasks" :claiming="claiming" @claim="onClaim" />
    </template>
  </div>
</template>

<style scoped>
.aul-body {
  background: linear-gradient(#ff9f5a 0, #ffc77a 150px, #ffe6b0 290px, var(--color-night-900) 290.5px);
}
</style>
