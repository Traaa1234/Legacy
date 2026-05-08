'use client';

import { useState } from 'react';
import { BigButton, BigCard, BigText } from '@/components/senior-ui';
import { InviteLinkModal } from '@/components/family/InviteLinkModal';
import { partitionFamilyQuestions } from '@/lib/family';
import type { FamilyMember, FamilyQuestionRow } from '@/lib/family';

interface Props {
  seniorUserId: string;
  familyMembers: FamilyMember[];
  familyQuestions: FamilyQuestionRow[];
}

export function SeniorViewClient({
  seniorUserId,
  familyMembers,
  familyQuestions,
}: Props) {
  const [inviteOpen, setInviteOpen] = useState(false);
  const { pending, answered } = partitionFamilyQuestions(familyQuestions);

  // Map family member IDs to display names for the question feed
  const memberById = new Map(familyMembers.map((m) => [m.id, m.display_name]));

  return (
    <main className="min-h-screen p-4 max-w-xl mx-auto flex flex-col gap-6">
      <BigText size="display" as="h1">My family</BigText>

      <section className="flex flex-col gap-3">
        <BigText className="uppercase tracking-wide text-sm opacity-60">
          People who can hear my stories
        </BigText>
        {familyMembers.length === 0 ? (
          <BigCard>
            <BigText>No one has joined yet. Invite someone to get started.</BigText>
          </BigCard>
        ) : (
          familyMembers.map((m) => (
            <BigCard key={m.id} className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-sand flex items-center justify-center text-deep-navy font-semibold">
                {m.display_name[0]?.toUpperCase()}
              </div>
              <div className="flex-1">
                <BigText>{m.display_name}</BigText>
                <p className="text-sm opacity-60">{m.email}</p>
              </div>
            </BigCard>
          ))
        )}
        <BigButton variant="primary" onClick={() => setInviteOpen(true)}>
          Invite a family member
        </BigButton>
      </section>

      {pending.length > 0 && (
        <section className="flex flex-col gap-3">
          <BigText className="uppercase tracking-wide text-sm opacity-60">
            Questions from your family
          </BigText>
          {pending.map((q) => (
            <BigCard key={q.id}>
              <p className="text-sm opacity-70 mb-2">
                {memberById.get(q.asked_by_user_id) ?? 'Family'} asks:
              </p>
              <BigText size="question">{q.question_text}</BigText>
            </BigCard>
          ))}
        </section>
      )}

      {answered.length > 0 && (
        <section className="flex flex-col gap-3">
          <BigText className="uppercase tracking-wide text-sm opacity-60">
            Questions you&apos;ve answered
          </BigText>
          {answered.map((q) => (
            <BigCard key={q.id}>
              <p className="text-sm opacity-70 mb-2">
                {memberById.get(q.asked_by_user_id) ?? 'Family'} asked:
              </p>
              <BigText>{q.question_text}</BigText>
              <p className="text-sm opacity-50 mt-2">✓ Answered</p>
            </BigCard>
          ))}
        </section>
      )}

      {inviteOpen && (
        <InviteLinkModal
          baseUrl={typeof window !== 'undefined' ? window.location.origin : ''}
          onClose={() => setInviteOpen(false)}
        />
      )}
    </main>
  );
}
