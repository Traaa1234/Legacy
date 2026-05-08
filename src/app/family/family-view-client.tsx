'use client';

import type { LinkedSenior, ReactionRow } from '@/lib/family';
import type { StoryRow } from '@/lib/stories';
import { BigText } from '@/components/senior-ui';

interface Props {
  familyUserId: string;
  seniors: LinkedSenior[];
  initialSeniorId: string;
  initialStories: StoryRow[];
  initialReactions: ReactionRow[];
}

export function FamilyViewClient(_: Props) {
  return (
    <main className="min-h-screen p-4 max-w-xl mx-auto">
      <BigText size="display" as="h1">Family view (stub)</BigText>
      <p className="text-body opacity-70 mt-4">Will be filled in by Task 11.</p>
    </main>
  );
}
