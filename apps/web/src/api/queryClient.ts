import { QueryClient } from '@tanstack/vue-query';
import { ApiError } from './http';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: true,
      // 4xx не повторяем: это ответ сервера, а не сбой сети
      retry: (count, err) => count < 2 && !(err instanceof ApiError && err.status >= 400 && err.status < 500),
    },
    mutations: { retry: 0 },
  },
});
