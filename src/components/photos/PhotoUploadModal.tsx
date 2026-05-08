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
          throw new Error(
            typeof body?.error === 'string'
              ? body.error
              : `HTTP ${upRes.status}`,
          );
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

        // 3. Insert photo row via server action
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
