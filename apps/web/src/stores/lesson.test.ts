import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const lessonApi = vi.fn();
const introduce = vi.fn();
const known = vi.fn();
const review = vi.fn();
vi.mock('@/api/endpoints', () => ({
  api: {
    lesson: (n: number) => lessonApi(n),
    introduce: (id: number) => introduce(id),
    known: (id: number) => known(id),
    review: (b: unknown) => review(b),
  },
}));

const { useLessonStore } = await import('./lesson');

const newCard = (id: number, kk: string, ru: string) => ({
  kind: 'new' as const,
  word_id: id,
  kk,
  ru,
  image_url: null,
  audio_url: null,
  examples: [],
  phase: 'learning' as const,
  step: 0,
  length: [...kk].length,
});

describe('lesson practice round', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    setActivePinia(createPinia());
    lessonApi.mockResolvedValue({ cards: [newCard(1, 'ит', 'собака'), newCard(2, 'мысық', 'кошка'), newCard(3, 'үй', 'дом')] });
    introduce.mockResolvedValue({ next: { phase: 'learning', step: 0, due_at: '2026-01-01T00:20:00Z' } });
    known.mockResolvedValue({ next: { phase: 'review', step: 0, due_at: '2026-02-01T00:00:00Z' } });
  });

  async function pickWords(l: ReturnType<typeof useLessonStore>) {
    await l.start();
    await l.introduce(); // ит
    await l.skipKnown(); // мысық
    await l.introduce(); // үй
  }

  it('quizzes only the words taken for learning, without touching the server SRS', async () => {
    const l = useLessonStore();
    await pickWords(l);
    expect(l.stage).toBe('practice-intro');
    expect(l.learned.map((w) => w.kk)).toEqual(['ит', 'үй']);
    expect(l.known.map((w) => w.kk)).toEqual(['мысық']);

    l.beginPractice();
    const seen: string[] = [];
    while (l.stage === 'card') {
      seen.push(l.card!.ru);
      l.input = l.card!.kk!;
      await l.check();
      expect(l.result?.verdict).toBe('correct');
      l.next();
    }
    expect(seen.sort()).toEqual(['дом', 'собака']);
    expect(l.stage).toBe('done');
    expect(l.learned.every((w) => w.tries === 1)).toBe(true);
    expect(review).not.toHaveBeenCalled();
    expect(l.stats.earned).toBe(0);
  });

  it('returns a wrongly written word to the end of the round', async () => {
    lessonApi.mockResolvedValue({ cards: [newCard(1, 'ит', 'собака')] });
    const l = useLessonStore();
    await l.start();
    await l.introduce();
    l.beginPractice();

    l.input = 'кот';
    await l.check();
    expect(l.result?.verdict).toBe('wrong');
    l.next();
    expect(l.stage).toBe('card');
    expect(l.card?.word_id).toBe(1);

    l.input = 'ит';
    await l.check();
    l.next();
    expect(l.stage).toBe('done');
    expect(l.learned[0]!.tries).toBe(2);
  });

  it('skips the practice round when nothing was taken for learning', async () => {
    lessonApi.mockResolvedValue({ cards: [newCard(1, 'ит', 'собака')] });
    const l = useLessonStore();
    await l.start();
    await l.skipKnown();
    expect(l.stage).toBe('done');
  });
});
