'use client';

import type { FamilyMember, FamilyQuestionRow } from '@/lib/family';
import { BigText } from '@/components/senior-ui';

interface Props {
  seniorUserId: string;
  familyMembers: FamilyMember[];
  familyQuestions: FamilyQuestionRow[];
}

export function SeniorViewClient(_: Props) {
  return (
    <main className="min-h-screen p-4 max-w-xl mx-auto">
      <BigText size="display" as="h1">Family page (senior — stub)</BigText>
      <p className="text-body opacity-70 mt-4">Will be filled in by Task 12.</p>
    </main>
  );
}
