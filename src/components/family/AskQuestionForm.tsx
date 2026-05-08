'use client';

import { useState, useTransition } from 'react';
import { BigButton, BigCard, BigText } from '@/components/senior-ui';
import { askQuestion } from '@/app/family/family-actions';

interface Props {
  fromFamilyUserId: string;
  toSeniorUserId: string;
  toSeniorName: string;
}

export function AskQuestionForm({
  fromFamilyUserId,
  toSeniorUserId,
  toSeniorName,
}: Props) {
  const [text, setText] = useState('');
  const [sent, setSent] = useState(false);
  const [pending, startTransition] = useTransition();
  const trimmed = text.trim();
  const valid = trimmed.length >= 5 && trimmed.length <= 500;

  function send() {
    if (!valid) return;
    startTransition(async () => {
      try {
        await askQuestion({
          fromFamilyUserId,
          toSeniorUserId,
          questionText: trimmed,
        });
        setSent(true);
        setText('');
        setTimeout(() => setSent(false), 4000);
      } catch (e) {
        alert(`Couldn't send: ${e instanceof Error ? e.message : 'unknown error'}`);
      }
    });
  }

  return (
    <BigCard className="flex flex-col gap-3">
      <BigText className="uppercase tracking-wide text-sm opacity-60">
        Ask {toSeniorName} a question
      </BigText>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
        placeholder="What's something you've always wanted to know?"
        className="bg-[#FFF8F0] border border-sand rounded-card p-4 text-body resize-y min-h-[120px]"
        disabled={pending || sent}
      />
      <BigButton
        variant="primary"
        onClick={send}
        disabled={!valid || pending || sent}
      >
        {sent ? 'Sent! It will show up on their next visit.' : pending ? 'Sending…' : 'Send'}
      </BigButton>
    </BigCard>
  );
}
