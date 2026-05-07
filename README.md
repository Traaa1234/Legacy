# Legacy

A personal history recorder for seniors. Record short audio answers to chapter-organized prompts; family members listen, react, and submit their own questions; everything renders as a downloadable memoir PDF.

## Status

**Phase 0 — Design.** Spec is complete and approved. Implementation has not started.

- Design spec: [`docs/superpowers/specs/2026-05-07-legacy-mvp-design.md`](docs/superpowers/specs/2026-05-07-legacy-mvp-design.md)
- Visual mockups: `.superpowers/brainstorm/` *(local only, not in git)*

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

*(Will be filled in once Phase 1 implementation begins.)*

## License

TBD.
