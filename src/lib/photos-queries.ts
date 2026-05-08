import 'server-only';
import { getServiceSupabase } from '@/lib/supabase/server';
import type { PhotoRow } from './photos';

export async function listPhotosForUser(seniorUserId: string): Promise<PhotoRow[]> {
  const sb = getServiceSupabase();

  // Photos uploaded BY this senior (their own additions)
  const { data: own, error: ownErr } = await sb
    .from('photos')
    .select('id, uploaded_by_user_id, chapter, story_id, storage_path, caption, created_at')
    .eq('uploaded_by_user_id', seniorUserId);
  if (ownErr) throw new Error(ownErr.message);

  // Photos linked to this senior's stories (uploaded by anyone, including family)
  const { data: linked, error: linkedErr } = await sb
    .from('photos')
    .select(
      'id, uploaded_by_user_id, chapter, story_id, storage_path, caption, created_at, stories!inner(user_id)',
    )
    .eq('stories.user_id', seniorUserId);
  if (linkedErr) throw new Error(linkedErr.message);

  // Dedupe by id
  const byId = new Map<string, PhotoRow>();
  for (const p of own ?? []) byId.set(p.id, p as PhotoRow);
  for (const p of linked ?? []) {
    const { stories: _stories, ...rest } = p as PhotoRow & { stories?: unknown };
    byId.set(rest.id, rest as PhotoRow);
  }
  return Array.from(byId.values()).sort(
    (a, b) =>
      a.chapter.localeCompare(b.chapter) ||
      a.created_at.localeCompare(b.created_at),
  );
}

export async function listPhotosLinkedToStory(storyId: string): Promise<PhotoRow[]> {
  const sb = getServiceSupabase();
  const { data, error } = await sb
    .from('photos')
    .select('id, uploaded_by_user_id, chapter, story_id, storage_path, caption, created_at')
    .eq('story_id', storyId)
    .order('created_at');
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getPhotoSignedUrl(
  path: string,
  expiresIn = 60 * 60,
): Promise<string> {
  const sb = getServiceSupabase();
  const { data, error } = await sb.storage.from('photos').createSignedUrl(path, expiresIn);
  if (error || !data) throw new Error(error?.message ?? 'photo signed url failed');
  return data.signedUrl;
}
