import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import archiver from 'archiver';
import { Readable } from 'node:stream';
import { getServiceSupabase } from '@/lib/supabase/server';
import { buildManifest } from '@/lib/zip/manifest';
import { CHAPTERS } from '@/lib/chapters';

export const runtime = 'nodejs';
export const maxDuration = 60;

const FAMILY_ID = '00000000-0000-4000-8000-000000000002';

const Query = z.object({
  seniorId: z.string().uuid(),
});

function slugify(s: string, max = 40): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, max) || 'untitled';
}

export async function GET(req: NextRequest) {
  const parsed = Query.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.format() }, { status: 400 });
  }
  const { seniorId } = parsed.data;

  const sb = getServiceSupabase();

  // Verify family link exists
  const { count: linkCount, error: linkErr } = await sb
    .from('family_links')
    .select('*', { count: 'exact', head: true })
    .eq('family_user_id', FAMILY_ID)
    .eq('senior_user_id', seniorId);
  if (linkErr) return NextResponse.json({ error: linkErr.message }, { status: 500 });
  if (!linkCount || linkCount === 0) {
    return NextResponse.json({ error: 'Not linked to this senior' }, { status: 403 });
  }

  // Fetch senior + stories + photos
  const { data: senior, error: seniorErr } = await sb
    .from('users')
    .select('display_name')
    .eq('id', seniorId)
    .single();
  if (seniorErr || !senior) {
    return NextResponse.json({ error: 'Senior not found' }, { status: 404 });
  }

  const { data: storiesRaw } = await sb
    .from('stories')
    .select(`id, chapter, transcript, audio_url, is_private, created_at,
             prompts:prompt_id (question_text)`)
    .eq('user_id', seniorId)
    .eq('is_private', false)
    .order('chapter')
    .order('created_at');

  const stories = (storiesRaw ?? []).map((r) => ({
    id: r.id,
    chapter: r.chapter,
    transcript: r.transcript,
    audio_url: r.audio_url,
    is_private: r.is_private as boolean,
    created_at: r.created_at,
    question_text:
      (r.prompts as unknown as { question_text: string } | null)?.question_text ?? null,
  }));

  const { data: photos } = await sb
    .from('photos')
    .select('id, chapter, storage_path, caption')
    .eq('uploaded_by_user_id', seniorId);

  // Build the archive
  const archive = archiver('zip', { zlib: { level: 9 } });
  archive.on('error', (e) => {
    console.error('archiver error', e);
  });

  // Manifest first
  const manifest = buildManifest({
    seniorDisplayName: senior.display_name,
    generatedAt: new Date(),
    stories: stories.map((s) => ({
      chapter: s.chapter,
      transcript: s.transcript,
      is_private: s.is_private,
    })),
    photos: (photos ?? []).map((p) => ({
      chapter: p.chapter,
      caption: p.caption,
    })),
  });
  archive.append(manifest, { name: 'manifest.txt' });

  // Stories: transcripts + audio per chapter
  for (const story of stories) {
    const chapter = CHAPTERS.find((c) => c.slug === story.chapter);
    const chapterFolder = chapter?.label.replace(/[^a-zA-Z0-9 &]/g, '') ?? story.chapter;
    const slug = slugify(story.question_text ?? story.transcript.slice(0, 30));
    archive.append(story.transcript, {
      name: `chapters/${chapterFolder}/stories/${slug}.txt`,
    });

    // Download audio from storage and append
    const { data: audioBlob } = await sb.storage.from('audio').download(story.audio_url);
    if (audioBlob) {
      const buffer = Buffer.from(await audioBlob.arrayBuffer());
      archive.append(buffer, {
        name: `chapters/${chapterFolder}/audio/${slug}.webm`,
      });
    }
  }

  // Photos
  for (const photo of photos ?? []) {
    const chapter = CHAPTERS.find((c) => c.slug === photo.chapter);
    const chapterFolder = chapter?.label.replace(/[^a-zA-Z0-9 &]/g, '') ?? photo.chapter;
    const ext = photo.storage_path.split('.').pop() ?? 'jpg';
    const slug = slugify(photo.caption ?? `photo-${photo.id.slice(0, 8)}`);
    const { data: photoBlob } = await sb.storage.from('photos').download(photo.storage_path);
    if (photoBlob) {
      const buffer = Buffer.from(await photoBlob.arrayBuffer());
      archive.append(buffer, {
        name: `chapters/${chapterFolder}/photos/${slug}.${ext}`,
      });
    }
  }

  archive.finalize();

  // Convert Node Readable stream to a Web ReadableStream for the Response
  const webStream = Readable.toWeb(archive as unknown as Readable) as unknown as ReadableStream;

  return new Response(webStream, {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${slugify(senior.display_name)}-stories.zip"`,
    },
  });
}
