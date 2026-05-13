'use client';

import { LANGUAGES } from '@/lib/languages';
import { clsx } from 'clsx';

interface Props {
  selected: string;
  onSelect: (code: string) => void;
}

export function LanguageSelector({ selected, onSelect }: Props) {
  return (
    <div className="flex gap-2 overflow-x-auto py-2 -mx-4 px-4">
      {LANGUAGES.map((l) => {
        const isActive = l.code === selected;
        return (
          <button
            key={l.code}
            onClick={() => onSelect(l.code)}
            className={clsx(
              'whitespace-nowrap rounded-full px-3 py-2 text-base shrink-0 min-h-touch-target',
              isActive
                ? 'bg-soft-coral text-white'
                : 'bg-white text-deep-navy border border-deep-navy/15',
            )}
            title={l.englishLabel}
          >
            {l.label}
          </button>
        );
      })}
    </div>
  );
}
