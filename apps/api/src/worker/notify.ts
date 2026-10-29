import type { NotifySettings } from '../db/schema.js';

export const DEFAULT_NOTIFY: NotifySettings = { short: true, daily: true, streak: true, baige: true };

/** Читает users.notify: недостающие или некорректные флаги заменяются значениями по умолчанию. */
export function readNotify(raw: unknown): NotifySettings {
  const src = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const pick = (k: keyof NotifySettings) => (typeof src[k] === 'boolean' ? (src[k] as boolean) : DEFAULT_NOTIFY[k]);
  return { short: pick('short'), daily: pick('daily'), streak: pick('streak'), baige: pick('baige') };
}
