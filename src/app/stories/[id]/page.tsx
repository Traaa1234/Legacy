import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getServiceSupabase } from '@/lib/supabase/server';
import { getAudioSignedUrl } from '@/lib/supabase/signed-url';
import { getChapterLabel } from '@/lib/chapters';
import { BigCard, BigText } from '@/components/senior-ui';
import { StoryAudioPlayer } from './audio-player';

export const dynamic = 'force-dynamic';

interface Params { id: string }

export default async function StoryDetailPage({
  params,
}: { params: Promise<Params> }) {
  const { id } = await params;
  const sb = getServiceSupabase();

  const { data: story } = await sb
    .from('stories')
    .select(`id, chapter, transcript, audio_url, created_at, prompt_id,
             prompts:prompt_id (question_text)`)
    .eq('id', id)
    .single();

  if (!story) notFound();

  const audioUrl = await getAudioSignedUrl(story.audio_url);
  const question =
    (story.prompts as unknown as { question_text: string } | null)
      ?.question_text ?? null;

  return (
    <main className="min-h-screen p-4 max-w-xl mx-auto flex flex-col gap-6">
      <Link href="/stories" className="opacity-70 underline">
        ← All stories
      </Link>

      <BigCard className="flex flex-col gap-4">
        <p className="text-sm uppercase tracking-wide opacity-60">
          {getChapterLabel(story.chapter)}
        </p>
        {question && <BigText size="question" as="h1">{question}</BigText>}
        <StoryAudioPlayer src={audioUrl} />
        <BigText className="whitespace-pre-wrap leading-relaxed">
          {story.transcript}
        </BigText>
      </BigCard>
    </main>
  );
}
