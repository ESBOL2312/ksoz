import { afterEach, describe, expect, it, vi } from 'vitest';
import { startKeepAlive } from './keepalive.js';

const log = { debug: vi.fn(), warn: vi.fn() };

afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe('startKeepAlive', () => {
  it('pings the url every interval and stops', async () => {
    vi.useFakeTimers();
    const fetchFn = vi.fn(async (_url: string, _init?: RequestInit) => new Response('ok'));
    const ka = startKeepAlive('https://x.example/health', 9 * 60_000, log, fetchFn);

    expect(fetchFn).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(9 * 60_000);
    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(fetchFn.mock.calls[0]![0]).toBe('https://x.example/health');
    await vi.advanceTimersByTimeAsync(9 * 60_000);
    expect(fetchFn).toHaveBeenCalledTimes(2);

    ka.stop();
    await vi.advanceTimersByTimeAsync(30 * 60_000);
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it('logs and keeps going when a ping fails', async () => {
    vi.useFakeTimers();
    const fetchFn = vi.fn(async () => {
      throw new Error('down');
    });
    const ka = startKeepAlive('https://x.example/health', 1000, log, fetchFn);
    await vi.advanceTimersByTimeAsync(2000);
    expect(fetchFn).toHaveBeenCalledTimes(2);
    expect(log.warn).toHaveBeenCalledTimes(2);
    ka.stop();
  });
});
