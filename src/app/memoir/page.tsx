import { MemoirContent } from './memoir-content';
import { MemoirActions } from './memoir-actions-client';
import { getServiceSupabase } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const SENIOR_ID = '00000000-0000-4000-8000-000000000001';

export default async function MemoirPage() {
  // Lightweight stories list for the upload modal's "link to story" picker
  const sb = getServiceSupabase();
  const { data: stories } = await sb
    .from('stories')
    .select('id, chapter, prompts:prompt_id (question_text)')
    .eq('user_id', SENIOR_ID);

  const storyOptions = (stories ?? []).map((r) => ({
    id: r.id as string,
    chapter: r.chapter as string,
    question_text:
      (r.prompts as unknown as { question_text: string } | null)?.question_text ?? null,
  }));

  return (
    <main className="min-h-screen pb-24">
      <MemoirActions
        uploadedByUserId={SENIOR_ID}
        forSeniorUserId={SENIOR_ID}
        stories={storyOptions}
      />
      <MemoirContent seniorUserId={SENIOR_ID} />
    </main>
  );
}
