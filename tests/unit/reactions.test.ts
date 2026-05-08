import { describe, it, expect } from 'vitest';
import { toggleReactionInList, type ReactionLite } from '@/lib/reactions';

const FAMILY_USER = 'fam-1';

describe('toggleReactionInList', () => {
  it('adds a reaction when user has not reacted yet', () => {
    const before: ReactionLite[] = [];
    const after = toggleReactionInList(before, 'story-1', FAMILY_USER, '❤️');
    expect(after).toHaveLength(1);
    expect(after[0]).toMatchObject({
      story_id: 'story-1',
      family_user_id: FAMILY_USER,
      emoji: '❤️',
    });
  });

  it('removes a reaction when user already reacted with that emoji', () => {
    const before: ReactionLite[] = [
      { story_id: 'story-1', family_user_id: FAMILY_USER, emoji: '❤️' },
    ];
    const after = toggleReactionInList(before, 'story-1', FAMILY_USER, '❤️');
    expect(after).toEqual([]);
  });

  it('leaves other users\' reactions intact when toggling own', () => {
    const before: ReactionLite[] = [
      { story_id: 'story-1', family_user_id: 'other', emoji: '❤️' },
      { story_id: 'story-1', family_user_id: FAMILY_USER, emoji: '❤️' },
    ];
    const after = toggleReactionInList(before, 'story-1', FAMILY_USER, '❤️');
    expect(after).toEqual([
      { story_id: 'story-1', family_user_id: 'other', emoji: '❤️' },
    ]);
  });

  it('only touches the targeted story_id', () => {
    const before: ReactionLite[] = [
      { story_id: 'story-1', family_user_id: FAMILY_USER, emoji: '❤️' },
      { story_id: 'story-2', family_user_id: FAMILY_USER, emoji: '❤️' },
    ];
    const after = toggleReactionInList(before, 'story-1', FAMILY_USER, '❤️');
    expect(after).toHaveLength(1);
    expect(after[0]?.story_id).toBe('story-2');
  });
});
