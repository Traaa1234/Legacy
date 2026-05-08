# Legacy

A personal history recorder for seniors. Record short audio answers to chapter-organized prompts; family members listen, react, and submit their own questions; everything renders as a downloadable memoir PDF.

## Status

**Phase 3 — Memoir + Photos + PDF.** ✅ The senior can browse a paginated in-app memoir, add photos (or have family add them), and download the whole thing as a PDF via Puppeteer + Chromium.

**Phase 1** (foundation + recording loop): complete.
**Phase 2** (family loop): complete.
**Phase 3** (this): complete.
**Phase 4** (AI polish — opt-in follow-up questions, admin prompt-bank generation): scoped in spec, not yet built.

## Tech stack

- Next.js 14 (App Router) + TypeScript + Tailwind
- Supabase (Postgres + Storage; auth deferred)
- OpenAI Whisper (audio → text)
- Anthropic Claude (transcript cleanup, follow-up question generation)
- Puppeteer + `@sparticuz/chromium` for server-side PDF rendering

## Build phases

1. **Foundation & core recording loop** — scaffold, schema, Today screen, Whisper + Claude pipeline, Stories list.
2. **Family loop** — `/family` route, reactions, ask-a-question, multi-senior, backup ZIP.
3. **Memoir & photos** — photo uploads, in-app memoir reader, PDF export.
4. **AI polish** — opt-in follow-up questions, admin bank-generation tool.

See the design spec for full details on each phase.

## Local development

### Prerequisites
- Node 20+ (use `.nvmrc`)
- A Supabase project (cloud or local) — see Setup below
- ffmpeg (only required if you re-add the e2e tests later)
- An OpenAI account with billing credits (Whisper API)
- An Anthropic account with billing credits (Claude API)

### Setup

1. `npm install`
2. Create a Supabase project at https://supabase.com (free tier works fine).
3. Generate a personal access token at https://supabase.com/dashboard/account/tokens.
4. Copy `.env.example` to `.env.local` and fill in:
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (from Project Settings → API)
   - `SUPABASE_ACCESS_TOKEN` (the personal access token from step 3)
   - `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`
   - `PDF_GENERATOR_TOKEN=local-dev-token` (any string — only used in Phase 3)
5. Link the local CLI to your cloud project:
   ```bash
   npx supabase link --project-ref <your-project-ref>
   ```
6. Apply migrations:
   ```bash
   npx supabase db push
   ```
7. Seed the database (1 senior, 1 family, 1 family link, 50 prompts):
   ```bash
   npm run seed
   ```
8. Run the dev server:
   ```bash
   npm run dev
   ```
   App at http://localhost:3000.

### Demo flow (5 minutes)

1. Visit `/` (you're the senior). Record a story under "Early Childhood".
2. Tap Memoir → see cover + TOC + your story.
3. Tap "📷 Add a photo" — pick an image, link it to your story, save. The photo appears inline in the memoir.
4. Tap "⬇ Download as PDF" — wait ~10s for Puppeteer to render. PDF downloads with cover, TOC, your story, and the photo.
5. Visit `/?persona=family` (now you're Sarah). On `/family`, click "📷 Add a photo" — upload a photo for Mom (you can link to her story or just chapter-tag it).
6. Visit `/?persona=senior` then `/memoir` — Sarah's photo now shows in the memoir.

### Tests

```bash
npm test            # vitest unit + lib tests (~47 tests)
npm run test:e2e    # Playwright record-and-save + family-flow (mocked AI, ~30s)
```

### Commands
- `npm run dev` — Next dev server
- `npm run build` — production build
- `npm run seed` — reseed DB (idempotent)
- `npm test` — vitest

### Notable caveats

- **Phase 1 uses persona cookies, not real auth.** The hardcoded senior ID is `00000000-0000-4000-8000-000000000001` and family ID is `00000000-0000-4000-8000-000000000002`. Visiting `/family` flips the cookie to family persona; visiting `/` flips it back. Real Supabase Auth lands in a post-MVP follow-up.
- **`/family` and `/memoir` routes are stubbed** — they're scoped for Phase 2 and Phase 3 respectively. The bottom-nav tabs are visible but disabled.
- **API costs:** each Whisper call is ~$0.006/min; each Claude cleanup is ~$0.005. ~$5 of OpenAI credit covers ~14 hours of recording.
- **Next 16 deprecation:** the `src/middleware.ts` file uses Next's middleware convention which is deprecated in favor of `src/proxy.ts`. Currently still works; rename in a follow-up.
- **E2E tests use mocked Whisper + Claude** (set `LEGACY_AI_MOCK=1` server-side). They use real Supabase (your cloud DB), so each run leaves a story behind. Re-seed when the DB gets cluttered: `npm run seed`.
- **Browser persona is sticky.** The `legacy_persona` cookie persists across pages. Use `?persona=senior` or `?persona=family` to switch.
- **PDF generation runs server-side via Puppeteer + `@sparticuz/chromium`.** First run on a cold Vercel function is ~5-10s; subsequent runs are ~2-3s. The Chromium binary is included in the deployment.
- **Photos are JPEG/PNG only**, max 8 MB. Stored in the private `photos` Supabase Storage bucket. Signed URLs are minted server-side for both the in-app memoir and the print route.
- **`/memoir/print` is internal** — guarded by a single-use 60-second `x-pdf-generator-token` header. Direct browser visits 404.

## License

TBD.
