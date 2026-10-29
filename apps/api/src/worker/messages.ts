import { InlineKeyboard } from 'grammy';
import type { ReminderKind } from './rules.js';

export interface MessageParams {
  n?: number;
  rank?: number;
  total?: number;
}

export function reminderText(kind: ReminderKind, p: MessageParams = {}): string {
  switch (kind) {
    case 'short':
      return 'Сөздерді қайталайтын уақыт! Жаңа үйренген сөздер күтіп тұр.\nПора повторить: недавно выученные слова ждут.';
    case 'daily':
      return `Қайталайтын сөздер: ${p.n ?? ''}. Бүгінгі жаттығуды бастайық!\nСлов к повтору: ${p.n ?? ''}. Начнём сегодняшнюю тренировку!`;
    case 'streak':
      return 'Сериян сөнуге жақын! Бүгін бір сөз қайталап, сақтап қал.\nСерия скоро сгорит! Повтори хотя бы одно слово сегодня.';
    case 'baige':
      return `Апта бәйгесі аяқталды! Сенің орның: ${p.rank} / ${p.total}.\nНеделя бәйге закрыта! Твоё место: ${p.rank} из ${p.total}.`;
  }
}

export function openAppKeyboard(miniappUrl: string): InlineKeyboard {
  return new InlineKeyboard().webApp('Ашу / Открыть', miniappUrl);
}
