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

  it('returns a word to the end of the round when «Вспомнил» was not pressed', async () => {
    lessonApi.mockResolvedValue({ cards: [newCard(1, 'ит', 'собака')] });
    const l = useLessonStore();
    await l.start();
    await l.introduce();
    l.beginPractice();

    l.input = 'кот';
    await l.check();
    expect(l.result?.verdict).toBe('wrong');
    l.next(false);
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

  it('does not repeat a practice word after «Вспомнил», even if it was wrong', async () => {
    lessonApi.mockResolvedValue({ cards: [newCard(1, 'ит', 'собака')] });
    const l = useLessonStore();
    await l.start();
    await l.introduce();
    l.beginPractice();
    l.input = 'кот';
    await l.check();
    l.next(true);
    expect(l.stage).toBe('done');
  });
});

const reviewCard = (id: number, kk: string, ru: string) => ({
  kind: 'review' as const,
  word_id: id,
  kk: null,
  ru,
  image_url: null,
  audio_url: null,
  examples: [],
  phase: 'review' as const,
  step: 0,
  length: [...kk].length,
});

const reviewRes = (verdict: 'correct' | 'wrong', answer: string) => ({
  verdict,
  answer,
  fix: [],
  altyn: { base: 5, combo: 0, earned: verdict === 'correct' ? 5 : 0, lost: 0, balance: 100 },
  next: { phase: 'review', step: 0, due_at: '2026-01-05T00:00:00Z' },
  examples: [{ kk: `${answer} үлкен`, ru: 'пример' }],
});

describe('«Вспомнил» after a review', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    setActivePinia(createPinia());
    lessonApi.mockResolvedValue({ cards: [reviewCard(1, 'ит', 'собака'), reviewCard(2, 'үй', 'дом')] });
  });

  it('offers the not remembered words again at the end of the lesson', async () => {
    const l = useLessonStore();
    await l.start();

    review.mockResolvedValueOnce(reviewRes('correct', 'ит'));
    l.input = 'ит';
    await l.check();
    l.next(true); // вспомнил

    review.mockResolvedValueOnce(reviewRes('correct', 'үй'));
    l.input = 'үй';
    await l.check();
    l.next(false); // угадал, но не вспомнил

    expect(l.again.map((w) => w.kk)).toEqual(['үй']);
    expect(l.stage).toBe('practice-intro');
    l.beginPractice();
    expect(l.cards.map((c) => c.word_id)).toEqual([2]);
    expect(l.card?.examples).toHaveLength(1);

    l.input = 'үй';
    await l.check();
    expect(l.result?.verdict).toBe('correct');
    // SRS не трогаем: показываем, когда слово вернётся по ответу сервера
    expect(l.result?.next.due_at).toBe('2026-01-05T00:00:00Z');
    expect(review).toHaveBeenCalledTimes(2);
    l.next(true);
    expect(l.stage).toBe('done');
  });

  it('goes straight to the summary when every word was remembered', async () => {
    const l = useLessonStore();
    await l.start();
    for (const kk of ['ит', 'үй']) {
      review.mockResolvedValueOnce(reviewRes('correct', kk));
      l.input = kk;
      await l.check();
      l.next(true);
    }
    expect(l.stage).toBe('done');
  });

  it('keeps asking at the end until «Вспомнил», but not forever', async () => {
    lessonApi.mockResolvedValue({ cards: [reviewCard(1, 'ит', 'собака')] });
    const l = useLessonStore();
    await l.start();
    review.mockResolvedValueOnce(reviewRes('wrong', 'ит'));
    l.input = 'кот';
    await l.check();
    l.next(false);
    l.beginPractice();
    let shown = 0;
    while (l.stage === 'card') {
      shown++;
      l.input = 'кот';
      await l.check();
      l.next(false);
    }
    expect(shown).toBe(3);
    expect(l.stage).toBe('done');
  });
});
