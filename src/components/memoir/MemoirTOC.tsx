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
