import { describe, it, expect } from 'vitest';
import { CHAPTERS, getChapterLabel, isValidChapterSlug } from '@/lib/chapters';

describe('chapters', () => {
  it('has 8 chapters in the spec-defined order', () => {
    expect(CHAPTERS).toHaveLength(8);
    expect(CHAPTERS[0]?.slug).toBe('early_childhood');
    expect(CHAPTERS[7]?.slug).toBe('practical_skills');
  });

  it('returns a label for a valid slug', () => {
    expect(getChapterLabel('early_childhood')).toBe('Early Childhood');
    expect(getChapterLabel('practical_skills')).toBe(
      'Information, Knowledge & Practical Skills',
    );
  });

  it('validates known slugs', () => {
    expect(isValidChapterSlug('school_years')).toBe(true);
    expect(isValidChapterSlug('not_a_chapter')).toBe(false);
  });
});
