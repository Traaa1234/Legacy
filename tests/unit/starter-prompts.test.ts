import { describe, it, expect } from 'vitest';
import { STARTER_PROMPTS } from '@/seeds/starter-prompts';

describe('STARTER_PROMPTS', () => {
  it('has exactly 50 entries', () => {
    expect(STARTER_PROMPTS).toHaveLength(50);
  });

  it('covers all 8 chapters', () => {
    const chapters = new Set(STARTER_PROMPTS.map((p) => p.chapter));
    expect(chapters.size).toBe(8);
  });

  it('has unique (chapter, order_in_chapter) pairs', () => {
    const seen = new Set<string>();
    for (const p of STARTER_PROMPTS) {
      const key = `${p.chapter}:${p.order_in_chapter}`;
      expect(seen.has(key), `duplicate ${key}`).toBe(false);
      seen.add(key);
    }
  });
});
