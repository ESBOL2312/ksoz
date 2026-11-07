import axios, { AxiosError } from 'axios';
import { getWebApp } from '@/telegram';

/** Ошибка API: { error, message } из ответа сервера. status 0 — сеть недоступна. */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message?: string,
  ) {
    super(message ?? code);
    this.name = 'ApiError';
  }

  get isNetwork(): boolean {
    return this.status === 0 || this.status >= 500;
  }
}

/**
 * Вне Telegram ходим через X-Dev-User (бэкенд принимает его только при NODE_ENV=development):
 * всегда в `vite dev`, в прод-сборке — только если при сборке задан VITE_DEV_USER.
 */
const devUserEnabled = import.meta.env.DEV || !!import.meta.env.VITE_DEV_USER;
export const DEV_USER = import.meta.env.VITE_DEV_USER || '42';

/** true, если миниапп открыт вне Telegram и разрешён dev-вход. */
export const isDevFallback = (): boolean => !getWebApp() && devUserEnabled;

export const http = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 10_000,
});

http.interceptors.request.use((config) => {
  const wa = getWebApp();
  if (wa) config.headers.set('Authorization', `tma ${wa.initData}`);
  else if (devUserEnabled) config.headers.set('X-Dev-User', DEV_USER);
  return config;
});

/** Слушатели 401: App показывает экран «откройте миниапп заново». */
const unauthorizedListeners = new Set<() => void>();
export function onUnauthorized(cb: () => void): () => void {
  unauthorizedListeners.add(cb);
  return () => unauthorizedListeners.delete(cb);
}

http.interceptors.response.use(
  (r) => r,
  (e: AxiosError<{ error?: string; message?: string }>) => {
    const status = e.response?.status ?? 0;
    const code = e.response?.data?.error ?? (status ? `http_${status}` : 'network');
    if (status === 401) unauthorizedListeners.forEach((cb) => cb());
    return Promise.reject(new ApiError(status, code, e.response?.data?.message ?? e.message));
  },
);
