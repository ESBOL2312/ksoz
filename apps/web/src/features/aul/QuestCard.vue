<!-- Карточка квеста на главной: «Квест «Танысу» · шаг N из 10 · Продолжить». -->
<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { useQuests } from '@/api/queries';
import Barys from '@/shared/mascot/Barys.vue';
import { haptics } from '@/telegram';

const router = useRouter();
const { data, isPending } = useQuests();

const quest = computed(() => {
  const list = data.value?.quests ?? [];
  return list.find((q) => !q.completed) ?? list[0] ?? null;
});
const current = computed(() => quest.value?.steps.find((s) => s.status === 'current') ?? null);
const blocked = computed(() => quest.value?.current_blocked === 'daily_limit');
const pct = computed(() => (quest.value?.steps_total ? quest.value.steps_done / quest.value.steps_total : 0));
const mapUrl = computed(() => (quest.value ? `/quest/${encodeURIComponent(quest.value.slug)}` : '/quest'));

const action = computed(() => {
  if (!quest.value || quest.value.completed) return 'Карта квеста';
  if (blocked.value) return 'Шаг завтра';
  return quest.value.steps_done ? 'Продолжить' : 'Бастау';
});

function go() {
  haptics.tap();
  const q = quest.value;
  if (!q) return;
  // текущий шаг сразу; если он сегодня закрыт или квест пройден — карта
  if (current.value && !blocked.value && !q.completed) void router.push(`${mapUrl.value}/${current.value.n}`);
  else void router.push(mapUrl.value);
}
</script>

<template>
  <USkeleton v-if="isPending" class="h-[92px] rounded-card" />
  <div v-else-if="quest" class="flex items-center gap-3 overflow-hidden rounded-card bg-surface py-3 pr-3 pl-2">
    <Barys :mood="quest.completed ? 'happy' : blocked ? 'sleep' : 'wave'" :animated="false" class="-mb-4 w-14 shrink-0 self-end" />
    <RouterLink :to="mapUrl" class="grid min-w-0 flex-1 gap-1">
      <span class="text-footnote text-label-2">
        Квест «{{ quest.title_kk }}» · {{ quest.completed ? 'пройден' : `шаг ${current?.n ?? quest.steps_done + 1} из ${quest.steps_total}` }}
      </span>
      <b class="text-headline break-words">{{ quest.completed ? quest.title_ru : (current?.title_kk ?? quest.title_kk) }}</b>
      <span class="h-1.5 overflow-hidden rounded-full bg-surface-2" aria-hidden="true">
        <i class="block h-full origin-left rounded-full bg-ok" :style="{ transform: `scaleX(${pct})` }" />
      </span>
    </RouterLink>
    <button type="button" class="btn btn-secondary min-h-11 shrink-0 px-3.5 text-subhead" @click="go">{{ action }}</button>
  </div>
</template>
