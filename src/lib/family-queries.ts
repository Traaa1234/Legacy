import 'server-only';
import { getServiceSupabase } from '@/lib/supabase/server';
import type {
  FamilyMember,
  FamilyQuestionRow,
  LinkedSenior,
  ReactionRow,
} from './family';

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
