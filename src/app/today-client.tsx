'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { CHAPTERS, type ChapterSlug } from '@/lib/chapters';
import { selectNextPromptId, type PromptRow, type SkipRow } from '@/lib/prompts';
import type { FamilyQuestionRow } from '@/lib/family';
import { ChapterSelector } from '@/components/chapter/ChapterSelector';
import { BigCard, BigText, BigButton } from '@/components/senior-ui';
import { useRecorder } from '@/components/recorder/use-recorder';
import { RecorderButton } from '@/components/recorder/RecorderButton';
import { RecorderTimer } from '@/components/recorder/RecorderTimer';
import { TranscribingSpinner } from '@/components/recorder/TranscribingSpinner';
import { TranscriptReview } from '@/components/recorder/TranscriptReview';
import { putPendingAudio, clearPendingAudio } from '@/lib/indexed-db';
import { saveStory, skipPrompt, saveFamilyQuestionAnswer } from './today-actions';

interface FullPrompt extends PromptRow {
  question_text: string;
}

interface Props {
  prompts: FullPrompt[];
  answeredPromptIds: string[];
  skips: SkipRow[];
  pendingFamilyQuestions: FamilyQuestionRow[];
}

type Phase =
  | { kind: 'browsing' }
  | { kind: 'answering-family'; familyQuestion: FamilyQuestionRow }
  | { kind: 'transcribing' }
  | { kind: 'reviewing'; transcript: string; transcriptRaw: string; storyId: string; audioPath: string; durationSeconds: number; familyQuestionId?: string }
  | { kind: 'error'; message: string };

function uuid(): string {
  return crypto.randomUUID();
}

export function TodayClient({
  prompts,
  answeredPromptIds,
  skips,
  pendingFamilyQuestions,
}: Props) {
  const [chapter, setChapter] = useState<ChapterSlug>('early_childhood');
  const [phase, setPhase] = useState<Phase>({ kind: 'browsing' });
  const recorder = useRecorder();

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

  async function handleStop() {
    if (!nextPrompt) return;
    const blob = await recorder.stop();
    if (!blob) {
      setPhase({ kind: 'error', message: 'Could not capture recording. Please try again.' });
      return;
    }
    await uploadAndTranscribe(blob, { type: 'prompt', prompt: nextPrompt });
  }

  async function handleStopFamilyAnswer() {
    if (phase.kind !== 'answering-family') return;
    const familyQuestion = phase.familyQuestion;
    const blob = await recorder.stop();
    if (!blob) {
      setPhase({ kind: 'error', message: 'Could not capture recording. Please try again.' });
      return;
    }
    await uploadAndTranscribe(blob, {
      type: 'family',
      familyQuestionId: familyQuestion.id,
      chapter,
    });
  }

  type Target =
    | { type: 'prompt'; prompt: FullPrompt }
    | { type: 'family'; familyQuestionId: string; chapter: ChapterSlug };

  async function uploadAndTranscribe(blob: Blob, target: Target) {
    setPhase({ kind: 'transcribing' });
    const storyId = uuid();
    try {
      // 1. Stash blob in IndexedDB as safety net
      await putPendingAudio(storyId, blob);

      // 2. Get signed upload URL
      const upRes = await fetch('/api/signed-upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bucket: 'audio', storyId, ext: 'webm' }),
      });
      if (!upRes.ok) {
        let detail = `HTTP ${upRes.status}`;
        try {
          const body = await upRes.json();
          if (body?.error) detail = typeof body.error === 'string' ? body.error : JSON.stringify(body.error);
        } catch { /* not JSON */ }
        throw new Error(`Could not get upload URL: ${detail}`);
      }
      const { path, signedUrl } = await upRes.json();

      // 3. PUT blob directly to Supabase Storage
      const putRes = await fetch(signedUrl, {
        method: 'PUT',
        headers: { 'Content-Type': 'audio/webm' },
        body: blob,
      });
      if (!putRes.ok) {
        const text = await putRes.text().catch(() => '');
        throw new Error(`Audio upload failed: HTTP ${putRes.status}${text ? ` — ${text.slice(0, 200)}` : ''}`);
      }

      // 4. Hit /api/transcribe
      const trRes = await fetch('/api/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audioPath: path }),
      });
      if (!trRes.ok) {
        let detail = `HTTP ${trRes.status}`;
        try {
          const body = await trRes.json();
          if (body?.stage) detail = `${body.stage} failed (${trRes.status})`;
          else if (body?.error) detail = typeof body.error === 'string' ? body.error : JSON.stringify(body.error);
        } catch { /* response body wasn't JSON */ }
        throw new Error(`Transcription failed: ${detail}`);
      }
      const tr = await trRes.json();

      setPhase({
        kind: 'reviewing',
        storyId,
        audioPath: path,
        transcript: tr.transcript,
        transcriptRaw: tr.transcript_raw,
        durationSeconds: tr.duration_seconds,
        familyQuestionId: target.type === 'family' ? target.familyQuestionId : undefined,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Something went wrong';
      setPhase({ kind: 'error', message: msg });
    }
  }

  async function handleSave(finalTranscript: string) {
    if (phase.kind !== 'reviewing') return;
    if (phase.familyQuestionId) {
      // Family question answer
      await saveFamilyQuestionAnswer({
        storyId: phase.storyId,
        familyQuestionId: phase.familyQuestionId,
        chapter,
        audioPath: phase.audioPath,
        transcriptRaw: phase.transcriptRaw,
        transcript: finalTranscript,
        durationSeconds: phase.durationSeconds,
      });
    } else {
      if (!nextPrompt) return;
      await saveStory({
        storyId: phase.storyId,
        promptId: nextPrompt.id,
        chapter,
        audioPath: phase.audioPath,
        transcriptRaw: phase.transcriptRaw,
        transcript: finalTranscript,
        durationSeconds: phase.durationSeconds,
      });
    }
    await clearPendingAudio(phase.storyId);
    recorder.reset();
    setPhase({ kind: 'browsing' });
  }

  function handleRerecord() {
    recorder.reset();
    setPhase({ kind: 'browsing' });
  }

  async function handleSkip() {
    if (!nextPrompt) return;
    await skipPrompt({ promptId: nextPrompt.id });
  }

  return (
    <main className="min-h-screen p-4 max-w-xl mx-auto flex flex-col gap-4">
      {phase.kind === 'browsing' && pendingFamilyQuestions.length > 0 && (
        <BigCard className="bg-sand/40 border border-deep-navy/15">
          <BigText className="uppercase tracking-wide text-sm opacity-60 mb-2">
            From your family
          </BigText>
          <BigText size="question" as="h2">
            {pendingFamilyQuestions[0]?.question_text}
          </BigText>
          <div className="mt-4">
            <BigButton
              variant="primary"
              onClick={() => {
                const q = pendingFamilyQuestions[0];
                if (q) setPhase({ kind: 'answering-family', familyQuestion: q });
              }}
            >
              🎙 Record an answer
            </BigButton>
          </div>
          {pendingFamilyQuestions.length > 1 && (
            <p className="text-sm opacity-60 mt-3">
              + {pendingFamilyQuestions.length - 1} more — see all in Family.
            </p>
          )}
        </BigCard>
      )}

      <ChapterSelector selected={chapter} onSelect={setChapter} />

      {phase.kind === 'transcribing' && <TranscribingSpinner />}

      {phase.kind === 'error' && (
        <BigCard>
          <BigText size="question">Something went wrong</BigText>
          <p className="opacity-70 mt-2">{phase.message}</p>
          <button
            className="mt-4 underline"
            onClick={() => setPhase({ kind: 'browsing' })}
          >
            Try again
          </button>
        </BigCard>
      )}

      {phase.kind === 'reviewing' && (
        <TranscriptReview
          initialTranscript={phase.transcript}
          onSave={handleSave}
          onRerecord={handleRerecord}
        />
      )}

      {phase.kind === 'answering-family' && (
        <>
          <BigCard className="flex-1 flex flex-col gap-6 bg-sand/40 border border-deep-navy/15">
            <p className="text-sm uppercase tracking-wide opacity-60">
              {recorder.state === 'recording'
                ? 'Recording…'
                : 'From your family'}
            </p>
            <BigText size="question" as="h2">
              {phase.familyQuestion.question_text}
            </BigText>
            {recorder.state === 'recording' && (
              <RecorderTimer seconds={recorder.durationSeconds} />
            )}
          </BigCard>

          <RecorderButton
            state={recorder.state}
            onStart={recorder.start}
            onStop={handleStopFamilyAnswer}
          />

          {recorder.state === 'idle' && (
            <button
              onClick={() => setPhase({ kind: 'browsing' })}
              className="text-center py-4 underline opacity-70 min-h-touch-target"
            >
              Back to my chapter
            </button>
          )}
        </>
      )}

      {phase.kind === 'browsing' && nextPrompt && (
        <>
          <BigCard className="flex-1 flex flex-col gap-6">
            <p className="text-sm uppercase tracking-wide opacity-60">
              {recorder.state === 'recording'
                ? 'Recording…'
                : `Question ${chapterIndex + 1} of ${inChapter.length}`}
            </p>
            <BigText size="question" as="h2">
              {nextPrompt.question_text}
            </BigText>
            {recorder.state === 'recording' && (
              <RecorderTimer seconds={recorder.durationSeconds} />
            )}
          </BigCard>

          <RecorderButton
            state={recorder.state}
            onStart={recorder.start}
            onStop={handleStop}
          />

          {recorder.state === 'idle' && (
            <div className="flex justify-center gap-8 py-4">
              <button
                onClick={handleSkip}
                className="underline opacity-70 min-h-touch-target"
              >
                Skip for now
              </button>
              <Link
                href="/stories"
                className="underline opacity-70 min-h-touch-target flex items-center"
              >
                Exit
              </Link>
            </div>
          )}
        </>
      )}

      {phase.kind === 'browsing' && !nextPrompt && (
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
