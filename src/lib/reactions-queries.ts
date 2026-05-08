import 'server-only';
import { getServiceSupabase } from '@/lib/supabase/server';

export async function addReaction(
  storyId: string,
  familyUserId: string,
  emoji: string,
): Promise<void> {
  const sb = getServiceSupabase();
  const { error } = await sb.from('reactions').upsert(
    { story_id: storyId, family_user_id: familyUserId, emoji },
    { onConflict: 'story_id,family_user_id,emoji' },
  );
  if (error) throw new Error(error.message);
}

export async function removeReaction(
  storyId: string,
  familyUserId: string,
  emoji: string,
): Promise<void> {
  const sb = getServiceSupabase();
  const { error } = await sb
    .from('reactions')
    .delete()
    .eq('story_id', storyId)
    .eq('family_user_id', familyUserId)
    .eq('emoji', emoji);
  if (error) throw new Error(error.message);
}
