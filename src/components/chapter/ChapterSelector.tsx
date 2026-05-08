'use client';

import { CHAPTERS, type ChapterSlug } from '@/lib/chapters';
import { clsx } from 'clsx';

interface Props {
  selected: ChapterSlug;
  onSelect: (slug: ChapterSlug) => void;
}

export function ChapterSelector({ selected, onSelect }: Props) {
  return (
    <div className="flex gap-2 overflow-x-auto py-2 -mx-4 px-4">
      {CHAPTERS.map((c) => {
        const isActive = c.slug === selected;
        return (
          <button
            key={c.slug}
            onClick={() => onSelect(c.slug)}
            className={clsx(
              'whitespace-nowrap rounded-full px-4 py-3 text-base shrink-0 min-h-touch-target',
              isActive
                ? 'bg-deep-navy text-cream'
                : 'bg-white text-deep-navy border border-deep-navy/15',
            )}
          >
            {c.label}
          </button>
        );
      })}
    </div>
  );
}
