import type { Logger } from 'pino';

export const DEFAULT_KEEPALIVE_MINUTES = 9;

type FetchFn = (url: string, init?: RequestInit) => Promise<Response>;

/**
 * Самопинг: раз в `intervalMs` запрашивает `url` (обычно PUBLIC_URL/health снаружи).
 * Нужен на бесплатном Render, который усыпляет сервис после 15 минут без входящих запросов;
 * запрос идёт через публичный адрес, поэтому Render считает его входящим трафиком.
 */
export function startKeepAlive(
  url: string,
  intervalMs: number,
  log: Pick<Logger, 'debug' | 'warn'>,
  fetchFn: FetchFn = fetch,
): { stop: () => void } {
  const ping = async () => {
    try {
      const res = await fetchFn(url, { signal: AbortSignal.timeout(30_000) });
      if (res.ok) log.debug({ url }, 'keepalive ok');
      else log.warn({ url, status: res.status }, 'keepalive non-2xx');
    } catch (err) {
      log.warn({ url, err }, 'keepalive failed');
    }
  };
  const timer = setInterval(() => void ping(), intervalMs);
  timer.unref();
  return { stop: () => clearInterval(timer) };
}
