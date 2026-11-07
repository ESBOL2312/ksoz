<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { useCities, useMe, usePatchMe, type PatchMeBody } from '@/api';
import { LEVELS, type Level, type Notify } from '@ksoz/shared';
import Art from '@/shared/art/Art.vue';
import { haptics, useBackButton } from '@/telegram';

const router = useRouter();
const toast = useToast();
const me = useMe();
const cities = useCities();
const patch = usePatchMe();

const goBack = () => router.push('/');
const hasTgBack = useBackButton(goBack);

const NONE = 'none';
const cityItems = computed(() => [
  { label: 'Не выбран', value: NONE },
  ...(cities.data.value?.cities ?? []).map((c) => ({ label: c.name_ru, value: String(c.id) })),
]);
const cityValue = computed(() => (me.data.value?.city_id == null ? NONE : String(me.data.value.city_id)));

const LEVEL_HINTS: Record<Level, string> = {
  A1: 'Начинаю',
  A2: 'Базовый',
  B1: 'Средний',
  B2: 'Свободный',
};

const REMINDERS: { key: keyof Notify; title: string }[] = [
  { key: 'short', title: 'Короткие повторы (20 мин – 5 ч)' },
  { key: 'daily', title: 'Повторы дня, утром' },
  { key: 'streak', title: 'Серия сгорает, в 20:00' },
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
  <section class="px-3.5 pt-3 pb-8">
    <button
      v-if="!hasTgBack"
      class="mb-2 inline-flex items-center gap-1 rounded-full bg-night-800 py-1.5 pr-3.5 pl-2.5 text-[13px] font-extrabold text-night-100"
      @click="goBack"
    >
      <span aria-hidden="true">‹</span> В аул
    </button>

    <div v-if="me.isPending.value" class="grid gap-3" aria-busy="true">
      <div class="h-40 animate-pulse rounded-[20px] bg-night-800" />
      <div class="h-32 animate-pulse rounded-[20px] bg-night-800" />
    </div>

    <template v-else-if="me.data.value">
      <div class="flex items-end gap-3 rounded-[20px] px-1" style="background: linear-gradient(transparent 55%, rgba(199, 56, 43, 0.25))">
        <Art name="hero" class="w-[88px] shrink-0" />
        <div class="grid gap-1 pb-3">
          <h1 class="font-display text-xl font-black break-words text-gold-400">{{ me.data.value.first_name }}</h1>
          <span class="text-[13px] font-bold text-night-200">Уровень {{ me.data.value.level }}</span>
        </div>
      </div>

      <h2 class="mt-4 mb-2 font-display text-[13px] font-bold text-gold-400">Мой уровень</h2>
      <div class="grid grid-cols-4 gap-2" role="radiogroup" aria-label="Уровень">
        <button
          v-for="l in LEVELS"
          :key="l"
          role="radio"
          :aria-checked="me.data.value.level === l"
          :disabled="patch.isPending.value"
          class="grid justify-items-center gap-0.5 rounded-2xl px-1 py-2.5 transition-colors disabled:opacity-60"
          :class="
            me.data.value.level === l
              ? 'bg-gold-400 text-ink shadow-[0_4px_0_var(--color-gold-600)]'
              : 'bg-night-800 text-night-100 shadow-[0_4px_0_#0e1838]'
          "
          @click="setLevel(l)"
        >
          <span class="font-display text-lg font-black">{{ l }}</span>
          <span class="text-[10px] font-extrabold opacity-80">{{ LEVEL_HINTS[l] }}</span>
        </button>
      </div>

      <h2 class="mt-5 mb-2 font-display text-[13px] font-bold text-gold-400">Город</h2>
      <div class="card-milk rounded-[18px] p-3">
        <USelect
          :model-value="cityValue"
          :items="cityItems"
          :loading="cities.isPending.value"
          :disabled="patch.isPending.value"
          size="xl"
          class="w-full"
          aria-label="Город"
          @update:model-value="setCity(String($event))"
        />
        <p class="mt-2 text-xs font-bold text-ink-2">Нужен для городского рейтинга в бәйге.</p>
      </div>

      <h2 class="mt-5 mb-2 font-display text-[13px] font-bold text-gold-400">Напоминания</h2>
      <div class="card-milk grid divide-y divide-milk-2 rounded-[18px] px-4">
        <div v-for="r in REMINDERS" :key="r.key" class="flex items-center justify-between gap-3 py-3">
          <span class="text-sm font-extrabold">{{ r.title }}</span>
          <USwitch
            :model-value="me.data.value.notify[r.key]"
            :disabled="patch.isPending.value"
            :aria-label="r.title"
            @update:model-value="setNotify(r.key, $event)"
          />
        </div>
      </div>

      <p class="mt-4 text-center text-xs font-bold text-night-300">
        Часовой пояс: {{ me.data.value.timezone }}
      </p>
    </template>

    <div v-else class="card-milk mt-4 grid justify-items-center gap-3 rounded-[20px] p-5 text-center">
      <p class="font-bold">Не удалось загрузить профиль</p>
      <button class="chunky chunky-sky px-5 py-3" @click="me.refetch()">Повторить</button>
    </div>
  </section>
</template>
