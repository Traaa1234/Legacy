'use client';

import { useState } from 'react';
import { BigButton, BigCard, BigText } from '@/components/senior-ui';

interface Props {
  baseUrl: string; // e.g., the current app's origin
  onClose: () => void;
}

export function InviteLinkModal({ baseUrl, onClose }: Props) {
  const [token] = useState(() => crypto.randomUUID());
  const [copied, setCopied] = useState(false);
  const link = `${baseUrl}/family?persona=family&inviteToken=${token}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback: select the input
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
      <BigCard className="w-full max-w-lg flex flex-col gap-4">
        <BigText size="question" as="h2">
          Invite a family member
        </BigText>
        <p className="text-body opacity-70">
          Share this link with anyone you&apos;d like to join. They&apos;ll be able to listen to your stories and ask new questions.
        </p>
        <input
          readOnly
          value={link}
          className="w-full bg-sand/30 border border-sand rounded-card p-3 text-sm font-mono"
          onFocus={(e) => e.currentTarget.select()}
        />
        <div className="flex gap-3">
          <BigButton variant="primary" onClick={copy}>
            {copied ? '✓ Copied!' : 'Copy link'}
          </BigButton>
          <BigButton variant="secondary" onClick={onClose}>
            Close
          </BigButton>
        </div>
        <p className="text-sm opacity-60">
          (For this demo, no email is sent — copy and share the link manually.)
        </p>
      </BigCard>
    </div>
  );
}
