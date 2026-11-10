export type BarysMood = 'idle' | 'happy' | 'sad' | 'wave' | 'think' | 'sleep';

/** Что надето на Барысе: по слоту вещи из базара (head / body / feet). */
export interface BarysWear {
  hat: boolean;
  coat: boolean;
  boots: boolean;
}

export function wearFrom(items: readonly { slot: string }[] | undefined): BarysWear {
  const slots = new Set((items ?? []).map((i) => i.slot));
  return { hat: slots.has('head'), coat: slots.has('body'), boots: slots.has('feet') };
}

/** Что стоит в ауле: по казахскому слову надетой вещи. */
export function sceneFrom(items: readonly { kk: string }[] | undefined) {
  const kk = new Set((items ?? []).map((i) => i.kk.toLowerCase()));
  return {
    horse: kk.has('жылқы') || kk.has('ат') || kk.has('тұлпар'),
    sheep: kk.has('қой'),
    cat: kk.has('мысық'),
    tea: kk.has('шай'),
    house: kk.has('үй') || kk.has('киіз үй'),
  };
}
