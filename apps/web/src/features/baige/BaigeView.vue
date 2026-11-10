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
  { value: 'city', label: 'Мой город' },
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

const COLORS = ['#19AECB', '#C7382B', '#7DAA45', '#8A4B2A', '#B97F12', '#6F7CBD'];
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
    <header class="grid gap-1 px-3.5 pt-3">
      <h1 class="font-display text-[22px] font-black text-gold-400">Апталық бәйге</h1>
      <p class="text-[13px] font-bold text-night-200">Скачки недели. До финиша {{ timeLeft }}.</p>
    </header>

    <div class="mx-3.5 mt-2.5 grid grid-cols-3 rounded-[14px] bg-night-800 p-1" role="tablist">
      <button
        v-for="s in SCOPES"
        :key="s.value"
        role="tab"
        :aria-selected="scope === s.value"
        class="rounded-[10px] py-2 text-xs font-extrabold transition-colors"
        :class="scope === s.value ? 'bg-milk text-ink' : 'text-night-200'"
        @click="scope = s.value"
      >
        {{ s.label }}
      </button>
    </div>

    <!-- город не выбран -->
    <div v-if="noCity" class="card-milk mx-3.5 mt-4 grid justify-items-center gap-3 rounded-[20px] p-5 text-center">
      <Barys mood="think" class="w-28" />
      <h2 class="font-display text-base font-bold">Выбери город в профиле</h2>
      <p class="text-[13px] font-bold text-ink-2">Тогда ты увидишь скачки земляков и сможешь обогнать их.</p>
      <button class="chunky chunky-gold w-full px-4 py-3.5 text-[15px]" @click="router.push('/profile')">
        Открыть профиль
      </button>
    </div>

    <!-- загрузка -->
    <div v-else-if="baige.isPending.value" class="mx-3.5 mt-3 grid gap-3" aria-busy="true">
      <div class="h-44 animate-pulse rounded-[20px] bg-night-800" />
      <div v-for="i in 3" :key="i" class="h-14 animate-pulse rounded-[14px] bg-night-800" />
    </div>

    <div v-else-if="baige.isError.value" class="card-milk mx-3.5 mt-4 grid justify-items-center gap-3 rounded-[20px] p-5 text-center">
      <p class="font-bold">Не удалось загрузить бәйге</p>
      <button class="chunky chunky-sky px-5 py-3" @click="baige.refetch()">Повторить</button>
    </div>

    <template v-else-if="baige.data.value">
      <!-- пустые друзья -->
      <div
        v-if="scope === 'friends' && top.every((r) => isMe(r.user_id))"
        class="card-milk mx-3.5 mt-4 grid justify-items-center gap-3 rounded-[20px] p-5 text-center"
      >
        <Barys mood="wave" class="w-32" />
        <h2 class="font-display text-base font-bold">Пока ты один на старте</h2>
        <p class="text-[13px] font-bold text-ink-2">Позови друга, и вы поскачете наперегонки: чья неделя будет богаче на верные ответы.</p>
        <button class="chunky chunky-gold w-full px-4 py-3.5 text-[15px]" @click="inviteFriend">
          Позвать друга в бәйге
        </button>
      </div>

      <template v-else>
        <!-- трек -->
        <div
          class="relative mx-3.5 mt-3 overflow-hidden rounded-[20px] pt-2.5 pb-1.5 shadow-[0_5px_0_#A9874A]"
          style="background: linear-gradient(#e6c88f, #d9b270)"
        >
          <div
            class="absolute top-0 right-3 bottom-0 w-2.5"
            style="background: repeating-linear-gradient(#1b1736 0 8px, #fff 8px 16px)"
            aria-hidden="true"
          />
          <div
            v-for="r in riders"
            :key="r.user_id"
            class="relative h-9 border-b-2 border-dashed border-[rgba(120,80,30,.35)] last:border-b-0"
          >
            <span class="absolute top-[9px] left-1.5 text-[11px] font-black text-[rgba(70,40,10,.6)]">{{ label(r) }}</span>
            <span
              class="absolute top-0 left-0 h-[34px] w-[54px] [transition:left_1.6s_cubic-bezier(.2,.8,.2,1)]"
              :style="{ left: `calc((100% - 78px) * ${ratio(r.score)})` }"
            >
              <Art name="horse" class="size-full" :label="`${label(r)}: ${num(r.score)}`" />
            </span>
          </div>
        </div>
        <div class="flex justify-between px-3.5 pt-1.5 text-[11px] font-extrabold text-night-300">
          <span>Старт, понедельник</span><span>Финиш, воскресенье</span>
        </div>

        <!-- таблица -->
        <ol class="mx-3.5 mt-3 grid gap-1.5">
          <li
            v-for="r in top"
            :key="r.user_id"
            class="grid grid-cols-[22px_38px_1fr_auto] items-center gap-2.5 rounded-[14px] px-3 py-2"
            :class="isMe(r.user_id) ? 'bg-milk text-ink' : 'bg-night-800'"
          >
            <span
              class="text-center font-display text-sm font-black"
              :class="isMe(r.user_id) ? 'text-felt-600' : r.place === 1 ? 'text-gold-400' : 'text-night-300'"
              >{{ r.place }}</span
            >
            <span
              class="grid size-[38px] place-items-center rounded-full font-display text-[15px] font-black text-white"
              :style="{ background: color(r.user_id) }"
              >{{ initial(r.first_name) }}</span
            >
            <span class="truncate text-sm font-black">{{ isMe(r.user_id) ? `${r.first_name} (ты)` : r.first_name }}</span>
            <span class="font-display text-sm font-bold tabular-nums">{{ num(r.score) }}</span>
          </li>
          <li
            v-if="showMeExtra"
            class="grid grid-cols-[22px_38px_1fr_auto] items-center gap-2.5 rounded-[14px] bg-milk px-3 py-2 text-ink"
          >
            <span class="text-center font-display text-sm font-black text-felt-600">{{ baige.data.value.me.place ?? '—' }}</span>
            <span class="grid size-[38px] place-items-center rounded-full bg-felt-600 font-display text-[15px] font-black text-white">{{
              initial(me.data.value?.first_name ?? 'С')
            }}</span>
            <span class="truncate text-sm font-black">Сен (ты)</span>
            <span class="font-display text-sm font-bold tabular-nums">{{ num(baige.data.value.me.score) }}</span>
          </li>
        </ol>

        <!-- приз -->
        <div
          v-if="baige.data.value.prize != null"
          class="mx-3.5 mt-3 grid grid-cols-[auto_1fr] items-center gap-3 rounded-[18px] bg-felt-600 px-3.5 py-2.5 shadow-[0_5px_0_var(--color-felt-800)]"
        >
          <Art name="eagle" class="w-[60px]" />
          <span>
            <b class="block font-display text-sm font-bold">Приз победителю: {{ num(baige.data.value.prize) }} алтын</b>
            <span class="text-xs font-bold opacity-90">Награда за самую богатую неделю</span>
          </span>
        </div>

        <div class="mx-3.5 mt-3.5">
          <button class="chunky chunky-gold w-full px-4 py-3.5 text-[15px]" @click="inviteFriend">
            Позвать друга в бәйге
          </button>
        </div>
      </template>
    </template>
  </section>
</template>
