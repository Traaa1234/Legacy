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
  language: z.string().default('en'),
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
    language: data.language,
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

const SaveFamilyAnswerInput = z.object({
  storyId: z.string().uuid(),
  familyQuestionId: z.string().uuid(),
  chapter: z.string(),
  audioPath: z.string(),
  transcriptRaw: z.string(),
  transcript: z.string(),
  durationSeconds: z.number().int().nonnegative(),
  language: z.string().default('en'),
});

export async function saveFamilyQuestionAnswer(
  input: z.infer<typeof SaveFamilyAnswerInput>,
) {
  const data = SaveFamilyAnswerInput.parse(input);
  const sb = getServiceSupabase();

  // 1. Insert the story
  const { error: storyErr } = await sb.from('stories').insert({
    id: data.storyId,
    user_id: SENIOR_ID,
    family_question_id: data.familyQuestionId,
    audio_url: data.audioPath,
    audio_duration_seconds: data.durationSeconds,
    transcript_raw: data.transcriptRaw,
    transcript: data.transcript,
    chapter: data.chapter,
    language: data.language,
  });
  if (storyErr) throw new Error(storyErr.message);

  // 2. Mark the family question as answered
  const { error: updateErr } = await sb
    .from('family_questions')
    .update({ answered_story_id: data.storyId })
    .eq('id', data.familyQuestionId);
  if (updateErr) throw new Error(updateErr.message);

  revalidatePath('/');
  revalidatePath('/stories');
  revalidatePath('/family');
}
