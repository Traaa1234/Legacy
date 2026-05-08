import { describe, it, expect } from 'vitest';
import {
  groupReactionsByStory,
  partitionFamilyQuestions,
  type FamilyQuestionRow,
  type ReactionRow,
} from '@/lib/family';

const NOW = '2026-05-08T12:00:00Z';

describe('groupReactionsByStory', () => {
  it('returns an empty map for no reactions', () => {
    expect(groupReactionsByStory([])).toEqual(new Map());
  });

  it('groups multiple reactions by story_id', () => {
    const rows: ReactionRow[] = [
      { story_id: 's1', family_user_id: 'f1', emoji: '❤️', created_at: NOW },
      { story_id: 's1', family_user_id: 'f2', emoji: '❤️', created_at: NOW },
      { story_id: 's2', family_user_id: 'f1', emoji: '❤️', created_at: NOW },
    ];
    const grouped = groupReactionsByStory(rows);
    expect(grouped.get('s1')).toHaveLength(2);
    expect(grouped.get('s2')).toHaveLength(1);
  });
});

describe('partitionFamilyQuestions', () => {
  const base: Omit<FamilyQuestionRow, 'id' | 'answered_story_id'> = {
    asked_by_user_id: 'family-1',
    asked_to_user_id: 'senior-1',
    question_text: 'tell me about?',
    created_at: NOW,
  };

  it('separates pending and answered questions', () => {
    const rows: FamilyQuestionRow[] = [
      { id: 'q1', answered_story_id: null,    ...base },
      { id: 'q2', answered_story_id: 's1',    ...base },
      { id: 'q3', answered_story_id: null,    ...base },
    ];
    const { pending, answered } = partitionFamilyQuestions(rows);
    expect(pending.map((q) => q.id)).toEqual(['q1', 'q3']);
    expect(answered.map((q) => q.id)).toEqual(['q2']);
  });

  it('handles empty input', () => {
    const { pending, answered } = partitionFamilyQuestions([]);
    expect(pending).toEqual([]);
    expect(answered).toEqual([]);
  });
});
