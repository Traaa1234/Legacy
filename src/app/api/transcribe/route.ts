import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getServiceSupabase } from '@/lib/supabase/server';
import { transcribeAudio } from '@/lib/ai/whisper';
import { cleanTranscript } from '@/lib/ai/claude';

export const runtime = 'nodejs';
export const maxDuration = 60;

const Body = z.object({
  audioPath: z.string(),
  language: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.format() }, { status: 400 });
  }
  const { audioPath } = parsed.data;

  const sb = getServiceSupabase();

  // Download audio from Storage
  const { data: blob, error: dlErr } = await sb.storage.from('audio').download(audioPath);
  if (dlErr || !blob) {
    return NextResponse.json(
      { error: dlErr?.message ?? 'audio not found' },
      { status: 404 },
    );
  }

  // Whisper
  let transcriptRaw: string;
  let durationSeconds = 0;
  try {
    const w = await transcribeAudio(blob, undefined, parsed.data.language ?? 'en');
    transcriptRaw = w.text;
    durationSeconds = w.durationSeconds;
  } catch (e) {
    console.error('whisper failed', e);
    return NextResponse.json(
      { error: 'transcription_failed', stage: 'whisper' },
      { status: 502 },
    );
  }

  // Claude cleanup (non-fatal — fall back to raw)
  let transcript = transcriptRaw;
  try {
    transcript = await cleanTranscript(transcriptRaw);
  } catch (e) {
    console.warn('claude cleanup failed, returning raw transcript', e);
  }

  return NextResponse.json({
    transcript_raw: transcriptRaw,
    transcript,
    duration_seconds: durationSeconds,
  });
}
