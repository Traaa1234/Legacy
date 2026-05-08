# Legacy Phase 2 — Family Loop Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A linked family member can open the app, listen to their senior's stories, react with hearts, and ask new questions that show up on the senior's Today screen. Multi-senior support and a family backup ZIP are included.

**Architecture:** Build on Phase 1's foundation. The same Next.js 14 + Supabase Cloud + persona-cookie stack. Persona switching is fixed (no longer auto-flipped by URL path) and the `/family` route now branches its render based on whose cookie is present. New server-side actions handle reactions, family questions, and privacy toggles. The backup ZIP is streamed via `archiver` from a Node-runtime route handler.

**Tech Stack:** Next.js 16, TypeScript strict, Tailwind v4, Supabase Cloud (existing schema — no migrations), `archiver` (streaming ZIP), Vitest, Playwright (mocked Whisper/Claude).

**Reference spec:** `docs/superpowers/specs/2026-05-07-legacy-mvp-design.md` — §9 Phase 2.

---

## Pre-flight context

Phase 1 ended at branch `phase-1-foundation` commit `2af3e1f`. All 8 tables exist in Supabase Cloud, seeded with 1 senior + 1 family + 1 family_link + 50 prompts. The cookie-based persona system has a known issue we'll fix in Task 1.

Run all commands from: `C:/Users/elinw/Projects/legacy`

Phase 2 starts a new branch: `phase-2-family`

Pre-step:

```bash
cd "C:/Users/elinw/Projects/legacy"
git checkout phase-1-foundation
git pull --ff-only origin phase-1-foundation 2>/dev/null || true
git checkout -b phase-2-family
git status
```

---

## File structure (created across all tasks)

```
legacy/
├── scripts/
│   └── seed.ts                                   ← MODIFY: idempotent + 2nd senior + 2nd link
├── src/
│   ├── middleware.ts                             ← MODIFY: no path-based flip
│   ├── app/
│   │   ├── page.tsx                              ← MODIFY: load family questions
│   │   ├── today-client.tsx                      ← MODIFY: "From your family" card
│   │   ├── stories/[id]/page.tsx                 ← MODIFY: PrivacyToggle in detail
│   │   ├── stories/[id]/story-actions.ts         ← NEW: togglePrivacy server action
│   │   ├── family/page.tsx                       ← NEW: persona-branching wrapper
│   │   ├── family/family-view-client.tsx         ← NEW: family persona view
│   │   ├── family/senior-view-client.tsx         ← NEW: senior persona view
│   │   ├── family/family-actions.ts              ← NEW: react / unreact / askQuestion
│   │   └── api/
│   │       └── family/export-zip/route.ts        ← NEW: ZIP backup
│   ├── components/
│   │   ├── nav/BottomNav.tsx                     ← MODIFY: enable Family tab
│   │   ├── family/
│   │   │   ├── ReactionButton.tsx                ← NEW
│   │   │   ├── AskQuestionForm.tsx               ← NEW
│   │   │   ├── SeniorPicker.tsx                  ← NEW
│   │   │   └── InviteLinkModal.tsx               ← NEW
│   │   └── story/
│   │       └── PrivacyToggle.tsx                 ← NEW
│   └── lib/
│       ├── family.ts                             ← NEW: linkedSeniors, familyQuestions queries
│       ├── reactions.ts                          ← NEW: react/unreact/listForStories
│       ├── persona.ts                            ← MODIFY: add getPersona() server helper
│       └── zip/manifest.ts                       ← NEW: TDD-backed manifest builder
└── tests/
    ├── unit/
    │   ├── family.test.ts                        ← NEW
    │   ├── reactions.test.ts                     ← NEW
    │   └── manifest.test.ts                      ← NEW
    └── e2e/
        ├── fixtures/
        │   └── silence.webm                      ← NEW (committed)
        ├── support/
        │   └── api-mocks.ts                      ← NEW: route handlers for Whisper/Claude
        ├── record-and-save.spec.ts               ← RESTORED with mocks
        └── family-flow.spec.ts                   ← NEW
```

---

## Task 1: Fix persona middleware — remove path-based auto-flip

**Files:**
- Modify: `src/middleware.ts`
- Modify: `src/lib/persona.ts`

**Background:** Phase 1's middleware flipped the persona cookie to `'family'` whenever the URL started with `/family`, and to `'senior'` for `/`, `/stories`, `/memoir`. That was wrong: a senior tapping the "Family" bottom-nav tab to manage their invites would become the family persona by accident. The persona represents WHO is using the app, not WHERE they are.

The fix: persona is only flipped explicitly via a `?persona=family` (or `?persona=senior`) query param, which the fake invite link uses. Otherwise the existing cookie value sticks.

- [ ] **Step 1: Replace `src/middleware.ts`**

```ts
import { NextRequest, NextResponse } from 'next/server';
import { PERSONA_COOKIE } from '@/lib/persona';

export function middleware(req: NextRequest) {
  const res = NextResponse.next();

  // Initialize persona cookie to 'senior' on the first visit.
  if (!req.cookies.get(PERSONA_COOKIE)) {
    res.cookies.set(PERSONA_COOKIE, 'senior', { path: '/', sameSite: 'lax' });
  }

  // Allow ?persona= query param to switch personas (used by fake invite link
  // and the dev-only "switch view" toggle).
  const personaParam = req.nextUrl.searchParams.get('persona');
  if (personaParam === 'family' || personaParam === 'senior') {
    res.cookies.set(PERSONA_COOKIE, personaParam, { path: '/', sameSite: 'lax' });
  }

  return res;
}

export const config = {
  matcher: ['/', '/family/:path*', '/stories/:path*', '/memoir/:path*'],
};
```

- [ ] **Step 2: Add a server helper to read the persona cookie — append to `src/lib/persona.ts`**

```ts
import { cookies } from 'next/headers';

export async function getPersona(): Promise<Persona> {
  const store = await cookies();
  const value = store.get(PERSONA_COOKIE)?.value;
  return resolvePersonaFromCookie(value);
}
```

(Keep the existing exports — `Persona`, `PERSONA_COOKIE`, `resolvePersonaFromCookie`. Just add `getPersona`.)

- [ ] **Step 3: Run tests**

```bash
npm test
```

Expected: 29 passed (the new `getPersona` is server-only and not unit-tested directly; `resolvePersonaFromCookie` already covers the parsing logic).

- [ ] **Step 4: Verify dev server still works**

```bash
npm run dev
```

Visit `http://localhost:3000`. Cookie should be `legacy_persona=senior`. Visit `http://localhost:3000/?persona=family` — cookie flips to family. Visit `http://localhost:3000/?persona=senior` — flips back. Stop server.

- [ ] **Step 5: Commit**

```bash
git add src/middleware.ts src/lib/persona.ts
git commit -m "fix(persona): remove path-based auto-flip; add ?persona= override + getPersona() helper"
```

---

## Task 2: Idempotent multi-senior seed

**Files:**
- Modify: `scripts/seed.ts`

**Background:** Phase 1's seed wiped all data and re-inserted. That's destructive — recordings the user has made are lost on every reseed. Phase 2 needs:
1. Idempotency that preserves user-generated content (stories, reactions, family_questions, prompt_skips, photos).
2. A second seeded senior so we can demo multi-senior support.

- [ ] **Step 1: Replace `scripts/seed.ts`**

```ts
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
```

- [ ] **Step 2: Run the seed**

```bash
npm run seed
```

Expected output:
```
Seeded (idempotent): 3 users (2 seniors + 1 family), 2 family links, 50 prompts. Existing stories/reactions/questions preserved.
```

- [ ] **Step 3: Probe to confirm**

```bash
node -e "require('dotenv').config({path:'.env.local'});const {createClient}=require('@supabase/supabase-js');(async()=>{const sb=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY);const {data:users}=await sb.from('users').select('display_name,role').order('role').order('display_name');const {data:links}=await sb.from('family_links').select('family_user_id,senior_user_id');console.log('users:',users);console.log('links:',links?.length);})()"
```

Expected: 3 users (Mom, Dad, Sarah), 2 links.

- [ ] **Step 4: Commit**

```bash
git add scripts/seed.ts
git commit -m "feat(seed): idempotent upsert + 2nd senior (Dad) + 2nd family_link"
```

---

## Task 3: `lib/family.ts` queries (TDD)

**Files:**
- Create: `src/lib/family.ts`
- Create: `tests/unit/family.test.ts`

These are pure-function helpers that compose query results — easy to test against in-memory data without hitting Supabase.

- [ ] **Step 1: Write the failing test — `tests/unit/family.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import {
  groupReactionsByStory,
  partitionFamilyQuestions,
  type FamilyQuestionRow,
  type ReactionRow,
} from '@/lib/family';

const NOW = '2026-05-08T12:00:00Z';

describe('groupReactionsByStory', () => {
  it('returns an empty map for no reactions', () => {
    expect(groupReactionsByStory([])).toEqual(new Map());
  });

  it('groups multiple reactions by story_id', () => {
    const rows: ReactionRow[] = [
      { story_id: 's1', family_user_id: 'f1', emoji: '❤️', created_at: NOW },
      { story_id: 's1', family_user_id: 'f2', emoji: '❤️', created_at: NOW },
      { story_id: 's2', family_user_id: 'f1', emoji: '❤️', created_at: NOW },
    ];
    const grouped = groupReactionsByStory(rows);
    expect(grouped.get('s1')).toHaveLength(2);
    expect(grouped.get('s2')).toHaveLength(1);
  });
});

describe('partitionFamilyQuestions', () => {
  const base: Omit<FamilyQuestionRow, 'id' | 'answered_story_id'> = {
    asked_by_user_id: 'family-1',
    asked_to_user_id: 'senior-1',
    question_text: 'tell me about?',
    created_at: NOW,
  };

  it('separates pending and answered questions', () => {
    const rows: FamilyQuestionRow[] = [
      { id: 'q1', answered_story_id: null,    ...base },
      { id: 'q2', answered_story_id: 's1',    ...base },
      { id: 'q3', answered_story_id: null,    ...base },
    ];
    const { pending, answered } = partitionFamilyQuestions(rows);
    expect(pending.map((q) => q.id)).toEqual(['q1', 'q3']);
    expect(answered.map((q) => q.id)).toEqual(['q2']);
  });

  it('handles empty input', () => {
    const { pending, answered } = partitionFamilyQuestions([]);
    expect(pending).toEqual([]);
    expect(answered).toEqual([]);
  });
});
```

- [ ] **Step 2: Run — expect fail**

```bash
npm test -- tests/unit/family.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement — `src/lib/family.ts`**

```ts
import { getServiceSupabase } from '@/lib/supabase/server';

export interface ReactionRow {
  story_id: string;
  family_user_id: string;
  emoji: string;
  created_at: string;
}

export interface FamilyQuestionRow {
  id: string;
  asked_by_user_id: string;
  asked_to_user_id: string;
  question_text: string;
  answered_story_id: string | null;
  created_at: string;
}

export interface LinkedSenior {
  id: string;
  display_name: string;
  email: string;
}

export interface FamilyMember {
  id: string;
  display_name: string;
  email: string;
}

/* ---------- Pure helpers (testable in-memory) ---------- */

export function groupReactionsByStory(
  rows: ReactionRow[],
): Map<string, ReactionRow[]> {
  const out = new Map<string, ReactionRow[]>();
  for (const r of rows) {
    const list = out.get(r.story_id) ?? [];
    list.push(r);
    out.set(r.story_id, list);
  }
  return out;
}

export function partitionFamilyQuestions(rows: FamilyQuestionRow[]) {
  const pending = rows.filter((r) => r.answered_story_id === null);
  const answered = rows.filter((r) => r.answered_story_id !== null);
  return { pending, answered };
}

/* ---------- DB queries (server-only) ---------- */

export async function listLinkedSeniors(
  familyUserId: string,
): Promise<LinkedSenior[]> {
  const sb = getServiceSupabase();
  const { data, error } = await sb
    .from('family_links')
    .select('senior_user_id, users!family_links_senior_user_id_fkey (id, display_name, email)')
    .eq('family_user_id', familyUserId);
  if (error) throw new Error(error.message);
  return (data ?? [])
    .map((r) => (r.users as unknown as LinkedSenior | null))
    .filter((u): u is LinkedSenior => u !== null);
}

export async function listFamilyMembersForSenior(
  seniorUserId: string,
): Promise<FamilyMember[]> {
  const sb = getServiceSupabase();
  const { data, error } = await sb
    .from('family_links')
    .select('family_user_id, users!family_links_family_user_id_fkey (id, display_name, email)')
    .eq('senior_user_id', seniorUserId);
  if (error) throw new Error(error.message);
  return (data ?? [])
    .map((r) => r.users as unknown as FamilyMember | null)
    .filter((u): u is FamilyMember => u !== null);
}

export async function listFamilyQuestionsForSenior(
  seniorUserId: string,
): Promise<FamilyQuestionRow[]> {
  const sb = getServiceSupabase();
  const { data, error } = await sb
    .from('family_questions')
    .select('id, asked_by_user_id, asked_to_user_id, question_text, answered_story_id, created_at')
    .eq('asked_to_user_id', seniorUserId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function listReactionsForStories(
  storyIds: string[],
): Promise<ReactionRow[]> {
  if (storyIds.length === 0) return [];
  const sb = getServiceSupabase();
  const { data, error } = await sb
    .from('reactions')
    .select('story_id, family_user_id, emoji, created_at')
    .in('story_id', storyIds);
  if (error) throw new Error(error.message);
  return data ?? [];
}
```

- [ ] **Step 4: Run — expect pass**

```bash
npm test -- tests/unit/family.test.ts
```

Expected: 4 passed.

- [ ] **Step 5: Commit**

```bash
git add src/lib/family.ts tests/unit/family.test.ts
git commit -m "feat(family): query helpers + partition/group functions (TDD)"
```

---

## Task 4: `lib/reactions.ts` (TDD on the optimistic toggle helper)

**Files:**
- Create: `src/lib/reactions.ts`
- Create: `tests/unit/reactions.test.ts`

- [ ] **Step 1: Write the failing test — `tests/unit/reactions.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { toggleReactionInList, type ReactionLite } from '@/lib/reactions';

const FAMILY_USER = 'fam-1';

describe('toggleReactionInList', () => {
  it('adds a reaction when user has not reacted yet', () => {
    const before: ReactionLite[] = [];
    const after = toggleReactionInList(before, 'story-1', FAMILY_USER, '❤️');
    expect(after).toHaveLength(1);
    expect(after[0]).toMatchObject({
      story_id: 'story-1',
      family_user_id: FAMILY_USER,
      emoji: '❤️',
    });
  });

  it('removes a reaction when user already reacted with that emoji', () => {
    const before: ReactionLite[] = [
      { story_id: 'story-1', family_user_id: FAMILY_USER, emoji: '❤️' },
    ];
    const after = toggleReactionInList(before, 'story-1', FAMILY_USER, '❤️');
    expect(after).toEqual([]);
  });

  it('leaves other users\' reactions intact when toggling own', () => {
    const before: ReactionLite[] = [
      { story_id: 'story-1', family_user_id: 'other', emoji: '❤️' },
      { story_id: 'story-1', family_user_id: FAMILY_USER, emoji: '❤️' },
    ];
    const after = toggleReactionInList(before, 'story-1', FAMILY_USER, '❤️');
    expect(after).toEqual([
      { story_id: 'story-1', family_user_id: 'other', emoji: '❤️' },
    ]);
  });

  it('only touches the targeted story_id', () => {
    const before: ReactionLite[] = [
      { story_id: 'story-1', family_user_id: FAMILY_USER, emoji: '❤️' },
      { story_id: 'story-2', family_user_id: FAMILY_USER, emoji: '❤️' },
    ];
    const after = toggleReactionInList(before, 'story-1', FAMILY_USER, '❤️');
    expect(after).toHaveLength(1);
    expect(after[0]?.story_id).toBe('story-2');
  });
});
```

- [ ] **Step 2: Run — expect fail**

```bash
npm test -- tests/unit/reactions.test.ts
```

- [ ] **Step 3: Implement — `src/lib/reactions.ts`**

```ts
import { getServiceSupabase } from '@/lib/supabase/server';

export interface ReactionLite {
  story_id: string;
  family_user_id: string;
  emoji: string;
}

/** Pure helper: optimistic toggle for a UI list. */
export function toggleReactionInList(
  list: ReactionLite[],
  storyId: string,
  familyUserId: string,
  emoji: string,
): ReactionLite[] {
  const exists = list.some(
    (r) =>
      r.story_id === storyId &&
      r.family_user_id === familyUserId &&
      r.emoji === emoji,
  );
  if (exists) {
    return list.filter(
      (r) =>
        !(
          r.story_id === storyId &&
          r.family_user_id === familyUserId &&
          r.emoji === emoji
        ),
    );
  }
  return [...list, { story_id: storyId, family_user_id: familyUserId, emoji }];
}

/* ---------- DB writes ---------- */

export async function addReaction(
  storyId: string,
  familyUserId: string,
  emoji: string,
): Promise<void> {
  const sb = getServiceSupabase();
  const { error } = await sb.from('reactions').upsert(
    { story_id: storyId, family_user_id: familyUserId, emoji },
    { onConflict: 'story_id,family_user_id,emoji' },
  );
  if (error) throw new Error(error.message);
}

export async function removeReaction(
  storyId: string,
  familyUserId: string,
  emoji: string,
): Promise<void> {
  const sb = getServiceSupabase();
  const { error } = await sb
    .from('reactions')
    .delete()
    .eq('story_id', storyId)
    .eq('family_user_id', familyUserId)
    .eq('emoji', emoji);
  if (error) throw new Error(error.message);
}
```

- [ ] **Step 4: Run — expect pass**

```bash
npm test -- tests/unit/reactions.test.ts
```

Expected: 4 passed.

- [ ] **Step 5: Commit**

```bash
git add src/lib/reactions.ts tests/unit/reactions.test.ts
git commit -m "feat(reactions): toggle helper + add/remove DB ops (TDD)"
```

---

## Task 5: PrivacyToggle component + server action + integration

**Files:**
- Create: `src/components/story/PrivacyToggle.tsx`
- Create: `src/app/stories/[id]/story-actions.ts`
- Modify: `src/app/stories/[id]/page.tsx`

- [ ] **Step 1: Create `src/app/stories/[id]/story-actions.ts`**

```ts
'use server';

import { z } from 'zod';
import { getServiceSupabase } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

const ToggleInput = z.object({
  storyId: z.string().uuid(),
  isPrivate: z.boolean(),
});

export async function setStoryPrivate(input: z.infer<typeof ToggleInput>) {
  const data = ToggleInput.parse(input);
  const sb = getServiceSupabase();
  const { error } = await sb
    .from('stories')
    .update({ is_private: data.isPrivate })
    .eq('id', data.storyId);
  if (error) throw new Error(error.message);
  revalidatePath(`/stories/${data.storyId}`);
  revalidatePath('/stories');
  revalidatePath('/family');
}
```

- [ ] **Step 2: Create `src/components/story/PrivacyToggle.tsx`**

```tsx
'use client';

import { useState, useTransition } from 'react';
import { BigButton } from '@/components/senior-ui';
import { setStoryPrivate } from '@/app/stories/[id]/story-actions';

interface Props {
  storyId: string;
  initialIsPrivate: boolean;
}

export function PrivacyToggle({ storyId, initialIsPrivate }: Props) {
  const [isPrivate, setIsPrivate] = useState(initialIsPrivate);
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  function requestToggle() {
    setConfirming(true);
  }

  function cancelConfirm() {
    setConfirming(false);
  }

  function commit() {
    const next = !isPrivate;
    startTransition(async () => {
      await setStoryPrivate({ storyId, isPrivate: next });
      setIsPrivate(next);
      setConfirming(false);
    });
  }

  if (confirming) {
    return (
      <div className="flex flex-col gap-3 p-4 bg-sand/30 rounded-card">
        <p className="text-body">
          {isPrivate
            ? 'Make this story visible to your family again?'
            : 'Hide this story from your family? Only you will see it in My Stories and the Memoir.'}
        </p>
        <div className="flex gap-3">
          <BigButton variant="primary" onClick={commit} disabled={pending}>
            {pending ? 'Saving…' : 'Yes, do it'}
          </BigButton>
          <BigButton variant="secondary" onClick={cancelConfirm} disabled={pending}>
            Never mind
          </BigButton>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={requestToggle}
      className="text-deep-navy underline opacity-70 min-h-touch-target text-left"
    >
      {isPrivate
        ? '🔒 Private — tap to share with family again'
        : '👨‍👩‍👧 Visible to family — tap to make private'}
    </button>
  );
}
```

- [ ] **Step 3: Update `src/app/stories/[id]/page.tsx`**

Modify the existing file to fetch `is_private` and render `<PrivacyToggle />`. Find the existing `select(...)` clause and add `is_private`. Then in the JSX, add the toggle below the transcript:

The select call should be:

```tsx
const { data: story } = await sb
  .from('stories')
  .select(`id, chapter, transcript, audio_url, is_private, created_at, prompt_id,
           prompts:prompt_id (question_text)`)
  .eq('id', id)
  .single();
```

Add an import at the top:

```tsx
import { PrivacyToggle } from '@/components/story/PrivacyToggle';
```

And render it inside the `<BigCard>`, after the transcript:

```tsx
<BigText className="whitespace-pre-wrap leading-relaxed">
  {story.transcript}
</BigText>
<PrivacyToggle storyId={story.id} initialIsPrivate={story.is_private} />
```

- [ ] **Step 4: TypeScript + tests**

```bash
npx tsc --noEmit
npm test
```

Expected: tsc clean, 37 tests passing (29 prior + 4 family + 4 reactions).

- [ ] **Step 5: Commit**

```bash
git add src/components/story/PrivacyToggle.tsx src/app/stories/[id]/story-actions.ts src/app/stories/[id]/page.tsx
git commit -m "feat(privacy): per-story privacy toggle with confirm dialog"
```

---

## Task 6: ReactionButton component

**Files:**
- Create: `src/components/family/ReactionButton.tsx`

- [ ] **Step 1: Implement**

```tsx
'use client';

import { useState, useTransition } from 'react';
import { clsx } from 'clsx';

interface Props {
  storyId: string;
  initialHasReacted: boolean;
  initialCount: number;
  onToggle: (storyId: string, hasReacted: boolean) => Promise<void>;
}

export function ReactionButton({
  storyId,
  initialHasReacted,
  initialCount,
  onToggle,
}: Props) {
  const [hasReacted, setHasReacted] = useState(initialHasReacted);
  const [count, setCount] = useState(initialCount);
  const [pending, startTransition] = useTransition();

  function click() {
    if (pending) return;
    const nextHas = !hasReacted;
    // Optimistic update first
    setHasReacted(nextHas);
    setCount((c) => c + (nextHas ? 1 : -1));
    startTransition(async () => {
      try {
        await onToggle(storyId, nextHas);
      } catch {
        // Roll back on failure
        setHasReacted(!nextHas);
        setCount((c) => c + (nextHas ? -1 : 1));
      }
    });
  }

  return (
    <button
      onClick={click}
      disabled={pending}
      aria-pressed={hasReacted}
      aria-label={hasReacted ? 'Remove heart' : 'Add heart'}
      className={clsx(
        'inline-flex items-center gap-2 px-4 py-3 rounded-button min-h-touch-target text-body',
        hasReacted
          ? 'bg-soft-coral/20 text-deep-navy'
          : 'bg-white border border-deep-navy/20 text-deep-navy',
      )}
    >
      <span className="text-2xl">{hasReacted ? '❤️' : '🤍'}</span>
      <span>{count}</span>
    </button>
  );
}
```

- [ ] **Step 2: TypeScript**

```bash
npx tsc --noEmit
```

Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add src/components/family/ReactionButton.tsx
git commit -m "feat(family): ReactionButton with optimistic heart toggle"
```

---

## Task 7: AskQuestionForm component + server action

**Files:**
- Create: `src/components/family/AskQuestionForm.tsx`
- Create: `src/app/family/family-actions.ts`

- [ ] **Step 1: Create `src/app/family/family-actions.ts`**

```ts
'use server';

import { z } from 'zod';
import { getServiceSupabase } from '@/lib/supabase/server';
import { addReaction, removeReaction } from '@/lib/reactions';
import { revalidatePath } from 'next/cache';

const ToggleReactionInput = z.object({
  storyId: z.string().uuid(),
  familyUserId: z.string().uuid(),
  hasReacted: z.boolean(), // the new state — true means reaction should now exist
});

export async function toggleReaction(input: z.infer<typeof ToggleReactionInput>) {
  const data = ToggleReactionInput.parse(input);
  if (data.hasReacted) {
    await addReaction(data.storyId, data.familyUserId, '❤️');
  } else {
    await removeReaction(data.storyId, data.familyUserId, '❤️');
  }
  revalidatePath('/family');
}

const AskQuestionInput = z.object({
  fromFamilyUserId: z.string().uuid(),
  toSeniorUserId: z.string().uuid(),
  questionText: z.string().min(5).max(500),
});

export async function askQuestion(input: z.infer<typeof AskQuestionInput>) {
  const data = AskQuestionInput.parse(input);
  const sb = getServiceSupabase();
  const { error } = await sb.from('family_questions').insert({
    asked_by_user_id: data.fromFamilyUserId,
    asked_to_user_id: data.toSeniorUserId,
    question_text: data.questionText.trim(),
  });
  if (error) throw new Error(error.message);
  revalidatePath('/family');
  revalidatePath('/');
}
```

- [ ] **Step 2: Create `src/components/family/AskQuestionForm.tsx`**

```tsx
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
        // Roll back not needed — text remains; show alert
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
```

- [ ] **Step 3: TypeScript**

```bash
npx tsc --noEmit
```

Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add src/components/family/AskQuestionForm.tsx src/app/family/family-actions.ts
git commit -m "feat(family): AskQuestionForm + askQuestion/toggleReaction server actions"
```

---

## Task 8: SeniorPicker component (when family has multiple linked seniors)

**Files:**
- Create: `src/components/family/SeniorPicker.tsx`

- [ ] **Step 1: Implement**

```tsx
'use client';

import { clsx } from 'clsx';
import type { LinkedSenior } from '@/lib/family';

interface Props {
  seniors: LinkedSenior[];
  selectedId: string;
  onSelect: (id: string) => void;
}

export function SeniorPicker({ seniors, selectedId, onSelect }: Props) {
  if (seniors.length <= 1) return null;
  return (
    <div className="flex gap-2 overflow-x-auto py-2 -mx-4 px-4">
      {seniors.map((s) => (
        <button
          key={s.id}
          onClick={() => onSelect(s.id)}
          className={clsx(
            'whitespace-nowrap rounded-full px-4 py-3 text-base shrink-0 min-h-touch-target',
            s.id === selectedId
              ? 'bg-deep-navy text-cream'
              : 'bg-white text-deep-navy border border-deep-navy/15',
          )}
        >
          {s.display_name}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/family/SeniorPicker.tsx
git commit -m "feat(family): SeniorPicker chip row (hidden when only one linked)"
```

---

## Task 9: InviteLinkModal component

**Files:**
- Create: `src/components/family/InviteLinkModal.tsx`

The "fake invite link" generates a UUID token that's appended to a `?persona=family&inviteToken=<uuid>` URL. The token isn't validated on the server — it's purely visual realism for the demo flow.

- [ ] **Step 1: Implement**

```tsx
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
```

- [ ] **Step 2: Commit**

```bash
git add src/components/family/InviteLinkModal.tsx
git commit -m "feat(family): InviteLinkModal — fake invite link generator with copy-to-clipboard"
```

---

## Task 10: `/family` page wrapper (persona branching)

**Files:**
- Create: `src/app/family/page.tsx`
- Create: `src/app/family/family-view-client.tsx` (placeholder — Task 11 fills in)
- Create: `src/app/family/senior-view-client.tsx` (placeholder — Task 12 fills in)

- [ ] **Step 1: Create `src/app/family/page.tsx`**

```tsx
import { getPersona } from '@/lib/persona';
import { listLinkedSeniors, listFamilyMembersForSenior, listFamilyQuestionsForSenior } from '@/lib/family';
import { listStoriesForUser } from '@/lib/stories';
import { listReactionsForStories } from '@/lib/family';
import { FamilyViewClient } from './family-view-client';
import { SeniorViewClient } from './senior-view-client';

export const dynamic = 'force-dynamic';

const SENIOR_ID = '00000000-0000-4000-8000-000000000001';
const FAMILY_ID = '00000000-0000-4000-8000-000000000002';

export default async function FamilyPage() {
  const persona = await getPersona();

  if (persona === 'family') {
    const seniors = await listLinkedSeniors(FAMILY_ID);
    const initialSeniorId = seniors[0]?.id ?? null;

    if (!initialSeniorId) {
      return (
        <main className="min-h-screen p-4 max-w-xl mx-auto">
          <p className="text-body">You aren&apos;t linked to anyone yet.</p>
        </main>
      );
    }

    const stories = await listStoriesForUser(initialSeniorId);
    const visibleStories = stories.filter((s) => true); // privacy filter applied via story.is_private later
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
```

- [ ] **Step 2: Stub `src/app/family/family-view-client.tsx` (Task 11 will replace)**

```tsx
'use client';

import type { LinkedSenior } from '@/lib/family';
import type { ReactionRow } from '@/lib/family';
import type { StoryRow } from '@/lib/stories';
import { BigText } from '@/components/senior-ui';

interface Props {
  familyUserId: string;
  seniors: LinkedSenior[];
  initialSeniorId: string;
  initialStories: StoryRow[];
  initialReactions: ReactionRow[];
}

export function FamilyViewClient(_: Props) {
  return (
    <main className="min-h-screen p-4 max-w-xl mx-auto">
      <BigText size="display" as="h1">Family view (stub)</BigText>
      <p className="text-body opacity-70 mt-4">Will be filled in by Task 11.</p>
    </main>
  );
}
```

- [ ] **Step 3: Stub `src/app/family/senior-view-client.tsx` (Task 12 will replace)**

```tsx
'use client';

import type { FamilyMember, FamilyQuestionRow } from '@/lib/family';
import { BigText } from '@/components/senior-ui';

interface Props {
  seniorUserId: string;
  familyMembers: FamilyMember[];
  familyQuestions: FamilyQuestionRow[];
}

export function SeniorViewClient(_: Props) {
  return (
    <main className="min-h-screen p-4 max-w-xl mx-auto">
      <BigText size="display" as="h1">Family page (senior — stub)</BigText>
      <p className="text-body opacity-70 mt-4">Will be filled in by Task 12.</p>
    </main>
  );
}
```

- [ ] **Step 4: Enable Family tab in BottomNav — modify `src/components/nav/BottomNav.tsx`**

Change the `family` item's `enabled: false` to `enabled: true`:

```tsx
const ITEMS = [
  { href: '/',         icon: '🏠', label: 'Today',   enabled: true  },
  { href: '/stories',  icon: '📖', label: 'Stories', enabled: true  },
  { href: '/family',   icon: '👪', label: 'Family',  enabled: true  },  // ← was false
  { href: '/memoir',   icon: '📕', label: 'Memoir',  enabled: false },
];
```

- [ ] **Step 5: Verify**

```bash
npx tsc --noEmit
npm test
npm run dev
```

Visit `http://localhost:3000/family` — should show the senior-stub page (since default persona is senior).
Visit `http://localhost:3000/family?persona=family` — should show the family-stub page.
Stop server.

- [ ] **Step 6: Commit**

```bash
git add src/app/family/ src/components/nav/BottomNav.tsx
git commit -m "feat(family): /family page persona-branching wrapper + enable Family tab"
```

---

## Task 11: Family persona view (story feed + react + ask)

**Files:**
- Replace: `src/app/family/family-view-client.tsx`

- [ ] **Step 1: Replace the stub with the full implementation**

```tsx
'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { CHAPTERS } from '@/lib/chapters';
import { BigButton, BigCard, BigText } from '@/components/senior-ui';
import { ReactionButton } from '@/components/family/ReactionButton';
import { AskQuestionForm } from '@/components/family/AskQuestionForm';
import { SeniorPicker } from '@/components/family/SeniorPicker';
import { toggleReaction } from './family-actions';
import {
  groupReactionsByStory,
  type LinkedSenior,
  type ReactionRow,
} from '@/lib/family';
import type { StoryRow } from '@/lib/stories';

interface Props {
  familyUserId: string;
  seniors: LinkedSenior[];
  initialSeniorId: string;
  initialStories: StoryRow[];
  initialReactions: ReactionRow[];
}

function snippet(text: string, n = 200): string {
  return text.length <= n ? text : text.slice(0, n).trimEnd() + '…';
}

export function FamilyViewClient({
  familyUserId,
  seniors,
  initialSeniorId,
  initialStories,
  initialReactions,
}: Props) {
  const [seniorId, setSeniorId] = useState(initialSeniorId);

  // Note: switching senior triggers a navigation (server reload), not a client filter,
  // since stories/reactions need to be re-queried. For MVP we use a hard reload.
  function pickSenior(id: string) {
    setSeniorId(id);
    window.location.search = `?persona=family&senior=${id}`;
  }

  const selectedSenior = seniors.find((s) => s.id === seniorId);
  const reactionsByStory = useMemo(
    () => groupReactionsByStory(initialReactions),
    [initialReactions],
  );

  function hasReacted(storyId: string): boolean {
    const rs = reactionsByStory.get(storyId) ?? [];
    return rs.some((r) => r.family_user_id === familyUserId);
  }

  function reactionCount(storyId: string): number {
    return (reactionsByStory.get(storyId) ?? []).length;
  }

  const handleToggle = async (storyId: string, hasReactedNow: boolean) => {
    await toggleReaction({
      storyId,
      familyUserId,
      hasReacted: hasReactedNow,
    });
  };

  return (
    <main className="min-h-screen p-4 max-w-xl mx-auto flex flex-col gap-6">
      <SeniorPicker seniors={seniors} selectedId={seniorId} onSelect={pickSenior} />

      <BigText size="display" as="h1">
        {selectedSenior?.display_name}&apos;s stories
      </BigText>

      {selectedSenior && (
        <AskQuestionForm
          fromFamilyUserId={familyUserId}
          toSeniorUserId={selectedSenior.id}
          toSeniorName={selectedSenior.display_name}
        />
      )}

      <Link
        href={`/api/family/export-zip?seniorId=${seniorId}`}
        className="block text-center underline opacity-70 min-h-touch-target py-3"
      >
        ⬇ Download all stories as a ZIP
      </Link>

      {initialStories.length === 0 && (
        <BigCard>
          <BigText>No stories yet. Once they record one, it&apos;ll show up here.</BigText>
        </BigCard>
      )}

      {CHAPTERS.map((c) => {
        const rows = initialStories.filter((s) => s.chapter === c.slug);
        if (rows.length === 0) return null;
        return (
          <section key={c.slug} className="flex flex-col gap-3">
            <h2 className="text-question font-serif sticky top-0 bg-cream py-2">
              {c.label}
            </h2>
            {rows.map((s) => (
              <BigCard key={s.id} className="flex flex-col gap-3">
                {s.question_text && (
                  <p className="text-sm opacity-70">{s.question_text}</p>
                )}
                <BigText>{snippet(s.transcript)}</BigText>
                <div className="flex items-center justify-between gap-3">
                  <Link
                    href={`/stories/${s.id}`}
                    className="underline text-deep-navy"
                  >
                    Listen →
                  </Link>
                  <ReactionButton
                    storyId={s.id}
                    initialHasReacted={hasReacted(s.id)}
                    initialCount={reactionCount(s.id)}
                    onToggle={handleToggle}
                  />
                </div>
              </BigCard>
            ))}
          </section>
        );
      })}
    </main>
  );
}
```

- [ ] **Step 2: Update `src/app/family/page.tsx` to filter private stories AND honor `?senior=` query param**

Replace the family-persona branch with:

```tsx
if (persona === 'family') {
  const seniors = await listLinkedSeniors(FAMILY_ID);
  const requestedSeniorId = (await searchParams).senior;
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
```

And update the page signature to receive `searchParams`:

```tsx
export default async function FamilyPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
```

- [ ] **Step 3: Add `is_private` to `StoryRow` and the query in `lib/stories.ts`**

Modify `src/lib/stories.ts` — add `is_private: boolean;` to the `StoryRow` interface, add `is_private` to the select clause, and propagate it in the map:

```ts
export interface StoryRow {
  id: string;
  chapter: string;
  transcript: string;
  audio_url: string;
  audio_duration_seconds: number;
  is_private: boolean;       // ← NEW
  created_at: string;
  prompt_id: string | null;
  question_text: string | null;
}
```

Update the select to include `is_private`:

```ts
const { data, error } = await sb
  .from('stories')
  .select(
    `id, chapter, transcript, audio_url, audio_duration_seconds, is_private, created_at, prompt_id,
     prompts:prompt_id (question_text)`,
  )
  ...
```

And in the map:

```ts
return (data ?? []).map((r) => ({
  id: r.id,
  chapter: r.chapter,
  transcript: r.transcript,
  audio_url: r.audio_url,
  audio_duration_seconds: r.audio_duration_seconds,
  is_private: r.is_private,   // ← NEW
  created_at: r.created_at,
  prompt_id: r.prompt_id,
  question_text:
    (r.prompts as unknown as { question_text: string } | null)?.question_text ?? null,
}));
```

- [ ] **Step 4: TypeScript + tests**

```bash
npx tsc --noEmit
npm test
```

- [ ] **Step 5: Manual verify**

```bash
npm run dev
```

Visit `http://localhost:3000/family?persona=family`. You should see Mom's stories (any you've recorded), with a heart button on each, an "Ask Mom a question" composer at top, and a "Download all stories" link (which 404s for now — Task 14 implements the route). Try clicking the heart — it should toggle.

Switch to `http://localhost:3000/family?persona=family&senior=<dad-id>` to see Dad's view (likely empty since you haven't recorded as Dad).

Stop server.

- [ ] **Step 6: Commit**

```bash
git add src/app/family/family-view-client.tsx src/app/family/page.tsx src/lib/stories.ts
git commit -m "feat(family): family persona view — story feed, hearts, ask form, senior picker"
```

---

## Task 12: Senior persona view (invites + reactions + questions queue)

**Files:**
- Replace: `src/app/family/senior-view-client.tsx`

- [ ] **Step 1: Implement**

```tsx
'use client';

import { useState } from 'react';
import { BigButton, BigCard, BigText } from '@/components/senior-ui';
import { InviteLinkModal } from '@/components/family/InviteLinkModal';
import { partitionFamilyQuestions } from '@/lib/family';
import type { FamilyMember, FamilyQuestionRow } from '@/lib/family';

interface Props {
  seniorUserId: string;
  familyMembers: FamilyMember[];
  familyQuestions: FamilyQuestionRow[];
}

export function SeniorViewClient({
  seniorUserId,
  familyMembers,
  familyQuestions,
}: Props) {
  const [inviteOpen, setInviteOpen] = useState(false);
  const { pending, answered } = partitionFamilyQuestions(familyQuestions);

  // Map family member IDs to display names for the question feed
  const memberById = new Map(familyMembers.map((m) => [m.id, m.display_name]));

  return (
    <main className="min-h-screen p-4 max-w-xl mx-auto flex flex-col gap-6">
      <BigText size="display" as="h1">My family</BigText>

      <section className="flex flex-col gap-3">
        <BigText className="uppercase tracking-wide text-sm opacity-60">
          People who can hear my stories
        </BigText>
        {familyMembers.length === 0 ? (
          <BigCard>
            <BigText>No one has joined yet. Invite someone to get started.</BigText>
          </BigCard>
        ) : (
          familyMembers.map((m) => (
            <BigCard key={m.id} className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-sand flex items-center justify-center text-deep-navy font-semibold">
                {m.display_name[0]?.toUpperCase()}
              </div>
              <div className="flex-1">
                <BigText>{m.display_name}</BigText>
                <p className="text-sm opacity-60">{m.email}</p>
              </div>
            </BigCard>
          ))
        )}
        <BigButton variant="primary" onClick={() => setInviteOpen(true)}>
          Invite a family member
        </BigButton>
      </section>

      {pending.length > 0 && (
        <section className="flex flex-col gap-3">
          <BigText className="uppercase tracking-wide text-sm opacity-60">
            Questions from your family
          </BigText>
          {pending.map((q) => (
            <BigCard key={q.id}>
              <p className="text-sm opacity-70 mb-2">
                {memberById.get(q.asked_by_user_id) ?? 'Family'} asks:
              </p>
              <BigText size="question">{q.question_text}</BigText>
            </BigCard>
          ))}
        </section>
      )}

      {answered.length > 0 && (
        <section className="flex flex-col gap-3">
          <BigText className="uppercase tracking-wide text-sm opacity-60">
            Questions you&apos;ve answered
          </BigText>
          {answered.map((q) => (
            <BigCard key={q.id}>
              <p className="text-sm opacity-70 mb-2">
                {memberById.get(q.asked_by_user_id) ?? 'Family'} asked:
              </p>
              <BigText>{q.question_text}</BigText>
              <p className="text-sm opacity-50 mt-2">✓ Answered</p>
            </BigCard>
          ))}
        </section>
      )}

      {inviteOpen && (
        <InviteLinkModal
          baseUrl={typeof window !== 'undefined' ? window.location.origin : ''}
          onClose={() => setInviteOpen(false)}
        />
      )}
    </main>
  );
}
```

- [ ] **Step 2: TypeScript + tests**

```bash
npx tsc --noEmit
npm test
```

- [ ] **Step 3: Manual verify**

```bash
npm run dev
```

Visit `http://localhost:3000/family` (default persona = senior). Expected:
- Title: "My family"
- "People who can hear my stories" — Sarah listed
- "Invite a family member" button — clicking opens the modal with a fake link
- If you've previously sent a question via the family-persona view, it shows under "Questions from your family"

Stop server.

- [ ] **Step 4: Commit**

```bash
git add src/app/family/senior-view-client.tsx
git commit -m "feat(family): senior persona view — invites + family-questions queue"
```

---

## Task 13: "Questions from family" surface on Today screen

**Files:**
- Modify: `src/app/page.tsx`
- Modify: `src/app/today-client.tsx`

The senior should see family-asked questions on Today, above the current chapter prompt, so they don't have to navigate to /family to find them.

- [ ] **Step 1: Update `src/app/page.tsx`** — load pending family questions and pass them through

```tsx
import { listFamilyQuestionsForSenior, partitionFamilyQuestions } from '@/lib/family';
```

In the page body (after the existing prompts/stories/skips queries), add:

```tsx
const familyQuestions = await listFamilyQuestionsForSenior(SENIOR_ID);
const { pending: pendingFamilyQuestions } = partitionFamilyQuestions(familyQuestions);
```

Pass to `<TodayClient>`:

```tsx
<TodayClient
  prompts={prompts ?? []}
  answeredPromptIds={
    ((stories ?? [])
      .map((s) => s.prompt_id)
      .filter(Boolean)) as string[]
  }
  skips={(skips ?? []).map((s) => ({
    prompt_id: s.prompt_id,
    skipped_at: new Date(s.skipped_at).getTime(),
  }))}
  pendingFamilyQuestions={pendingFamilyQuestions}
/>
```

- [ ] **Step 2: Update `src/app/today-client.tsx`** — add the prop, render the card

Add to imports:

```tsx
import type { FamilyQuestionRow } from '@/lib/family';
```

Add to the `Props` interface:

```ts
interface Props {
  prompts: FullPrompt[];
  answeredPromptIds: string[];
  skips: SkipRow[];
  pendingFamilyQuestions: FamilyQuestionRow[];
}
```

Destructure:

```ts
export function TodayClient({
  prompts,
  answeredPromptIds,
  skips,
  pendingFamilyQuestions,
}: Props) {
```

In the JSX, just inside `<main>` and BEFORE `<ChapterSelector>`, render the family-questions card if any are pending and we're in the browsing phase:

```tsx
{phase.kind === 'browsing' && pendingFamilyQuestions.length > 0 && (
  <BigCard className="bg-sand/40 border border-deep-navy/15">
    <BigText className="uppercase tracking-wide text-sm opacity-60 mb-2">
      From your family
    </BigText>
    <BigText size="question" as="h2">
      {pendingFamilyQuestions[0]?.question_text}
    </BigText>
    {pendingFamilyQuestions.length > 1 && (
      <p className="text-sm opacity-60 mt-2">
        + {pendingFamilyQuestions.length - 1} more — see all in Family.
      </p>
    )}
  </BigCard>
)}
```

(Keep the rest of the file unchanged. Note: answering a family question is not yet wired through the Today flow — the senior tapping it doesn't pre-load the question into the recorder. That's a polish item; for MVP, the card just surfaces the question so they know it exists.)

- [ ] **Step 3: TypeScript + tests**

```bash
npx tsc --noEmit
npm test
```

- [ ] **Step 4: Manual verify**

```bash
npm run dev
```

1. Visit `/family?persona=family`, send a question (e.g., "What was your favorite holiday meal?").
2. Visit `/?persona=senior`. Above the chapter selector, you should see a "From your family" card with that question.

Stop server.

- [ ] **Step 5: Commit**

```bash
git add src/app/page.tsx src/app/today-client.tsx
git commit -m "feat(today): surface pending family questions above chapter prompt"
```

---

## Task 14: ZIP manifest builder (TDD)

**Files:**
- Create: `src/lib/zip/manifest.ts`
- Create: `tests/unit/manifest.test.ts`

The manifest is a plain text summary written to `manifest.txt` in the backup ZIP. We TDD it because the format must be stable for users who might rely on it.

- [ ] **Step 1: Write the failing test — `tests/unit/manifest.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { buildManifest, type ManifestInput } from '@/lib/zip/manifest';

describe('buildManifest', () => {
  it('returns a text manifest with senior name, date, and chapter counts', () => {
    const input: ManifestInput = {
      seniorDisplayName: 'Mom',
      generatedAt: new Date('2026-05-08T12:00:00Z'),
      stories: [
        { chapter: 'early_childhood', transcript: 'a', is_private: false },
        { chapter: 'early_childhood', transcript: 'b', is_private: true  },
        { chapter: 'school_years',    transcript: 'c', is_private: false },
      ],
      photos: [
        { chapter: 'early_childhood', caption: 'p1' },
      ],
    };
    const text = buildManifest(input);
    expect(text).toContain('Mom\'s Memoir');
    expect(text).toContain('2026-05-08');
    // Public counts only — private stories excluded
    expect(text).toContain('Early Childhood: 1 story');
    expect(text).toContain('School Years: 1 story');
    expect(text).toContain('Total: 2 stories, 1 photo');
  });

  it('handles zero stories cleanly', () => {
    const text = buildManifest({
      seniorDisplayName: 'Dad',
      generatedAt: new Date('2026-05-08T12:00:00Z'),
      stories: [],
      photos: [],
    });
    expect(text).toContain('Total: 0 stories, 0 photos');
  });
});
```

- [ ] **Step 2: Run — expect fail**

```bash
npm test -- tests/unit/manifest.test.ts
```

- [ ] **Step 3: Implement — `src/lib/zip/manifest.ts`**

```ts
import { CHAPTERS, type ChapterSlug } from '@/lib/chapters';

export interface ManifestStoryInput {
  chapter: string;
  transcript: string;
  is_private: boolean;
}

export interface ManifestPhotoInput {
  chapter: string;
  caption: string | null;
}

export interface ManifestInput {
  seniorDisplayName: string;
  generatedAt: Date;
  stories: ManifestStoryInput[];
  photos: ManifestPhotoInput[];
}

export function buildManifest(input: ManifestInput): string {
  const publicStories = input.stories.filter((s) => !s.is_private);
  const dateStr = input.generatedAt.toISOString().slice(0, 10);

  const counts = new Map<ChapterSlug, number>();
  for (const s of publicStories) {
    if (CHAPTERS.some((c) => c.slug === s.chapter)) {
      counts.set(
        s.chapter as ChapterSlug,
        (counts.get(s.chapter as ChapterSlug) ?? 0) + 1,
      );
    }
  }

  const photoCount = input.photos.length;
  const lines: string[] = [];
  lines.push(`${input.seniorDisplayName}'s Memoir`);
  lines.push(`Generated ${dateStr}`);
  lines.push('');
  lines.push('Chapters:');
  for (const c of CHAPTERS) {
    const n = counts.get(c.slug) ?? 0;
    if (n > 0) {
      lines.push(`  ${c.label}: ${n} ${n === 1 ? 'story' : 'stories'}`);
    }
  }
  lines.push('');
  const totalStories = publicStories.length;
  lines.push(
    `Total: ${totalStories} ${totalStories === 1 ? 'story' : 'stories'}, ${photoCount} ${photoCount === 1 ? 'photo' : 'photos'}`,
  );
  lines.push('');
  lines.push('Private stories are excluded from this archive.');
  return lines.join('\n');
}
```

- [ ] **Step 4: Run — expect pass**

```bash
npm test -- tests/unit/manifest.test.ts
```

Expected: 2 passed.

- [ ] **Step 5: Commit**

```bash
git add src/lib/zip/manifest.ts tests/unit/manifest.test.ts
git commit -m "feat(zip): manifest text builder with chapter counts (TDD)"
```

---

## Task 15: `/api/family/export-zip` route handler

**Files:**
- Create: `src/app/api/family/export-zip/route.ts`

- [ ] **Step 1: Install archiver**

```bash
cd "C:/Users/elinw/Projects/legacy"
npm install archiver
npm install -D @types/archiver
```

- [ ] **Step 2: Implement**

```ts
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import archiver from 'archiver';
import { Readable } from 'node:stream';
import { ReadableStream as WebReadableStream } from 'node:stream/web';
import { getServiceSupabase } from '@/lib/supabase/server';
import { buildManifest } from '@/lib/zip/manifest';
import { CHAPTERS } from '@/lib/chapters';

export const runtime = 'nodejs';
export const maxDuration = 60;

const FAMILY_ID = '00000000-0000-4000-8000-000000000002';

const Query = z.object({
  seniorId: z.string().uuid(),
});

function slugify(s: string, max = 40): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, max) || 'untitled';
}

export async function GET(req: NextRequest) {
  const parsed = Query.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.format() }, { status: 400 });
  }
  const { seniorId } = parsed.data;

  const sb = getServiceSupabase();

  // Verify family link exists
  const { count: linkCount, error: linkErr } = await sb
    .from('family_links')
    .select('*', { count: 'exact', head: true })
    .eq('family_user_id', FAMILY_ID)
    .eq('senior_user_id', seniorId);
  if (linkErr) return NextResponse.json({ error: linkErr.message }, { status: 500 });
  if (!linkCount || linkCount === 0) {
    return NextResponse.json({ error: 'Not linked to this senior' }, { status: 403 });
  }

  // Fetch senior + stories + photos
  const { data: senior, error: seniorErr } = await sb
    .from('users')
    .select('display_name')
    .eq('id', seniorId)
    .single();
  if (seniorErr || !senior) {
    return NextResponse.json({ error: 'Senior not found' }, { status: 404 });
  }

  const { data: storiesRaw } = await sb
    .from('stories')
    .select(`id, chapter, transcript, audio_url, is_private, created_at,
             prompts:prompt_id (question_text)`)
    .eq('user_id', seniorId)
    .eq('is_private', false)
    .order('chapter')
    .order('created_at');

  const stories = (storiesRaw ?? []).map((r) => ({
    id: r.id,
    chapter: r.chapter,
    transcript: r.transcript,
    audio_url: r.audio_url,
    is_private: r.is_private as boolean,
    created_at: r.created_at,
    question_text:
      (r.prompts as unknown as { question_text: string } | null)?.question_text ?? null,
  }));

  const { data: photos } = await sb
    .from('photos')
    .select('id, chapter, storage_path, caption')
    .eq('uploaded_by_user_id', seniorId);

  // Build the archive
  const archive = archiver('zip', { zlib: { level: 9 } });
  const errors: Error[] = [];
  archive.on('error', (e) => errors.push(e));

  // Manifest first
  const manifest = buildManifest({
    seniorDisplayName: senior.display_name,
    generatedAt: new Date(),
    stories: stories.map((s) => ({
      chapter: s.chapter,
      transcript: s.transcript,
      is_private: s.is_private,
    })),
    photos: (photos ?? []).map((p) => ({
      chapter: p.chapter,
      caption: p.caption,
    })),
  });
  archive.append(manifest, { name: 'manifest.txt' });

  // Stories: transcripts + audio per chapter
  for (const story of stories) {
    const chapter = CHAPTERS.find((c) => c.slug === story.chapter);
    const chapterFolder = chapter?.label.replace(/[^a-zA-Z0-9 &]/g, '') ?? story.chapter;
    const slug = slugify(story.question_text ?? story.transcript.slice(0, 30));
    archive.append(story.transcript, {
      name: `chapters/${chapterFolder}/stories/${slug}.txt`,
    });

    // Download audio from storage and append
    const { data: audioBlob } = await sb.storage.from('audio').download(story.audio_url);
    if (audioBlob) {
      const buffer = Buffer.from(await audioBlob.arrayBuffer());
      archive.append(buffer, {
        name: `chapters/${chapterFolder}/audio/${slug}.webm`,
      });
    }
  }

  // Photos
  for (const photo of photos ?? []) {
    const chapter = CHAPTERS.find((c) => c.slug === photo.chapter);
    const chapterFolder = chapter?.label.replace(/[^a-zA-Z0-9 &]/g, '') ?? photo.chapter;
    const ext = photo.storage_path.split('.').pop() ?? 'jpg';
    const slug = slugify(photo.caption ?? `photo-${photo.id.slice(0, 8)}`);
    const { data: photoBlob } = await sb.storage.from('photos').download(photo.storage_path);
    if (photoBlob) {
      const buffer = Buffer.from(await photoBlob.arrayBuffer());
      archive.append(buffer, {
        name: `chapters/${chapterFolder}/photos/${slug}.${ext}`,
      });
    }
  }

  archive.finalize();

  const stream = WebReadableStream.from(Readable.toWeb(archive) as unknown as AsyncIterable<Uint8Array>);

  return new Response(stream as unknown as ReadableStream, {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${slugify(senior.display_name)}-stories.zip"`,
    },
  });
}
```

- [ ] **Step 3: Verify**

```bash
npx tsc --noEmit
```

If TS complains about `Readable.toWeb`, simplify the streaming wrapper:

```ts
const nodeStream = archive as unknown as Readable;
return new Response(Readable.toWeb(nodeStream) as unknown as ReadableStream, {
  headers: { /* ... */ },
});
```

- [ ] **Step 4: Manual smoke test (optional)**

```bash
npm run dev
# In another shell:
curl -o /tmp/legacy-test.zip "http://localhost:3000/api/family/export-zip?seniorId=00000000-0000-4000-8000-000000000001"
unzip -l /tmp/legacy-test.zip   # Lists manifest.txt + chapters/.../stories/...txt + audio/...webm
```

If you don't have `unzip`, just confirm `/tmp/legacy-test.zip` exists and is non-trivial in size.

Stop server.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/family/export-zip/route.ts package.json package-lock.json
git commit -m "feat(api): /api/family/export-zip — streaming ZIP backup with manifest"
```

---

## Task 16: Restore Playwright + API mock infrastructure

**Files:**
- Create: `playwright.config.ts`
- Create: `tests/e2e/support/api-mocks.ts`
- Modify: `package.json` (add Playwright if not present, devDeps already include it from Phase 1 deferral)

- [ ] **Step 1: Install Playwright**

```bash
cd "C:/Users/elinw/Projects/legacy"
npm install -D @playwright/test
npx playwright install chromium
```

- [ ] **Step 2: Create `playwright.config.ts`**

```ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'retain-on-failure',
    permissions: ['microphone'],
    launchOptions: {
      args: [
        '--use-fake-ui-for-media-stream',
        '--use-fake-device-for-media-stream',
        '--use-file-for-fake-audio-capture=tests/e2e/fixtures/silence.webm',
        '--autoplay-policy=no-user-gesture-required',
      ],
    },
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      // Tell server-side code to use mock AI providers
      LEGACY_AI_MOCK: '1',
    },
  },
});
```

- [ ] **Step 3: Generate the audio fixture (one-time)**

```bash
mkdir -p tests/e2e/fixtures
ffmpeg -y -f lavfi -i "sine=frequency=440:duration=3" -c:a libopus tests/e2e/fixtures/silence.webm
```

- [ ] **Step 4: Add mock layer — `src/lib/ai/whisper.ts` and `src/lib/ai/claude.ts`**

Modify `src/lib/ai/whisper.ts` — at the top of `transcribeAudio`, short-circuit when `LEGACY_AI_MOCK` is set:

```ts
export async function transcribeAudio(
  audio: Blob | Buffer,
  filename = 'audio.webm',
): Promise<WhisperResult> {
  if (process.env.LEGACY_AI_MOCK === '1') {
    return {
      text: 'This is a test recording. My childhood bedroom had pale yellow walls.',
      durationSeconds: 3,
    };
  }
  // ... existing code unchanged below this point
```

Modify `src/lib/ai/claude.ts` — same pattern:

```ts
export async function cleanTranscript(rawText: string): Promise<string> {
  if (process.env.LEGACY_AI_MOCK === '1') {
    return rawText.trim();
  }
  if (!rawText.trim()) return '';
  // ... existing code unchanged below this point
```

- [ ] **Step 5: Add scripts**

In `package.json`:

```json
"test:e2e": "playwright test"
```

(Already exists from Phase 1 — verify and skip if present.)

- [ ] **Step 6: Smoke check the mock layer**

```bash
LEGACY_AI_MOCK=1 npm run dev
# In another shell:
curl -X POST http://localhost:3000/api/transcribe \
  -H "Content-Type: application/json" \
  -d '{"audioPath":"00000000-0000-4000-8000-000000000001/fake.webm"}'
```

Expected: even though the audio path doesn't exist in storage (so the download fails), if you reach the route at all you'd see the 404 "audio not found" error rather than a 502 — which proves `LEGACY_AI_MOCK` is honored. (For the e2e proper, the audio IS uploaded first, so the download succeeds and Whisper is mocked.)

Stop server.

- [ ] **Step 7: Commit**

```bash
git add playwright.config.ts tests/e2e/fixtures/silence.webm src/lib/ai/whisper.ts src/lib/ai/claude.ts package.json package-lock.json
git commit -m "test(e2e): restore Playwright + AI mock layer (LEGACY_AI_MOCK)"
```

---

## Task 17: e2e — record-and-save (with mocks)

**Files:**
- Create: `tests/e2e/record-and-save.spec.ts`

- [ ] **Step 1: Write the test**

```ts
import { test, expect } from '@playwright/test';

test.describe.serial('Phase 1 demo target', () => {
  test('senior records a story end-to-end and finds it in Stories', async ({ page }) => {
    await page.goto('/');

    // Today screen renders the prompt
    await expect(page.getByRole('heading', { level: 2 })).toBeVisible();

    // Record
    await page.getByRole('button', { name: /tap to record/i }).click();
    await expect(page.getByText(/Recording…/i)).toBeVisible();

    // Speak (fake audio plays from fixture)
    await page.waitForTimeout(3000);
    await page.getByRole('button', { name: /tap to stop/i }).click();

    // Spinner → review screen (mock returns instantly)
    await expect(page.getByRole('button', { name: /save story/i })).toBeVisible({
      timeout: 30_000,
    });

    // Save
    await page.getByRole('button', { name: /save story/i }).click();

    // Navigate to Stories — story should appear
    await page.getByRole('link', { name: /stories/i }).first().click();
    const sections = await page.locator('section').count();
    expect(sections).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run**

```bash
npm run test:e2e
```

Expected: 1 test passes (~30 seconds).

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/record-and-save.spec.ts
git commit -m "test(e2e): record-and-save with mocked AI (Phase 1 demo target)"
```

---

## Task 18: e2e — family flow (react + ask)

**Files:**
- Create: `tests/e2e/family-flow.spec.ts`

This test uses the persona query param to toggle between senior and family views and asserts that a heart toggles, a question is sent, and shows up on the senior's Today.

- [ ] **Step 1: Write the test**

```ts
import { test, expect } from '@playwright/test';

test.describe.serial('Family flow', () => {
  test('family member can react to a story and ask a question that surfaces on Today', async ({
    page,
  }) => {
    // Pre-condition: the record-and-save spec has already run, so a story exists.
    // (Tests run serially — Playwright's projects.serial pattern via test.describe.serial.)

    // Switch to family persona
    await page.goto('/family?persona=family');
    await expect(page.getByText(/Mom's stories/i)).toBeVisible();

    // The story's heart starts at 🤍 (count 0); click it to react
    const heartButton = page.getByLabel('Add heart').first();
    await heartButton.click();
    await expect(page.getByLabel('Remove heart').first()).toBeVisible();

    // Ask a question
    const composer = page.getByPlaceholder(/something you've always wanted to know/i);
    await composer.fill('What was your favorite holiday meal as a child?');
    await page.getByRole('button', { name: /^Send$/ }).click();
    await expect(page.getByText(/Sent/i)).toBeVisible();

    // Switch to senior persona and visit Today
    await page.goto('/?persona=senior');
    await expect(page.getByText(/From your family/i)).toBeVisible();
    await expect(
      page.getByText(/What was your favorite holiday meal as a child\?/i),
    ).toBeVisible();
  });
});
```

- [ ] **Step 2: Run all e2e**

```bash
npm run test:e2e
```

Expected: 2 tests pass. The record-and-save runs first (creating a story), then the family-flow can react to that story.

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/family-flow.spec.ts
git commit -m "test(e2e): family flow — heart, ask, surface on Today"
```

---

## Task 19: README update for Phase 2

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Replace the `## Status` section with**

```markdown
## Status

**Phase 2 — Family loop.** ✅ Family members can listen to stories, react with hearts, and ask new questions. Multi-senior support. Streaming ZIP backup. Persona switching via `?persona=family|senior`.

**Phase 1** (foundation + recording loop): complete.
**Phases 3-4** (Memoir + AI polish): scoped in spec, not yet built.
```

- [ ] **Step 2: In the `## Local development` section, append a "Demo flow" section right before "### Tests"**

```markdown
### Demo flow (3 minutes)

1. Visit `/` (you're the senior). Record a story under "Early Childhood".
2. Visit `/?persona=family` (now you're a family member). See the story, click ❤️, send a question via the composer.
3. Visit `/?persona=senior`. The question now appears in a "From your family" card above the chapter prompt.
4. Visit `/family?persona=family`, click "Download all stories as a ZIP" — get a backup with manifest, transcripts, and audio.

To switch between Mom and Dad as the senior whose stories you're viewing (in family persona), use the senior chip selector at the top of `/family?persona=family`.
```

- [ ] **Step 3: Replace the `### Tests` section with**

```markdown
### Tests

```bash
npm test            # vitest unit + lib tests (~40 tests)
npm run test:e2e    # Playwright record-and-save + family-flow (mocked AI, ~60s)
```
```

- [ ] **Step 4: Commit**

```bash
git add README.md
git commit -m "docs: README updates for Phase 2 (family loop, demo flow, e2e)"
```

---

## Self-review

**1. Spec coverage check** (against §9 Phase 2):

| Spec requirement | Tasks |
|---|---|
| `/family` route with persona branching | 10 |
| Family feed of senior's non-private stories | 11 |
| Reactions (hearts) | 4, 6, 7, 11 |
| "Ask a question" composer → `family_questions` | 7, 11 |
| Senior-side "Questions from family" surface on Today | 13 |
| Senior-side "Questions from family" surface on /family (history) | 12 |
| Fake invite link generator | 9, 12 |
| Privacy toggle on stories with confirmation | 5 |
| Multi-senior: family selector when linked to >1 | 2 (seed Dad), 8 (SeniorPicker), 11 (wired) |
| Family backup ZIP `/api/family/export-zip` | 14, 15 |
| Persona middleware fix | 1 |
| Restore Playwright with mocks | 16, 17, 18 |
| README updates | 19 |

All spec items covered.

**2. Placeholder scan:** Every step has complete code. No "TBD", "implement later", or "add error handling".

**3. Type consistency:**
- `Persona` from `lib/persona.ts` (Phase 1) — re-exported with new `getPersona()` server helper ✓
- `LinkedSenior`, `FamilyMember`, `FamilyQuestionRow`, `ReactionRow` from `lib/family.ts` — used in family/page.tsx, both view clients, and tests ✓
- `ReactionLite` from `lib/reactions.ts` — used by toggle helper tests; `ReactionRow` (richer, with timestamp) used by lib/family.ts and family/page.tsx ✓
- `StoryRow` extended with `is_private: boolean` in Task 11 — Phase 1 callers continue to compile (new field) ✓
- `PrivacyToggle` props match `setStoryPrivate` action input shape ✓

**4. Cross-task references:**
- Task 11's family-view-client renders `<AskQuestionForm>` (Task 7), `<ReactionButton>` (Task 6), `<SeniorPicker>` (Task 8) — all created before Task 11 ✓
- Task 12's senior-view renders `<InviteLinkModal>` (Task 9) — Task 9 comes first ✓
- Task 13 references `partitionFamilyQuestions` from `lib/family.ts` (Task 3) ✓
- Task 15's ZIP route uses `buildManifest` from Task 14 ✓
- Task 18 (family-flow e2e) depends on a story existing — covered by serial ordering with Task 17 ✓

No type or reference inconsistencies.

---
