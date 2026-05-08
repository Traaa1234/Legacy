import { describe, it, expect } from 'vitest';
import { buildManifest, type ManifestInput } from '@/lib/zip/manifest';

describe('buildManifest', () => {
  it('returns a text manifest with senior name, date, and chapter counts', () => {
    const input: ManifestInput = {
      seniorDisplayName: 'Mom',
      generatedAt: new Date('2026-05-08T12:00:00Z'),
      stories: [
        { chapter: 'early_childhood', transcript: 'a', is_private: false },
        { chapter: 'early_childhood', transcript: 'b', is_private: true  },
        { chapter: 'school_years',    transcript: 'c', is_private: false },
      ],
      photos: [
        { chapter: 'early_childhood', caption: 'p1' },
      ],
    };
    const text = buildManifest(input);
    expect(text).toContain('Mom\'s Memoir');
    expect(text).toContain('2026-05-08');
    // Public counts only — private stories excluded
    expect(text).toContain('Early Childhood: 1 story');
    expect(text).toContain('School Years: 1 story');
    expect(text).toContain('Total: 2 stories, 1 photo');
  });

  it('handles zero stories cleanly', () => {
    const text = buildManifest({
      seniorDisplayName: 'Dad',
      generatedAt: new Date('2026-05-08T12:00:00Z'),
      stories: [],
      photos: [],
    });
    expect(text).toContain('Total: 0 stories, 0 photos');
  });
});
