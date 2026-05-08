'use server';

import { z } from 'zod';
import { getServiceSupabase } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

const ToggleInput = z.object({
  storyId: z.string().uuid(),
  isPrivate: z.boolean(),
});

export async function setStoryPrivate(input: z.infer<typeof ToggleInput>) {
  const data = ToggleInput.parse(input);
  const sb = getServiceSupabase();
  const { error } = await sb
    .from('stories')
    .update({ is_private: data.isPrivate })
    .eq('id', data.storyId);
  if (error) throw new Error(error.message);
  revalidatePath(`/stories/${data.storyId}`);
  revalidatePath('/stories');
  revalidatePath('/family');
}
