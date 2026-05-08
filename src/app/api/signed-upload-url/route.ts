import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getServiceSupabase } from '@/lib/supabase/server';

const SENIOR_ID = '00000000-0000-4000-8000-000000000001';

const Body = z.object({
  bucket: z.enum(['audio', 'photos']),
  storyId: z.string().uuid(),
  ext: z.enum(['webm', 'jpg', 'jpeg', 'png']),
});

export async function POST(req: NextRequest) {
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.format() }, { status: 400 });
  }
  const { bucket, storyId, ext } = parsed.data;

  const sb = getServiceSupabase();
  const path = `${SENIOR_ID}/${storyId}.${ext}`;

  const { data, error } = await sb.storage
    .from(bucket)
    .createSignedUploadUrl(path);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ path, token: data.token, signedUrl: data.signedUrl });
}
