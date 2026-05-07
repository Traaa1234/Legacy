# Legacy — Personal History Recorder MVP

**Status:** Design approved, ready for implementation plan
**Date:** 2026-05-07
**Owner:** lw_jen@yahoo.com

## 1. Overview

Legacy is a web application that helps seniors record, organize, and share their life stories. The senior records short audio responses to chapter-organized prompts. Audio is transcribed by Whisper, cleaned by Claude, and saved with optional photos. Family members get a separate dashboard where they can listen, react, and submit personalized questions. The full collection renders as a paginated in-app memoir and can be exported as a PDF.

The MVP focuses on the core recording loop and the family-viewing loop, with multi-senior support and family backups included from the start. Authentication is deferred (URL-based personas for now), with a clear upgrade path to Supabase Auth.

## 2. Goals & Non-Goals

### Goals
- Make recording feel effortless for an older user (large type, large buttons, single primary action per screen).
- Produce a transcript that preserves the senior's voice without requiring manual cleanup.
- Give family members a low-friction way to listen, react, and prompt new stories.
- Render a beautiful in-app memoir that mirrors the downloadable PDF.
- Support a family member linked to multiple seniors (e.g., both parents).
- Let family members back up everything as a ZIP.

### Non-Goals (MVP)
- User signup / real authentication (deferred — see TODO list).
- Real email-based family invites.
- Background / async transcription.
- Multi-emoji reactions (schema supports it; UI is hearts-only).
- Search across stories.
- Story tags or themes beyond the 8 chapters.
- Editing chapter membership of saved stories.
- Multi-language UI (transcripts can be any language Whisper supports; UI is English).
- Analytics or tracking.

## 3. Tech Stack

- **Next.js 14** (App Router), TypeScript strict mode
- **Tailwind CSS** with a custom design-token layer (cream/navy/coral palette)
- **Supabase** — Postgres, Storage, Auth (auth deferred but project provisioned)
- **OpenAI Whisper API** — audio → raw transcript
- **Anthropic Claude API** (Sonnet 4.5) — transcript cleanup, follow-up question generation, prompt-bank generation
- **`@sparticuz/chromium` + `puppeteer-core`** — server-side PDF rendering on Vercel
- **`archiver`** — streaming ZIP generation for family backups
- **`react-hook-form` + `zod`** — forms & validation
- **`react-h5-audio-player`** — accessible audio playback
- Browser **MediaRecorder API** — recording (no library)
- **Vitest** — unit tests; **Playwright** — integration; **Axe-core** — a11y in CI

## 4. Architecture

### Top-level routes

| Route | Persona | Purpose |
|---|---|---|
| `/` | senior | Today screen — chapter selector, today's question, record button |
| `/stories` | senior | List of all recorded stories grouped by chapter |
| `/stories/[id]` | senior | Story detail — transcript, audio, follow-up button, privacy, delete |
| `/family` | senior or family | Senior view (invites + reactions + family questions) OR family view (story feed, react, ask) — branches on persona cookie |
| `/memoir` | senior | In-app paginated reader: cover, TOC, chapters with stories + photos inline |
| `/memoir/print` | (internal) | Server-rendered version of `/memoir` for Puppeteer; guarded by header token |

### API routes (Node runtime)

| Route | Purpose |
|---|---|
| `POST /api/transcribe` | Audio path + prompt id → Whisper → Claude cleanup → final transcript (no DB write) |
| `POST /api/follow-up` | Story id → Claude → 2 suggested follow-up questions |
| `POST /api/export/pdf` | Senior id → Puppeteer → PDF binary |
| `POST /api/family/export-zip` | Senior id → ZIP of stories + audio + photos + manifest |
| `POST /api/admin/seed-prompts` | Chapter + count → Claude → bulk insert into `prompts` (CLI tool, no UI) |
| `POST /api/signed-upload-url` | Returns a Supabase Storage signed URL so browser can upload audio/photos directly |

### Mutation strategy

- Server Actions for all DB mutations (save story, save photo, react, ask question, skip prompt, accept follow-up, toggle privacy, delete story).
- Audio and photo uploads bypass server actions and go directly to Supabase Storage via signed upload URLs (avoids the 4.5MB Vercel function body limit).
- AI work runs in Node-runtime route handlers, not server actions, so we can stream and use the official SDKs.

### Persona switching (no auth yet)

A `persona` cookie holds `'senior'` or `'family'`. Visiting `/family` flips it to family; visiting `/` flips it back. A small dev-only "Switch view" link lives in the footer for testing. Both seeded users (1 senior, 1 family) are pre-configured; the cookie just toggles which one the request acts as.

**TODO (post-MVP):** Replace persona cookie with Supabase Auth (see §10).

## 5. Database Schema

### Tables

#### `users`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `email` | text | |
| `role` | enum `'senior' \| 'family'` | |
| `display_name` | text | Used in UI ("Sarah asked you…") |
| `created_at` | timestamptz | default `now()` |

> `linked_senior_id` from the original spec is replaced by the `family_links` table to support multi-senior families.

#### `family_links` *(new — multi-senior support)*
| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `family_user_id` | uuid FK→users | |
| `senior_user_id` | uuid FK→users | |
| `created_at` | timestamptz | |
| | | UNIQUE(`family_user_id`, `senior_user_id`) |

#### `prompts`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `chapter` | text | One of the 8 chapter slugs |
| `question_text` | text | |
| `order_in_chapter` | int | |
| `source` | enum `'starter' \| 'ai_generated'` | |
| `created_at` | timestamptz | |

#### `prompt_skips`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `prompt_id` | uuid FK→prompts | |
| `user_id` | uuid FK→users | |
| `skipped_at` | timestamptz | |
| | | UNIQUE(`prompt_id`, `user_id`) |

A skipped prompt becomes eligible again 7 days after `skipped_at`.

#### `stories`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid FK→users | The senior |
| `prompt_id` | uuid FK→prompts NULL | |
| `family_question_id` | uuid FK→family_questions NULL | |
| `audio_url` | text | Supabase Storage path |
| `audio_duration_seconds` | int | |
| `transcript_raw` | text | Whisper output, kept for re-cleanup if prompt improves |
| `transcript` | text | Final, may be edited by senior |
| `chapter` | text | Denormalized for grouping |
| `is_private` | boolean | default `false` |
| `created_at` | timestamptz | |

Constraint: exactly one of `prompt_id` or `family_question_id` is non-null (CHECK constraint).

#### `photos`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `uploaded_by_user_id` | uuid FK→users | Senior or family |
| `chapter` | text | Required |
| `story_id` | uuid FK→stories NULL | Optional inline link |
| `storage_path` | text | |
| `caption` | text NULL | |
| `created_at` | timestamptz | |

#### `family_questions`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `asked_by_user_id` | uuid FK→users | A family member |
| `asked_to_user_id` | uuid FK→users | The senior |
| `question_text` | text | |
| `answered_story_id` | uuid FK→stories NULL | |
| `skipped_at` | timestamptz NULL | |
| `created_at` | timestamptz | |

#### `reactions`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `story_id` | uuid FK→stories | |
| `family_user_id` | uuid FK→users | |
| `emoji` | text | MVP: `'❤️'` only; schema supports more |
| `created_at` | timestamptz | |
| | | UNIQUE(`story_id`, `family_user_id`, `emoji`) |

### Chapters (constants in code, not a table)

`lib/chapters.ts`:

```ts
export const CHAPTERS = [
  { slug: 'early_childhood',    label: 'Early Childhood' },
  { slug: 'school_years',       label: 'School Years' },
  { slug: 'young_adulthood',    label: 'Young Adulthood' },
  { slug: 'building_a_family',  label: 'Building a Family' },
  { slug: 'career_and_work',    label: 'Career & Work' },
  { slug: 'reflections_wisdom', label: 'Reflections & Wisdom' },
  { slug: 'memorable_stories',  label: 'Memorable Stories on Your Mind' },
  { slug: 'practical_skills',   label: 'Information, Knowledge & Practical Skills' },
] as const;
```

### Storage buckets (Supabase Storage)

- `audio/` — `{senior_id}/{story_id}.webm` (browser MediaRecorder default codec)
- `photos/` — `{senior_id}/{photo_id}.{ext}`

Both buckets are private; signed URLs minted at read time.

### Row-Level Security

RLS policies are written and committed but disabled via a feature flag for MVP (since auth is not in place). Documented for one-line activation post-MVP.

### "Today's question" resolution

For the senior's selected chapter:

1. Find prompts in chapter, ordered by `order_in_chapter`.
2. Exclude prompts that already have a story (`stories.prompt_id`).
3. Exclude prompts skipped within 7 days (`prompt_skips.skipped_at > now() - interval '7 days'`).
4. Return the first remaining prompt.

If the chapter is exhausted, the home card shows a celebration state and prompts the senior to switch chapters.

Family-submitted questions appear as a **separate "From your family" card above** the today's-question card. They never compete with chapter flow.

## 6. AI Pipelines

### Pipeline 1 — Recording → Final Transcript (synchronous)

```
Browser                          Vercel /api/transcribe              External
─────────────────────────────────────────────────────────────────────────────
[Tap Record] → MediaRecorder.start() (audio/webm, opus, 16kHz mono)
[Tap Stop]   → MediaRecorder.stop() → Blob
              → Request signed upload URL → Server action
              → PUT blob → Supabase Storage (direct)
              → POST /api/transcribe { audio_path, prompt_id }
                                   ├─ Stream audio from Supabase
                                   ├─ Whisper API (verbose_json) ──→ OpenAI
                                   ├─ Claude (cleanup prompt) ────→ Anthropic
                                   ◄── { transcript_raw, transcript }
[Show review screen]
[Tap Save]   → Server action save-story → INSERT INTO stories
```

**Latency budget for a 2-min recording:** ~10–15s total. Covered by a calming "We're writing down your story…" spinner.

**Client-side safety net:** the audio Blob is stored in IndexedDB until the server confirms the story is saved. Cleared on success.

#### Whisper request

```
POST https://api.openai.com/v1/audio/transcriptions
  model: whisper-1
  response_format: verbose_json
  language: 'en' (configurable)
```

#### Claude cleanup prompt

```
SYSTEM:
You are helping a senior preserve their life story. You'll receive the raw
transcript of an audio recording produced by Whisper. Your job:
- Fix punctuation, capitalization, and obvious word errors.
- Remove filler words (um, uh, you know) only when they break flow; keep
  them when they reflect personality.
- Do NOT paraphrase, summarize, or change the meaning.
- Do NOT add information that wasn't in the audio.
- Preserve regional speech, slang, and the speaker's voice.
Return ONLY the cleaned transcript. No commentary.

USER:
<raw whisper transcript>
```

### Pipeline 2 — Follow-up Question (opt-in)

Triggered by "Ask me more about this" on a saved story.

```
POST /api/follow-up { story_id }
  ├─ Load story (transcript + original prompt + chapter)
  ├─ Claude prompt:
  │     SYSTEM: "You are helping a senior document their life. Read this
  │     story they recorded in answer to '<prompt>'. Suggest 2 specific
  │     follow-up questions that draw out warmth and detail. Be gentle,
  │     not intrusive. Output JSON: {questions: [string, string]}"
  │     USER: <transcript>
  └─ Returns {questions: [...]}
```

The senior sees a modal with both questions. Tapping "Add this one" inserts a new row into `prompts` with `chapter = story.chapter`, `source = 'ai_generated'`, and `order_in_chapter = MAX(...)+1`. The follow-up becomes indistinguishable from a starter prompt in the chapter rotation.

### Pipeline 3 — Admin Bank Generation (CLI/curl, no UI in MVP)

```bash
curl -X POST .../api/admin/seed-prompts \
  -d '{"chapter": "school_years", "count": 10}'
```

Claude is given the existing prompts in that chapter and asked to generate `count` new complementary ones. Inserts with `source = 'ai_generated'`.

### Pipeline 4 — PDF Export

```
POST /api/export/pdf { senior_id }
  ├─ Generate one-time bearer token (60s TTL, in-memory cache)
  ├─ puppeteer.launch({ executablePath: chromium.path() })
  ├─ page.goto('/memoir/print', { headers: {'x-pdf-generator-token': token} })
  ├─ page.waitForSelector('[data-memoir-loaded="true"]')
  ├─ page.pdf({ format: 'Letter', printBackground: true, margin: '0.75in' })
  └─ Stream PDF back as application/pdf
```

The `[data-memoir-loaded="true"]` flag is set by the page after photos load, ensuring no missing images.

**Cold-start budget:** ~3–5s first PDF, ~1–2s subsequent. Covered by spinner.

### Pipeline 5 — Family Backup ZIP

```
POST /api/family/export-zip { senior_id }
  ├─ Verify the family member is linked to this senior (family_links lookup)
  ├─ Stream archiver:
  │   - manifest.txt (chapter list, story counts, generation date)
  │   - chapters/{chapter}/stories/{slug}.txt   (transcript)
  │   - chapters/{chapter}/audio/{slug}.webm    (from Storage)
  │   - chapters/{chapter}/photos/{caption-slug}.{ext}
  └─ Returns application/zip, streamed
```

Excludes private stories. Sized for one-shot family request, not bulk cron.

### Error handling

| Failure | Behavior |
|---|---|
| Audio upload fails | Blob persists in IndexedDB; "Try uploading again" button |
| Whisper fails | "We couldn't hear that — please try again" with retry; audio kept |
| Claude cleanup fails after Whisper succeeds | Show raw transcript with note: "We've shown the transcript as-is — you can edit if needed" |
| User edits transcript | Both `transcript_raw` (Whisper) and `transcript` (final, possibly user-edited) are kept |
| Audio > 10 minutes | Warn before sending: "This is a long recording — it may take longer to process. Continue?" |
| Puppeteer fails | "Couldn't make your memoir right now — please try again." In-app Memoir always works as fallback. |
| Senior offline | Disable Record; show "You're offline — try again when connected." Drafts stay in IndexedDB. |

### Privacy & data hygiene

- Audio retained indefinitely (the senior may relisten years later).
- Whisper called with default API tier (no audio retention by OpenAI).
- Claude calls are stateless; no persistent cross-call identity.
- `transcript_raw` allows re-running cleanup if we improve the prompt later.
- No analytics or tracking in MVP.

## 7. UI / Design System

### Color palette

| Token | Hex | Use |
|---|---|---|
| `cream` | `#FAF7F2` | App background. Warm, low glare. |
| `deep-navy` | `#2C3E5C` | Body text. ~12:1 contrast on cream. |
| `soft-coral` | `#E07856` | Primary action color (Record button, primary CTAs). |
| `pure-white` | `#FFFFFF` | Card surface. Lifts content from cream. |
| `sand` | `#E7DCC9` | Borders, dividers, transcript box background. |

### Typography

- `font-serif` = Lora — used for display headings only (memoir cover, chapter titles).
- `font-sans` = Inter — used for everything else.
- Tabular numerals enabled for the recording timer.

### Sizing rules (enforced by `senior-ui/` primitives)

- Body text: 18px minimum, 24px+ for primary content (questions, transcripts).
- Buttons: 60px minimum height, 16px+ inner padding, 14px corner radius.
- Touch targets: 60×60px minimum.
- Line length: 60–70 characters max on body text.
- Whitespace: 24px minimum between distinct sections.
- No hover-only affordances; all interactions revealed at rest.
- Destructive actions (delete, discard) require explicit text confirmation.

### Bottom navigation

Four tabs, no hamburger menu:

| Icon | Label | Route |
|---|---|---|
| 🏠 | Today | `/` |
| 📖 | Stories | `/stories` |
| 👪 | Family | `/family` |
| 📕 | Memoir | `/memoir` |

Active tab uses the soft-coral color; inactive uses deep-navy.

### Today screen states

1. **Idle** — chapter strip + question card + Record button + "Skip for now"
2. **Recording** — pulsing coral Stop button + tabular timer
3. **Processing** — calming "We're writing down your story…" spinner
4. **Reviewing** — editable transcript box + Save story / Re-record

The chapter selector is **always visible** at the top of the Today screen.

## 8. Component Organization

```
src/
├── app/
│   ├── layout.tsx                  ← persona detection, theme provider
│   ├── (senior)/
│   │   ├── page.tsx                ← Today
│   │   ├── stories/page.tsx
│   │   ├── stories/[id]/page.tsx
│   │   ├── family/page.tsx         ← branches on persona cookie
│   │   ├── memoir/page.tsx
│   │   └── memoir/print/page.tsx
│   └── api/
│       ├── transcribe/route.ts
│       ├── follow-up/route.ts
│       ├── export/pdf/route.ts
│       ├── family/export-zip/route.ts
│       ├── admin/seed-prompts/route.ts
│       └── signed-upload-url/route.ts
├── components/
│   ├── senior-ui/                  ← BigButton, BigCard, BigText (design tokens)
│   ├── recorder/                   ← RecorderButton, TranscriptReview, audio state machine
│   ├── chapter/                    ← ChapterSelector, ChapterHeader
│   ├── family/                     ← ReactionButton, AskQuestionForm, FamilyList, SeniorPicker
│   └── memoir/                     ← MemoirCover, MemoirChapter, MemoirStory, MemoirPhoto
├── lib/
│   ├── supabase/                   ← client + server clients, signed-url helpers
│   ├── ai/                         ← whisper.ts, claude.ts (cleanup, follow-up, seed prompts)
│   ├── pdf/                        ← puppeteer launcher
│   ├── zip/                        ← family backup archiver
│   ├── chapters.ts
│   └── persona.ts                  ← cookie-based persona resolution
├── seeds/
│   ├── prompts.ts                  ← 50 starter questions across 8 chapters
│   └── seed.ts                     ← seeds users + family_links + prompts on first run
└── tests/
    ├── unit/
    └── e2e/
```

## 9. Build Phasing

### Phase 1 — Foundation & core recording loop
- Next.js 14 scaffold, Tailwind, design tokens, `senior-ui/` primitives.
- Supabase project, schema migrations, seed script (1 senior, 1 family, 1 family_link, 50 prompts).
- Persona cookie + middleware.
- Today screen: chapter selector, question card, Record button, MediaRecorder integration, signed-upload flow.
- `/api/transcribe` (Whisper → Claude cleanup) with calming spinner.
- Review screen: editable transcript + Save / Re-record.
- Stories list + detail view (no follow-up button yet).
- IndexedDB safety net for unsaved audio.

**Demo target:** Senior can record a story end-to-end and find it in Stories.

### Phase 2 — Family loop *(matches user's stated MVP priority)*
- `/family` route with persona branching.
- Family feed of senior's non-private stories.
- Reactions (hearts only).
- "Ask a question" composer → `family_questions`.
- Senior-side "Questions from family" surface on Today.
- Fake invite link generator (no real email).
- Privacy toggle on stories with confirmation dialog.
- **Multi-senior:** family persona shows a senior selector when linked to >1 senior.
- **Backup:** `/api/family/export-zip` and "Download all stories" button.

### Phase 3 — Memoir & photos
- Photo upload (senior + family) with chapter + optional story link.
- Photo album view inside Memoir.
- `/memoir` in-app reader (cover, TOC, chapters with stories + photos inline).
- `/memoir/print` route + Puppeteer + `/api/export/pdf`.
- Download flow with spinner.

### Phase 4 — AI polish
- "Ask me more about this" → `/api/follow-up` → 2-question modal.
- Admin CLI: `/api/admin/seed-prompts` for bank expansion via Claude.
- Skip recycle (no UI work — just the eligibility query already in the prompt resolver).

## 10. Post-MVP TODOs

| Area | Upgrade |
|---|---|
| **Auth** | Replace persona cookie with Supabase Auth. Pre-seeded users become real accounts. Enable RLS policies (already drafted). |
| **Email invites** | Real email via Supabase Auth invite flow or Resend. Replaces fake `/family?token=…` link. |
| **Async transcription** | Move to background pipeline: `processing_status` column on `stories`, Supabase Realtime for live updates, optional worker. |
| **Multi-emoji reactions** | Schema already supports it; add a picker UI. |
| **Streaming Whisper** | If Whisper gains streaming, swap into the existing pipeline. |
| **Photo OCR** | Detect handwriting on letters/postcards and offer to insert as a transcript. |
| **Mobile native** | Wrap as Capacitor or Expo Router shell for App Store presence. |
| **Voice-clone narration** | Optionally read transcripts back in the senior's own voice. Requires explicit consent and ethical guardrails. |

## 11. Testing Strategy

- **Unit (Vitest):** `lib/` modules — chapter resolution, prompt selection algorithm, persona detection, signed-URL helpers.
- **Integration (Playwright):** Full record-and-save flow with Whisper/Claude mocked at the network layer.
- **A11y (Axe-core):** Run in CI on every PR; manual screen-reader pass per page before release.
- **Senior UX checklist (manual):** font sizes, contrast, button sizes, no hover-only affordances. Backed by `eslint-plugin-tailwindcss` rules to lint design-token violations.
- **Sample data:** A fixtures script creates 8 stories across all chapters (one per chapter), 5 photos, 3 reactions, 2 family questions for demo and visual regression tests.

## 12. Out of Scope

Explicitly not in MVP, listed so they aren't built by accident:

- Search across stories.
- Story tags or themes beyond chapters.
- Re-assigning the chapter of a saved story.
- Comments or threads beyond simple reactions.
- Multi-language UI.
- Analytics, telemetry, or event tracking.
- Real email invites.
- Authentication.
- Async transcription.

## 13. Open Items

None. All design decisions have been confirmed by the user during the brainstorming session.
