// Pure helpers and types. Safe to import from both server and client code.
// DB queries live in `family-queries.ts` (server-only).

export interface ReactionRow {
  story_id: string;
  family_user_id: string;
  emoji: string;
  created_at: string;
}

export interface FamilyQuestionRow {
  id: string;
  asked_by_user_id: string;
  asked_to_user_id: string;
  question_text: string;
  answered_story_id: string | null;
  created_at: string;
}

export interface LinkedSenior {
  id: string;
  display_name: string;
  email: string;
}

export interface FamilyMember {
  id: string;
  display_name: string;
  email: string;
}

export function groupReactionsByStory(
  rows: ReactionRow[],
): Map<string, ReactionRow[]> {
  const out = new Map<string, ReactionRow[]>();
  for (const r of rows) {
    const list = out.get(r.story_id) ?? [];
    list.push(r);
    out.set(r.story_id, list);
  }
  return out;
}

export function partitionFamilyQuestions(rows: FamilyQuestionRow[]) {
  const pending = rows.filter((r) => r.answered_story_id === null);
  const answered = rows.filter((r) => r.answered_story_id !== null);
  return { pending, answered };
}
