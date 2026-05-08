import { CHAPTERS, type ChapterSlug } from '@/lib/chapters';

export interface ManifestStoryInput {
  chapter: string;
  transcript: string;
  is_private: boolean;
}

export interface ManifestPhotoInput {
  chapter: string;
  caption: string | null;
}

export interface ManifestInput {
  seniorDisplayName: string;
  generatedAt: Date;
  stories: ManifestStoryInput[];
  photos: ManifestPhotoInput[];
}

export function buildManifest(input: ManifestInput): string {
  const publicStories = input.stories.filter((s) => !s.is_private);
  const dateStr = input.generatedAt.toISOString().slice(0, 10);

  const counts = new Map<ChapterSlug, number>();
  for (const s of publicStories) {
    if (CHAPTERS.some((c) => c.slug === s.chapter)) {
      counts.set(
        s.chapter as ChapterSlug,
        (counts.get(s.chapter as ChapterSlug) ?? 0) + 1,
      );
    }
  }

  const photoCount = input.photos.length;
  const lines: string[] = [];
  lines.push(`${input.seniorDisplayName}'s Memoir`);
  lines.push(`Generated ${dateStr}`);
  lines.push('');
  lines.push('Chapters:');
  for (const c of CHAPTERS) {
    const n = counts.get(c.slug) ?? 0;
    if (n > 0) {
      lines.push(`  ${c.label}: ${n} ${n === 1 ? 'story' : 'stories'}`);
    }
  }
  lines.push('');
  const totalStories = publicStories.length;
  lines.push(
    `Total: ${totalStories} ${totalStories === 1 ? 'story' : 'stories'}, ${photoCount} ${photoCount === 1 ? 'photo' : 'photos'}`,
  );
  lines.push('');
  lines.push('Private stories are excluded from this archive.');
  return lines.join('\n');
}
