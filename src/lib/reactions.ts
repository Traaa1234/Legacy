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
