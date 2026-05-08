# Legacy

A personal history recorder for seniors. Record short audio answers to chapter-organized prompts; family members listen, react, and submit their own questions; everything renders as a downloadable memoir PDF.

## Status

**Phase 1 — Foundation & core recording loop.** ✅ Demo target hit: senior records a story end-to-end and finds it in Stories.

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

### Tests
```bash
npm test            # vitest unit + lib tests (29 tests)
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

## License

TBD.
