<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import { api, ApiError, usePatchMe } from '@/api';
import type { ImportLocalBody } from '@/api';
import type { Level } from '@ksoz/shared';
import Art from '@/shared/art/Art.vue';
import { haptics, safeLocal } from '@/telegram';
import { useSessionStore } from '@/stores/session';
import { PROTOTYPE_WORDS } from './prototypeWords';

const router = useRouter();
const session = useSessionStore();
const toast = useToast();
const patch = usePatchMe();

type Step = 'hello' | 'level' | 'import';
const step = ref<Step>('hello');

const LEVEL_OPTIONS: { level: Level; text: string }[] = [
  { level: 'A1', text: 'Начинаю с нуля' },
  { level: 'A2', text: 'Знаю базовые слова' },
  { level: 'B1', text: 'Понимаю простые тексты' },
  { level: 'B2', text: 'Говорю свободно' },
];

// Прогресс старой версии (прототип хранит его в localStorage; ключ в docs/prototype: kz-srs-v1)
const PROTOTYPE_KEYS = ['kz-srs-v1', 'kazakh-srs-v1'];
function readPrototype(): ImportLocalBody | null {
  for (const key of PROTOTYPE_KEYS) {
    const raw = safeLocal(() => localStorage.getItem(key));
    if (!raw) continue;
    try {
      const cards = (JSON.parse(raw) as { cards?: ImportLocalBody['cards'] }).cards;
      if (cards && Object.keys(cards).length > 0) return { cards, words: PROTOTYPE_WORDS };
    } catch {
      /* битые данные не переносим */
    }
  }
  return null;
}
const legacy = ref<ImportLocalBody | null>(readPrototype());
const legacyCount = computed(() => Object.keys(legacy.value?.cards ?? {}).length);

const busy = ref(false);

async function pickLevel(level: Level) {
  if (busy.value) return;
  haptics.select();
  busy.value = true;
  try {
    await patch.mutateAsync({ level });
  } catch {
    busy.value = false;
    toast.add({ title: 'Не удалось сохранить уровень', color: 'error' });
    return;
  }
  busy.value = false;
  if (legacy.value) step.value = 'import';
  else await finish();
}

async function doImport() {
  if (!legacy.value || busy.value) return;
  busy.value = true;
  try {
    const res = await api.importLocal(legacy.value);
    toast.add({ title: `Перенесено слов: ${res.imported}`, color: 'success' });
  } catch (e) {
    // 409 already_imported: уже переносили, молча идём дальше
    if (!(e instanceof ApiError && e.status === 409)) {
      busy.value = false;
      toast.add({ title: 'Не удалось перенести прогресс', description: 'Попробуй ещё раз или пропусти', color: 'error' });
      return;
    }
  }
  await finish();
}

async function finish() {
  busy.value = true;
  await session.markOnboarded();
  await router.replace('/');
}
</script>

<template>
  <main class="mx-auto flex min-h-dvh max-w-md flex-col px-4 pt-6 pb-8">
    <!-- 1. приветствие -->
    <template v-if="step === 'hello'">
      <div class="grid flex-1 content-center justify-items-center gap-5 text-center">
        <h1 class="font-display text-[44px] leading-none font-black text-gold-400 [text-shadow:0_4px_0_var(--color-felt-800)]">
          Сөз ауылы
        </h1>
        <div class="relative h-56 w-full">
          <Art name="yurt" class="absolute bottom-0 left-1/2 w-56 -translate-x-[40%]" />
          <Art name="horse" class="absolute bottom-0 left-2 w-24" />
          <Art name="hero" class="absolute bottom-0 left-[26%] w-[84px] [animation:bob_2.4s_ease-in-out_infinite]" />
        </div>
        <ul class="grid gap-2 text-left text-[15px] font-bold text-night-100">
          <li class="flex items-center gap-3 rounded-2xl bg-night-800 px-4 py-3">
            <Art name="horn" class="size-6 shrink-0 text-gold-400" />Учишь казахские слова
          </li>
          <li class="flex items-center gap-3 rounded-2xl bg-night-800 px-4 py-3">
            <Art name="coin" class="size-6 shrink-0" />Получаешь алтын за верные ответы
          </li>
          <li class="flex items-center gap-3 rounded-2xl bg-night-800 px-4 py-3">
            <Art name="yurt" class="size-6 shrink-0" />Строишь свой аул и скачешь в бәйге
          </li>
        </ul>
      </div>
      <button class="chunky chunky-gold mt-6 w-full px-4 py-4 text-base" @click="step = 'level'">Бастау</button>
    </template>

    <!-- 2. уровень -->
    <template v-else-if="step === 'level'">
      <div class="grid flex-1 content-center gap-5">
        <div class="grid justify-items-center gap-3 text-center">
          <Art name="hero" class="w-20" />
          <h1 class="font-display text-2xl font-black text-gold-400">Какой у тебя уровень?</h1>
          <p class="text-sm font-bold text-night-200">Подберём слова под тебя. Потом можно поменять в профиле.</p>
        </div>
        <div class="grid gap-3">
          <button
            v-for="o in LEVEL_OPTIONS"
            :key="o.level"
            :disabled="busy"
            class="card-milk flex items-center gap-4 rounded-[20px] px-4 py-3.5 text-left transition-transform active:translate-y-1 disabled:opacity-60"
            @click="pickLevel(o.level)"
          >
            <span class="grid size-12 shrink-0 place-items-center rounded-full bg-felt-600 font-display text-lg font-black text-white shadow-[0_0_0_3px_var(--color-gold-400)]">{{
              o.level
            }}</span>
            <span class="font-display text-[15px] font-bold">{{ o.text }}</span>
          </button>
        </div>
      </div>
    </template>

    <!-- 3. перенос прогресса -->
    <template v-else>
      <div class="grid flex-1 content-center justify-items-center gap-5 text-center">
        <Art name="yurt" class="w-40" />
        <h1 class="font-display text-2xl font-black text-gold-400">Перенести прогресс из старой версии?</h1>
        <p class="max-w-xs text-sm font-bold text-night-200">
          Нашли твои слова из прототипа: {{ legacyCount }}. Перенесём их в повторы, ничего не потеряется.
        </p>
      </div>
      <div class="mt-6 grid gap-3">
        <button class="chunky chunky-gold w-full px-4 py-4 text-base" :disabled="busy" @click="doImport">Перенести</button>
        <button class="chunky chunky-night w-full px-4 py-3.5 text-[15px]" :disabled="busy" @click="finish">Начать заново</button>
      </div>
    </template>
  </main>
</template>
