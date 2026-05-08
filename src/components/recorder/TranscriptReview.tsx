'use client';

import { useState } from 'react';
import { BigButton, BigCard, BigText } from '@/components/senior-ui';

interface Props {
  initialTranscript: string;
  onSave: (finalTranscript: string) => Promise<void>;
  onRerecord: () => void;
}

export function TranscriptReview({ initialTranscript, onSave, onRerecord }: Props) {
  const [text, setText] = useState(initialTranscript);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      await onSave(text);
    } finally {
      setSaving(false);
    }
  }

  return (
    <BigCard className="flex flex-col gap-4">
      <BigText className="uppercase tracking-wide text-sm opacity-60">
        Your story
      </BigText>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        className="bg-[#FFF8F0] border border-sand rounded-card p-4 text-body min-h-[240px] leading-relaxed resize-y"
      />
      <BigButton variant="primary" onClick={save} disabled={saving}>
        {saving ? 'Saving…' : 'Save story'}
      </BigButton>
      <BigButton variant="secondary" onClick={onRerecord} disabled={saving}>
        Re-record
      </BigButton>
    </BigCard>
  );
}
