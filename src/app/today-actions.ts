'use server';

import { z } from 'zod';
import { getServiceSupabase } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

const SENIOR_ID = '00000000-0000-4000-8000-000000000001';

const SaveStoryInput = z.object({
  storyId: z.string().uuid(),
  promptId: z.string().uuid(),
  chapter: z.string(),
  audioPath: z.string(),
  transcriptRaw: z.string(),
  transcript: z.string(),
  durationSeconds: z.number().int().nonnegative(),
});

export async function saveStory(input: z.infer<typeof SaveStoryInput>) {
  const data = SaveStoryInput.parse(input);
  const sb = getServiceSupabase();
  const { error } = await sb.from('stories').insert({
    id: data.storyId,
    user_id: SENIOR_ID,
    prompt_id: data.promptId,
    audio_url: data.audioPath,
    audio_duration_seconds: data.durationSeconds,
    transcript_raw: data.transcriptRaw,
    transcript: data.transcript,
    chapter: data.chapter,
  });
  if (error) throw new Error(error.message);
  revalidatePath('/');
  revalidatePath('/stories');
}

const SkipPromptInput = z.object({ promptId: z.string().uuid() });

export async function skipPrompt(input: z.infer<typeof SkipPromptInput>) {
  const data = SkipPromptInput.parse(input);
  const sb = getServiceSupabase();
  await sb.from('prompt_skips').upsert(
    { prompt_id: data.promptId, user_id: SENIOR_ID, skipped_at: new Date().toISOString() },
    { onConflict: 'prompt_id,user_id' },
  );
  revalidatePath('/');
}
