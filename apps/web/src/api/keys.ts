import type { BaigeScope } from './endpoints';

/** Ключи TanStack Query. Инвалидация по префиксу: ['baige'] сбросит все scope. */
export const qk = {
  me: ['me'] as const,
  home: ['home'] as const,
  lesson: ['lesson'] as const,
  bazaar: ['bazaar'] as const,
  baige: (scope?: BaigeScope) => (scope ? (['baige', scope] as const) : (['baige'] as const)),
  words: (level?: string, topic?: string) => ['words', level ?? null, topic ?? null] as const,
  topics: ['topics'] as const,
  cities: ['cities'] as const,
  invite: ['invite'] as const,
};
