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
