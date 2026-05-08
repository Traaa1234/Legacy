import { getServiceSupabase } from '@/lib/supabase/server';

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

/* ---------- Pure helpers (testable in-memory) ---------- */

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

/* ---------- DB queries (server-only) ---------- */

export async function listLinkedSeniors(
  familyUserId: string,
): Promise<LinkedSenior[]> {
  const sb = getServiceSupabase();
  const { data, error } = await sb
    .from('family_links')
    .select('senior_user_id, users!family_links_senior_user_id_fkey (id, display_name, email)')
    .eq('family_user_id', familyUserId);
  if (error) throw new Error(error.message);
  return (data ?? [])
    .map((r) => (r.users as unknown as LinkedSenior | null))
    .filter((u): u is LinkedSenior => u !== null);
}

export async function listFamilyMembersForSenior(
  seniorUserId: string,
): Promise<FamilyMember[]> {
  const sb = getServiceSupabase();
  const { data, error } = await sb
    .from('family_links')
    .select('family_user_id, users!family_links_family_user_id_fkey (id, display_name, email)')
    .eq('senior_user_id', seniorUserId);
  if (error) throw new Error(error.message);
  return (data ?? [])
    .map((r) => r.users as unknown as FamilyMember | null)
    .filter((u): u is FamilyMember => u !== null);
}

export async function listFamilyQuestionsForSenior(
  seniorUserId: string,
): Promise<FamilyQuestionRow[]> {
  const sb = getServiceSupabase();
  const { data, error } = await sb
    .from('family_questions')
    .select('id, asked_by_user_id, asked_to_user_id, question_text, answered_story_id, created_at')
    .eq('asked_to_user_id', seniorUserId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function listReactionsForStories(
  storyIds: string[],
): Promise<ReactionRow[]> {
  if (storyIds.length === 0) return [];
  const sb = getServiceSupabase();
  const { data, error } = await sb
    .from('reactions')
    .select('story_id, family_user_id, emoji, created_at')
    .in('story_id', storyIds);
  if (error) throw new Error(error.message);
  return data ?? [];
}
