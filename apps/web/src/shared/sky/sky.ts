import { onBeforeUnmount, ref } from 'vue';

export type SkyPhase = 'dawn' | 'day' | 'dusk' | 'night';

export interface Sky {
  phase: SkyPhase;
  /** солнце над горизонтом: позиция по дуге в долях сцены (0..1), null если ночь */
  sun: { x: number; y: number } | null;
  /** луна видна с вечера до рассвета */
  moon: { x: number; y: number } | null;
}

const SUNRISE = 6;
const SUNSET = 20;

/** Положение на дуге: t от 0 до 1 → x слева направо, y = высота (0 у горизонта, 1 в зените). */
const arc = (t: number) => ({ x: 0.08 + t * 0.84, y: Math.sin(Math.PI * Math.min(1, Math.max(0, t))) });

/** Небо для местного времени пользователя. */
export function skyAt(d: Date): Sky {
  const h = d.getHours() + d.getMinutes() / 60;
  const phase: SkyPhase = h >= 5 && h < 8 ? 'dawn' : h >= 8 && h < 18 ? 'day' : h >= 18 && h < 21 ? 'dusk' : 'night';
  const sunUp = h >= SUNRISE && h < SUNSET;
  const nightLen = 24 - (SUNSET - SUNRISE);
  const nightT = ((h - SUNSET + 24) % 24) / nightLen;
  return {
    phase,
    sun: sunUp ? arc((h - SUNRISE) / (SUNSET - SUNRISE)) : null,
    moon: phase === 'night' || phase === 'dusk' && h >= 19.5 ? arc(Math.min(1, nightT)) : null,
  };
}

/** Живое небо: пересчитывается раз в минуту. */
export function useSky(now: () => Date = () => new Date()) {
  const sky = ref<Sky>(skyAt(now()));
  const timer = setInterval(() => (sky.value = skyAt(now())), 60_000);
  onBeforeUnmount(() => clearInterval(timer));
  return sky;
}
