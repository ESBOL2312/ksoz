import { useQuery } from '@tanstack/vue-query';
import { computed, toValue, type MaybeRefOrGetter } from 'vue';
import { api, type BaigeScope } from './endpoints';
import { qk } from './keys';

const HOUR = 60 * 60_000;

export const useMe = () => useQuery({ queryKey: qk.me, queryFn: api.me });
export const useHome = () => useQuery({ queryKey: qk.home, queryFn: api.home });
export const useBazaar = () => useQuery({ queryKey: qk.bazaar, queryFn: api.bazaar });
/** Слова в процессе изучения: после урока сбрасывается в invalidateAfterLesson. */
export const useMyWords = () => useQuery({ queryKey: qk.myWords, queryFn: api.myWords });
export const useTopics = () => useQuery({ queryKey: qk.topics, queryFn: api.topics, staleTime: HOUR });
export const useCities = () => useQuery({ queryKey: qk.cities, queryFn: api.cities, staleTime: HOUR });
export const useInvite = () => useQuery({ queryKey: qk.invite, queryFn: api.invite, staleTime: Infinity });

export function useBaige(scope: MaybeRefOrGetter<BaigeScope>) {
  return useQuery({
    queryKey: computed(() => qk.baige(toValue(scope))),
    queryFn: () => api.baige(toValue(scope)),
  });
}

/** Очередь урока: не кешируется, при каждом заходе в урок свежая. */
export function useLessonQuery(limit = 12) {
  return useQuery({
    queryKey: qk.lesson,
    queryFn: () => api.lesson(limit),
    gcTime: 0,
    staleTime: 0,
    refetchOnWindowFocus: false,
  });
}
