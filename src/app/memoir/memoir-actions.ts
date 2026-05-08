'use server';

import { z } from 'zod';
import { getServiceSupabase } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

const SavePhotoInput = z.object({
  uploadedByUserId: z.string().uuid(),
  storagePath: z.string(),
  chapter: z.string(),
  storyId: z.string().uuid().nullable(),
  caption: z.string().nullable(),
});

export async function savePhoto(input: z.infer<typeof SavePhotoInput>) {
  const data = SavePhotoInput.parse(input);
  const sb = getServiceSupabase();
  const { error } = await sb.from('photos').insert({
    uploaded_by_user_id: data.uploadedByUserId,
    storage_path: data.storagePath,
    chapter: data.chapter,
    story_id: data.storyId,
    caption: data.caption,
  });
  if (error) throw new Error(error.message);
  revalidatePath('/memoir');
  revalidatePath('/family');
  if (data.storyId) revalidatePath(`/stories/${data.storyId}`);
}
