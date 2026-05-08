'use client';

import { useState, useTransition } from 'react';
import { BigButton } from '@/components/senior-ui';
import { setStoryPrivate } from '@/app/stories/[id]/story-actions';

interface Props {
  storyId: string;
  initialIsPrivate: boolean;
}

export function PrivacyToggle({ storyId, initialIsPrivate }: Props) {
  const [isPrivate, setIsPrivate] = useState(initialIsPrivate);
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  function requestToggle() {
    setConfirming(true);
  }

  function cancelConfirm() {
    setConfirming(false);
  }

  function commit() {
    const next = !isPrivate;
    startTransition(async () => {
      await setStoryPrivate({ storyId, isPrivate: next });
      setIsPrivate(next);
      setConfirming(false);
    });
  }

  if (confirming) {
    return (
      <div className="flex flex-col gap-3 p-4 bg-sand/30 rounded-card">
        <p className="text-body">
          {isPrivate
            ? 'Make this story visible to your family again?'
            : 'Hide this story from your family? Only you will see it in My Stories and the Memoir.'}
        </p>
        <div className="flex gap-3">
          <BigButton variant="primary" onClick={commit} disabled={pending}>
            {pending ? 'Saving…' : 'Yes, do it'}
          </BigButton>
          <BigButton variant="secondary" onClick={cancelConfirm} disabled={pending}>
            Never mind
          </BigButton>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={requestToggle}
      className="text-deep-navy underline opacity-70 min-h-touch-target text-left"
    >
      {isPrivate
        ? '🔒 Private — tap to share with family again'
        : '👨‍👩‍👧 Visible to family — tap to make private'}
    </button>
  );
}
