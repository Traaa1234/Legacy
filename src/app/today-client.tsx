'use client';

import { useMemo, useState } from 'react';
import { CHAPTERS, type ChapterSlug } from '@/lib/chapters';
import { selectNextPromptId, type PromptRow, type SkipRow } from '@/lib/prompts';
import { ChapterSelector } from '@/components/chapter/ChapterSelector';
import { BigCard, BigText } from '@/components/senior-ui';
import { useRecorder } from '@/components/recorder/use-recorder';
import { RecorderButton } from '@/components/recorder/RecorderButton';
import { RecorderTimer } from '@/components/recorder/RecorderTimer';
import { TranscribingSpinner } from '@/components/recorder/TranscribingSpinner';
import { TranscriptReview } from '@/components/recorder/TranscriptReview';
import { putPendingAudio, clearPendingAudio } from '@/lib/indexed-db';
import { saveStory, skipPrompt } from './today-actions';

interface FullPrompt extends PromptRow {
  question_text: string;
}

interface Props {
  prompts: FullPrompt[];
  answeredPromptIds: string[];
  skips: SkipRow[];
}

type Phase =
  | { kind: 'browsing' }
  | { kind: 'transcribing' }
  | { kind: 'reviewing'; transcript: string; transcriptRaw: string; storyId: string; audioPath: string; durationSeconds: number }
  | { kind: 'error'; message: string };

function uuid(): string {
  return crypto.randomUUID();
}

export function TodayClient({ prompts, answeredPromptIds, skips }: Props) {
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
    await uploadAndTranscribe(blob, nextPrompt);
  }

  async function uploadAndTranscribe(blob: Blob, prompt: FullPrompt) {
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
      if (!upRes.ok) throw new Error('Could not get upload URL');
      const { path, signedUrl } = await upRes.json();

      // 3. PUT blob directly to Supabase Storage
      const putRes = await fetch(signedUrl, {
        method: 'PUT',
        headers: { 'Content-Type': 'audio/webm' },
        body: blob,
      });
      if (!putRes.ok) throw new Error('Audio upload failed');

      // 4. Hit /api/transcribe
      const trRes = await fetch('/api/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audioPath: path }),
      });
      if (!trRes.ok) throw new Error('Transcription failed');
      const tr = await trRes.json();

      setPhase({
        kind: 'reviewing',
        storyId,
        audioPath: path,
        transcript: tr.transcript,
        transcriptRaw: tr.transcript_raw,
        durationSeconds: tr.duration_seconds,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Something went wrong';
      setPhase({ kind: 'error', message: msg });
    }
  }

  async function handleSave(finalTranscript: string) {
    if (phase.kind !== 'reviewing' || !nextPrompt) return;
    await saveStory({
      storyId: phase.storyId,
      promptId: nextPrompt.id,
      chapter,
      audioPath: phase.audioPath,
      transcriptRaw: phase.transcriptRaw,
      transcript: finalTranscript,
      durationSeconds: phase.durationSeconds,
    });
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
            <button
              onClick={handleSkip}
              className="text-center py-4 underline opacity-70"
            >
              Skip for now
            </button>
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
