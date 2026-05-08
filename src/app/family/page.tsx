import { getPersona } from '@/lib/persona';
import {
  listLinkedSeniors,
  listFamilyMembersForSenior,
  listFamilyQuestionsForSenior,
  listReactionsForStories,
} from '@/lib/family';
import { listStoriesForUser } from '@/lib/stories';
import { FamilyViewClient } from './family-view-client';
import { SeniorViewClient } from './senior-view-client';

export const dynamic = 'force-dynamic';

const SENIOR_ID = '00000000-0000-4000-8000-000000000001';
const FAMILY_ID = '00000000-0000-4000-8000-000000000002';

export default async function FamilyPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const persona = await getPersona();

  if (persona === 'family') {
    const seniors = await listLinkedSeniors(FAMILY_ID);
    const params = await searchParams;
    const requestedSeniorId = params.senior;
    const initialSeniorId =
      (typeof requestedSeniorId === 'string' && seniors.some((s) => s.id === requestedSeniorId)
        ? requestedSeniorId
        : seniors[0]?.id) ?? null;

    if (!initialSeniorId) {
      return (
        <main className="min-h-screen p-4 max-w-xl mx-auto">
          <p className="text-body">You aren&apos;t linked to anyone yet.</p>
        </main>
      );
    }

    const allStories = await listStoriesForUser(initialSeniorId);
    const visibleStories = allStories.filter((s) => !s.is_private);
    const reactions = await listReactionsForStories(visibleStories.map((s) => s.id));

    return (
      <FamilyViewClient
        familyUserId={FAMILY_ID}
        seniors={seniors}
        initialSeniorId={initialSeniorId}
        initialStories={visibleStories}
        initialReactions={reactions}
      />
    );
  }

  // Senior persona
  const familyMembers = await listFamilyMembersForSenior(SENIOR_ID);
  const familyQuestions = await listFamilyQuestionsForSenior(SENIOR_ID);

  return (
    <SeniorViewClient
      seniorUserId={SENIOR_ID}
      familyMembers={familyMembers}
      familyQuestions={familyQuestions}
    />
  );
}
