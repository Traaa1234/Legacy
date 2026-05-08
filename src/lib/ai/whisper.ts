import OpenAI from 'openai';
import { env } from '@/lib/env';

let client: OpenAI | null = null;
function getClient() {
  if (!client) client = new OpenAI({ apiKey: env.openaiApiKey() });
  return client;
}

export interface WhisperResult {
  text: string;
  durationSeconds: number;
}

export async function transcribeAudio(
  audio: Blob | Buffer,
  filename = 'audio.webm',
): Promise<WhisperResult> {
  const blob =
    audio instanceof Blob ? audio : new Blob([audio as unknown as ArrayBuffer]);
  // OpenAI SDK expects a File-like object in Node 20+
  const file = new File([blob], filename, { type: 'audio/webm' });

  const res = await getClient().audio.transcriptions.create({
    model: 'whisper-1',
    file,
    response_format: 'verbose_json',
  });

  return {
    text: res.text,
    // verbose_json has a top-level `duration` field per OpenAI docs
    durationSeconds: Math.round((res as unknown as { duration?: number }).duration ?? 0),
  };
}
