# Legacy Phase 3 — Memoir + Photos + PDF Export Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A senior can browse a beautiful in-app memoir of their stories grouped by chapter (with photos inline) and download it as a PDF. Family members can also upload photos for the senior.

**Architecture:** Build on Phases 1+2. Photos use the existing `photos` Supabase Storage bucket. The Memoir page renders a paginated reader using shared markup. A separate `/memoir/print` server route renders the same content without chrome — Puppeteer (`puppeteer-core` + `@sparticuz/chromium`) navigates to it with a one-time bearer token, captures a PDF, and streams it back.

**Tech Stack:** Next.js 16, TypeScript strict, Tailwind v4, Supabase Cloud, `puppeteer-core` + `@sparticuz/chromium` (Vercel-friendly Chrome), Vitest.

**Reference spec:** `docs/superpowers/specs/2026-05-07-legacy-mvp-design.md` — §9 Phase 3.

---

## Pre-flight context

Phase 2 ended at branch `phase-2-family`. Phase 3 builds on top of it.

```bash
cd "C:/Users/elinw/Projects/legacy"
git checkout phase-2-family
git checkout -b phase-3-memoir
```

The `photos` Supabase Storage bucket already exists from Phase 1 migration `0004`. The `photos` table already exists from migration `0003`. No new migrations needed.

The Phase 1 signed-upload-url route at `/api/signed-upload-url` already accepts `bucket: 'audio' | 'photos'`, but it hardcodes `SENIOR_ID` as the path prefix. For photo uploads BY family (where the senior is someone else), we'll extend it to accept an optional `seniorId` parameter.

---

## File structure (created across all tasks)

```
legacy/
├── src/
│   ├── app/
│   │   ├── memoir/
│   │   │   ├── page.tsx                      ← NEW: in-app reader
│   │   │   ├── memoir-content.tsx            ← NEW: shared markup (server component)
│   │   │   ├── download-button.tsx           ← NEW: client trigger /api/export/pdf
│   │   │   ├── memoir-actions.ts             ← NEW: savePhoto server action
│   │   │   └── print/
│   │   │       └── page.tsx                  ← NEW: print-only route (header-guarded)
│   │   ├── stories/[id]/page.tsx             ← MODIFY: show linked photos
│   │   ├── family/family-view-client.tsx     ← MODIFY: add "Add photo" button
│   │   ├── api/
│   │   │   ├── signed-upload-url/route.ts    ← MODIFY: accept optional seniorId
│   │   │   └── export/pdf/route.ts           ← NEW: Puppeteer PDF
│   ├── components/
│   │   ├── nav/BottomNav.tsx                 ← MODIFY: enable Memoir
│   │   ├── photos/
│   │   │   └── PhotoUploadModal.tsx          ← NEW
│   │   └── memoir/
│   │       ├── MemoirCover.tsx               ← NEW
│   │       ├── MemoirTOC.tsx                 ← NEW
│   │       ├── MemoirChapter.tsx             ← NEW
│   │       ├── MemoirStory.tsx               ← NEW
│   │       └── MemoirPhoto.tsx               ← NEW
│   └── lib/
│       ├── photos.ts                         ← NEW: types + pure helpers
│       ├── photos-queries.ts                 ← NEW: server-only DB queries + signed URLs
│       └── pdf/
│           └── token.ts                      ← NEW: in-memory token cache
└── tests/
    └── unit/
        ├── photos.test.ts                    ← NEW
        └── pdf-token.test.ts                 ← NEW
```

---

## Task 1: Install Puppeteer dependencies

**Files:**
- Modify: `package.json`, `package-lock.json`

- [ ] **Step 1: Install**

```bash
cd "C:/Users/elinw/Projects/legacy"
npm install puppeteer-core @sparticuz/chromium
```

(`@sparticuz/chromium` ships a Chromium build that works in serverless environments AND on local Windows dev. The package is ~70 MB.)

- [ ] **Step 2: Verify install with a probe**

```bash
node -e "const c = require('@sparticuz/chromium').default; c.executablePath().then(p => console.log('chromium at:', p));"
```

Expected: prints a path. If the binary download fails (which can happen on slow networks), retry the install.

- [ ] **Step 3: TypeScript clean check**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add puppeteer-core + @sparticuz/chromium for PDF export"
```

---

## Task 2: `lib/photos.ts` (pure helpers + types) + `lib/photos-queries.ts` (server) — TDD

**Files:**
- Create: `src/lib/photos.ts`
- Create: `src/lib/photos-queries.ts`
- Create: `tests/unit/photos.test.ts`

- [ ] **Step 1: Write failing test — `tests/unit/photos.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import {
  groupPhotosByChapter,
  groupPhotosByStory,
  type PhotoRow,
} from '@/lib/photos';

const NOW = '2026-05-08T12:00:00Z';

function makePhoto(overrides: Partial<PhotoRow>): PhotoRow {
  return {
    id: 'p-default',
    uploaded_by_user_id: 'u-1',
    chapter: 'early_childhood',
    story_id: null,
    storage_path: 'p1.jpg',
    caption: null,
    created_at: NOW,
    ...overrides,
  };
}

describe('groupPhotosByChapter', () => {
  it('returns empty map for empty input', () => {
    expect(groupPhotosByChapter([])).toEqual(new Map());
  });

  it('groups multiple photos by chapter', () => {
    const photos: PhotoRow[] = [
      makePhoto({ id: 'p1', chapter: 'early_childhood' }),
      makePhoto({ id: 'p2', chapter: 'early_childhood' }),
      makePhoto({ id: 'p3', chapter: 'school_years' }),
    ];
    const grouped = groupPhotosByChapter(photos);
    expect(grouped.get('early_childhood')).toHaveLength(2);
    expect(grouped.get('school_years')).toHaveLength(1);
  });
});

describe('groupPhotosByStory', () => {
  it('returns empty map when no photos have story_id', () => {
    const photos: PhotoRow[] = [
      makePhoto({ id: 'p1', story_id: null }),
      makePhoto({ id: 'p2', story_id: null }),
    ];
    expect(groupPhotosByStory(photos).size).toBe(0);
  });

  it('groups photos with story_id, ignores those without', () => {
    const photos: PhotoRow[] = [
      makePhoto({ id: 'p1', story_id: 's1' }),
      makePhoto({ id: 'p2', story_id: 's1' }),
      makePhoto({ id: 'p3', story_id: 's2' }),
      makePhoto({ id: 'p4', story_id: null }),
    ];
    const grouped = groupPhotosByStory(photos);
    expect(grouped.get('s1')).toHaveLength(2);
    expect(grouped.get('s2')).toHaveLength(1);
    expect(grouped.size).toBe(2);
  });
});
```

- [ ] **Step 2: Run, expect fail**

```bash
npm test -- tests/unit/photos.test.ts
```

- [ ] **Step 3: Implement `src/lib/photos.ts` (client-safe)**

```ts
// Pure helpers and types. Safe to import from server or client.
// DB queries live in photos-queries.ts.

import type { ChapterSlug } from '@/lib/chapters';

export interface PhotoRow {
  id: string;
  uploaded_by_user_id: string;
  chapter: string;
  story_id: string | null;
  storage_path: string;
  caption: string | null;
  created_at: string;
}

export function groupPhotosByChapter(rows: PhotoRow[]): Map<string, PhotoRow[]> {
  const out = new Map<string, PhotoRow[]>();
  for (const p of rows) {
    const list = out.get(p.chapter) ?? [];
    list.push(p);
    out.set(p.chapter, list);
  }
  return out;
}

export function groupPhotosByStory(rows: PhotoRow[]): Map<string, PhotoRow[]> {
  const out = new Map<string, PhotoRow[]>();
  for (const p of rows) {
    if (!p.story_id) continue;
    const list = out.get(p.story_id) ?? [];
    list.push(p);
    out.set(p.story_id, list);
  }
  return out;
}

export function isChapterSlug(s: string): s is ChapterSlug {
  // Defer to chapters.ts in the consuming code; this file stays standalone
  return true; // accepting any slug; chapters.ts validation is the source of truth
}
```

- [ ] **Step 4: Implement `src/lib/photos-queries.ts` (server-only)**

```ts
import 'server-only';
import { getServiceSupabase } from '@/lib/supabase/server';
import type { PhotoRow } from './photos';

export async function listPhotosForUser(seniorUserId: string): Promise<PhotoRow[]> {
  const sb = getServiceSupabase();
  const { data, error } = await sb
    .from('photos')
    .select('id, uploaded_by_user_id, chapter, story_id, storage_path, caption, created_at')
    .or(`uploaded_by_user_id.eq.${seniorUserId},story_id.in.(select id from stories where user_id = '${seniorUserId}')`)
    .order('chapter')
    .order('created_at');
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function listPhotosLinkedToStory(storyId: string): Promise<PhotoRow[]> {
  const sb = getServiceSupabase();
  const { data, error } = await sb
    .from('photos')
    .select('id, uploaded_by_user_id, chapter, story_id, storage_path, caption, created_at')
    .eq('story_id', storyId)
    .order('created_at');
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getPhotoSignedUrl(path: string, expiresIn = 60 * 60): Promise<string> {
  const sb = getServiceSupabase();
  const { data, error } = await sb.storage.from('photos').createSignedUrl(path, expiresIn);
  if (error || !data) throw new Error(error?.message ?? 'photo signed url failed');
  return data.signedUrl;
}
```

(Note on `listPhotosForUser`: the `.or(...)` with a subquery is awkward in PostgREST. If it errors at runtime, fall back to two queries combined in JS:

```ts
const [byUploader, byStory] = await Promise.all([
  sb.from('photos').select('...').eq('uploaded_by_user_id', seniorUserId),
  sb.from('photos').select('..., stories!inner(user_id)').eq('stories.user_id', seniorUserId),
]);
return dedupe([...(byUploader.data ?? []), ...(byStory.data ?? [])]);
```

For MVP, the simpler `eq('uploaded_by_user_id', seniorUserId)` alone is acceptable — a senior's photos uploaded by family will be missed, but family-uploaded photos surface via the linked story chain when those stories appear in the memoir. Use the simpler version first; only escalate if Task 5's manual test reveals missing photos.)

**Use this simpler `listPhotosForUser` instead:**

```ts
export async function listPhotosForUser(seniorUserId: string): Promise<PhotoRow[]> {
  const sb = getServiceSupabase();
  // Photos uploaded BY this senior (their own additions)
  const { data: own, error: ownErr } = await sb
    .from('photos')
    .select('id, uploaded_by_user_id, chapter, story_id, storage_path, caption, created_at')
    .eq('uploaded_by_user_id', seniorUserId);
  if (ownErr) throw new Error(ownErr.message);

  // Photos linked to this senior's stories (uploaded by anyone, including family)
  const { data: linked, error: linkedErr } = await sb
    .from('photos')
    .select('id, uploaded_by_user_id, chapter, story_id, storage_path, caption, created_at, stories!inner(user_id)')
    .eq('stories.user_id', seniorUserId);
  if (linkedErr) throw new Error(linkedErr.message);

  // Dedupe by id
  const byId = new Map<string, PhotoRow>();
  for (const p of own ?? []) byId.set(p.id, p);
  for (const p of linked ?? []) {
    // Strip the joined stories field
    const { stories: _stories, ...rest } = p as PhotoRow & { stories?: unknown };
    byId.set(rest.id, rest as PhotoRow);
  }
  return Array.from(byId.values()).sort((a, b) => a.chapter.localeCompare(b.chapter) || a.created_at.localeCompare(b.created_at));
}
```

- [ ] **Step 5: Run test, expect pass**

```bash
npm test -- tests/unit/photos.test.ts
```

Expected: 4 passed.

- [ ] **Step 6: Run full suite + tsc**

```bash
npm test
npx tsc --noEmit
```

Expected: 41 tests passing (37 prior + 4 new), tsc clean.

- [ ] **Step 7: Commit**

```bash
git add src/lib/photos.ts src/lib/photos-queries.ts tests/unit/photos.test.ts
git commit -m "feat(photos): types + pure helpers + server queries (TDD)"
```

---

## Task 3: Extend `/api/signed-upload-url` to accept optional `seniorId`

**Files:**
- Modify: `src/app/api/signed-upload-url/route.ts`

The Phase 1 route hardcodes `SENIOR_ID`. For photos uploaded by family (where the senior is someone else, e.g., Mom or Dad), we need to specify which senior's storage folder to use.

- [ ] **Step 1: Replace `src/app/api/signed-upload-url/route.ts`**

```ts
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
```

- [ ] **Step 2: Verify**

```bash
npx tsc --noEmit
npm test
```

Expected: tsc clean, 41 tests pass.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/signed-upload-url/route.ts
git commit -m "feat(api): signed-upload-url accepts optional seniorId for cross-user photo uploads"
```

---

## Task 4: `savePhoto` server action

**Files:**
- Create: `src/app/memoir/memoir-actions.ts`

- [ ] **Step 1: Implement**

```ts
'use server';

import { z } from 'zod';
import { getServiceSupabase } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

const SavePhotoInput = z.object({
  uploadedByUserId: z.string().uuid(),
  storagePath: z.string(),
  chapter: z.string(),
  storyId: z.string().uuid().nullable(),
  caption: z.string().nullable(),
});

export async function savePhoto(input: z.infer<typeof SavePhotoInput>) {
  const data = SavePhotoInput.parse(input);
  const sb = getServiceSupabase();
  const { error } = await sb.from('photos').insert({
    uploaded_by_user_id: data.uploadedByUserId,
    storage_path: data.storagePath,
    chapter: data.chapter,
    story_id: data.storyId,
    caption: data.caption,
  });
  if (error) throw new Error(error.message);
  revalidatePath('/memoir');
  revalidatePath('/family');
  if (data.storyId) revalidatePath(`/stories/${data.storyId}`);
}
```

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/app/memoir/memoir-actions.ts
git commit -m "feat(memoir): savePhoto server action"
```

---

## Task 5: PhotoUploadModal component

**Files:**
- Create: `src/components/photos/PhotoUploadModal.tsx`

This is a single reusable modal used by both `/memoir` (senior persona) and `/family` (family persona).

- [ ] **Step 1: Implement**

```tsx
'use client';

import { useState, useTransition } from 'react';
import { CHAPTERS, type ChapterSlug } from '@/lib/chapters';
import { BigButton, BigCard, BigText } from '@/components/senior-ui';
import { savePhoto } from '@/app/memoir/memoir-actions';

interface StoryOption {
  id: string;
  question_text: string | null;
  chapter: string;
}

interface Props {
  uploadedByUserId: string; // current persona's user id
  forSeniorUserId: string;  // whose memoir this photo is for
  stories: StoryOption[];   // candidate stories to optionally link to
  onClose: () => void;
  onSaved?: () => void;
}

export function PhotoUploadModal({
  uploadedByUserId,
  forSeniorUserId,
  stories,
  onClose,
  onSaved,
}: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [chapter, setChapter] = useState<ChapterSlug>('early_childhood');
  const [storyId, setStoryId] = useState<string | ''>('');
  const [caption, setCaption] = useState('');
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const filteredStories = stories.filter((s) => s.chapter === chapter);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    setError(null);
    const f = e.target.files?.[0] ?? null;
    if (f && f.size > 8 * 1024 * 1024) {
      setError('Please choose a photo under 8 MB.');
      return;
    }
    setFile(f);
  }

  async function upload() {
    if (!file) {
      setError('Please choose a photo first.');
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        const ext = file.type === 'image/png' ? 'png' : 'jpeg';
        const photoId = crypto.randomUUID();

        // 1. Get signed upload URL
        const upRes = await fetch('/api/signed-upload-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            bucket: 'photos',
            storyId: photoId, // used as filename
            ext,
            seniorId: forSeniorUserId,
          }),
        });
        if (!upRes.ok) {
          const body = await upRes.json().catch(() => ({}));
          throw new Error(body?.error ?? `HTTP ${upRes.status}`);
        }
        const { path, signedUrl } = await upRes.json();

        // 2. PUT to Supabase Storage
        const putRes = await fetch(signedUrl, {
          method: 'PUT',
          headers: { 'Content-Type': file.type },
          body: file,
        });
        if (!putRes.ok) {
          const text = await putRes.text().catch(() => '');
          throw new Error(`Upload failed: ${text || putRes.status}`);
        }

        // 3. Insert photo row
        await savePhoto({
          uploadedByUserId,
          storagePath: path,
          chapter,
          storyId: storyId === '' ? null : storyId,
          caption: caption.trim() || null,
        });

        onSaved?.();
        onClose();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Upload failed');
      }
    });
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <BigCard className="w-full max-w-lg flex flex-col gap-4 my-8">
        <BigText size="question" as="h2">
          Add a photo
        </BigText>

        <label className="flex flex-col gap-2">
          <span className="text-body opacity-70">Photo</span>
          <input
            type="file"
            accept="image/jpeg,image/png"
            onChange={handleFile}
            disabled={pending}
            className="text-body"
          />
          {file && (
            <p className="text-sm opacity-60">
              {file.name} ({Math.round(file.size / 1024)} KB)
            </p>
          )}
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-body opacity-70">Chapter</span>
          <select
            value={chapter}
            onChange={(e) => {
              setChapter(e.target.value as ChapterSlug);
              setStoryId('');
            }}
            disabled={pending}
            className="bg-white border border-sand rounded-button p-3 text-body min-h-touch-target"
          >
            {CHAPTERS.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-body opacity-70">
            Link to a story <span className="opacity-50">(optional)</span>
          </span>
          <select
            value={storyId}
            onChange={(e) => setStoryId(e.target.value)}
            disabled={pending || filteredStories.length === 0}
            className="bg-white border border-sand rounded-button p-3 text-body min-h-touch-target"
          >
            <option value="">— Not linked —</option>
            {filteredStories.map((s) => (
              <option key={s.id} value={s.id}>
                {s.question_text?.slice(0, 80) ?? '(untitled)'}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-body opacity-70">
            Caption <span className="opacity-50">(optional)</span>
          </span>
          <input
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="e.g. My grandmother's kitchen, 1962"
            disabled={pending}
            className="bg-white border border-sand rounded-button p-3 text-body min-h-touch-target"
          />
        </label>

        {error && (
          <p className="text-body text-red-700 bg-red-50 rounded-button p-3">{error}</p>
        )}

        <div className="flex gap-3">
          <BigButton variant="primary" onClick={upload} disabled={pending || !file}>
            {pending ? 'Uploading…' : 'Save photo'}
          </BigButton>
          <BigButton variant="secondary" onClick={onClose} disabled={pending}>
            Cancel
          </BigButton>
        </div>
      </BigCard>
    </div>
  );
}
```

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/components/photos/PhotoUploadModal.tsx
git commit -m "feat(photos): PhotoUploadModal — file + chapter + optional story link + caption"
```

---

## Task 6: MemoirCover, MemoirTOC, MemoirPhoto, MemoirStory, MemoirChapter components

**Files:**
- Create: `src/components/memoir/MemoirCover.tsx`
- Create: `src/components/memoir/MemoirTOC.tsx`
- Create: `src/components/memoir/MemoirPhoto.tsx`
- Create: `src/components/memoir/MemoirStory.tsx`
- Create: `src/components/memoir/MemoirChapter.tsx`

These are presentational server components that compose the memoir layout.

- [ ] **Step 1: Implement `MemoirCover.tsx`**

```tsx
import { BigText } from '@/components/senior-ui';

interface Props {
  seniorDisplayName: string;
  generatedAt: Date;
}

export function MemoirCover({ seniorDisplayName, generatedAt }: Props) {
  const dateStr = generatedAt.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  return (
    <section className="memoir-cover flex flex-col items-center justify-center text-center py-24 page-break-after">
      <p className="text-body opacity-50 uppercase tracking-widest mb-4">A life in stories</p>
      <BigText size="display" as="h1" className="font-serif">
        {seniorDisplayName}
      </BigText>
      <p className="mt-6 opacity-60 italic">{dateStr}</p>
    </section>
  );
}
```

- [ ] **Step 2: Implement `MemoirTOC.tsx`**

```tsx
import { CHAPTERS } from '@/lib/chapters';
import { BigText } from '@/components/senior-ui';

interface Props {
  storyCountByChapter: Map<string, number>;
}

export function MemoirTOC({ storyCountByChapter }: Props) {
  const used = CHAPTERS.filter((c) => (storyCountByChapter.get(c.slug) ?? 0) > 0);
  if (used.length === 0) return null;
  return (
    <section className="memoir-toc py-12 page-break-after">
      <BigText size="display" as="h2" className="font-serif text-center mb-8">
        Contents
      </BigText>
      <ol className="list-none flex flex-col gap-3 text-body max-w-md mx-auto">
        {used.map((c, i) => {
          const n = storyCountByChapter.get(c.slug) ?? 0;
          return (
            <li key={c.slug} className="flex justify-between items-baseline gap-3">
              <a href={`#chapter-${c.slug}`} className="font-serif">
                {i + 1}. {c.label}
              </a>
              <span className="opacity-50 text-sm">
                {n} {n === 1 ? 'story' : 'stories'}
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
```

- [ ] **Step 3: Implement `MemoirPhoto.tsx`**

```tsx
import { getPhotoSignedUrl } from '@/lib/photos-queries';
import type { PhotoRow } from '@/lib/photos';

interface Props {
  photo: PhotoRow;
}

export async function MemoirPhoto({ photo }: Props) {
  const url = await getPhotoSignedUrl(photo.storage_path);
  return (
    <figure className="my-6">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt={photo.caption ?? 'Memoir photo'}
        className="w-full max-w-2xl mx-auto rounded-card border border-sand"
      />
      {photo.caption && (
        <figcaption className="text-center mt-2 italic text-sm opacity-70">
          {photo.caption}
        </figcaption>
      )}
    </figure>
  );
}
```

(Native `<img>` rather than `next/image` — `next/image` has runtime quirks under Puppeteer's print rendering and adds no value for a static memoir page.)

- [ ] **Step 4: Implement `MemoirStory.tsx`**

```tsx
import type { StoryRow } from '@/lib/stories';
import type { PhotoRow } from '@/lib/photos';
import { MemoirPhoto } from './MemoirPhoto';
import { BigText } from '@/components/senior-ui';

interface Props {
  story: StoryRow;
  linkedPhotos: PhotoRow[];
}

export function MemoirStory({ story, linkedPhotos }: Props) {
  return (
    <article className="memoir-story mb-12 page-break-inside-avoid">
      {story.question_text && (
        <p className="font-serif italic text-body opacity-70 mb-3 border-l-4 border-sand pl-4">
          {story.question_text}
        </p>
      )}
      <BigText className="whitespace-pre-wrap leading-relaxed">{story.transcript}</BigText>
      {linkedPhotos.map((p) => (
        <MemoirPhoto key={p.id} photo={p} />
      ))}
    </article>
  );
}
```

- [ ] **Step 5: Implement `MemoirChapter.tsx`**

```tsx
import { BigText } from '@/components/senior-ui';
import { MemoirStory } from './MemoirStory';
import { MemoirPhoto } from './MemoirPhoto';
import type { StoryRow } from '@/lib/stories';
import type { PhotoRow } from '@/lib/photos';
import type { ChapterSlug } from '@/lib/chapters';

interface Props {
  slug: ChapterSlug;
  label: string;
  stories: StoryRow[];
  linkedPhotosByStoryId: Map<string, PhotoRow[]>;
  unlinkedPhotos: PhotoRow[];
}

export function MemoirChapter({
  slug,
  label,
  stories,
  linkedPhotosByStoryId,
  unlinkedPhotos,
}: Props) {
  if (stories.length === 0 && unlinkedPhotos.length === 0) return null;
  return (
    <section
      id={`chapter-${slug}`}
      className="memoir-chapter page-break-before py-12"
    >
      <BigText size="display" as="h2" className="font-serif mb-8 text-center">
        {label}
      </BigText>
      {stories.map((s) => (
        <MemoirStory
          key={s.id}
          story={s}
          linkedPhotos={linkedPhotosByStoryId.get(s.id) ?? []}
        />
      ))}
      {unlinkedPhotos.length > 0 && (
        <div className="mt-8">
          <p className="text-sm uppercase tracking-wide opacity-60 mb-4 text-center">
            More from {label}
          </p>
          <div className="grid grid-cols-2 gap-4">
            {unlinkedPhotos.map((p) => (
              <MemoirPhoto key={p.id} photo={p} />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
```

- [ ] **Step 6: TypeScript + tests**

```bash
npx tsc --noEmit
npm test
```

Expected: tsc clean, 41 tests still pass.

- [ ] **Step 7: Commit**

```bash
git add src/components/memoir/
git commit -m "feat(memoir): Cover/TOC/Chapter/Story/Photo layout components"
```

---

## Task 7: Shared `memoir-content.tsx` + memoir page (server component) with Add Photo button

**Files:**
- Create: `src/app/memoir/memoir-content.tsx`
- Create: `src/app/memoir/memoir-actions-client.tsx` (client wrapper for Add-Photo button)
- Create: `src/app/memoir/page.tsx`

The `memoir-content.tsx` is the shared server-rendered block used by BOTH `/memoir` (with chrome) and `/memoir/print` (without chrome). It does all the data fetching internally so callers just pass a `seniorUserId`.

- [ ] **Step 1: Implement `src/app/memoir/memoir-content.tsx`**

```tsx
import { getServiceSupabase } from '@/lib/supabase/server';
import { listStoriesForUser } from '@/lib/stories';
import { listPhotosForUser } from '@/lib/photos-queries';
import { groupPhotosByChapter, groupPhotosByStory } from '@/lib/photos';
import { CHAPTERS } from '@/lib/chapters';
import { MemoirCover } from '@/components/memoir/MemoirCover';
import { MemoirTOC } from '@/components/memoir/MemoirTOC';
import { MemoirChapter } from '@/components/memoir/MemoirChapter';

interface Props {
  seniorUserId: string;
  /** When true, signals print-ready content (used by /memoir/print). */
  forPrint?: boolean;
}

export async function MemoirContent({ seniorUserId, forPrint = false }: Props) {
  const sb = getServiceSupabase();

  const { data: senior, error: seniorErr } = await sb
    .from('users')
    .select('display_name')
    .eq('id', seniorUserId)
    .single();
  if (seniorErr || !senior) {
    return <p className="text-body p-8">Senior not found.</p>;
  }

  const allStories = await listStoriesForUser(seniorUserId);
  // Show all stories in the senior's own memoir (private or not).
  // If you want privacy-respecting memoirs for other viewers, filter here.
  const stories = allStories;

  const allPhotos = await listPhotosForUser(seniorUserId);
  const photosByStoryId = groupPhotosByStory(allPhotos);
  const photosByChapter = groupPhotosByChapter(allPhotos);

  const storyCountByChapter = new Map<string, number>();
  for (const s of stories) {
    storyCountByChapter.set(s.chapter, (storyCountByChapter.get(s.chapter) ?? 0) + 1);
  }

  return (
    <article className="memoir-content max-w-2xl mx-auto px-4 print:px-0">
      <MemoirCover
        seniorDisplayName={senior.display_name}
        generatedAt={new Date()}
      />
      <MemoirTOC storyCountByChapter={storyCountByChapter} />
      {CHAPTERS.map((c) => {
        const chapterStories = stories.filter((s) => s.chapter === c.slug);
        const chapterPhotos = photosByChapter.get(c.slug) ?? [];
        // Photos NOT linked to any story shown in this chapter
        const linkedIds = new Set(
          chapterStories
            .flatMap((s) => photosByStoryId.get(s.id) ?? [])
            .map((p) => p.id),
        );
        const unlinkedPhotos = chapterPhotos.filter((p) => !linkedIds.has(p.id));
        return (
          <MemoirChapter
            key={c.slug}
            slug={c.slug}
            label={c.label}
            stories={chapterStories}
            linkedPhotosByStoryId={photosByStoryId}
            unlinkedPhotos={unlinkedPhotos}
          />
        );
      })}
      {forPrint && <div data-memoir-loaded="true" style={{ display: 'none' }} />}
    </article>
  );
}
```

- [ ] **Step 2: Implement `src/app/memoir/memoir-actions-client.tsx` (client trigger for Add Photo + Download)**

```tsx
'use client';

import { useState } from 'react';
import { BigButton } from '@/components/senior-ui';
import { PhotoUploadModal } from '@/components/photos/PhotoUploadModal';
import { DownloadButton } from './download-button';

interface StoryOption {
  id: string;
  question_text: string | null;
  chapter: string;
}

interface Props {
  uploadedByUserId: string;
  forSeniorUserId: string;
  stories: StoryOption[];
}

export function MemoirActions({
  uploadedByUserId,
  forSeniorUserId,
  stories,
}: Props) {
  const [uploadOpen, setUploadOpen] = useState(false);
  return (
    <>
      <div className="flex gap-3 my-6 max-w-2xl mx-auto px-4">
        <BigButton variant="secondary" onClick={() => setUploadOpen(true)}>
          📷 Add a photo
        </BigButton>
        <DownloadButton seniorUserId={forSeniorUserId} />
      </div>
      {uploadOpen && (
        <PhotoUploadModal
          uploadedByUserId={uploadedByUserId}
          forSeniorUserId={forSeniorUserId}
          stories={stories}
          onClose={() => setUploadOpen(false)}
          onSaved={() => window.location.reload()}
        />
      )}
    </>
  );
}
```

- [ ] **Step 3: Implement `src/app/memoir/page.tsx`**

```tsx
import { MemoirContent } from './memoir-content';
import { MemoirActions } from './memoir-actions-client';
import { getServiceSupabase } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const SENIOR_ID = '00000000-0000-4000-8000-000000000001';

export default async function MemoirPage() {
  // Fetch lightweight stories list for the upload modal's "link to story" picker
  const sb = getServiceSupabase();
  const { data: stories } = await sb
    .from('stories')
    .select('id, chapter, prompts:prompt_id (question_text)')
    .eq('user_id', SENIOR_ID);

  const storyOptions = (stories ?? []).map((r) => ({
    id: r.id as string,
    chapter: r.chapter as string,
    question_text:
      (r.prompts as unknown as { question_text: string } | null)?.question_text ?? null,
  }));

  return (
    <main className="min-h-screen pb-24">
      <MemoirActions
        uploadedByUserId={SENIOR_ID}
        forSeniorUserId={SENIOR_ID}
        stories={storyOptions}
      />
      <MemoirContent seniorUserId={SENIOR_ID} />
    </main>
  );
}
```

- [ ] **Step 4: Stub the DownloadButton (real one in Task 9)**

Create `src/app/memoir/download-button.tsx`:

```tsx
'use client';

import { BigButton } from '@/components/senior-ui';

interface Props {
  seniorUserId: string;
}

// Stub — the working PDF version lands in Task 9.
export function DownloadButton({ seniorUserId: _seniorUserId }: Props) {
  return (
    <BigButton
      variant="primary"
      onClick={() => alert('PDF download lands in Task 9.')}
    >
      ⬇ Download as PDF
    </BigButton>
  );
}
```

- [ ] **Step 5: Verify**

```bash
npx tsc --noEmit
```

- [ ] **Step 6: Manual smoke test**

```bash
npm run seed   # ensure 2 seniors exist
npm run dev
```

Visit `http://localhost:3000/memoir`. Expected: cover with "Mom" + date, TOC listing chapters with stories, each chapter rendering its stories. The photo upload modal opens when "Add a photo" is clicked. Download button alerts the placeholder.

Stop server.

- [ ] **Step 7: Commit**

```bash
git add src/app/memoir/
git commit -m "feat(memoir): /memoir page — cover + TOC + chapters + add-photo + (stub) download"
```

---

## Task 8: PDF token cache (TDD)

**Files:**
- Create: `src/lib/pdf/token.ts`
- Create: `tests/unit/pdf-token.test.ts`

- [ ] **Step 1: Write failing test — `tests/unit/pdf-token.test.ts`**

```ts
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { mintToken, consumeToken } from '@/lib/pdf/token';

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('pdf token cache', () => {
  it('mintToken returns a unique uuid each time', () => {
    const t1 = mintToken();
    const t2 = mintToken();
    expect(t1).not.toBe(t2);
    expect(t1).toMatch(/^[0-9a-f-]{36}$/i);
  });

  it('consumeToken returns true for a valid token, then false on re-use', () => {
    const t = mintToken();
    expect(consumeToken(t)).toBe(true);
    expect(consumeToken(t)).toBe(false);
  });

  it('consumeToken returns false for an unknown token', () => {
    expect(consumeToken('00000000-0000-4000-8000-000000000099')).toBe(false);
  });

  it('consumeToken returns false after the 60s TTL elapses', () => {
    const t = mintToken();
    vi.advanceTimersByTime(61_000);
    expect(consumeToken(t)).toBe(false);
  });
});
```

- [ ] **Step 2: Run, expect fail**

```bash
npm test -- tests/unit/pdf-token.test.ts
```

- [ ] **Step 3: Implement `src/lib/pdf/token.ts`**

```ts
const TTL_MS = 60_000;
const tokens = new Map<string, number>(); // token → expiresAt (epoch ms)

function cleanup() {
  const now = Date.now();
  for (const [t, exp] of tokens) {
    if (exp < now) tokens.delete(t);
  }
}

export function mintToken(): string {
  cleanup();
  const token = crypto.randomUUID();
  tokens.set(token, Date.now() + TTL_MS);
  return token;
}

export function consumeToken(token: string): boolean {
  cleanup();
  const expires = tokens.get(token);
  if (!expires) return false;
  if (expires < Date.now()) {
    tokens.delete(token);
    return false;
  }
  tokens.delete(token); // single-use
  return true;
}
```

- [ ] **Step 4: Run, expect pass**

```bash
npm test -- tests/unit/pdf-token.test.ts
```

Expected: 4 passed.

- [ ] **Step 5: Full suite**

```bash
npm test
```

Expected: 45 passing (41 prior + 4 new).

- [ ] **Step 6: Commit**

```bash
git add src/lib/pdf/token.ts tests/unit/pdf-token.test.ts
git commit -m "feat(pdf): single-use token cache with 60s TTL (TDD)"
```

---

## Task 9: `/memoir/print` route + `/api/export/pdf` route + working DownloadButton

**Files:**
- Create: `src/app/memoir/print/page.tsx`
- Create: `src/app/api/export/pdf/route.ts`
- Replace: `src/app/memoir/download-button.tsx`

- [ ] **Step 1: Implement `src/app/memoir/print/page.tsx`**

```tsx
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { consumeToken } from '@/lib/pdf/token';
import { MemoirContent } from '../memoir-content';
import './print.css';

export const dynamic = 'force-dynamic';

const SENIOR_ID = '00000000-0000-4000-8000-000000000001';

export default async function MemoirPrintPage() {
  const h = await headers();
  const token = h.get('x-pdf-generator-token');
  if (!token || !consumeToken(token)) {
    notFound();
  }

  return (
    <html>
      <body className="bg-white text-deep-navy">
        <MemoirContent seniorUserId={SENIOR_ID} forPrint />
      </body>
    </html>
  );
}
```

- [ ] **Step 2: Create `src/app/memoir/print/print.css`**

```css
@import "tailwindcss";

@page {
  size: Letter;
  margin: 0.75in;
}

@media print {
  body { background: white !important; color: #2C3E5C !important; }
  .page-break-before { page-break-before: always; }
  .page-break-after { page-break-after: always; }
  .page-break-inside-avoid { page-break-inside: avoid; }
}

/* Always apply page-break helpers (Puppeteer respects them) */
.page-break-before { page-break-before: always; }
.page-break-after { page-break-after: always; }
.page-break-inside-avoid { page-break-inside: avoid; }
```

(Note: the print page renders WITHOUT the global `layout.tsx` — it returns its own `<html>`. This is the intended way to bypass the bottom nav and other chrome for Puppeteer.)

Actually, Next.js requires every page to be wrapped by the root layout. We CANNOT return our own `<html>` from a page. Instead, create a print-specific layout:

**Create `src/app/memoir/print/layout.tsx`:**

```tsx
import './print.css';

export default function PrintLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ background: 'white', color: '#2C3E5C' }}>{children}</body>
    </html>
  );
}
```

And **revise `src/app/memoir/print/page.tsx` to NOT include `<html>` itself**:

```tsx
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { consumeToken } from '@/lib/pdf/token';
import { MemoirContent } from '../memoir-content';

export const dynamic = 'force-dynamic';

const SENIOR_ID = '00000000-0000-4000-8000-000000000001';

export default async function MemoirPrintPage() {
  const h = await headers();
  const token = h.get('x-pdf-generator-token');
  if (!token || !consumeToken(token)) {
    notFound();
  }
  return <MemoirContent seniorUserId={SENIOR_ID} forPrint />;
}
```

But we ALSO need this print layout to suppress the BottomNav from the root layout. In Next.js, when a route segment has its own `layout.tsx`, that layout REPLACES the parent IF it includes its own `<html>`. So the print layout above should isolate `/memoir/print` from the root layout's BottomNav.

Cross-verify by visiting `/memoir/print` (with a manually-minted token) — there should be no `<nav>` element at the bottom.

- [ ] **Step 3: Implement `src/app/api/export/pdf/route.ts`**

```ts
import { NextRequest, NextResponse } from 'next/server';
import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';
import { mintToken } from '@/lib/pdf/token';

export const runtime = 'nodejs';
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const token = mintToken();

  let browser;
  try {
    browser = await puppeteer.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: true,
    });

    const page = await browser.newPage();
    await page.setExtraHTTPHeaders({ 'x-pdf-generator-token': token });

    const baseUrl = req.nextUrl.origin;
    const target = `${baseUrl}/memoir/print`;

    await page.goto(target, { waitUntil: 'networkidle0', timeout: 30_000 });
    await page.waitForSelector('[data-memoir-loaded="true"]', { timeout: 30_000 });

    const pdf = await page.pdf({
      format: 'Letter',
      printBackground: true,
      margin: { top: '0.75in', right: '0.75in', bottom: '0.75in', left: '0.75in' },
      preferCSSPageSize: true,
    });

    return new Response(pdf, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="memoir.pdf"',
      },
    });
  } catch (e) {
    console.error('pdf export failed', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'PDF generation failed' },
      { status: 500 },
    );
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
}
```

- [ ] **Step 4: Replace `src/app/memoir/download-button.tsx` with the working version**

```tsx
'use client';

import { useState } from 'react';
import { BigButton } from '@/components/senior-ui';

interface Props {
  seniorUserId: string;
}

export function DownloadButton({ seniorUserId }: Props) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function download() {
    setPending(true);
    setError(null);
    try {
      const res = await fetch('/api/export/pdf', { method: 'POST' });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? `HTTP ${res.status}`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `memoir-${new Date().toISOString().slice(0, 10)}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Download failed');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <BigButton variant="primary" onClick={download} disabled={pending}>
        {pending ? 'Preparing your memoir…' : '⬇ Download as PDF'}
      </BigButton>
      {error && <p className="text-sm text-red-700">{error}</p>}
    </div>
  );
}
```

- [ ] **Step 5: TypeScript + tests**

```bash
npx tsc --noEmit
npm test
```

Expected: tsc clean, 45 tests pass.

- [ ] **Step 6: Manual smoke test**

```bash
npm run dev
```

Visit `http://localhost:3000/memoir`. Click "⬇ Download as PDF". Expected:
- Button shows "Preparing your memoir…" for ~5-10 seconds (first run is slower)
- Browser downloads `memoir-YYYY-MM-DD.pdf`
- Open the PDF — should contain cover, TOC, chapters with stories

If the route returns 500, the most common cause on first run is `@sparticuz/chromium`'s binary not being downloaded. The `npm install` in Task 1 should have done this. If the error mentions "could not find Chromium", run:

```bash
node -e "require('@sparticuz/chromium').default.executablePath().then(p => console.log(p))"
```

If that prints a non-existent path, `npm rebuild @sparticuz/chromium` to re-fetch.

Stop server.

- [ ] **Step 7: Commit**

```bash
git add src/app/memoir/print/ src/app/api/export/pdf/route.ts src/app/memoir/download-button.tsx
git commit -m "feat(memoir): /memoir/print route + Puppeteer /api/export/pdf + working DownloadButton"
```

---

## Task 10: Enable Memoir tab + show linked photos on story detail + Add-Photo on family page

**Files:**
- Modify: `src/components/nav/BottomNav.tsx`
- Modify: `src/app/stories/[id]/page.tsx`
- Modify: `src/app/family/family-view-client.tsx`

- [ ] **Step 1: Enable Memoir in `src/components/nav/BottomNav.tsx`**

Find:
```tsx
{ href: '/memoir',   icon: '📕', label: 'Memoir',  enabled: false },
```

Replace `enabled: false` with `enabled: true`:
```tsx
{ href: '/memoir',   icon: '📕', label: 'Memoir',  enabled: true  },
```

- [ ] **Step 2: Show linked photos on story detail — modify `src/app/stories/[id]/page.tsx`**

Read the existing file. Add this import:
```tsx
import { listPhotosLinkedToStory } from '@/lib/photos-queries';
import { MemoirPhoto } from '@/components/memoir/MemoirPhoto';
```

Inside the page component (after fetching `story` and `audioUrl`), add:
```tsx
const linkedPhotos = await listPhotosLinkedToStory(id);
```

In the JSX, render the photos right before the `<PrivacyToggle>` line:
```tsx
{linkedPhotos.length > 0 && (
  <div className="border-t border-sand pt-4">
    {linkedPhotos.map((p) => (
      <MemoirPhoto key={p.id} photo={p} />
    ))}
  </div>
)}
<PrivacyToggle storyId={story.id} initialIsPrivate={story.is_private} />
```

- [ ] **Step 3: Add upload button to `src/app/family/family-view-client.tsx`**

Read the existing file. Add these imports:
```tsx
import { useState } from 'react';
import { PhotoUploadModal } from '@/components/photos/PhotoUploadModal';
```

(`useState` is probably already imported — confirm and don't double-import.)

Inside the component, add state for the modal:
```ts
const [photoUploadOpen, setPhotoUploadOpen] = useState(false);
```

Build the storyOptions list from `initialStories` for the modal:
```ts
const storyOptions = initialStories.map((s) => ({
  id: s.id,
  chapter: s.chapter,
  question_text: s.question_text,
}));
```

In the JSX, just before the closing `</main>`, add the upload button + modal trigger near the top (right after the SeniorPicker and before `BigText size="display"`):

Find this in the JSX:
```tsx
<BigText size="display" as="h1">
  {selectedSenior?.display_name}&apos;s stories
</BigText>
```

Replace with:
```tsx
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
```

And just before the closing `</main>`, add the modal:
```tsx
{photoUploadOpen && selectedSenior && (
  <PhotoUploadModal
    uploadedByUserId={familyUserId}
    forSeniorUserId={selectedSenior.id}
    stories={storyOptions}
    onClose={() => setPhotoUploadOpen(false)}
    onSaved={() => window.location.reload()}
  />
)}
```

- [ ] **Step 4: Verify**

```bash
npx tsc --noEmit
npm test
```

Expected: tsc clean, 45 tests pass.

- [ ] **Step 5: Manual smoke**

```bash
npm run dev
```

1. Visit `/` — bottom nav: Memoir tab is now enabled (no longer grayed out)
2. Tap Memoir tab — page loads with cover + TOC + stories. "Add a photo" + "Download as PDF" buttons at top.
3. Click "Add a photo" — modal opens. Pick a JPEG, choose chapter, optionally link a story, save. Page reloads, photo appears inline.
4. Click "Download as PDF" — PDF downloads with the new photo included.
5. Visit `/stories/<id>` for a story you linked a photo to — the photo shows above the privacy toggle.
6. Visit `/family?persona=family` — there's now a "📷 Add a photo" link next to "Mom's stories". Click it, upload a photo for Mom. Refresh `/?persona=senior` then `/memoir` — the photo Sarah uploaded shows up.

Stop server.

- [ ] **Step 6: Commit**

```bash
git add src/components/nav/BottomNav.tsx src/app/stories/[id]/page.tsx src/app/family/family-view-client.tsx
git commit -m "feat(memoir): enable Memoir tab + linked photos on story detail + Add-Photo on family view"
```

---

## Task 11: README update for Phase 3

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Update the Status section**

Find `## Status` and replace its content with:

```markdown
## Status

**Phase 3 — Memoir + Photos + PDF.** ✅ The senior can browse a paginated in-app memoir, add photos (or have family add them), and download the whole thing as a PDF via Puppeteer + Chromium.

**Phase 1** (foundation + recording loop): complete.
**Phase 2** (family loop): functionally complete (story feed, hearts, ask question, privacy toggle, multi-senior, persona switching). Backup ZIP and Playwright e2e deferred.
**Phase 3** (this): complete.
**Phase 4** (AI polish — opt-in follow-up questions, admin prompt-bank generation): scoped in spec, not yet built.
```

- [ ] **Step 2: Update Local development → Demo flow**

Find `### Demo flow` and replace its body with:

```markdown
### Demo flow (5 minutes)

1. Visit `/` (you're the senior). Record a story under "Early Childhood".
2. Tap Memoir → see cover + TOC + your story.
3. Tap "📷 Add a photo" — pick an image, link it to your story, save. The photo appears inline in the memoir.
4. Tap "⬇ Download as PDF" — wait ~10s for Puppeteer to render. PDF downloads with cover, TOC, your story, and the photo.
5. Visit `/?persona=family` (now you're Sarah). On `/family`, click "📷 Add a photo" — upload a photo for Mom (you can link to her story or just chapter-tag it).
6. Visit `/?persona=senior` then `/memoir` — Sarah's photo now shows in the memoir.
```

- [ ] **Step 3: Update Tests section**

Find `### Tests` and replace:

```markdown
### Tests

```bash
npm test            # vitest unit + lib tests (~45 tests)
```

E2E suite (Playwright) is deferred — see plans.
```

- [ ] **Step 4: Add Caveats**

Find `### Notable caveats` and append:

```markdown
- **PDF generation runs server-side via Puppeteer + `@sparticuz/chromium`.** First run on a cold Vercel function is ~5-10s; subsequent runs are ~2-3s. The Chromium binary is included in the deployment.
- **Photos are JPEG/PNG only**, max 8 MB. Stored in the private `photos` Supabase Storage bucket. Signed URLs are minted server-side for both the in-app memoir and the print route.
- **`/memoir/print` is internal** — guarded by a single-use 60-second `x-pdf-generator-token` header. Direct browser visits 404.
```

- [ ] **Step 5: Commit**

```bash
git add README.md
git commit -m "docs: README updates for Phase 3 (memoir, photos, PDF)"
```

---

## Self-review

**1. Spec coverage check** (against §9 Phase 3):

| Spec requirement | Tasks |
|---|---|
| Photo upload (senior + family) with chapter + optional story link | 3, 4, 5, 10 |
| Photo album view inside Memoir | 7 (chapter sections), 10 (linked photos in story detail) |
| `/memoir` in-app reader (cover, TOC, chapters with stories + photos inline) | 6, 7 |
| `/memoir/print` route + Puppeteer + `/api/export/pdf` | 1, 8, 9 |
| "Download as PDF" button | 7 (stub), 9 (real) |
| Bottom nav Memoir tab enabled | 10 |
| README updates | 11 |

All §9 Phase 3 items covered.

**2. Placeholder scan:** All code blocks complete. The only "placeholder" is the Task 7 stubbed `DownloadButton` which is explicitly replaced in Task 9 — that's intentional sequencing, not a TBD.

**3. Type consistency:**
- `PhotoRow` shape (id, uploaded_by_user_id, chapter, story_id, storage_path, caption, created_at) consistent across `lib/photos.ts`, `lib/photos-queries.ts`, all Memoir components, and the upload modal ✓
- `StoryRow` from Phase 2 (extended with `is_private`) is reused in `MemoirContent` and `MemoirStory` ✓
- `MemoirContent` props: `seniorUserId: string`, `forPrint?: boolean` — used identically by `/memoir/page.tsx` (no forPrint) and `/memoir/print/page.tsx` (forPrint=true) ✓
- `mintToken/consumeToken` signatures match between `lib/pdf/token.ts`, `/api/export/pdf/route.ts`, and `/memoir/print/page.tsx` ✓
- Photo upload modal's `forSeniorUserId` prop matches the `seniorId` body param of `/api/signed-upload-url` ✓
- `savePhoto` action input shape matches the modal's call site ✓

**4. Cross-task references:**
- Tasks 6, 7 reference each other's components — strict order: 6 (components) → 7 (consumes them) ✓
- Task 7 stubs DownloadButton, Task 9 replaces it — sequencing valid ✓
- Task 9 requires Task 8 (token cache) and Task 1 (puppeteer deps) — order valid ✓
- Task 10 requires Tasks 5 (modal) and 7 (memoir page exists) — order valid ✓

No type or reference inconsistencies.

---
