<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import { api, ApiError, usePatchMe } from '@/api';
import type { ImportLocalBody } from '@/api';
import type { Level } from '@ksoz/shared';
import Art from '@/shared/art/Art.vue';
import Barys from '@/shared/mascot/Barys.vue';
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
  <main class="mx-auto flex min-h-dvh max-w-md flex-col px-4 pt-6" style="padding-bottom: calc(16px + var(--tg-safe-bottom))">
    <!-- 1. приветствие -->
    <template v-if="step === 'hello'">
      <div class="grid flex-1 content-center justify-items-center gap-5 text-center">
        <h1 class="text-large-title">Сөз ауылы</h1>
        <div class="relative h-56 w-full overflow-hidden rounded-card bg-sky-art">
          <div class="absolute inset-x-[-20%] -bottom-20 h-36 rounded-[50%] bg-[#9cc25a]" aria-hidden="true" />
          <Art name="yurt" class="absolute right-2 bottom-6 w-36" />
          <Barys mood="wave" hat class="absolute -bottom-2 left-[4%] w-40" label="Барыс" />
          <div class="absolute top-3 right-3 max-w-[11rem] rounded-control bg-white px-3 py-2 text-left text-subhead text-[#0f1b24]">
            Сәлем! Мен <b class="font-semibold text-[#0a72b5]">Барыс</b>. Үйренейік қазақша!
          </div>
        </div>
        <ul class="group-list w-full text-left">
          <li class="flex min-h-12 items-center gap-3 px-4 py-2 text-body">
            <Art name="horn" class="size-6 shrink-0 text-altyn-label" />Учишь казахские слова
          </li>
          <li class="flex min-h-12 items-center gap-3 px-4 py-2 text-body"><Art name="coin" class="size-6 shrink-0" />Получаешь алтын за верные ответы</li>
          <li class="flex min-h-12 items-center gap-3 px-4 py-2 text-body"><Art name="yurt" class="size-6 shrink-0" />Строишь свой аул и скачешь в бәйге</li>
        </ul>
      </div>
      <button type="button" class="btn btn-primary mt-6 w-full" @click="step = 'level'">Бастау</button>
    </template>

    <!-- 2. уровень -->
    <template v-else-if="step === 'level'">
      <div class="grid flex-1 content-center gap-5">
        <div class="grid justify-items-center gap-2 text-center">
          <Barys mood="think" class="w-28" />
          <h1 class="text-title1">Какой у тебя уровень?</h1>
          <p class="text-body text-label-2">Подберём слова под тебя. Потом можно поменять в профиле.</p>
        </div>
        <ul class="group-list">
          <li v-for="o in LEVEL_OPTIONS" :key="o.level">
            <button
              type="button"
              :disabled="busy"
              class="flex min-h-14 w-full items-center gap-4 px-4 py-2.5 text-left active:bg-surface-2 disabled:opacity-60"
              @click="pickLevel(o.level)"
            >
              <span class="grid size-11 shrink-0 place-items-center rounded-full bg-kok-600 text-headline text-white">{{ o.level }}</span>
              <span class="flex-1 text-body">{{ o.text }}</span>
              <svg width="8" height="14" viewBox="0 0 8 14" class="text-label-3" aria-hidden="true">
                <path d="M1.5 1.5L6.5 7l-5 5.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
            </button>
          </li>
        </ul>
      </div>
    </template>

    <!-- 3. перенос прогресса -->
    <template v-else>
      <div class="grid flex-1 content-center justify-items-center gap-4 text-center">
        <Barys mood="happy" class="w-36" />
        <h1 class="text-title1">Перенести прогресс из старой версии?</h1>
        <p class="max-w-xs text-body text-label-2">Нашли твои слова из прототипа: {{ legacyCount }}. Перенесём их в повторы, ничего не потеряется.</p>
      </div>
      <div class="mt-6 grid gap-3">
        <button type="button" class="btn btn-primary w-full" :disabled="busy" @click="doImport">Перенести</button>
        <button type="button" class="btn btn-secondary w-full" :disabled="busy" @click="finish">Начать заново</button>
      </div>
    </template>
  </main>
</template>
