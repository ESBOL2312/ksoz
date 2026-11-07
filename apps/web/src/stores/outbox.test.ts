import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/api/http';

const review = vi.fn();
vi.mock('@/api/endpoints', () => ({ api: { review: (b: unknown) => review(b) } }));

const { useOutboxStore } = await import('./outbox');

const body = (id: string) => ({ client_id: id, word_id: 1, input: 'ит', hints: 0, ms: 1000 });
const ok = { verdict: 'correct' } as never;

describe('outbox', () => {
  beforeEach(() => {
    localStorage.clear();
    review.mockReset();
    setActivePinia(createPinia());
  });

  it('removes the answer after the server accepts it', async () => {
    review.mockResolvedValue(ok);
    const o = useOutboxStore();
    expect(await o.submit(body('a'))).toBe(ok);
    expect(o.items).toEqual([]);
  });

  it('keeps the answer on a network error and resends it with the same client_id', async () => {
    review.mockRejectedValueOnce(new ApiError(0, 'network'));
    const o = useOutboxStore();
    expect(await o.submit(body('a'))).toBeNull();
    expect(o.items.map((i) => i.client_id)).toEqual(['a']);
    expect(JSON.parse(localStorage.getItem('ksoz.outbox.dev42')!)).toHaveLength(1);

    review.mockResolvedValue(ok);
    expect(await o.flush()).toBe(1);
    expect(review).toHaveBeenLastCalledWith(body('a'));
    expect(o.items).toEqual([]);
  });

  it('drops the answer on a 4xx and rethrows', async () => {
    review.mockRejectedValueOnce(new ApiError(404, 'word_not_found'));
    const o = useOutboxStore();
    await expect(o.submit(body('a'))).rejects.toThrow('word_not_found');
    expect(o.items).toEqual([]);
  });

  it('flush stops at the first network error and keeps the rest in order', async () => {
    const o = useOutboxStore();
    o.items = [body('a'), body('b'), body('c')];
    review.mockResolvedValueOnce(ok).mockRejectedValueOnce(new ApiError(503, 'http_503'));
    expect(await o.flush()).toBe(1);
    expect(o.items.map((i) => i.client_id)).toEqual(['b', 'c']);
  });
});
