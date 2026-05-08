import { config } from 'dotenv';
config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';
import { STARTER_PROMPTS } from '../src/seeds/starter-prompts';

const SENIOR_ID = '00000000-0000-4000-8000-000000000001';
const SENIOR_2_ID = '00000000-0000-4000-8000-000000000003';
const FAMILY_ID = '00000000-0000-4000-8000-000000000002';

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing Supabase env vars');

  const sb = createClient(url, key, { auth: { persistSession: false } });

  // 1. Upsert seeded users (NEVER delete — wiping users would cascade and
  //    nuke any recordings the senior has made).
  const { error: usersErr } = await sb.from('users').upsert(
    [
      { id: SENIOR_ID,   email: 'mom@example.com',   role: 'senior', display_name: 'Mom' },
      { id: SENIOR_2_ID, email: 'dad@example.com',   role: 'senior', display_name: 'Dad' },
      { id: FAMILY_ID,   email: 'sarah@example.com', role: 'family', display_name: 'Sarah' },
    ],
    { onConflict: 'id' },
  );
  if (usersErr) throw usersErr;

  // 2. Upsert family links (Sarah → Mom, Sarah → Dad)
  const { error: linkErr } = await sb.from('family_links').upsert(
    [
      { family_user_id: FAMILY_ID, senior_user_id: SENIOR_ID },
      { family_user_id: FAMILY_ID, senior_user_id: SENIOR_2_ID },
    ],
    { onConflict: 'family_user_id,senior_user_id' },
  );
  if (linkErr) throw linkErr;

  // 3. Upsert prompts (idempotent on chapter+order — already a unique pair)
  const { error: promptsErr } = await sb.from('prompts').upsert(
    STARTER_PROMPTS.map((p) => ({
      chapter: p.chapter,
      order_in_chapter: p.order_in_chapter,
      question_text: p.question_text,
      source: 'starter' as const,
    })),
    { onConflict: 'chapter,order_in_chapter' },
  );
  if (promptsErr) throw promptsErr;

  console.log(
    `Seeded (idempotent): 3 users (2 seniors + 1 family), 2 family links, ${STARTER_PROMPTS.length} prompts. Existing stories/reactions/questions preserved.`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
