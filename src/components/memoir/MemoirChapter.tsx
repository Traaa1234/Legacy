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
