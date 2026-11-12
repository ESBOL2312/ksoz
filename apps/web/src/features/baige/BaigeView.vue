<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useBaige, useInvite, useMe, type BaigeScope } from '@/api';
import Art from '@/shared/art/Art.vue';
import Barys from '@/shared/mascot/Barys.vue';
import { days, num } from '@/shared/format';
import { getWebApp, haptics } from '@/telegram';

const router = useRouter();
const toast = useToast();
const me = useMe();
const invite = useInvite();

const SCOPES: { value: BaigeScope; label: string }[] = [
  { value: 'friends', label: 'Друзья' },
  { value: 'city', label: 'Город' },
  { value: 'kz', label: 'Казахстан' },
];
const scope = ref<BaigeScope>('friends');
const baige = useBaige(scope);

const myId = computed(() => me.data.value?.id);
const noCity = computed(() => scope.value === 'city' && me.data.value && me.data.value.city_id == null);

const top = computed(() => baige.data.value?.top ?? []);
const riders = computed(() => top.value.slice(0, 5));
const maxScore = computed(() => Math.max(1, ...riders.value.map((r) => r.score)));
const meInTop = computed(() => top.value.some((r) => r.user_id === myId.value));
const showMeExtra = computed(() => !!baige.data.value && !meInTop.value && !!me.data.value);

// Скакуны выезжают со старта один раз после монтирования
const started = ref(false);
let raf = 0;
onMounted(() => {
  raf = requestAnimationFrame(() => {
    raf = requestAnimationFrame(() => (started.value = true));
  });
});
onBeforeUnmount(() => cancelAnimationFrame(raf));

const ratio = (score: number) => (started.value ? score / maxScore.value : 0);
const isMe = (id: number) => id === myId.value;
const label = (r: { user_id: number; first_name: string }) => (isMe(r.user_id) ? 'Сен' : r.first_name);

const COLORS = ['#0A72B5', '#B3261E', '#2E7D32', '#8A4B2A', '#8A5A00', '#5B4FB0'];
const color = (id: number) => COLORS[Math.abs(id) % COLORS.length];
const initial = (name: string) => (name.trim()[0] ?? '?').toUpperCase();

// Время до конца ISO-недели: следующий понедельник 00:00 по местному времени
const now = ref(Date.now());
const timer = setInterval(() => (now.value = Date.now()), 60_000);
onBeforeUnmount(() => clearInterval(timer));
const timeLeft = computed(() => {
  const d = new Date(now.value);
  const end = new Date(d.getFullYear(), d.getMonth(), d.getDate() + (8 - (d.getDay() || 7)));
  const mins = Math.max(0, Math.floor((end.getTime() - d.getTime()) / 60_000));
  const dd = Math.floor(mins / 1440);
  const hh = Math.floor((mins % 1440) / 60);
  const mm = mins % 60;
  if (dd > 0) return `${days(dd)} ${hh} ч`;
  if (hh > 0) return `${hh} ч ${mm} мин`;
  return `${mm} мин`;
});
async function inviteFriend() {
  haptics.tap();
  let link = invite.data.value?.link;
  if (!link) link = (await invite.refetch()).data?.link;
  if (!link) {
    toast.add({ title: 'Не удалось получить ссылку', color: 'error' });
    return;
  }
  const text = 'Учим казахский вместе в Сөз ауылы!';
  const wa = getWebApp();
  if (wa) {
    wa.openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(text)}`);
    return;
  }
  try {
    if (navigator.share) {
      await navigator.share({ url: link, text });
      return;
    }
    await navigator.clipboard.writeText(link);
    toast.add({ title: 'Ссылка скопирована', description: 'Отправь её другу' });
  } catch (e) {
    if ((e as Error).name !== 'AbortError') toast.add({ title: 'Не удалось поделиться', color: 'error' });
  }
}
</script>

<template>
  <section class="pb-6">
    <header class="px-4 pt-3">
      <h1 class="text-large-title">Бәйге</h1>
      <p class="mt-0.5 text-subhead text-label-2">Скачки недели. До финиша {{ timeLeft }}.</p>
    </header>

    <div class="segmented mx-4 mt-4" role="tablist" aria-label="Соперники">
      <button v-for="s in SCOPES" :key="s.value" type="button" role="tab" class="segment" :aria-selected="scope === s.value" @click="scope = s.value">
        {{ s.label }}
      </button>
    </div>

    <!-- город не выбран -->
    <div v-if="noCity" class="mx-4 mt-4 grid justify-items-center gap-3 rounded-card bg-surface p-5 text-center">
      <Barys mood="think" class="w-28" />
      <h2 class="text-title3">Выбери город в профиле</h2>
      <p class="text-subhead text-label-2">Тогда ты увидишь скачки земляков и сможешь обогнать их.</p>
      <button type="button" class="btn btn-primary w-full" @click="router.push('/profile')">Открыть профиль</button>
    </div>

    <!-- загрузка -->
    <div v-else-if="baige.isPending.value" class="mx-4 mt-4 grid gap-3" aria-busy="true">
      <div class="h-44 animate-pulse rounded-card bg-surface" />
      <div class="h-56 animate-pulse rounded-card bg-surface" />
    </div>

    <div v-else-if="baige.isError.value" class="mx-4 mt-4 grid justify-items-center gap-4 rounded-card bg-surface p-5 text-center">
      <p class="text-body">Не удалось загрузить бәйге</p>
      <button type="button" class="btn btn-primary w-full" @click="baige.refetch()">Повторить</button>
    </div>

    <template v-else-if="baige.data.value">
      <!-- пустые друзья -->
      <div v-if="scope === 'friends' && top.every((r) => isMe(r.user_id))" class="mx-4 mt-4 grid justify-items-center gap-3 rounded-card bg-surface p-5 text-center">
        <Barys mood="wave" class="w-32" />
        <h2 class="text-title3">Пока ты один на старте</h2>
        <p class="text-subhead text-label-2">Позови друга, и вы поскачете наперегонки: чья неделя будет богаче на верные ответы.</p>
        <button type="button" class="btn btn-primary w-full" @click="inviteFriend">Позвать друга</button>
      </div>

      <template v-else>
        <!-- трек -->
        <div class="relative mx-4 mt-4 overflow-hidden rounded-card bg-[#e9d3a4] py-1" aria-hidden="true">
          <div class="absolute top-0 right-3.5 bottom-0 w-2" style="background: repeating-linear-gradient(#0f1b24 0 8px, #fff 8px 16px)" />
          <div v-for="r in riders" :key="r.user_id" class="relative h-10 border-b-2 border-dashed border-[rgba(110,70,25,0.3)] last:border-b-0">
            <span class="absolute top-[11px] left-2.5 text-caption1" :class="isMe(r.user_id) ? 'font-semibold text-[#8e2219]' : 'text-[#5a3a12]'">{{
              label(r)
            }}</span>
            <span
              class="absolute top-0.5 left-0 h-[34px] w-[54px] [transition:left_1.6s_cubic-bezier(.2,.8,.2,1)]"
              :style="{ left: `calc((100% - 78px) * ${ratio(r.score)})` }"
            >
              <Art name="horse" class="size-full" />
            </span>
          </div>
        </div>
        <div class="flex justify-between px-4 pt-1.5 text-caption1 text-label-3" aria-hidden="true">
          <span>Старт, понедельник</span><span>Финиш, воскресенье</span>
        </div>

        <!-- таблица -->
        <ol class="group-list mx-4 mt-4" aria-label="Таблица бәйге">
          <li
            v-for="r in top"
            :key="r.user_id"
            class="grid min-h-[52px] grid-cols-[24px_36px_1fr_auto] items-center gap-3 px-4"
            :class="isMe(r.user_id) && 'bg-surface-2'"
          >
            <span class="text-center text-headline" :class="r.place === 1 ? 'text-altyn-label' : isMe(r.user_id) ? '' : 'text-label-3'">{{ r.place }}</span>
            <span class="grid size-9 place-items-center rounded-full text-subhead font-semibold text-white" :style="{ background: color(r.user_id) }" aria-hidden="true">{{
              initial(r.first_name)
            }}</span>
            <span class="truncate text-body" :class="isMe(r.user_id) && 'font-semibold'">{{ isMe(r.user_id) ? `${r.first_name} (ты)` : r.first_name }}</span>
            <span class="text-subhead font-semibold tabular-nums">{{ num(r.score) }}</span>
          </li>
          <li v-if="showMeExtra" class="grid min-h-[52px] grid-cols-[24px_36px_1fr_auto] items-center gap-3 bg-surface-2 px-4">
            <span class="text-center text-headline">{{ baige.data.value.me.place ?? '—' }}</span>
            <span class="grid size-9 place-items-center rounded-full bg-kok-600 text-subhead font-semibold text-white" aria-hidden="true">{{
              initial(me.data.value?.first_name ?? 'С')
            }}</span>
            <span class="truncate text-body font-semibold">Сен (ты)</span>
            <span class="text-subhead font-semibold tabular-nums">{{ num(baige.data.value.me.score) }}</span>
          </li>
        </ol>

        <!-- приз -->
        <div v-if="baige.data.value.prize != null" class="mx-4 mt-4 flex items-center gap-3">
          <Art name="eagle" class="w-[52px] shrink-0" />
          <span class="grid">
            <b class="text-headline">Приз победителю: {{ num(baige.data.value.prize) }} алтын</b>
            <span class="text-footnote text-label-3">За самую богатую неделю верных ответов</span>
          </span>
        </div>

        <div class="mx-4 mt-4">
          <button type="button" class="btn btn-primary w-full" @click="inviteFriend">Позвать друга</button>
        </div>
      </template>
    </template>
  </section>
</template>
