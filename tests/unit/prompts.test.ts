import { describe, it, expect } from 'vitest';
import { selectNextPromptId } from '@/lib/prompts';

const PROMPTS = [
  { id: 'p1', chapter: 'early_childhood', order_in_chapter: 1 },
  { id: 'p2', chapter: 'early_childhood', order_in_chapter: 2 },
  { id: 'p3', chapter: 'early_childhood', order_in_chapter: 3 },
];

const NOW = new Date('2026-05-07T12:00:00Z').getTime();
const SIX_DAYS_AGO = new Date('2026-05-01T12:00:00Z').getTime();
const EIGHT_DAYS_AGO = new Date('2026-04-29T12:00:00Z').getTime();

describe('selectNextPromptId', () => {
  it('returns the lowest-order unanswered, unskipped prompt', () => {
    const next = selectNextPromptId({
      prompts: PROMPTS,
      answeredPromptIds: new Set(),
      skips: [],
      now: NOW,
    });
    expect(next).toBe('p1');
  });

  it('skips answered prompts', () => {
    const next = selectNextPromptId({
      prompts: PROMPTS,
      answeredPromptIds: new Set(['p1']),
      skips: [],
      now: NOW,
    });
    expect(next).toBe('p2');
  });

  it('skips prompts skipped within 7 days', () => {
    const next = selectNextPromptId({
      prompts: PROMPTS,
      answeredPromptIds: new Set(),
      skips: [{ prompt_id: 'p1', skipped_at: SIX_DAYS_AGO }],
      now: NOW,
    });
    expect(next).toBe('p2');
  });

  it('recycles prompts skipped more than 7 days ago', () => {
    const next = selectNextPromptId({
      prompts: PROMPTS,
      answeredPromptIds: new Set(),
      skips: [{ prompt_id: 'p1', skipped_at: EIGHT_DAYS_AGO }],
      now: NOW,
    });
    expect(next).toBe('p1');
  });

  it('returns null when all prompts are answered or recently skipped', () => {
    const next = selectNextPromptId({
      prompts: PROMPTS,
      answeredPromptIds: new Set(['p1', 'p2', 'p3']),
      skips: [],
      now: NOW,
    });
    expect(next).toBeNull();
  });
});
