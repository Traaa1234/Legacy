import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { consumeToken } from '@/lib/pdf/token';
import { MemoirContent } from '../memoir-content';

export const dynamic = 'force-dynamic';

const SENIOR_ID = '00000000-0000-4000-8000-000000000001';

export default async function MemoirPrintPage() {
  const h = await headers();
  const token = h.get('x-pdf-generator-token');
  if (!token || !consumeToken(token)) {
    notFound();
  }
  return <MemoirContent seniorUserId={SENIOR_ID} forPrint />;
}
