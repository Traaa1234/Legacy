'use client';

import { BigButton } from '@/components/senior-ui';
import type { RecorderState } from './use-recorder';

interface Props {
  state: RecorderState;
  onStart: () => void;
  onStop: () => void;
}

export function RecorderButton({ state, onStart, onStop }: Props) {
  if (state === 'recording') {
    return (
      <BigButton
        onClick={onStop}
        className="w-full text-xl animate-[pulse_1.5s_ease-in-out_infinite]"
      >
        ⏹ &nbsp; Tap to stop
      </BigButton>
    );
  }
  if (state === 'idle') {
    return (
      <BigButton onClick={onStart} className="w-full text-xl">
        ● &nbsp; Tap to record
      </BigButton>
    );
  }
  return null; // reviewing — handled by TranscriptReview (Task 27)
}
