import { getServiceSupabase } from '@/lib/supabase/server';

export interface ReactionLite {
  story_id: string;
  family_user_id: string;
  emoji: string;
}

/** Pure helper: optimistic toggle for a UI list. */
export function toggleReactionInList(
  list: ReactionLite[],
  storyId: string,
  familyUserId: string,
  emoji: string,
): ReactionLite[] {
  const exists = list.some(
    (r) =>
      r.story_id === storyId &&
      r.family_user_id === familyUserId &&
      r.emoji === emoji,
  );
  if (exists) {
    return list.filter(
      (r) =>
        !(
          r.story_id === storyId &&
          r.family_user_id === familyUserId &&
          r.emoji === emoji
        ),
    );
  }
  return [...list, { story_id: storyId, family_user_id: familyUserId, emoji }];
}

/* ---------- DB writes ---------- */

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
