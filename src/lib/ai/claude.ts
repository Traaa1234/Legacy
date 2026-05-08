import Anthropic from '@anthropic-ai/sdk';
import { env } from '@/lib/env';

let client: Anthropic | null = null;
function getClient() {
  if (!client) client = new Anthropic({ apiKey: env.anthropicApiKey() });
  return client;
}

const CLEANUP_SYSTEM = `You are helping a senior preserve their life story. You'll receive the raw transcript of an audio recording produced by Whisper. Your job:
- Fix punctuation, capitalization, and obvious word errors.
- Remove filler words (um, uh, you know) only when they break flow; keep them when they reflect personality.
- Do NOT paraphrase, summarize, or change the meaning.
- Do NOT add information that wasn't in the audio.
- Preserve regional speech, slang, and the speaker's voice.
Return ONLY the cleaned transcript. No commentary, no headers, no explanations.`;

export async function cleanTranscript(rawText: string): Promise<string> {
  if (!rawText.trim()) return '';
  const res = await getClient().messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 4096,
    system: CLEANUP_SYSTEM,
    messages: [{ role: 'user', content: rawText }],
  });

  const block = res.content[0];
  if (block?.type !== 'text') {
    throw new Error('Unexpected non-text response from Claude');
  }
  return block.text.trim();
}
