import { getServiceSupabase } from '@/lib/supabase/server';
import { CHAPTERS, type ChapterSlug } from '@/lib/chapters';

export interface StoryRow {
  id: string;
  chapter: string;
  transcript: string;
  audio_url: string;
  audio_duration_seconds: number;
  created_at: string;
  prompt_id: string | null;
  question_text: string | null;
}

export async function listStoriesForUser(userId: string): Promise<StoryRow[]> {
  const sb = getServiceSupabase();
  const { data, error } = await sb
    .from('stories')
    .select(
      `id, chapter, transcript, audio_url, audio_duration_seconds, created_at, prompt_id,
       prompts:prompt_id (question_text)`,
    )
    .eq('user_id', userId)
    .order('chapter', { ascending: true })
    .order('created_at', { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => ({
    id: r.id,
    chapter: r.chapter,
    transcript: r.transcript,
    audio_url: r.audio_url,
    audio_duration_seconds: r.audio_duration_seconds,
    created_at: r.created_at,
    prompt_id: r.prompt_id,
    question_text:
      (r.prompts as unknown as { question_text: string } | null)
        ?.question_text ?? null,
  }));
}

export function groupByChapter(rows: StoryRow[]) {
  const out: Record<ChapterSlug, StoryRow[]> = Object.fromEntries(
    CHAPTERS.map((c) => [c.slug, [] as StoryRow[]]),
  ) as Record<ChapterSlug, StoryRow[]>;
  for (const r of rows) {
    if (r.chapter in out) out[r.chapter as ChapterSlug].push(r);
  }
  return out;
}
