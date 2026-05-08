'use client';

import { useMemo, useState } from 'react';
import { CHAPTERS, type ChapterSlug } from '@/lib/chapters';
import { selectNextPromptId, type PromptRow, type SkipRow } from '@/lib/prompts';
import { ChapterSelector } from '@/components/chapter/ChapterSelector';
import { BigCard, BigText } from '@/components/senior-ui';

interface FullPrompt extends PromptRow {
  question_text: string;
}

interface Props {
  prompts: FullPrompt[];
  answeredPromptIds: string[];
  skips: SkipRow[];
}

export function TodayClient({ prompts, answeredPromptIds, skips }: Props) {
  const [chapter, setChapter] = useState<ChapterSlug>('early_childhood');

  const inChapter = useMemo(
    () => prompts.filter((p) => p.chapter === chapter),
    [prompts, chapter],
  );

  const nextPromptId = useMemo(
    () =>
      selectNextPromptId({
        prompts: inChapter,
        answeredPromptIds: new Set(answeredPromptIds),
        skips,
        now: Date.now(),
      }),
    [inChapter, answeredPromptIds, skips],
  );

  const nextPrompt = inChapter.find((p) => p.id === nextPromptId) ?? null;
  const chapterIndex = inChapter.findIndex((p) => p.id === nextPromptId);

  return (
    <main className="min-h-screen p-4 max-w-xl mx-auto flex flex-col gap-4">
      <ChapterSelector selected={chapter} onSelect={setChapter} />

      {nextPrompt ? (
        <BigCard className="flex-1 flex flex-col gap-6">
          <p className="text-sm uppercase tracking-wide opacity-60">
            Question {chapterIndex + 1} of {inChapter.length}
          </p>
          <BigText size="question" as="h2">
            {nextPrompt.question_text}
          </BigText>
          <p className="text-base opacity-50 mt-auto">
            (Recording controls land in the next task)
          </p>
        </BigCard>
      ) : (
        <BigCard>
          <BigText size="question" as="h2">
            You&apos;ve shared every story in {CHAPTERS.find((c) => c.slug === chapter)?.label}.
          </BigText>
          <p className="mt-4 opacity-70">Try another chapter above.</p>
        </BigCard>
      )}
    </main>
  );
}
