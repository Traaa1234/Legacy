import { describe, it, expect } from 'vitest';
import {
  groupPhotosByChapter,
  groupPhotosByStory,
  type PhotoRow,
} from '@/lib/photos';

const NOW = '2026-05-08T12:00:00Z';

function makePhoto(overrides: Partial<PhotoRow>): PhotoRow {
  return {
    id: 'p-default',
    uploaded_by_user_id: 'u-1',
    chapter: 'early_childhood',
    story_id: null,
    storage_path: 'p1.jpg',
    caption: null,
    created_at: NOW,
    ...overrides,
  };
}

describe('groupPhotosByChapter', () => {
  it('returns empty map for empty input', () => {
    expect(groupPhotosByChapter([])).toEqual(new Map());
  });

  it('groups multiple photos by chapter', () => {
    const photos: PhotoRow[] = [
      makePhoto({ id: 'p1', chapter: 'early_childhood' }),
      makePhoto({ id: 'p2', chapter: 'early_childhood' }),
      makePhoto({ id: 'p3', chapter: 'school_years' }),
    ];
    const grouped = groupPhotosByChapter(photos);
    expect(grouped.get('early_childhood')).toHaveLength(2);
    expect(grouped.get('school_years')).toHaveLength(1);
  });
});

describe('groupPhotosByStory', () => {
  it('returns empty map when no photos have story_id', () => {
    const photos: PhotoRow[] = [
      makePhoto({ id: 'p1', story_id: null }),
      makePhoto({ id: 'p2', story_id: null }),
    ];
    expect(groupPhotosByStory(photos).size).toBe(0);
  });

  it('groups photos with story_id, ignores those without', () => {
    const photos: PhotoRow[] = [
      makePhoto({ id: 'p1', story_id: 's1' }),
      makePhoto({ id: 'p2', story_id: 's1' }),
      makePhoto({ id: 'p3', story_id: 's2' }),
      makePhoto({ id: 'p4', story_id: null }),
    ];
    const grouped = groupPhotosByStory(photos);
    expect(grouped.get('s1')).toHaveLength(2);
    expect(grouped.get('s2')).toHaveLength(1);
    expect(grouped.size).toBe(2);
  });
});
