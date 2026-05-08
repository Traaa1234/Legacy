import { getServiceSupabase } from '@/lib/supabase/server';
import { TodayClient } from './today-client';

export const dynamic = 'force-dynamic';

const SENIOR_ID = '00000000-0000-4000-8000-000000000001';

export default async function HomePage() {
  const sb = getServiceSupabase();

  const { data: prompts } = await sb
    .from('prompts')
    .select('id, chapter, order_in_chapter, question_text');

  const { data: stories } = await sb
    .from('stories')
    .select('prompt_id')
    .eq('user_id', SENIOR_ID);

  const { data: skips } = await sb
    .from('prompt_skips')
    .select('prompt_id, skipped_at')
    .eq('user_id', SENIOR_ID);

  return (
    <TodayClient
      prompts={prompts ?? []}
      answeredPromptIds={
        ((stories ?? [])
          .map((s) => s.prompt_id)
          .filter(Boolean)) as string[]
      }
      skips={(skips ?? []).map((s) => ({
        prompt_id: s.prompt_id,
        skipped_at: new Date(s.skipped_at).getTime(),
      }))}
    />
  );
}
