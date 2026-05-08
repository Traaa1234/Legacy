// Pure helpers and types. Safe to import from server or client.
// DB queries live in photos-queries.ts.

export interface PhotoRow {
  id: string;
  uploaded_by_user_id: string;
  chapter: string;
  story_id: string | null;
  storage_path: string;
  caption: string | null;
  created_at: string;
}

export function groupPhotosByChapter(rows: PhotoRow[]): Map<string, PhotoRow[]> {
  const out = new Map<string, PhotoRow[]>();
  for (const p of rows) {
    const list = out.get(p.chapter) ?? [];
    list.push(p);
    out.set(p.chapter, list);
  }
  return out;
}

export function groupPhotosByStory(rows: PhotoRow[]): Map<string, PhotoRow[]> {
  const out = new Map<string, PhotoRow[]>();
  for (const p of rows) {
    if (!p.story_id) continue;
    const list = out.get(p.story_id) ?? [];
    list.push(p);
    out.set(p.story_id, list);
  }
  return out;
}
