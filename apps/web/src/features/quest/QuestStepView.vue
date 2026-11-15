<script setup lang="ts">
import { useQueryClient } from '@tanstack/vue-query';
import { computed, onBeforeUnmount, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { invalidateAfterLesson, qk, setBalance, useQuests } from '@/api';
import Art from '@/shared/art/Art.vue';
import Barys from '@/shared/mascot/Barys.vue';
import { getWebApp, supports, useBackButton } from '@/telegram';
import { useQuestStore } from '@/stores/quest';
import ChoiceCards from './ChoiceCards.vue';
import GapText from './GapText.vue';
import QuestDialog from './QuestDialog.vue';
import QuestNewCard from './QuestNewCard.vue';
import QuestStepResult from './QuestStepResult.vue';

const quest = useQuestStore();
const route = useRoute();
const router = useRouter();
const qc = useQueryClient();
const quests = useQuests();

const slug = computed(() => String(route.params.slug ?? ''));
const n = computed(() => Number(route.params.n) || 1);
const begin = () => quest.start(slug.value, n.value);

const toMap = () => void router.push(`/quest/${encodeURIComponent(slug.value)}`);
useBackButton(toMap);

onMounted(() => {
  if (supports('7.7')) getWebApp()?.disableVerticalSwipes?.();
  void begin();
});
onBeforeUnmount(() => {
  if (supports('7.7')) getWebApp()?.enableVerticalSwipes?.();
});
// «Следующий шаг» меняет только параметр маршрута: компонент тот же
watch(
  () => route.fullPath,
  (p, old) => {
    if (p !== old && route.name === 'quest-step') void begin();
  },
);

watch(
  () => quest.stage,
  (s) => {
    if (s !== 'result') return;
    invalidateAfterLesson(qc);
    void qc.invalidateQueries({ queryKey: qk.quests });
    if (quest.balance != null) setBalance(qc, quest.balance);
  },
);

/** Сегодня новых слов на этот шаг не хватает (лимит общий с обычным режимом). */
const summary = computed(() => quests.data.value?.quests.find((q) => q.slug === slug.value));
const blocked = computed(() => {
  const s = summary.value;
  const cur = s?.steps.find((x) => x.status === 'current');
  return !!s && s.current_blocked === 'daily_limit' && cur?.n === n.value && !!quest.step?.items.some((i) => i.state === 'new');
});

const SECTION_TITLES = { review: 'Повторим', new: 'Новые слова', choose: 'Выбери верное', life: 'В жизни', dialog: 'Разговор' } as const;
const SECTION_HINTS = {
  review: 'Вспомни слова из прошлых шагов',
  new: 'Познакомься со словами шага',
  choose: 'Проверь себя карточками',
  life: 'Вставь слово во фразу',
  dialog: 'Поговори по-казахски сам',
} as const;
const inSection = computed(() => (['review', 'new', 'choose', 'life', 'dialog'] as const).find((s) => s === quest.stage));

const ERRORS: Record<string, string> = {
  network: 'Нет связи. Проверь интернет и попробуй ещё раз.',
  daily_limit_reached: 'Лимит новых слов на сегодня закончился. Возвращайся завтра, а пока можно повторить слова.',
  step_locked: 'Этот шаг пока закрыт. Сначала пройди предыдущие.',
  step_words_missing: 'Не все слова шага взяты в изучение. Пройди шаг ещё раз.',
  step_not_found: 'Такого шага нет.',
  quest_not_found: 'Такого квеста нет.',
};
const errorText = (code: string | null) => (code ? (ERRORS[code] ?? 'Что-то пошло не так. Попробуй ещё раз.') : '');

const nextLabel = computed(() => {
  if (quest.stage === 'review' && !quest.reviewRes && !quest.reviewOffline && !quest.error) return '';
  return 'Дальше';
});
const feedback = computed(() => {
  if (!quest.answered) return null;
  if (quest.stage === 'review' && quest.reviewOffline) return { ok: true, text: 'Ответ сохранён, отправим, когда появится сеть' };
  if (quest.stage === 'review' && quest.error) return { ok: false, text: errorText(quest.error) };
  if (quest.isRight) return { ok: true, text: quest.stage === 'review' && quest.reviewRes?.altyn.earned ? `Дұрыс! +${quest.reviewRes.altyn.earned} алтын` : 'Дұрыс!' };
  return { ok: false, text: quest.stage === 'choose' ? 'Верный ответ подсвечен. Это задание вернётся в конце' : 'Посмотри верный ответ' };
});

const reviewOptions = computed(() => quest.reviewCard?.options ?? []);
</script>

<template>
  <div class="mx-auto flex min-h-dvh w-full max-w-[430px] flex-col gap-3 px-4 pt-2" style="padding-bottom: calc(16px + var(--tg-safe-bottom))">
    <!-- шапка: выход и прогресс шага -->
    <div v-if="quest.stage !== 'result'" class="-ml-3 flex items-center gap-2">
      <button type="button" class="grid size-11 shrink-0 place-items-center text-label-2" aria-label="К карте квеста" @click="toMap">
        <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" />
        </svg>
      </button>
      <div
        class="h-2 flex-1 overflow-hidden rounded-full bg-surface-2"
        role="progressbar"
        aria-label="Прогресс шага"
        :aria-valuenow="Math.round(quest.progress * 100)"
        aria-valuemin="0"
        aria-valuemax="100"
      >
        <div class="h-full origin-left rounded-full bg-accent transition-transform duration-300" :style="{ transform: `scaleX(${quest.progress})` }" />
      </div>
      <span class="shrink-0 text-subhead font-semibold text-label-2 tabular-nums">{{ n }}/{{ quest.step?.steps_total ?? 10 }}</span>
    </div>

    <div v-if="quest.stage === 'idle' || quest.stage === 'loading'" class="grid flex-1 content-start gap-3" aria-busy="true">
      <div class="h-5 w-1/2 animate-pulse rounded-full bg-surface" />
      <div class="h-56 animate-pulse rounded-card bg-surface" />
      <div class="grid grid-cols-2 gap-2.5">
        <div v-for="i in 4" :key="i" class="h-[4.5rem] animate-pulse rounded-card bg-surface" />
      </div>
    </div>

    <!-- вступление Барыса -->
    <div v-else-if="quest.stage === 'intro' && quest.step" class="flex flex-1 flex-col">
      <div class="grid flex-1 content-center justify-items-center gap-3 text-center">
        <span class="rounded-full bg-surface-2 px-3 py-1 text-footnote font-medium">Шаг {{ quest.step.n }} из {{ quest.step.steps_total }}</span>
        <h1 class="text-large-title">{{ quest.step.title_kk }}</h1>
        <p class="-mt-2 text-body text-label-2">{{ quest.step.title_ru }}</p>
        <div class="mt-2 flex items-end gap-1">
          <Barys mood="wave" class="w-28 shrink-0" label="Барыс" />
          <p class="enter-up mb-10 max-w-[13rem] rounded-card rounded-bl-md bg-surface px-3.5 py-2.5 text-left text-subhead">{{ quest.step.intro_ru }}</p>
        </div>
        <ul class="group-list w-full text-left">
          <li v-for="s in quest.sections" :key="s" class="flex min-h-12 items-center gap-3 px-4 py-2">
            <span class="size-2 shrink-0 rounded-full bg-accent" aria-hidden="true" />
            <span class="grid">
              <span class="text-body">{{ SECTION_TITLES[s] }}</span>
              <span class="text-footnote text-label-3">{{ SECTION_HINTS[s] }}</span>
            </span>
          </li>
        </ul>
      </div>
      <template v-if="blocked">
        <p class="mb-3 rounded-card bg-surface p-3 text-center text-subhead text-label-2">
          Сегодняшний лимит новых слов уже использован. Этот шаг откроется завтра, а пока можно повторить слова.
        </p>
        <div class="grid gap-2">
          <button type="button" class="btn btn-primary w-full" @click="router.push('/lesson?only=review')">Повторить слова</button>
          <button type="button" class="btn-plain w-full" @click="toMap">К карте квеста</button>
        </div>
      </template>
      <button v-else type="button" class="btn btn-primary w-full" @click="quest.begin()">Бастау</button>
    </div>

    <!-- разделы шага -->
    <template v-else-if="inSection && quest.step">
      <div class="flex items-center justify-between gap-2">
        <h2 class="text-headline">{{ SECTION_TITLES[inSection] }}</h2>
        <span v-if="inSection !== 'dialog'" class="rounded-full bg-surface-2 px-2.5 py-0.5 text-footnote font-medium tabular-nums">
          {{ quest.position.at }} из {{ quest.position.of }}
        </span>
      </div>

      <!-- 1. повтор: выбери казахское слово -->
      <div v-if="quest.stage === 'review' && quest.reviewCard" :key="`r${quest.index}`" class="enter-up flex flex-1 flex-col gap-3">
        <article class="grid gap-1 rounded-card bg-surface p-4">
          <span class="text-footnote text-label-2">Как по-казахски?</span>
          <b class="text-title1">{{ quest.reviewCard.ru }}</b>
        </article>
        <ChoiceCards :options="reviewOptions" :picked="quest.picked" :correct="quest.correct" :disabled="quest.busy" @pick="quest.pickReview" />
      </div>

      <!-- 2. новые слова -->
      <div v-else-if="quest.stage === 'new' && quest.item" :key="`n${quest.index}`" class="flex flex-1 flex-col gap-3">
        <QuestNewCard :item="quest.item" />
        <p v-if="quest.error" class="text-center text-footnote text-danger" aria-live="polite">{{ errorText(quest.error) }}</p>
        <div class="mt-auto grid gap-2">
          <button type="button" class="btn btn-primary w-full" :disabled="quest.busy" @click="quest.introduceItem()">
            {{ quest.item.state === 'learning' ? 'Дальше' : 'Түсіндім' }}
          </button>
          <p class="text-center text-footnote text-label-3">
            {{ quest.item.state === 'learning' ? 'Это слово ты уже учишь' : 'Сейчас проверим, потом повторим через 20 минут' }}
          </p>
        </div>
      </div>

      <!-- 3. выбор карточек -->
      <div v-else-if="quest.stage === 'choose' && quest.task" :key="quest.task.id" class="enter-up flex flex-1 flex-col gap-3">
        <article class="grid gap-1 rounded-card bg-surface p-4">
          <span class="text-footnote text-label-2">{{ quest.task.dir === 'kk-ru' ? 'Что это значит?' : 'Как по-казахски?' }}</span>
          <b class="text-title1 break-words" :class="quest.task.dir === 'kk-ru' && 'text-word'">{{ quest.task.prompt }}</b>
        </article>
        <ChoiceCards
          :options="quest.task.options"
          :picked="quest.picked"
          :correct="quest.correct"
          :lang="quest.task.dir === 'kk-ru' ? 'ru' : 'kk'"
          @pick="quest.pickChoice"
        />
      </div>

      <!-- 4. в жизни -->
      <div v-else-if="quest.stage === 'life' && quest.life" :key="`l${quest.index}`" class="enter-up flex flex-1 flex-col gap-3">
        <div class="flex items-start gap-2">
          <Barys mood="think" :animated="false" class="w-12 shrink-0" />
          <p class="rounded-card rounded-tl-md bg-surface px-3.5 py-2.5 text-subhead">{{ quest.life.situation_ru }}</p>
        </div>
        <article class="grid gap-2 rounded-card bg-surface p-4">
          <span class="text-footnote text-label-2">Что скажешь?</span>
          <GapText :text="quest.life.text" :answer="quest.answered ? quest.life.answer : null" />
          <p v-if="quest.answered" class="enter-up text-subhead text-label-2">{{ quest.life.ru }}</p>
        </article>
        <ChoiceCards :options="quest.life.options" :picked="quest.picked" :correct="quest.correct" @pick="quest.pickLife" />
      </div>

      <!-- 5. диалог последнего шага -->
      <QuestDialog v-else-if="quest.stage === 'dialog'" />

      <!-- отклик и «Дальше» -->
      <div v-if="quest.stage !== 'new' && quest.stage !== 'dialog'" class="mt-auto grid min-h-[86px] content-end gap-2 pt-1">
        <p
          v-if="feedback"
          class="enter-up flex items-center justify-center gap-1.5 text-center text-subhead font-medium"
          :class="feedback.ok ? 'text-ok-label' : 'text-danger'"
          aria-live="polite"
        >
          <Art v-if="feedback.ok && quest.stage === 'review' && quest.reviewRes?.altyn.earned" name="coin" class="size-5" />{{ feedback.text }}
        </p>
        <button v-if="quest.answered && nextLabel" type="button" class="enter-up btn btn-primary w-full" @click="quest.next()">{{ nextLabel }}</button>
      </div>
    </template>

    <!-- отправка итога -->
    <div v-else-if="quest.stage === 'completing'" class="flex flex-1 flex-col">
      <div class="grid flex-1 content-center justify-items-center gap-3 text-center">
        <Barys :mood="quest.error ? 'sad' : 'think'" class="w-32" />
        <h1 class="text-title2">{{ quest.error ? 'Не получилось сохранить шаг' : 'Сохраняем…' }}</h1>
        <p v-if="quest.error" class="max-w-[18rem] text-body text-label-2">{{ errorText(quest.error) }}</p>
      </div>
      <button v-if="quest.error" type="button" class="btn btn-primary w-full" :disabled="quest.busy" @click="quest.finish()">Повторить</button>
    </div>

    <QuestStepResult v-else-if="quest.stage === 'result'" @next="(m) => router.replace(`/quest/${encodeURIComponent(slug)}/${m}`)" @map="toMap" />

    <div v-else-if="quest.stage === 'error'" class="flex flex-1 flex-col">
      <div class="grid flex-1 content-center justify-items-center gap-3 text-center">
        <Barys mood="sad" class="w-36" />
        <h1 class="text-title2">{{ quest.error === 'network' ? 'Нет связи с сервером' : 'Не удалось открыть шаг' }}</h1>
        <p class="max-w-[18rem] text-body text-label-2">{{ errorText(quest.error) }}</p>
      </div>
      <div class="grid gap-3">
        <button v-if="quest.error === 'network' || !quest.error?.startsWith('step_')" type="button" class="btn btn-primary w-full" @click="begin()">Повторить</button>
        <button type="button" class="btn btn-secondary w-full" @click="toMap">К карте квеста</button>
      </div>
    </div>
  </div>
</template>
