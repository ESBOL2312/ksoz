import type { Category } from '@ksoz/shared';

/** Символы спрайта и их viewBox. */
export const ART = {
  coin: '0 0 32 32',
  flame: '0 0 24 24',
  horn: '0 0 40 40',
  horse: '0 0 120 100',
  yurt: '0 0 200 140',
  dombra: '0 0 60 170',
  chapan: '0 0 100 100',
  syrmak: '0 0 100 70',
  eagle: '0 0 200 120',
  takiya: '0 0 100 80',
  etik: '0 0 110 90',
  cat: '0 0 100 100',
  sheep: '0 0 120 100',
  tea: '0 0 110 90',
  'i-aul': '0 0 24 24',
  'i-lesson': '0 0 24 24',
  'i-bazaar': '0 0 24 24',
  'i-baige': '0 0 24 24',
} as const;

export type ArtName = keyof typeof ART;

/** Рисунок для товара без image_url: по слову, иначе по категории. */
export function artForItem(kk: string, category: Category): ArtName {
  const byWord: Record<string, ArtName> = {
    'киіз үй': 'yurt',
    үй: 'yurt',
    домбыра: 'dombra',
    шапан: 'chapan',
    'көк шапан': 'chapan',
    сырмақ: 'syrmak',
    бүркіт: 'eagle',
    ат: 'horse',
    жылқы: 'horse',
    тұлпар: 'horse',
    тақия: 'takiya',
    етік: 'etik',
    мысық: 'cat',
    қой: 'sheep',
    шай: 'tea',
  };
  const hit = byWord[kk.trim().toLowerCase()];
  if (hit) return hit;
  return ({ kiim: 'chapan', uy: 'yurt', mal: 'horse', aspap: 'dombra' } as const)[category];
}
