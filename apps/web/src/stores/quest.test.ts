import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const questStep = vi.fn();
const questComplete = vi.fn();
const introduce = vi.fn();
const review = vi.fn();
vi.mock('@/api/endpoints', () => ({
  api: {
    questStep: (s: string, n: number) => questStep(s, n),
    questComplete: (s: string, n: number) => questComplete(s, n),
    introduce: (id: number, source?: string) => introduce(id, source),
    review: (b: unknown) => review(b),
  },
}));

const { useQuestStore } = await import('./quest');

const item = (id: number, kk: string, ru: string, state: 'new' | 'learning' = 'new') => ({
  word_id: id,
  kk,
  ru,
  kind: 'word' as const,
  note: null,
  examples: [],
  image_url: null,
  audio_url: null,
  state,
});

const stepData = (over: Record<string, unknown> = {}) => ({
  slug: 'tanysu',
  n: 1,
  steps_total: 10,
  title_kk: 'Сәлемдесу',
  title_ru: 'Здороваемся',
  intro_ru: 'Начнём',
  npc: 'Айгүл',
  review: [{ word_id: 9, ru: 'спасибо', options: ['Рақмет', 'Сәлем', 'Жақсы'] }],
  items: [item(1, 'Сәлем', 'привет'), item(2, 'Жақсы', 'хорошо', 'learning')],
  distractors: [
    { kk: 'Рақмет', ru: 'спасибо' },
    { kk: 'Иә', ru: 'да' },
  ],
  life: [{ situation_ru: 'Встречаешь друга', text: '___, Асан!', ru: 'Привет, Асан!', answer: 'Сәлем', options: ['Сәлем', 'Жақсы'] }],
  dialog: [],
  ...over,
});

const done = { reward: 20, balance: 120, quest_completed: false, next_step: 2 };

describe('quest step flow', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    setActivePinia(createPinia());
    questStep.mockResolvedValue(stepData());
    questComplete.mockResolvedValue(done);
    introduce.mockResolvedValue({ next: { phase: 'learning', step: 0, due_at: '2026-01-01T00:20:00Z' } });
    review.mockResolvedValue({
      verdict: 'correct',
      answer: 'Рақмет',
      fix: [],
      altyn: { base: 3, combo: 0, earned: 3, lost: 0, balance: 103 },
      next: { phase: 'review', step: 0, due_at: '2026-01-05T00:00:00Z' },
      examples: [],
    });
  });

  it('goes review → new → choose → life → result', async () => {
    const q = useQuestStore();
    await q.start('tanysu', 1);
    expect(q.stage).toBe('intro');
    expect(q.sections).toEqual(['review', 'new', 'choose', 'life']);

    q.begin();
    expect(q.stage).toBe('review');
    q.next(); // без ответа дальше нельзя
    expect(q.stage).toBe('review');
    await q.pickReview('Рақмет');
    expect(review).toHaveBeenCalledWith(expect.objectContaining({ word_id: 9, input: 'Рақмет', mode: 'choice', hints: 0 }));
    expect(q.correct).toBe('Рақмет');
    expect(q.isRight).toBe(true);
    expect(q.earned).toBe(3);
    q.next();

    expect(q.stage).toBe('new');
    expect(q.item?.kk).toBe('Сәлем');
    await q.introduceItem();
    expect(introduce).toHaveBeenCalledWith(1, 'quest');
    await q.introduceItem(); // уже в изучении: без запроса
    expect(introduce).toHaveBeenCalledTimes(1);
    expect(q.learned.map((w) => [w.kk, w.familiar])).toEqual([
      ['Сәлем', false],
      ['Жақсы', true],
    ]);

    expect(q.stage).toBe('choose');
    expect(q.tasks).toHaveLength(4);
    while (q.stage === 'choose') {
      q.pickChoice(q.task!.answer);
      expect(q.isRight).toBe(true);
      q.next();
    }

    expect(q.stage).toBe('life');
    q.pickLife('Сәлем');
    expect(q.isRight).toBe(true);
    q.next();
    await vi.waitFor(() => expect(q.stage).toBe('result'));
    expect(questComplete).toHaveBeenCalledWith('tanysu', 1);
    expect(q.completeRes).toEqual(done);
    expect(q.progress).toBe(1);
    expect(q.mistakes).toBe(0);
  });

  it('skips the review section when nothing is due', async () => {
    questStep.mockResolvedValue(stepData({ review: [] }));
    const q = useQuestStore();
    await q.start('tanysu', 1);
    q.begin();
    expect(q.stage).toBe('new');
  });

  it('returns a wrong choice task to the end of the section', async () => {
    questStep.mockResolvedValue(stepData({ review: [], items: [item(1, 'Сәлем', 'привет')] }));
    const q = useQuestStore();
    await q.start('tanysu', 1);
    q.begin();
    await q.introduceItem();
    expect(q.stage).toBe('choose');
    const first = q.task!;
    const wrong = first.options.find((o) => o !== first.answer)!;
    q.pickChoice(wrong);
    expect(q.isRight).toBe(false);
    expect(q.correct).toBe(first.answer);
    q.pickChoice(first.answer); // второй выбор не засчитывается
    expect(q.picked).toBe(wrong);
    expect(q.tasks).toHaveLength(3);
    expect(q.tasks[2]!.word_id).toBe(first.word_id);
    expect(q.tasks[2]!.dir).toBe(first.dir);
    q.next();
    q.pickChoice(q.task!.answer);
    q.next();
    expect(q.task!.id).toBe(`${first.id}#1`);
    q.pickChoice(q.task!.answer);
    q.next();
    expect(q.stage).toBe('life');
    expect(q.mistakes).toBe(1);
  });

  it('keeps an introduce error on the card and lets the user retry', async () => {
    questStep.mockResolvedValue(stepData({ review: [] }));
    introduce.mockRejectedValueOnce(new Error('boom'));
    const q = useQuestStore();
    await q.start('tanysu', 1);
    q.begin();
    await q.introduceItem();
    expect(q.stage).toBe('new');
    expect(q.error).toBe('network');
    await q.introduceItem();
    expect(q.item?.kk).toBe('Жақсы');
  });

  it('plays the final dialog line by line and completes the step', async () => {
    questStep.mockResolvedValue(
      stepData({
        n: 10,
        review: [],
        items: [],
        distractors: [],
        life: [],
        dialog: [
          { who: 'npc', kk: 'Сәлем!', ru: 'Привет!', options: null },
          { who: 'me', kk: 'Сәлем! Қалың қалай?', ru: 'Привет! Как дела?', options: ['Сау бол!', 'Сәлем! Қалың қалай?'] },
          { who: 'npc', kk: 'Жақсы.', ru: 'Хорошо.', options: null },
        ],
      }),
    );
    questComplete.mockResolvedValue({ reward: 120, balance: 300, quest_completed: true, next_step: null });
    const q = useQuestStore();
    await q.start('tanysu', 10);
    expect(q.sections).toEqual(['dialog']);
    q.begin();
    expect(q.stage).toBe('dialog');
    q.pickDialog('Сәлем! Қалың қалай?'); // ещё говорит житель
    expect(q.dialogShown).toBe(0);
    q.revealNpc();
    expect(q.dialogLine?.who).toBe('me');
    expect(q.dialogOptions[1]).toHaveLength(2);
    q.pickDialog('Сау бол!');
    expect(q.dialogWrong).toEqual(['Сау бол!']);
    expect(q.dialogShown).toBe(1);
    q.pickDialog('Сәлем! Қалың қалай?');
    expect(q.dialogWrong).toEqual([]);
    q.revealNpc();
    expect(q.dialogDone).toBe(true);
    await q.finish();
    expect(q.stage).toBe('result');
    expect(q.completeRes?.quest_completed).toBe(true);
  });

  it('shows an error when the step cannot be loaded', async () => {
    const { ApiError } = await import('@/api/http');
    questStep.mockRejectedValue(new ApiError(409, 'daily_limit'));
    const q = useQuestStore();
    await q.start('tanysu', 3);
    expect(q.stage).toBe('error');
    expect(q.error).toBe('daily_limit');
  });

  it('keeps the step open when completing fails and retries', async () => {
    questStep.mockResolvedValue(stepData({ review: [], items: [], life: [stepData().life[0]] }));
    questComplete.mockRejectedValueOnce(new Error('offline'));
    const q = useQuestStore();
    await q.start('tanysu', 1);
    q.begin();
    q.pickLife('Жақсы');
    expect(q.isRight).toBe(false);
    q.next();
    await vi.waitFor(() => expect(q.busy).toBe(false));
    expect(q.stage).toBe('completing');
    expect(q.error).toBe('network');
    await q.finish();
    expect(q.stage).toBe('result');
  });
});
