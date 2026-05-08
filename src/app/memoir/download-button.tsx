'use client';

import { useState } from 'react';
import { BigButton } from '@/components/senior-ui';

interface Props {
  seniorUserId: string;
}

export function DownloadButton({ seniorUserId: _seniorUserId }: Props) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function download() {
    setPending(true);
    setError(null);
    try {
      const res = await fetch('/api/export/pdf', { method: 'POST' });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(
          typeof body?.error === 'string' ? body.error : `HTTP ${res.status}`,
        );
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `memoir-${new Date().toISOString().slice(0, 10)}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Download failed');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <BigButton variant="primary" onClick={download} disabled={pending}>
        {pending ? 'Preparing your memoir…' : '⬇ Download as PDF'}
      </BigButton>
      {error && <p className="text-sm text-red-700">{error}</p>}
    </div>
  );
}
