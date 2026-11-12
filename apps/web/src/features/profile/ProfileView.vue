<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { useCities, useHome, useMe, usePatchMe, type PatchMeBody } from '@/api';
import Barys from '@/shared/mascot/Barys.vue';
import { wearFrom } from '@/shared/mascot/mascot';
import { days } from '@/shared/format';
import { LEVELS, type Level, type Notify } from '@ksoz/shared';
import { haptics, useBackButton } from '@/telegram';

const router = useRouter();
const toast = useToast();
const me = useMe();
const cities = useCities();
const patch = usePatchMe();
const home = useHome();
const wear = computed(() => wearFrom(home.data.value?.equipped));

const goBack = () => router.push('/');
const hasTgBack = useBackButton(goBack);

const NONE = 'none';
const cityItems = computed(() => [
  { label: 'Не выбран', value: NONE },
  ...(cities.data.value?.cities ?? []).map((c) => ({ label: c.name_ru, value: String(c.id) })),
]);
const cityValue = computed(() => (me.data.value?.city_id == null ? NONE : String(me.data.value.city_id)));

const LEVEL_HINTS: Record<Level, string> = {
  A1: 'начинаю с нуля',
  A2: 'знаю базовые слова',
  B1: 'понимаю простые тексты',
  B2: 'говорю свободно',
};

const REMINDERS: { key: keyof Notify; title: string; hint?: string }[] = [
  { key: 'short', title: 'Короткие повторы', hint: 'Через 20 минут – 5 часов' },
  { key: 'daily', title: 'Повторы дня', hint: 'Утром' },
  { key: 'streak', title: 'Серия сгорает', hint: 'В 20:00' },
  { key: 'baige', title: 'Итоги бәйге' },
];

function save(body: PatchMeBody) {
  patch.mutate(body, {
    onSuccess: () => {
      haptics.success();
      toast.add({ title: 'Сохранено', color: 'success' });
    },
    onError: () => toast.add({ title: 'Не удалось сохранить', color: 'error' }),
  });
}

function setLevel(l: Level) {
  if (l === me.data.value?.level) return;
  haptics.select();
  save({ level: l });
}
function setCity(v: string) {
  save({ city_id: v === NONE ? null : Number(v) });
}
function setNotify(key: keyof Notify, value: boolean) {
  save({ notify: { [key]: value } });
}
</script>

<template>
  <section class="pb-8">
    <div class="grid h-11 grid-cols-[1fr_auto_1fr] items-center px-2">
      <button v-if="!hasTgBack" type="button" class="btn-plain justify-self-start px-2 text-body" @click="goBack">
        <svg width="12" height="20" viewBox="0 0 12 20" class="mr-1" aria-hidden="true">
          <path d="M10 2L2 10l8 8" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
        Ауыл
      </button>
      <span v-else />
      <h1 class="text-headline">Профиль</h1>
      <span />
    </div>

    <div v-if="me.isPending.value" class="mx-4 mt-2 grid gap-3" aria-busy="true">
      <div class="h-28 animate-pulse rounded-card bg-surface" />
      <div class="h-40 animate-pulse rounded-card bg-surface" />
    </div>

    <template v-else-if="me.data.value">
      <div class="mx-4 mt-2 flex h-28 items-end gap-2 overflow-hidden rounded-card bg-surface pr-4">
        <Barys mood="wave" v-bind="wear" class="-mb-3.5 w-[110px] shrink-0" />
        <div class="grid gap-0.5 self-center">
          <span class="text-title2 break-words">{{ me.data.value.first_name }}</span>
          <span class="text-footnote text-label-2">
            Уровень {{ me.data.value.level }} · серия {{ days(me.data.value.streak_current) }}, рекорд {{ me.data.value.streak_best }}
          </span>
        </div>
      </div>

      <h2 class="mx-8 mt-6 mb-1.5 text-footnote font-medium text-label-3">Мой уровень</h2>
      <div class="segmented mx-4" role="radiogroup" aria-label="Уровень">
        <button
          v-for="l in LEVELS"
          :key="l"
          type="button"
          role="radio"
          class="segment text-subhead"
          :aria-checked="me.data.value.level === l"
          :disabled="patch.isPending.value"
          @click="setLevel(l)"
        >
          {{ l }}
        </button>
      </div>
      <p class="mx-8 mt-1.5 text-footnote text-label-3">{{ me.data.value.level }}, {{ LEVEL_HINTS[me.data.value.level] }}. Новые слова подбираем под этот уровень.</p>

      <h2 class="mx-8 mt-6 mb-1.5 text-footnote font-medium text-label-3">Город</h2>
      <div class="mx-4 rounded-card bg-surface p-2">
        <USelect
          :model-value="cityValue"
          :items="cityItems"
          :loading="cities.isPending.value"
          :disabled="patch.isPending.value"
          size="xl"
          variant="none"
          class="w-full text-body"
          aria-label="Город"
          @update:model-value="setCity(String($event))"
        />
      </div>
      <p class="mx-8 mt-1.5 text-footnote text-label-3">Нужен для городского рейтинга в бәйге.</p>

      <h2 class="mx-8 mt-6 mb-1.5 text-footnote font-medium text-label-3">Напоминания</h2>
      <ul class="group-list mx-4">
        <li v-for="r in REMINDERS" :key="r.key" class="flex min-h-12 items-center justify-between gap-3 py-2 pr-4 pl-4">
          <span class="grid">
            <span class="text-body">{{ r.title }}</span>
            <span v-if="r.hint" class="text-footnote text-label-3">{{ r.hint }}</span>
          </span>
          <USwitch
            :model-value="me.data.value.notify[r.key]"
            :disabled="patch.isPending.value"
            :aria-label="r.title"
            color="success"
            size="xl"
            @update:model-value="setNotify(r.key, $event)"
          />
        </li>
      </ul>
      <p class="mx-8 mt-1.5 text-footnote text-label-3">Не больше трёх напоминаний в день. Часовой пояс: {{ me.data.value.timezone }}.</p>
    </template>

    <div v-else class="mx-4 mt-4 grid justify-items-center gap-4 rounded-card bg-surface p-5 text-center">
      <p class="text-body">Не удалось загрузить профиль</p>
      <button type="button" class="btn btn-primary w-full" @click="me.refetch()">Повторить</button>
    </div>
  </section>
</template>
