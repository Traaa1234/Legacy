'use client';

import { useState, useTransition } from 'react';
import { clsx } from 'clsx';

interface Props {
  storyId: string;
  initialHasReacted: boolean;
  initialCount: number;
  onToggle: (storyId: string, hasReacted: boolean) => Promise<void>;
}

export function ReactionButton({
  storyId,
  initialHasReacted,
  initialCount,
  onToggle,
}: Props) {
  const [hasReacted, setHasReacted] = useState(initialHasReacted);
  const [count, setCount] = useState(initialCount);
  const [pending, startTransition] = useTransition();

  function click() {
    if (pending) return;
    const nextHas = !hasReacted;
    // Optimistic update first
    setHasReacted(nextHas);
    setCount((c) => c + (nextHas ? 1 : -1));
    startTransition(async () => {
      try {
        await onToggle(storyId, nextHas);
      } catch {
        // Roll back on failure
        setHasReacted(!nextHas);
        setCount((c) => c + (nextHas ? -1 : 1));
      }
    });
  }

  return (
    <button
      onClick={click}
      disabled={pending}
      aria-pressed={hasReacted}
      aria-label={hasReacted ? 'Remove heart' : 'Add heart'}
      className={clsx(
        'inline-flex items-center gap-2 px-4 py-3 rounded-button min-h-touch-target text-body',
        hasReacted
          ? 'bg-soft-coral/20 text-deep-navy'
          : 'bg-white border border-deep-navy/20 text-deep-navy',
      )}
    >
      <span className="text-2xl">{hasReacted ? '❤️' : '🤍'}</span>
      <span>{count}</span>
    </button>
  );
}
