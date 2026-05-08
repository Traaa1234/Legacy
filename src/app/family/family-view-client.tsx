'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { CHAPTERS } from '@/lib/chapters';
import { BigCard, BigText } from '@/components/senior-ui';
import { ReactionButton } from '@/components/family/ReactionButton';
import { AskQuestionForm } from '@/components/family/AskQuestionForm';
import { SeniorPicker } from '@/components/family/SeniorPicker';
import { PhotoUploadModal } from '@/components/photos/PhotoUploadModal';
import { toggleReaction } from './family-actions';
import {
  groupReactionsByStory,
  type LinkedSenior,
  type ReactionRow,
} from '@/lib/family';
import type { StoryRow } from '@/lib/stories';

interface Props {
  familyUserId: string;
  seniors: LinkedSenior[];
  initialSeniorId: string;
  initialStories: StoryRow[];
  initialReactions: ReactionRow[];
}

function snippet(text: string, n = 200): string {
  return text.length <= n ? text : text.slice(0, n).trimEnd() + '…';
}

export function FamilyViewClient({
  familyUserId,
  seniors,
  initialSeniorId,
  initialStories,
  initialReactions,
}: Props) {
  const [seniorId, setSeniorId] = useState(initialSeniorId);
  const [photoUploadOpen, setPhotoUploadOpen] = useState(false);

  // Switching senior triggers a hard navigation so the server re-queries
  // stories+reactions for that senior.
  function pickSenior(id: string) {
    setSeniorId(id);
    window.location.search = `?persona=family&senior=${id}`;
  }

  const selectedSenior = seniors.find((s) => s.id === seniorId);
  const reactionsByStory = useMemo(
    () => groupReactionsByStory(initialReactions),
    [initialReactions],
  );

  function hasReacted(storyId: string): boolean {
    const rs = reactionsByStory.get(storyId) ?? [];
    return rs.some((r) => r.family_user_id === familyUserId);
  }

  function reactionCount(storyId: string): number {
    return (reactionsByStory.get(storyId) ?? []).length;
  }

  const handleToggle = async (storyId: string, hasReactedNow: boolean) => {
    await toggleReaction({
      storyId,
      familyUserId,
      hasReacted: hasReactedNow,
    });
  };

  const storyOptions = initialStories.map((s) => ({
    id: s.id,
    chapter: s.chapter,
    question_text: s.question_text,
  }));

  return (
    <main className="min-h-screen p-4 max-w-xl mx-auto flex flex-col gap-6">
      <SeniorPicker seniors={seniors} selectedId={seniorId} onSelect={pickSenior} />

      <div className="flex items-center justify-between gap-3">
        <BigText size="display" as="h1">
          {selectedSenior?.display_name}&apos;s stories
        </BigText>
        <button
          onClick={() => setPhotoUploadOpen(true)}
          className="text-deep-navy underline opacity-70 min-h-touch-target"
        >
          📷 Add a photo
        </button>
      </div>

      {selectedSenior && (
        <AskQuestionForm
          fromFamilyUserId={familyUserId}
          toSeniorUserId={selectedSenior.id}
          toSeniorName={selectedSenior.display_name}
        />
      )}

      <Link
        href={`/api/family/export-zip?seniorId=${seniorId}`}
        className="block text-center underline opacity-70 min-h-touch-target py-3"
      >
        ⬇ Download all stories as a ZIP
      </Link>

      {initialStories.length === 0 && (
        <BigCard>
          <BigText>No stories yet. Once they record one, it&apos;ll show up here.</BigText>
        </BigCard>
      )}

      {CHAPTERS.map((c) => {
        const rows = initialStories.filter((s) => s.chapter === c.slug);
        if (rows.length === 0) return null;
        return (
          <section key={c.slug} className="flex flex-col gap-3">
            <h2 className="text-question font-serif sticky top-0 bg-cream py-2">
              {c.label}
            </h2>
            {rows.map((s) => (
              <BigCard key={s.id} className="flex flex-col gap-3">
                {s.question_text && (
                  <p className="text-sm opacity-70">{s.question_text}</p>
                )}
                <BigText>{snippet(s.transcript)}</BigText>
                <div className="flex items-center justify-between gap-3">
                  <Link
                    href={`/stories/${s.id}`}
                    className="underline text-deep-navy"
                  >
                    Listen →
                  </Link>
                  <ReactionButton
                    storyId={s.id}
                    initialHasReacted={hasReacted(s.id)}
                    initialCount={reactionCount(s.id)}
                    onToggle={handleToggle}
                  />
                </div>
              </BigCard>
            ))}
          </section>
        );
      })}
      {photoUploadOpen && selectedSenior && (
        <PhotoUploadModal
          uploadedByUserId={familyUserId}
          forSeniorUserId={selectedSenior.id}
          stories={storyOptions}
          onClose={() => setPhotoUploadOpen(false)}
          onSaved={() => window.location.reload()}
        />
      )}
    </main>
  );
}
