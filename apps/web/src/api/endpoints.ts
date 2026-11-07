import type {
  Baige,
  City,
  Home,
  Lesson,
  Me,
  PatchMeBody,
  Purchase,
  ReviewBody,
  ReviewResponse,
} from '@ksoz/shared';
import type {
  BazaarResponseSchema,
  EquipResponseSchema,
  HintResponseSchema,
  ImportLocalBodySchema,
  ImportLocalResponseSchema,
  IntroduceResponseSchema,
  InviteResponseSchema,
  TaskClaimResponseSchema,
  TopicsResponseSchema,
  WordsResponseSchema,
} from '@ksoz/shared';
import type { z } from 'zod';
import { http } from './http';

// Типы ответов — из zod-схем @ksoz/shared (те же, что валидирует сервер).
export type Bazaar = z.infer<typeof BazaarResponseSchema>;
export type BazaarItem = Bazaar['items'][number];
export type EquipResponse = z.infer<typeof EquipResponseSchema>;
export type HintResponse = z.infer<typeof HintResponseSchema>;
export type ImportLocalBody = z.infer<typeof ImportLocalBodySchema>;
export type ImportLocalResponse = z.infer<typeof ImportLocalResponseSchema>;
export type IntroduceResponse = z.infer<typeof IntroduceResponseSchema>;
export type Invite = z.infer<typeof InviteResponseSchema>;
export type TaskClaim = z.infer<typeof TaskClaimResponseSchema>;
export type Topics = z.infer<typeof TopicsResponseSchema>;
export type Words = z.infer<typeof WordsResponseSchema>;
export type BaigeScope = Baige['scope'];
export type { Baige, City, Home, Lesson, Me, PatchMeBody, Purchase, ReviewBody, ReviewResponse };

const data = <T>(p: Promise<{ data: T }>) => p.then((r) => r.data);

export const api = {
  me: () => data(http.get<Me>('/v1/me')),
  patchMe: (body: PatchMeBody) => data(http.patch<Me>('/v1/me', body)),
  home: () => data(http.get<Home>('/v1/home')),
  lesson: (limit = 12) => data(http.get<Lesson>('/v1/lesson', { params: { limit } })),
  introduce: (word_id: number) => data(http.post<IntroduceResponse>('/v1/lesson/introduce', { word_id })),
  hint: (word_id: number, hints_used: number) =>
    data(http.post<HintResponse>('/v1/lesson/hint', { word_id, hints_used })),
  review: (body: ReviewBody) => data(http.post<ReviewResponse>('/v1/reviews', body)),
  words: (params: { level?: string; topic?: string } = {}) => data(http.get<Words>('/v1/words', { params })),
  topics: () => data(http.get<Topics>('/v1/topics')),
  cities: () => data(http.get<{ cities: City[] }>('/v1/cities')),
  bazaar: () => data(http.get<Bazaar>('/v1/bazaar')),
  purchase: (item_id: number) => data(http.post<Purchase>('/v1/bazaar/purchase', { item_id })),
  equip: (item_id: number, equipped: boolean) =>
    data(http.post<EquipResponse>('/v1/inventory/equip', { item_id, equipped })),
  claimTask: (code: string) => data(http.post<TaskClaim>(`/v1/tasks/${encodeURIComponent(code)}/claim`)),
  importLocal: (body: ImportLocalBody) => data(http.post<ImportLocalResponse>('/v1/import/local', body)),
  baige: (scope: BaigeScope) => data(http.get<Baige>('/v1/baige', { params: { scope } })),
  invite: () => data(http.get<Invite>('/v1/invite')),
};
