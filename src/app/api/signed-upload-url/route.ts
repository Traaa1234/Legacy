import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getServiceSupabase } from '@/lib/supabase/server';

const DEFAULT_SENIOR_ID = '00000000-0000-4000-8000-000000000001';

const Body = z.object({
  bucket: z.enum(['audio', 'photos']),
  // The legacy parameter name. For audio it's the story id; for photos it's a photo id.
  // Either way, used as the file's basename.
  storyId: z.string().uuid(),
  ext: z.enum(['webm', 'jpg', 'jpeg', 'png']),
  // NEW: which senior's folder. Defaults to the hardcoded senior for backward compat.
  seniorId: z.string().uuid().optional(),
});

export async function POST(req: NextRequest) {
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.format() }, { status: 400 });
  }
  const { bucket, storyId, ext, seniorId } = parsed.data;

  const sb = getServiceSupabase();
  const owner = seniorId ?? DEFAULT_SENIOR_ID;
  const path = `${owner}/${storyId}.${ext}`;

  const { data, error } = await sb.storage.from(bucket).createSignedUploadUrl(path);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ path, token: data.token, signedUrl: data.signedUrl });
}
