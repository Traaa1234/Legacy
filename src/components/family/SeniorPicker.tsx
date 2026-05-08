'use client';

import { clsx } from 'clsx';
import type { LinkedSenior } from '@/lib/family';

interface Props {
  seniors: LinkedSenior[];
  selectedId: string;
  onSelect: (id: string) => void;
}

export function SeniorPicker({ seniors, selectedId, onSelect }: Props) {
  if (seniors.length <= 1) return null;
  return (
    <div className="flex gap-2 overflow-x-auto py-2 -mx-4 px-4">
      {seniors.map((s) => (
        <button
          key={s.id}
          onClick={() => onSelect(s.id)}
          className={clsx(
            'whitespace-nowrap rounded-full px-4 py-3 text-base shrink-0 min-h-touch-target',
            s.id === selectedId
              ? 'bg-deep-navy text-cream'
              : 'bg-white text-deep-navy border border-deep-navy/15',
          )}
        >
          {s.display_name}
        </button>
      ))}
    </div>
  );
}
