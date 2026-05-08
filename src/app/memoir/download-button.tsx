'use client';

import { BigButton } from '@/components/senior-ui';

interface Props {
  seniorUserId: string;
}

// Stub — the working PDF version lands in Task 9.
export function DownloadButton({ seniorUserId: _seniorUserId }: Props) {
  return (
    <BigButton
      variant="primary"
      onClick={() => alert('PDF download lands in Task 9.')}
    >
      ⬇ Download as PDF
    </BigButton>
  );
}
