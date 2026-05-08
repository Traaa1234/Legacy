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
