import { config } from 'dotenv';
config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';
import { STARTER_PROMPTS } from '../src/seeds/starter-prompts';

const SENIOR_ID = '00000000-0000-4000-8000-000000000001';
const FAMILY_ID = '00000000-0000-4000-8000-000000000002';

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing Supabase env vars');

  const sb = createClient(url, key, { auth: { persistSession: false } });

  // 1. Wipe existing data (idempotent reseed for local dev)
  await sb.from('reactions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await sb.from('photos').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await sb.from('stories').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await sb.from('family_questions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await sb.from('prompt_skips').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await sb.from('prompts').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await sb.from('family_links').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await sb.from('users').delete().neq('id', '00000000-0000-0000-0000-000000000000');

  // 2. Users
  const { error: usersErr } = await sb.from('users').insert([
    { id: SENIOR_ID, email: 'mom@example.com',   role: 'senior', display_name: 'Mom' },
    { id: FAMILY_ID, email: 'sarah@example.com', role: 'family', display_name: 'Sarah' },
  ]);
  if (usersErr) throw usersErr;

  // 3. Family link (Sarah → Mom)
  const { error: linkErr } = await sb.from('family_links').insert([
    { family_user_id: FAMILY_ID, senior_user_id: SENIOR_ID },
  ]);
  if (linkErr) throw linkErr;

  // 4. Prompts
  const { error: promptsErr } = await sb.from('prompts').insert(
    STARTER_PROMPTS.map((p) => ({
      chapter: p.chapter,
      order_in_chapter: p.order_in_chapter,
      question_text: p.question_text,
      source: 'starter' as const,
    })),
  );
  if (promptsErr) throw promptsErr;

  console.log(`Seeded: 2 users, 1 family link, ${STARTER_PROMPTS.length} prompts`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
