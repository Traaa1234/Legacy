'use server';

import { z } from 'zod';
import { getServiceSupabase } from '@/lib/supabase/server';
import { addReaction, removeReaction } from '@/lib/reactions-queries';
import { revalidatePath } from 'next/cache';

const ToggleReactionInput = z.object({
  storyId: z.string().uuid(),
  familyUserId: z.string().uuid(),
  hasReacted: z.boolean(), // the new state — true means reaction should now exist
});

export async function toggleReaction(input: z.infer<typeof ToggleReactionInput>) {
  const data = ToggleReactionInput.parse(input);
  if (data.hasReacted) {
    await addReaction(data.storyId, data.familyUserId, '❤️');
  } else {
    await removeReaction(data.storyId, data.familyUserId, '❤️');
  }
  revalidatePath('/family');
}

const AskQuestionInput = z.object({
  fromFamilyUserId: z.string().uuid(),
  toSeniorUserId: z.string().uuid(),
  questionText: z.string().min(5).max(500),
});

export async function askQuestion(input: z.infer<typeof AskQuestionInput>) {
  const data = AskQuestionInput.parse(input);
  const sb = getServiceSupabase();
  const { error } = await sb.from('family_questions').insert({
    asked_by_user_id: data.fromFamilyUserId,
    asked_to_user_id: data.toSeniorUserId,
    question_text: data.questionText.trim(),
  });
  if (error) throw new Error(error.message);
  revalidatePath('/family');
  revalidatePath('/');
}
