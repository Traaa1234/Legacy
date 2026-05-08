import Link from 'next/link';
import { CHAPTERS } from '@/lib/chapters';
import { listStoriesForUser, groupByChapter } from '@/lib/stories';
import { BigCard, BigText } from '@/components/senior-ui';

export const dynamic = 'force-dynamic';

const SENIOR_ID = '00000000-0000-4000-8000-000000000001';

function snippet(text: string, n = 140): string {
  return text.length <= n ? text : text.slice(0, n).trimEnd() + '…';
}

export default async function StoriesPage() {
  const all = await listStoriesForUser(SENIOR_ID);
  const grouped = groupByChapter(all);

  return (
    <main className="min-h-screen p-4 max-w-xl mx-auto flex flex-col gap-6">
      <BigText size="display" as="h1">My Stories</BigText>

      {all.length === 0 && (
        <BigCard>
          <BigText>You haven&apos;t saved any stories yet.</BigText>
          <Link href="/" className="underline mt-4 inline-block">
            Record your first story →
          </Link>
        </BigCard>
      )}

      {CHAPTERS.map((c) => {
        const rows = grouped[c.slug];
        if (!rows?.length) return null;
        return (
          <section key={c.slug} className="flex flex-col gap-3">
            <h2 className="text-question font-serif sticky top-0 bg-cream py-2">
              {c.label}
            </h2>
            {rows.map((s) => (
              <Link key={s.id} href={`/stories/${s.id}`}>
                <BigCard className="hover:bg-sand/30">
                  {s.question_text && (
                    <p className="text-sm opacity-70 mb-2">{s.question_text}</p>
                  )}
                  <BigText>{snippet(s.transcript)}</BigText>
                  <p className="text-sm opacity-50 mt-2">
                    {Math.max(1, Math.round(s.audio_duration_seconds / 60))} min
                  </p>
                </BigCard>
              </Link>
            ))}
          </section>
        );
      })}
    </main>
  );
}
