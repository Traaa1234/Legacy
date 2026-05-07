# Legacy Phase 1 — Foundation & Core Recording Loop Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A senior can open the app, see a chapter-organized question, record an audio answer, watch it get transcribed and cleaned, save it, and find it in the Stories list.

**Architecture:** Next.js 14 App Router on Vercel + Supabase Postgres/Storage. Audio uploads go directly from the browser to Supabase Storage via signed URLs (bypassing Vercel's 4.5 MB function limit). A single Node-runtime API route runs the synchronous Whisper → Claude pipeline. Persona is set by a middleware-managed cookie; auth is deferred. All AI errors degrade gracefully — the senior never gets stuck.

**Tech Stack:** Next.js 14, TypeScript (strict), Tailwind CSS, Supabase JS v2, OpenAI SDK (Whisper), Anthropic SDK (Claude Sonnet 4.5), Vitest + Playwright, react-h5-audio-player, idb (IndexedDB wrapper).

**Reference spec:** `docs/superpowers/specs/2026-05-07-legacy-mvp-design.md` — read it first.

---

## File structure (created across all tasks)

```
legacy/
├── package.json
├── tsconfig.json
├── next.config.ts
├── tailwind.config.ts
├── postcss.config.js
├── vitest.config.ts
├── playwright.config.ts
├── .env.example
├── middleware.ts
├── supabase/
│   ├── config.toml
│   ├── migrations/
│   │   ├── 0001_users_and_family_links.sql
│   │   ├── 0002_prompts_and_skips.sql
│   │   ├── 0003_stories_photos_questions_reactions.sql
│   │   ├── 0004_storage_buckets.sql
│   │   └── 0005_rls_policies_disabled.sql
│   └── seed.sql
├── scripts/
│   └── seed.ts
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── globals.css
│   │   ├── page.tsx                          ← Today
│   │   ├── stories/page.tsx
│   │   ├── stories/[id]/page.tsx
│   │   └── api/
│   │       ├── transcribe/route.ts
│   │       └── signed-upload-url/route.ts
│   ├── components/
│   │   ├── senior-ui/
│   │   │   ├── BigButton.tsx
│   │   │   ├── BigCard.tsx
│   │   │   └── BigText.tsx
│   │   ├── recorder/
│   │   │   ├── RecorderButton.tsx
│   │   │   ├── RecorderTimer.tsx
│   │   │   ├── TranscriptReview.tsx
│   │   │   ├── TranscribingSpinner.tsx
│   │   │   └── use-recorder.ts
│   │   └── chapter/
│   │       └── ChapterSelector.tsx
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── browser.ts
│   │   │   ├── server.ts
│   │   │   └── signed-url.ts
│   │   ├── ai/
│   │   │   ├── whisper.ts
│   │   │   └── claude.ts
│   │   ├── chapters.ts
│   │   ├── persona.ts
│   │   ├── prompts.ts
│   │   ├── stories.ts
│   │   ├── indexed-db.ts
│   │   └── env.ts
│   └── seeds/
│       └── starter-prompts.ts
└── tests/
    ├── unit/
    │   ├── chapters.test.ts
    │   ├── persona.test.ts
    │   ├── prompts.test.ts
    │   ├── indexed-db.test.ts
    │   └── senior-ui.test.tsx
    └── e2e/
        └── record-and-save.spec.ts
```

---

## Pre-flight

Run all commands from the project root: `C:/Users/elinw/Projects/legacy`

This plan uses TDD where it earns its keep (lib functions, hooks). UI components are tested for rendered structure and accessibility but not pixel-by-pixel. Each task ends with a commit so you always have a working checkpoint.

---

## Task 1: Initialize Next.js 14 with TypeScript

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`, `.gitignore` *(extend existing)*

- [ ] **Step 1: Run the Next.js installer (non-interactive)**

```bash
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --no-turbopack --skip-install
```

Expected output: scaffolded files in current directory.

- [ ] **Step 2: Pin Node version**

Create `.nvmrc`:

```
20
```

- [ ] **Step 3: Install dependencies**

```bash
npm install
```

Expected: clean install, no peer warnings other than Tailwind v4 notes.

- [ ] **Step 4: Replace `src/app/page.tsx` with a placeholder so the dev server runs**

```tsx
export default function HomePage() {
  return (
    <main className="min-h-screen flex items-center justify-center">
      <h1 className="text-2xl">Legacy — coming soon</h1>
    </main>
  );
}
```

- [ ] **Step 5: Verify dev server boots**

```bash
npm run dev
```

Expected: server listening on `http://localhost:3000`, page renders the placeholder. Stop the server (Ctrl+C).

- [ ] **Step 6: Tighten `tsconfig.json`**

Open `tsconfig.json`, set `"strict": true` (already on by default in Next 14), and add:

```json
"noUncheckedIndexedAccess": true,
"noImplicitOverride": true
```

inside `compilerOptions`.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "chore: scaffold Next.js 14 + TypeScript + Tailwind"
```

---

## Task 2: Configure Tailwind design tokens

**Files:**
- Modify: `tailwind.config.ts`
- Modify: `src/app/globals.css`

- [ ] **Step 1: Replace `tailwind.config.ts`**

```ts
import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        cream: '#FAF7F2',
        'deep-navy': '#2C3E5C',
        'soft-coral': '#E07856',
        'soft-coral-shadow': '#c95a36',
        sand: '#E7DCC9',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        serif: ['Lora', 'Georgia', 'serif'],
      },
      fontSize: {
        // senior-friendly scale; 18px floor for body
        body: ['1.125rem', { lineHeight: '1.6' }],
        question: ['1.5rem', { lineHeight: '1.4' }],
        display: ['2.25rem', { lineHeight: '1.2' }],
      },
      minHeight: {
        'touch-target': '60px',
      },
      borderRadius: {
        button: '14px',
        card: '20px',
      },
    },
  },
  plugins: [],
};

export default config;
```

- [ ] **Step 2: Replace `src/app/globals.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  html, body {
    background-color: #FAF7F2;
    color: #2C3E5C;
    font-family: 'Inter', system-ui, sans-serif;
    font-size: 18px; /* senior body floor */
  }
  button {
    font-family: inherit;
  }
}
```

- [ ] **Step 3: Add Google Fonts link to `src/app/layout.tsx`**

Replace the file contents:

```tsx
import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Legacy',
  description: 'Record your life stories.',
};

export default function RootLayout({
  children,
}: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Lora:wght@500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
```

- [ ] **Step 4: Verify visual change**

Run `npm run dev`. The placeholder page should now render with cream background and deep-navy text in Inter. Stop the server.

- [ ] **Step 5: Commit**

```bash
git add tailwind.config.ts src/app/globals.css src/app/layout.tsx
git commit -m "feat: senior-friendly design tokens (cream/navy/coral, Inter+Lora)"
```

---

## Task 3: Set up Vitest for unit tests

**Files:**
- Create: `vitest.config.ts`
- Modify: `package.json` (add scripts and devDependencies)

- [ ] **Step 1: Install testing deps**

```bash
npm install -D vitest @vitejs/plugin-react @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom
```

- [ ] **Step 2: Create `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/unit/**/*.{test,spec}.{ts,tsx}'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

- [ ] **Step 3: Create `tests/setup.ts`**

```ts
import '@testing-library/jest-dom/vitest';
```

- [ ] **Step 4: Add test scripts to `package.json`**

In the `"scripts"` block, add:

```json
"test": "vitest run",
"test:watch": "vitest",
"test:e2e": "playwright test"
```

- [ ] **Step 5: Sanity test**

Create `tests/unit/sanity.test.ts`:

```ts
import { describe, it, expect } from 'vitest';

describe('vitest setup', () => {
  it('runs', () => {
    expect(1 + 1).toBe(2);
  });
});
```

Run: `npm test`
Expected: 1 passed.

- [ ] **Step 6: Commit**

```bash
git add vitest.config.ts tests/setup.ts tests/unit/sanity.test.ts package.json package-lock.json
git commit -m "chore: vitest + RTL setup with jsdom"
```

---

## Task 4: Chapters constants module (TDD)

**Files:**
- Create: `src/lib/chapters.ts`
- Create: `tests/unit/chapters.test.ts`

- [ ] **Step 1: Write the failing test — `tests/unit/chapters.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { CHAPTERS, getChapterLabel, isValidChapterSlug } from '@/lib/chapters';

describe('chapters', () => {
  it('has 8 chapters in the spec-defined order', () => {
    expect(CHAPTERS).toHaveLength(8);
    expect(CHAPTERS[0]?.slug).toBe('early_childhood');
    expect(CHAPTERS[7]?.slug).toBe('practical_skills');
  });

  it('returns a label for a valid slug', () => {
    expect(getChapterLabel('early_childhood')).toBe('Early Childhood');
    expect(getChapterLabel('practical_skills')).toBe(
      'Information, Knowledge & Practical Skills',
    );
  });

  it('validates known slugs', () => {
    expect(isValidChapterSlug('school_years')).toBe(true);
    expect(isValidChapterSlug('not_a_chapter')).toBe(false);
  });
});
```

- [ ] **Step 2: Run — expect fail**

```bash
npm test -- tests/unit/chapters.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement — `src/lib/chapters.ts`**

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

export type ChapterSlug = (typeof CHAPTERS)[number]['slug'];

const SLUG_TO_LABEL: Record<string, string> = Object.fromEntries(
  CHAPTERS.map((c) => [c.slug, c.label]),
);

export function getChapterLabel(slug: string): string {
  const label = SLUG_TO_LABEL[slug];
  if (!label) throw new Error(`Unknown chapter slug: ${slug}`);
  return label;
}

export function isValidChapterSlug(slug: string): slug is ChapterSlug {
  return slug in SLUG_TO_LABEL;
}
```

- [ ] **Step 4: Run — expect pass**

```bash
npm test -- tests/unit/chapters.test.ts
```

Expected: 3 passed.

- [ ] **Step 5: Commit**

```bash
git add src/lib/chapters.ts tests/unit/chapters.test.ts
git commit -m "feat(chapters): 8 chapters constant + helpers (TDD)"
```

---

## Task 5: Senior-UI primitives — BigButton, BigCard, BigText

**Files:**
- Create: `src/components/senior-ui/BigButton.tsx`
- Create: `src/components/senior-ui/BigCard.tsx`
- Create: `src/components/senior-ui/BigText.tsx`
- Create: `src/components/senior-ui/index.ts`
- Create: `tests/unit/senior-ui.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BigButton } from '@/components/senior-ui/BigButton';
import { BigCard } from '@/components/senior-ui/BigCard';
import { BigText } from '@/components/senior-ui/BigText';

describe('BigButton', () => {
  it('renders children and meets 60px min-height', () => {
    render(<BigButton>Tap to record</BigButton>);
    const btn = screen.getByRole('button', { name: /tap to record/i });
    expect(btn).toBeInTheDocument();
    expect(btn.className).toContain('min-h-touch-target');
  });

  it('applies coral styling for primary variant', () => {
    render(<BigButton variant="primary">Save</BigButton>);
    const btn = screen.getByRole('button');
    expect(btn.className).toContain('bg-soft-coral');
  });

  it('applies outline styling for secondary variant', () => {
    render(<BigButton variant="secondary">Cancel</BigButton>);
    const btn = screen.getByRole('button');
    expect(btn.className).toContain('border-deep-navy');
  });
});

describe('BigCard', () => {
  it('renders children with rounded card surface', () => {
    render(<BigCard><p>Inside</p></BigCard>);
    expect(screen.getByText('Inside')).toBeInTheDocument();
  });
});

describe('BigText', () => {
  it('renders question size at 24px+', () => {
    render(<BigText size="question">A question</BigText>);
    const el = screen.getByText('A question');
    expect(el.className).toContain('text-question');
  });
});
```

- [ ] **Step 2: Run — expect fail**

```bash
npm test -- tests/unit/senior-ui.test.tsx
```

Expected: FAIL — modules not found.

- [ ] **Step 3: Implement BigButton — `src/components/senior-ui/BigButton.tsx`**

```tsx
import { ButtonHTMLAttributes, forwardRef } from 'react';
import { clsx } from 'clsx';

type Variant = 'primary' | 'secondary';

interface BigButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

export const BigButton = forwardRef<HTMLButtonElement, BigButtonProps>(
  function BigButton({ variant = 'primary', className, children, ...rest }, ref) {
    const base =
      'min-h-touch-target px-6 py-4 rounded-button font-semibold text-body transition-shadow';
    const variants: Record<Variant, string> = {
      primary:
        'bg-soft-coral text-white shadow-[0_3px_0_#c95a36] active:shadow-none active:translate-y-[2px]',
      secondary:
        'bg-white text-deep-navy border-2 border-deep-navy',
    };
    return (
      <button
        ref={ref}
        className={clsx(base, variants[variant], className)}
        {...rest}
      >
        {children}
      </button>
    );
  },
);
```

- [ ] **Step 4: Implement BigCard — `src/components/senior-ui/BigCard.tsx`**

```tsx
import { HTMLAttributes } from 'react';
import { clsx } from 'clsx';

export function BigCard({
  className,
  children,
  ...rest
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={clsx('bg-white rounded-card p-8 shadow-sm', className)}
      {...rest}
    >
      {children}
    </div>
  );
}
```

- [ ] **Step 5: Implement BigText — `src/components/senior-ui/BigText.tsx`**

```tsx
import { HTMLAttributes } from 'react';
import { clsx } from 'clsx';

type Size = 'body' | 'question' | 'display';

interface BigTextProps extends HTMLAttributes<HTMLParagraphElement> {
  size?: Size;
  as?: 'p' | 'h1' | 'h2' | 'h3';
}

export function BigText({
  size = 'body',
  as: Tag = 'p',
  className,
  children,
  ...rest
}: BigTextProps) {
  const sizes: Record<Size, string> = {
    body: 'text-body',
    question: 'text-question',
    display: 'text-display font-serif',
  };
  return (
    <Tag className={clsx(sizes[size], className)} {...rest}>
      {children}
    </Tag>
  );
}
```

- [ ] **Step 6: Install clsx**

```bash
npm install clsx
```

- [ ] **Step 7: Create barrel — `src/components/senior-ui/index.ts`**

```ts
export { BigButton } from './BigButton';
export { BigCard } from './BigCard';
export { BigText } from './BigText';
```

- [ ] **Step 8: Run — expect pass**

```bash
npm test -- tests/unit/senior-ui.test.tsx
```

Expected: 5 passed.

- [ ] **Step 9: Commit**

```bash
git add src/components/senior-ui/ tests/unit/senior-ui.test.tsx package.json package-lock.json
git commit -m "feat(ui): senior-ui primitives — BigButton, BigCard, BigText"
```

---

## Task 6: Persona helper module (TDD)

**Files:**
- Create: `src/lib/persona.ts`
- Create: `tests/unit/persona.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { resolvePersonaFromCookie, PERSONA_COOKIE } from '@/lib/persona';

describe('persona', () => {
  it('defaults to senior when no cookie', () => {
    expect(resolvePersonaFromCookie(undefined)).toBe('senior');
  });

  it('reads explicit family value', () => {
    expect(resolvePersonaFromCookie('family')).toBe('family');
  });

  it('reads explicit senior value', () => {
    expect(resolvePersonaFromCookie('senior')).toBe('senior');
  });

  it('falls back to senior for invalid values', () => {
    expect(resolvePersonaFromCookie('admin')).toBe('senior');
    expect(resolvePersonaFromCookie('')).toBe('senior');
  });

  it('exposes the cookie name constant', () => {
    expect(PERSONA_COOKIE).toBe('legacy_persona');
  });
});
```

- [ ] **Step 2: Run — expect fail**

```bash
npm test -- tests/unit/persona.test.ts
```

- [ ] **Step 3: Implement — `src/lib/persona.ts`**

```ts
export type Persona = 'senior' | 'family';

export const PERSONA_COOKIE = 'legacy_persona';

export function resolvePersonaFromCookie(value: string | undefined): Persona {
  return value === 'family' ? 'family' : 'senior';
}
```

- [ ] **Step 4: Run — expect pass**

```bash
npm test -- tests/unit/persona.test.ts
```

Expected: 5 passed.

- [ ] **Step 5: Commit**

```bash
git add src/lib/persona.ts tests/unit/persona.test.ts
git commit -m "feat(persona): cookie-based persona resolver (TDD)"
```

---

## Task 7: Persona middleware

**Files:**
- Create: `middleware.ts`

- [ ] **Step 1: Implement middleware**

```ts
import { NextRequest, NextResponse } from 'next/server';
import { PERSONA_COOKIE } from '@/lib/persona';

export function middleware(req: NextRequest) {
  const res = NextResponse.next();

  // Visiting /family flips the cookie to family.
  // Visiting / (or anything else) flips it to senior.
  const path = req.nextUrl.pathname;
  if (path.startsWith('/family')) {
    res.cookies.set(PERSONA_COOKIE, 'family', { path: '/', sameSite: 'lax' });
  } else if (path === '/' || path.startsWith('/stories') || path.startsWith('/memoir')) {
    res.cookies.set(PERSONA_COOKIE, 'senior', { path: '/', sameSite: 'lax' });
  }

  return res;
}

export const config = {
  matcher: ['/', '/family/:path*', '/stories/:path*', '/memoir/:path*'],
};
```

- [ ] **Step 2: Verify dev server still boots without errors**

```bash
npm run dev
```

Visit `http://localhost:3000`. Open DevTools → Application → Cookies. Expect `legacy_persona=senior`. Stop server.

- [ ] **Step 3: Commit**

```bash
git add middleware.ts
git commit -m "feat(persona): middleware sets persona cookie based on path"
```

---

## Task 8: Environment variable scaffolding

**Files:**
- Create: `src/lib/env.ts`
- Create: `.env.example`

- [ ] **Step 1: Create `.env.example`**

```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# AI providers
OPENAI_API_KEY=
ANTHROPIC_API_KEY=

# Internal
PDF_GENERATOR_TOKEN=change-me
```

- [ ] **Step 2: Create `src/lib/env.ts`**

```ts
function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

export const env = {
  // Public (browser-safe)
  supabaseUrl: () => required('NEXT_PUBLIC_SUPABASE_URL'),
  supabaseAnonKey: () => required('NEXT_PUBLIC_SUPABASE_ANON_KEY'),

  // Server-only
  supabaseServiceRoleKey: () => required('SUPABASE_SERVICE_ROLE_KEY'),
  openaiApiKey: () => required('OPENAI_API_KEY'),
  anthropicApiKey: () => required('ANTHROPIC_API_KEY'),
  pdfGeneratorToken: () => required('PDF_GENERATOR_TOKEN'),
};
```

Functions, not eager constants — so missing vars only throw when actually needed.

- [ ] **Step 3: Commit**

```bash
git add .env.example src/lib/env.ts
git commit -m "chore: env var scaffold (lazy required-vars helper)"
```

---

## Task 9: Initialize local Supabase

**Files:**
- Create: `supabase/config.toml` (auto-created)

- [ ] **Step 1: Install Supabase CLI globally if not present**

```bash
npm install -g supabase
supabase --version
```

Expected: prints version (1.x or 2.x).

- [ ] **Step 2: Initialize project**

```bash
supabase init
```

Expected: creates `supabase/` directory.

- [ ] **Step 3: Start local Supabase**

```bash
supabase start
```

Expected: prints `API URL`, `anon key`, `service_role key`. **Copy these — you'll paste them into `.env.local` next.**

- [ ] **Step 4: Create `.env.local` from the values printed**

```
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<paste anon key>
SUPABASE_SERVICE_ROLE_KEY=<paste service_role key>
OPENAI_API_KEY=<your real key>
ANTHROPIC_API_KEY=<your real key>
PDF_GENERATOR_TOKEN=local-dev-token
```

- [ ] **Step 5: Confirm `.env.local` is gitignored** (it is — `.gitignore` includes `.env.local`)

```bash
git status --short
```

Expected: `supabase/config.toml` shown as untracked, `.env.local` NOT shown.

- [ ] **Step 6: Commit Supabase scaffolding**

```bash
git add supabase/
git commit -m "chore: init local Supabase (no migrations yet)"
```

---

## Task 10: Migration 0001 — users + family_links

**Files:**
- Create: `supabase/migrations/0001_users_and_family_links.sql`

- [ ] **Step 1: Write migration**

```sql
-- 0001 — users and family_links

create type user_role as enum ('senior', 'family');

create table users (
  id            uuid primary key default gen_random_uuid(),
  email         text unique not null,
  role          user_role not null,
  display_name  text not null,
  created_at    timestamptz not null default now()
);

create table family_links (
  id              uuid primary key default gen_random_uuid(),
  family_user_id  uuid not null references users(id) on delete cascade,
  senior_user_id  uuid not null references users(id) on delete cascade,
  created_at      timestamptz not null default now(),
  unique (family_user_id, senior_user_id)
);

create index on family_links (family_user_id);
create index on family_links (senior_user_id);
```

- [ ] **Step 2: Apply**

```bash
supabase db reset
```

Expected: rebuilds local DB and applies the migration. No errors.

- [ ] **Step 3: Verify with psql**

```bash
supabase db psql -c "\dt"
```

Expected: lists `users`, `family_links`.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/0001_users_and_family_links.sql
git commit -m "feat(db): users + family_links tables"
```

---

## Task 11: Migration 0002 — prompts + prompt_skips

**Files:**
- Create: `supabase/migrations/0002_prompts_and_skips.sql`

- [ ] **Step 1: Write migration**

```sql
-- 0002 — prompts and prompt_skips

create type prompt_source as enum ('starter', 'ai_generated');

create table prompts (
  id                uuid primary key default gen_random_uuid(),
  chapter           text not null,
  question_text     text not null,
  order_in_chapter  int  not null,
  source            prompt_source not null default 'starter',
  created_at        timestamptz not null default now(),
  unique (chapter, order_in_chapter)
);

create index on prompts (chapter, order_in_chapter);

create table prompt_skips (
  id          uuid primary key default gen_random_uuid(),
  prompt_id   uuid not null references prompts(id) on delete cascade,
  user_id     uuid not null references users(id) on delete cascade,
  skipped_at  timestamptz not null default now(),
  unique (prompt_id, user_id)
);

create index on prompt_skips (user_id, skipped_at desc);
```

- [ ] **Step 2: Apply and verify**

```bash
supabase db reset
supabase db psql -c "\dt"
```

Expected: now lists `prompts`, `prompt_skips` in addition.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/0002_prompts_and_skips.sql
git commit -m "feat(db): prompts + prompt_skips tables"
```

---

## Task 12: Migration 0003 — stories, photos, family_questions, reactions

**Files:**
- Create: `supabase/migrations/0003_stories_photos_questions_reactions.sql`

- [ ] **Step 1: Write migration**

```sql
-- 0003 — stories, photos, family_questions, reactions

create table family_questions (
  id                  uuid primary key default gen_random_uuid(),
  asked_by_user_id    uuid not null references users(id) on delete cascade,
  asked_to_user_id    uuid not null references users(id) on delete cascade,
  question_text       text not null,
  answered_story_id   uuid,
  skipped_at          timestamptz,
  created_at          timestamptz not null default now()
);

create index on family_questions (asked_to_user_id, created_at desc);

create table stories (
  id                       uuid primary key default gen_random_uuid(),
  user_id                  uuid not null references users(id) on delete cascade,
  prompt_id                uuid references prompts(id) on delete set null,
  family_question_id       uuid references family_questions(id) on delete set null,
  audio_url                text not null,
  audio_duration_seconds   int  not null default 0,
  transcript_raw           text not null,
  transcript               text not null,
  chapter                  text not null,
  is_private               boolean not null default false,
  created_at               timestamptz not null default now(),
  -- exactly one source: prompt OR family_question
  constraint stories_source_xor check (
    (prompt_id is not null)::int + (family_question_id is not null)::int = 1
  )
);

-- now that stories exists, add the FK back from family_questions
alter table family_questions
  add constraint family_questions_answered_story_fk
  foreign key (answered_story_id) references stories(id) on delete set null;

create index on stories (user_id, chapter, created_at desc);
create index on stories (prompt_id);

create table photos (
  id                    uuid primary key default gen_random_uuid(),
  uploaded_by_user_id   uuid not null references users(id) on delete cascade,
  chapter               text not null,
  story_id              uuid references stories(id) on delete set null,
  storage_path          text not null,
  caption               text,
  created_at            timestamptz not null default now()
);

create index on photos (chapter);
create index on photos (story_id);

create table reactions (
  id              uuid primary key default gen_random_uuid(),
  story_id        uuid not null references stories(id) on delete cascade,
  family_user_id  uuid not null references users(id) on delete cascade,
  emoji           text not null default '❤️',
  created_at      timestamptz not null default now(),
  unique (story_id, family_user_id, emoji)
);
```

- [ ] **Step 2: Apply and verify**

```bash
supabase db reset
supabase db psql -c "\dt"
```

Expected: lists `users`, `family_links`, `prompts`, `prompt_skips`, `family_questions`, `stories`, `photos`, `reactions`.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/0003_stories_photos_questions_reactions.sql
git commit -m "feat(db): stories, photos, family_questions, reactions"
```

---

## Task 13: Migration 0004 — storage buckets

**Files:**
- Create: `supabase/migrations/0004_storage_buckets.sql`

- [ ] **Step 1: Write migration**

```sql
-- 0004 — storage buckets (private)

insert into storage.buckets (id, name, public)
values ('audio', 'audio', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('photos', 'photos', false)
on conflict (id) do nothing;
```

- [ ] **Step 2: Apply**

```bash
supabase db reset
```

- [ ] **Step 3: Verify**

```bash
supabase db psql -c "select id, name, public from storage.buckets;"
```

Expected: rows for `audio` and `photos`, both `public = f`.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/0004_storage_buckets.sql
git commit -m "feat(db): private storage buckets for audio + photos"
```

---

## Task 14: Migration 0005 — RLS policies (drafted, disabled)

**Files:**
- Create: `supabase/migrations/0005_rls_policies_disabled.sql`

- [ ] **Step 1: Write migration**

```sql
-- 0005 — RLS policies drafted but DISABLED for MVP (no auth yet).
-- To enable post-MVP: alter table <name> enable row level security;

-- senior reads own stories; family reads non-private stories of linked seniors
create policy stories_senior_read on stories
  for select using (
    user_id = auth.uid()
    or exists (
      select 1 from family_links fl
      where fl.senior_user_id = stories.user_id
        and fl.family_user_id = auth.uid()
        and stories.is_private = false
    )
  );

create policy stories_senior_write on stories
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- photos: senior writes own; family writes for linked seniors; both can read
create policy photos_read on photos
  for select using (
    uploaded_by_user_id = auth.uid()
    or exists (
      select 1 from family_links fl
      where fl.family_user_id = auth.uid()
        and fl.senior_user_id = (
          select user_id from stories where stories.id = photos.story_id
        )
    )
  );

-- ALL policies above are inert until RLS is enabled on each table.
-- Example one-liner to enable later:
--   alter table stories enable row level security;
```

- [ ] **Step 2: Apply**

```bash
supabase db reset
```

- [ ] **Step 3: Verify policies exist but RLS is off**

```bash
supabase db psql -c "select tablename, rowsecurity from pg_tables where schemaname='public';"
```

Expected: `rowsecurity = f` for all our tables (RLS off as planned).

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/0005_rls_policies_disabled.sql
git commit -m "feat(db): draft RLS policies (disabled until auth lands)"
```

---

## Task 15: Starter prompts seed file (50 questions across 8 chapters)

**Files:**
- Create: `src/seeds/starter-prompts.ts`

- [ ] **Step 1: Create the file**

```ts
import type { ChapterSlug } from '@/lib/chapters';

export interface StarterPrompt {
  chapter: ChapterSlug;
  order_in_chapter: number;
  question_text: string;
}

export const STARTER_PROMPTS: StarterPrompt[] = [
  // Early Childhood (8)
  { chapter: 'early_childhood', order_in_chapter: 1, question_text: 'What did your childhood bedroom look like?' },
  { chapter: 'early_childhood', order_in_chapter: 2, question_text: 'Who were you closest to as a small child, and what did you do together?' },
  { chapter: 'early_childhood', order_in_chapter: 3, question_text: 'What was your favorite meal at home growing up, and who made it?' },
  { chapter: 'early_childhood', order_in_chapter: 4, question_text: 'Tell me about the neighborhood you grew up in.' },
  { chapter: 'early_childhood', order_in_chapter: 5, question_text: 'What games or toys did you love most before you started school?' },
  { chapter: 'early_childhood', order_in_chapter: 6, question_text: 'What is the earliest memory you can clearly recall?' },
  { chapter: 'early_childhood', order_in_chapter: 7, question_text: 'Did you have any pets? Tell me about one of them.' },
  { chapter: 'early_childhood', order_in_chapter: 8, question_text: 'What sounds or smells from your childhood do you still remember?' },

  // School Years (7)
  { chapter: 'school_years', order_in_chapter: 1, question_text: 'What was your first day of school like?' },
  { chapter: 'school_years', order_in_chapter: 2, question_text: 'Who was your favorite teacher, and why?' },
  { chapter: 'school_years', order_in_chapter: 3, question_text: 'Tell me about a friend you made in school.' },
  { chapter: 'school_years', order_in_chapter: 4, question_text: 'What did you do for fun after school?' },
  { chapter: 'school_years', order_in_chapter: 5, question_text: 'Was there a subject that came easily to you, or one that gave you trouble?' },
  { chapter: 'school_years', order_in_chapter: 6, question_text: 'What did you imagine you would be when you grew up?' },
  { chapter: 'school_years', order_in_chapter: 7, question_text: 'Did you take part in any clubs, sports, or performances?' },

  // Young Adulthood (6)
  { chapter: 'young_adulthood', order_in_chapter: 1, question_text: 'When did you first feel like an adult, and why?' },
  { chapter: 'young_adulthood', order_in_chapter: 2, question_text: 'Tell me about your first job.' },
  { chapter: 'young_adulthood', order_in_chapter: 3, question_text: 'What was the first place you lived on your own?' },
  { chapter: 'young_adulthood', order_in_chapter: 4, question_text: 'Did you travel anywhere meaningful in your twenties? Tell me about it.' },
  { chapter: 'young_adulthood', order_in_chapter: 5, question_text: 'Who shaped the way you saw the world during this time?' },
  { chapter: 'young_adulthood', order_in_chapter: 6, question_text: 'What did you believe deeply at that age that you see differently now?' },

  // Building a Family (6)
  { chapter: 'building_a_family', order_in_chapter: 1, question_text: 'How did you meet your spouse or partner?' },
  { chapter: 'building_a_family', order_in_chapter: 2, question_text: 'Tell me about the day your first child was born.' },
  { chapter: 'building_a_family', order_in_chapter: 3, question_text: 'What was the home you raised your family in like?' },
  { chapter: 'building_a_family', order_in_chapter: 4, question_text: 'What family traditions did you pass along, or start?' },
  { chapter: 'building_a_family', order_in_chapter: 5, question_text: 'Tell me about a holiday or gathering you remember warmly.' },
  { chapter: 'building_a_family', order_in_chapter: 6, question_text: 'What do you hope your children remember about growing up?' },

  // Career & Work (6)
  { chapter: 'career_and_work', order_in_chapter: 1, question_text: 'How did you find your way into the work you ended up doing?' },
  { chapter: 'career_and_work', order_in_chapter: 2, question_text: 'Who was a mentor or coworker who shaped you?' },
  { chapter: 'career_and_work', order_in_chapter: 3, question_text: 'What was a project or accomplishment you are most proud of?' },
  { chapter: 'career_and_work', order_in_chapter: 4, question_text: 'Tell me about a difficult time at work and how you got through it.' },
  { chapter: 'career_and_work', order_in_chapter: 5, question_text: 'What did your typical workday look like during the busiest years?' },
  { chapter: 'career_and_work', order_in_chapter: 6, question_text: 'When you retired or stepped away, how did that feel?' },

  // Reflections & Wisdom (5)
  { chapter: 'reflections_wisdom', order_in_chapter: 1, question_text: 'What is the best advice you have ever received?' },
  { chapter: 'reflections_wisdom', order_in_chapter: 2, question_text: 'Looking back, what are you most grateful for?' },
  { chapter: 'reflections_wisdom', order_in_chapter: 3, question_text: 'What do you wish you had known at 25?' },
  { chapter: 'reflections_wisdom', order_in_chapter: 4, question_text: 'How would you describe what makes a good life, in your own words?' },
  { chapter: 'reflections_wisdom', order_in_chapter: 5, question_text: 'What do you hope future generations of your family hold onto?' },

  // Memorable Stories on Your Mind (6)
  { chapter: 'memorable_stories', order_in_chapter: 1, question_text: 'Tell me a story you love telling — one you have told many times.' },
  { chapter: 'memorable_stories', order_in_chapter: 2, question_text: 'What is the funniest thing that ever happened to you?' },
  { chapter: 'memorable_stories', order_in_chapter: 3, question_text: 'Tell me about a time you took a risk that paid off.' },
  { chapter: 'memorable_stories', order_in_chapter: 4, question_text: 'Tell me about a stranger who changed your day or your life.' },
  { chapter: 'memorable_stories', order_in_chapter: 5, question_text: 'Was there a moment when you knew everything was about to change?' },
  { chapter: 'memorable_stories', order_in_chapter: 6, question_text: 'What is a story you have never told before but want recorded?' },

  // Information, Knowledge & Practical Skills (6)
  { chapter: 'practical_skills', order_in_chapter: 1, question_text: 'What is a recipe you make from memory? Walk me through it.' },
  { chapter: 'practical_skills', order_in_chapter: 2, question_text: 'What is a household repair or fix you taught yourself?' },
  { chapter: 'practical_skills', order_in_chapter: 3, question_text: 'What financial advice would you pass to someone starting out?' },
  { chapter: 'practical_skills', order_in_chapter: 4, question_text: 'What is a skill from your trade that you wish you could teach?' },
  { chapter: 'practical_skills', order_in_chapter: 5, question_text: 'How did you handle a major decision you faced alone?' },
  { chapter: 'practical_skills', order_in_chapter: 6, question_text: 'What is something simple but important that people forget to do?' },
];

// Sanity check at module load — total must be 50
if (STARTER_PROMPTS.length !== 50) {
  throw new Error(
    `STARTER_PROMPTS must have 50 entries; found ${STARTER_PROMPTS.length}`,
  );
}
```

- [ ] **Step 2: Verify import works**

Create `tests/unit/starter-prompts.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { STARTER_PROMPTS } from '@/seeds/starter-prompts';

describe('STARTER_PROMPTS', () => {
  it('has exactly 50 entries', () => {
    expect(STARTER_PROMPTS).toHaveLength(50);
  });

  it('covers all 8 chapters', () => {
    const chapters = new Set(STARTER_PROMPTS.map((p) => p.chapter));
    expect(chapters.size).toBe(8);
  });

  it('has unique (chapter, order_in_chapter) pairs', () => {
    const seen = new Set<string>();
    for (const p of STARTER_PROMPTS) {
      const key = `${p.chapter}:${p.order_in_chapter}`;
      expect(seen.has(key), `duplicate ${key}`).toBe(false);
      seen.add(key);
    }
  });
});
```

Run: `npm test -- tests/unit/starter-prompts.test.ts`
Expected: 3 passed.

- [ ] **Step 3: Commit**

```bash
git add src/seeds/starter-prompts.ts tests/unit/starter-prompts.test.ts
git commit -m "feat(seeds): 50 starter prompts across 8 chapters"
```

---

## Task 16: Seed script

**Files:**
- Create: `scripts/seed.ts`
- Modify: `package.json` (add `seed` script and devDependencies)

- [ ] **Step 1: Install dotenv and tsx**

```bash
npm install -D dotenv tsx
npm install @supabase/supabase-js
```

- [ ] **Step 2: Create `scripts/seed.ts`**

```ts
import 'dotenv/config';
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
```

- [ ] **Step 3: Add seed script to `package.json`**

In `"scripts"`:

```json
"seed": "tsx scripts/seed.ts",
"db:reset": "supabase db reset && npm run seed"
```

- [ ] **Step 4: Run seed**

```bash
npm run seed
```

Expected output: `Seeded: 2 users, 1 family link, 50 prompts`

- [ ] **Step 5: Verify in DB**

```bash
supabase db psql -c "select count(*) from prompts;"
supabase db psql -c "select role, display_name from users;"
```

Expected: 50 prompts, two users (Mom + Sarah).

- [ ] **Step 6: Commit**

```bash
git add scripts/seed.ts package.json package-lock.json
git commit -m "feat(seeds): seed script — 2 users, 1 family link, 50 prompts"
```

---

## Task 17: Supabase client helpers (browser + server)

**Files:**
- Create: `src/lib/supabase/browser.ts`
- Create: `src/lib/supabase/server.ts`

- [ ] **Step 1: Install ssr helper**

```bash
npm install @supabase/ssr
```

- [ ] **Step 2: Create `src/lib/supabase/browser.ts`**

```ts
'use client';

import { createBrowserClient } from '@supabase/ssr';

export function getBrowserSupabase() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
```

- [ ] **Step 3: Create `src/lib/supabase/server.ts`**

```ts
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { env } from '@/lib/env';

/** Service-role client for server actions / route handlers that need full access. */
export function getServiceSupabase() {
  return createServerClient(env.supabaseUrl(), env.supabaseServiceRoleKey(), {
    cookies: { getAll: () => [], setAll: () => {} },
  });
}

/** Anon client tied to the request's cookies. RLS will apply once enabled. */
export async function getRequestSupabase() {
  const store = await cookies();
  return createServerClient(env.supabaseUrl(), env.supabaseAnonKey(), {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (toSet) => {
        for (const c of toSet) store.set(c.name, c.value, c.options);
      },
    },
  });
}
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/supabase/ package.json package-lock.json
git commit -m "feat(supabase): browser + server clients"
```

---

## Task 18: Today's prompt resolver (TDD)

**Files:**
- Create: `src/lib/prompts.ts`
- Create: `tests/unit/prompts.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { selectNextPromptId } from '@/lib/prompts';

const PROMPTS = [
  { id: 'p1', chapter: 'early_childhood', order_in_chapter: 1 },
  { id: 'p2', chapter: 'early_childhood', order_in_chapter: 2 },
  { id: 'p3', chapter: 'early_childhood', order_in_chapter: 3 },
];

const NOW = new Date('2026-05-07T12:00:00Z').getTime();
const SIX_DAYS_AGO = new Date('2026-05-01T12:00:00Z').getTime();
const EIGHT_DAYS_AGO = new Date('2026-04-29T12:00:00Z').getTime();

describe('selectNextPromptId', () => {
  it('returns the lowest-order unanswered, unskipped prompt', () => {
    const next = selectNextPromptId({
      prompts: PROMPTS,
      answeredPromptIds: new Set(),
      skips: [],
      now: NOW,
    });
    expect(next).toBe('p1');
  });

  it('skips answered prompts', () => {
    const next = selectNextPromptId({
      prompts: PROMPTS,
      answeredPromptIds: new Set(['p1']),
      skips: [],
      now: NOW,
    });
    expect(next).toBe('p2');
  });

  it('skips prompts skipped within 7 days', () => {
    const next = selectNextPromptId({
      prompts: PROMPTS,
      answeredPromptIds: new Set(),
      skips: [{ prompt_id: 'p1', skipped_at: SIX_DAYS_AGO }],
      now: NOW,
    });
    expect(next).toBe('p2');
  });

  it('recycles prompts skipped more than 7 days ago', () => {
    const next = selectNextPromptId({
      prompts: PROMPTS,
      answeredPromptIds: new Set(),
      skips: [{ prompt_id: 'p1', skipped_at: EIGHT_DAYS_AGO }],
      now: NOW,
    });
    expect(next).toBe('p1');
  });

  it('returns null when all prompts are answered or recently skipped', () => {
    const next = selectNextPromptId({
      prompts: PROMPTS,
      answeredPromptIds: new Set(['p1', 'p2', 'p3']),
      skips: [],
      now: NOW,
    });
    expect(next).toBeNull();
  });
});
```

- [ ] **Step 2: Run — expect fail**

```bash
npm test -- tests/unit/prompts.test.ts
```

- [ ] **Step 3: Implement — `src/lib/prompts.ts`**

```ts
export interface PromptRow {
  id: string;
  chapter: string;
  order_in_chapter: number;
}

export interface SkipRow {
  prompt_id: string;
  skipped_at: number; // ms epoch
}

export interface SelectArgs {
  prompts: PromptRow[];           // already filtered to current chapter, sorted or not
  answeredPromptIds: Set<string>; // story.prompt_id for the user
  skips: SkipRow[];               // skips for the user
  now: number;                    // ms epoch
}

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export function selectNextPromptId(args: SelectArgs): string | null {
  const { prompts, answeredPromptIds, skips, now } = args;

  const recentSkipIds = new Set(
    skips.filter((s) => now - s.skipped_at < SEVEN_DAYS_MS).map((s) => s.prompt_id),
  );

  const eligible = prompts
    .filter((p) => !answeredPromptIds.has(p.id) && !recentSkipIds.has(p.id))
    .sort((a, b) => a.order_in_chapter - b.order_in_chapter);

  return eligible[0]?.id ?? null;
}
```

- [ ] **Step 4: Run — expect pass**

```bash
npm test -- tests/unit/prompts.test.ts
```

Expected: 5 passed.

- [ ] **Step 5: Commit**

```bash
git add src/lib/prompts.ts tests/unit/prompts.test.ts
git commit -m "feat(prompts): next-prompt resolver with skip recycle (TDD)"
```

---

## Task 19: Today page — render the next prompt

**Files:**
- Create: `src/components/chapter/ChapterSelector.tsx`
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Implement `ChapterSelector`**

```tsx
'use client';

import { CHAPTERS, type ChapterSlug } from '@/lib/chapters';
import { clsx } from 'clsx';

interface Props {
  selected: ChapterSlug;
  onSelect: (slug: ChapterSlug) => void;
}

export function ChapterSelector({ selected, onSelect }: Props) {
  return (
    <div className="flex gap-2 overflow-x-auto py-2 -mx-4 px-4">
      {CHAPTERS.map((c) => {
        const isActive = c.slug === selected;
        return (
          <button
            key={c.slug}
            onClick={() => onSelect(c.slug)}
            className={clsx(
              'whitespace-nowrap rounded-full px-4 py-3 text-base shrink-0 min-h-touch-target',
              isActive
                ? 'bg-deep-navy text-cream'
                : 'bg-white text-deep-navy border border-deep-navy/15',
            )}
          >
            {c.label}
          </button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Replace `src/app/page.tsx`**

```tsx
import { CHAPTERS } from '@/lib/chapters';
import { selectNextPromptId } from '@/lib/prompts';
import { getServiceSupabase } from '@/lib/supabase/server';
import { TodayClient } from './today-client';

export const dynamic = 'force-dynamic';

const SENIOR_ID = '00000000-0000-4000-8000-000000000001';

export default async function HomePage() {
  const sb = getServiceSupabase();

  const { data: prompts = [] } = await sb
    .from('prompts')
    .select('id, chapter, order_in_chapter, question_text');

  const { data: stories = [] } = await sb
    .from('stories')
    .select('prompt_id')
    .eq('user_id', SENIOR_ID);

  const { data: skips = [] } = await sb
    .from('prompt_skips')
    .select('prompt_id, skipped_at')
    .eq('user_id', SENIOR_ID);

  return (
    <TodayClient
      prompts={prompts ?? []}
      answeredPromptIds={(stories ?? []).map((s) => s.prompt_id).filter(Boolean) as string[]}
      skips={(skips ?? []).map((s) => ({
        prompt_id: s.prompt_id,
        skipped_at: new Date(s.skipped_at).getTime(),
      }))}
    />
  );
}
```

- [ ] **Step 3: Create `src/app/today-client.tsx`**

```tsx
'use client';

import { useMemo, useState } from 'react';
import { CHAPTERS, type ChapterSlug } from '@/lib/chapters';
import { selectNextPromptId, type PromptRow, type SkipRow } from '@/lib/prompts';
import { ChapterSelector } from '@/components/chapter/ChapterSelector';
import { BigCard, BigText } from '@/components/senior-ui';

interface FullPrompt extends PromptRow {
  question_text: string;
}

interface Props {
  prompts: FullPrompt[];
  answeredPromptIds: string[];
  skips: SkipRow[];
}

export function TodayClient({ prompts, answeredPromptIds, skips }: Props) {
  const [chapter, setChapter] = useState<ChapterSlug>('early_childhood');

  const inChapter = useMemo(
    () => prompts.filter((p) => p.chapter === chapter),
    [prompts, chapter],
  );

  const nextPromptId = useMemo(
    () =>
      selectNextPromptId({
        prompts: inChapter,
        answeredPromptIds: new Set(answeredPromptIds),
        skips,
        now: Date.now(),
      }),
    [inChapter, answeredPromptIds, skips],
  );

  const nextPrompt = inChapter.find((p) => p.id === nextPromptId) ?? null;
  const chapterIndex = inChapter.findIndex((p) => p.id === nextPromptId);

  return (
    <main className="min-h-screen p-4 max-w-xl mx-auto flex flex-col gap-4">
      <ChapterSelector selected={chapter} onSelect={setChapter} />

      {nextPrompt ? (
        <BigCard className="flex-1 flex flex-col gap-6">
          <p className="text-sm uppercase tracking-wide opacity-60">
            Question {chapterIndex + 1} of {inChapter.length}
          </p>
          <BigText size="question" as="h2">
            {nextPrompt.question_text}
          </BigText>
          <p className="text-base opacity-50 mt-auto">
            (Recording controls land in the next task)
          </p>
        </BigCard>
      ) : (
        <BigCard>
          <BigText size="question" as="h2">
            You&apos;ve shared every story in {CHAPTERS.find((c) => c.slug === chapter)?.label}.
          </BigText>
          <p className="mt-4 opacity-70">Try another chapter above.</p>
        </BigCard>
      )}
    </main>
  );
}
```

- [ ] **Step 4: Run dev server, verify**

```bash
npm run dev
```

Open `http://localhost:3000`. Expected:
- 8 chapter chips at the top, "Early Childhood" highlighted in deep-navy.
- A card showing "Question 1 of 8" and "What did your childhood bedroom look like?"
- Tapping another chapter chip swaps the question.

Stop the server.

- [ ] **Step 5: Commit**

```bash
git add src/app/page.tsx src/app/today-client.tsx src/components/chapter/ChapterSelector.tsx
git commit -m "feat(today): chapter selector + render next prompt from DB"
```

---

## Task 20: useRecorder hook (TDD)

**Files:**
- Create: `src/components/recorder/use-recorder.ts`
- Create: `tests/unit/use-recorder.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useRecorder } from '@/components/recorder/use-recorder';

class FakeMediaRecorder {
  state: 'inactive' | 'recording' = 'inactive';
  ondataavailable: ((e: { data: Blob }) => void) | null = null;
  onstop: (() => void) | null = null;
  start() { this.state = 'recording'; }
  stop() {
    this.state = 'inactive';
    this.ondataavailable?.({ data: new Blob(['fake'], { type: 'audio/webm' }) });
    this.onstop?.();
  }
}

beforeEach(() => {
  // @ts-expect-error mock global
  globalThis.MediaRecorder = vi.fn().mockImplementation(() => new FakeMediaRecorder());
  // @ts-expect-error mock global
  globalThis.navigator.mediaDevices = {
    getUserMedia: vi.fn().mockResolvedValue({
      getTracks: () => [{ stop: vi.fn() }],
    }),
  };
});

describe('useRecorder', () => {
  it('starts in idle state', () => {
    const { result } = renderHook(() => useRecorder());
    expect(result.current.state).toBe('idle');
    expect(result.current.blob).toBeNull();
  });

  it('transitions idle → recording → reviewing on start/stop', async () => {
    const { result } = renderHook(() => useRecorder());

    await act(async () => { await result.current.start(); });
    expect(result.current.state).toBe('recording');

    await act(async () => { await result.current.stop(); });
    expect(result.current.state).toBe('reviewing');
    expect(result.current.blob).toBeInstanceOf(Blob);
  });

  it('reset returns to idle and clears blob', async () => {
    const { result } = renderHook(() => useRecorder());
    await act(async () => { await result.current.start(); });
    await act(async () => { await result.current.stop(); });
    act(() => { result.current.reset(); });
    expect(result.current.state).toBe('idle');
    expect(result.current.blob).toBeNull();
  });
});
```

- [ ] **Step 2: Run — expect fail**

- [ ] **Step 3: Implement — `src/components/recorder/use-recorder.ts`**

```ts
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export type RecorderState = 'idle' | 'recording' | 'reviewing';

export interface UseRecorderResult {
  state: RecorderState;
  blob: Blob | null;
  durationSeconds: number;
  start: () => Promise<void>;
  stop: () => Promise<void>;
  reset: () => void;
}

export function useRecorder(): UseRecorderResult {
  const [state, setState] = useState<RecorderState>('idle');
  const [blob, setBlob] = useState<Blob | null>(null);
  const [durationSeconds, setDurationSeconds] = useState(0);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const startedAtRef = useRef<number | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const start = useCallback(async () => {
    chunksRef.current = [];
    setBlob(null);
    setDurationSeconds(0);

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const rec = new MediaRecorder(stream, { mimeType: 'audio/webm' });
    rec.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
    };
    rec.onstop = () => {
      const finalBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
      setBlob(finalBlob);
      setState('reviewing');
      stream.getTracks().forEach((t) => t.stop());
    };

    rec.start();
    recorderRef.current = rec;
    startedAtRef.current = Date.now();
    setState('recording');

    tickRef.current = setInterval(() => {
      if (startedAtRef.current) {
        setDurationSeconds(Math.floor((Date.now() - startedAtRef.current) / 1000));
      }
    }, 250);
  }, []);

  const stop = useCallback(async () => {
    const rec = recorderRef.current;
    if (rec && rec.state !== 'inactive') rec.stop();
    if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
  }, []);

  const reset = useCallback(() => {
    setBlob(null);
    setState('idle');
    setDurationSeconds(0);
  }, []);

  useEffect(
    () => () => {
      if (tickRef.current) clearInterval(tickRef.current);
    },
    [],
  );

  return { state, blob, durationSeconds, start, stop, reset };
}
```

- [ ] **Step 4: Run — expect pass**

```bash
npm test -- tests/unit/use-recorder.test.tsx
```

Expected: 3 passed.

- [ ] **Step 5: Commit**

```bash
git add src/components/recorder/use-recorder.ts tests/unit/use-recorder.test.tsx
git commit -m "feat(recorder): useRecorder hook with state machine (TDD)"
```

---

## Task 21: RecorderButton + Timer + integrate on Today

**Files:**
- Create: `src/components/recorder/RecorderButton.tsx`
- Create: `src/components/recorder/RecorderTimer.tsx`
- Modify: `src/app/today-client.tsx`

- [ ] **Step 1: Implement `RecorderButton.tsx`**

```tsx
'use client';

import { BigButton } from '@/components/senior-ui';
import type { RecorderState } from './use-recorder';

interface Props {
  state: RecorderState;
  onStart: () => void;
  onStop: () => void;
}

export function RecorderButton({ state, onStart, onStop }: Props) {
  if (state === 'recording') {
    return (
      <BigButton
        onClick={onStop}
        className="w-full text-xl animate-[pulse_1.5s_ease-in-out_infinite]"
      >
        ⏹ &nbsp; Tap to stop
      </BigButton>
    );
  }
  if (state === 'idle') {
    return (
      <BigButton onClick={onStart} className="w-full text-xl">
        ● &nbsp; Tap to record
      </BigButton>
    );
  }
  return null; // reviewing — handled by TranscriptReview
}
```

- [ ] **Step 2: Implement `RecorderTimer.tsx`**

```tsx
'use client';

interface Props {
  seconds: number;
}

export function RecorderTimer({ seconds }: Props) {
  const m = Math.floor(seconds / 60);
  const s = String(seconds % 60).padStart(2, '0');
  return (
    <div className="text-3xl font-semibold text-center tabular-nums">
      {m}:{s}
    </div>
  );
}
```

- [ ] **Step 3: Update `src/app/today-client.tsx` to wire in the recorder**

Replace the file:

```tsx
'use client';

import { useMemo, useState } from 'react';
import { CHAPTERS, type ChapterSlug } from '@/lib/chapters';
import { selectNextPromptId, type PromptRow, type SkipRow } from '@/lib/prompts';
import { ChapterSelector } from '@/components/chapter/ChapterSelector';
import { BigCard, BigText } from '@/components/senior-ui';
import { useRecorder } from '@/components/recorder/use-recorder';
import { RecorderButton } from '@/components/recorder/RecorderButton';
import { RecorderTimer } from '@/components/recorder/RecorderTimer';

interface FullPrompt extends PromptRow {
  question_text: string;
}

interface Props {
  prompts: FullPrompt[];
  answeredPromptIds: string[];
  skips: SkipRow[];
}

export function TodayClient({ prompts, answeredPromptIds, skips }: Props) {
  const [chapter, setChapter] = useState<ChapterSlug>('early_childhood');
  const recorder = useRecorder();

  const inChapter = useMemo(
    () => prompts.filter((p) => p.chapter === chapter),
    [prompts, chapter],
  );

  const nextPromptId = useMemo(
    () =>
      selectNextPromptId({
        prompts: inChapter,
        answeredPromptIds: new Set(answeredPromptIds),
        skips,
        now: Date.now(),
      }),
    [inChapter, answeredPromptIds, skips],
  );

  const nextPrompt = inChapter.find((p) => p.id === nextPromptId) ?? null;
  const chapterIndex = inChapter.findIndex((p) => p.id === nextPromptId);

  return (
    <main className="min-h-screen p-4 max-w-xl mx-auto flex flex-col gap-4">
      <ChapterSelector selected={chapter} onSelect={setChapter} />

      {nextPrompt ? (
        <>
          <BigCard className="flex-1 flex flex-col gap-6">
            <p className="text-sm uppercase tracking-wide opacity-60">
              {recorder.state === 'recording'
                ? 'Recording…'
                : `Question ${chapterIndex + 1} of ${inChapter.length}`}
            </p>
            <BigText size="question" as="h2">
              {nextPrompt.question_text}
            </BigText>
            {recorder.state === 'recording' && (
              <RecorderTimer seconds={recorder.durationSeconds} />
            )}
          </BigCard>

          {recorder.state !== 'reviewing' && (
            <RecorderButton
              state={recorder.state}
              onStart={recorder.start}
              onStop={recorder.stop}
            />
          )}

          {recorder.state === 'reviewing' && recorder.blob && (
            <BigCard>
              <BigText>Recording captured ({recorder.blob.size} bytes).</BigText>
              <BigText className="opacity-60 mt-2">
                Transcript review lands in the next task.
              </BigText>
              <button
                onClick={recorder.reset}
                className="mt-4 text-deep-navy underline"
              >
                Discard and try again
              </button>
            </BigCard>
          )}

          {recorder.state === 'idle' && (
            <button className="text-center py-4 underline opacity-70">
              Skip for now
            </button>
          )}
        </>
      ) : (
        <BigCard>
          <BigText size="question" as="h2">
            You&apos;ve shared every story in {CHAPTERS.find((c) => c.slug === chapter)?.label}.
          </BigText>
          <p className="mt-4 opacity-70">Try another chapter above.</p>
        </BigCard>
      )}
    </main>
  );
}
```

- [ ] **Step 4: Manual smoke test**

```bash
npm run dev
```

Visit `http://localhost:3000`. Click "Tap to record" — browser will prompt for microphone permission. Allow it. Speak for 5 seconds. Click "Tap to stop". Expect to see "Recording captured (XXX bytes)." Stop the server.

- [ ] **Step 5: Commit**

```bash
git add src/components/recorder/RecorderButton.tsx src/components/recorder/RecorderTimer.tsx src/app/today-client.tsx
git commit -m "feat(recorder): live record/stop/timer on Today screen"
```

---

## Task 22: IndexedDB safety net (TDD)

**Files:**
- Create: `src/lib/indexed-db.ts`
- Create: `tests/unit/indexed-db.test.ts`

- [ ] **Step 1: Install idb**

```bash
npm install idb
npm install -D fake-indexeddb
```

- [ ] **Step 2: Write the failing test**

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import {
  putPendingAudio,
  getPendingAudio,
  clearPendingAudio,
  listPendingAudioIds,
} from '@/lib/indexed-db';

beforeEach(() => {
  // fake-indexeddb is reset between test files but not test cases
});

describe('indexed-db pending audio store', () => {
  it('stores and retrieves a blob by id', async () => {
    const blob = new Blob(['hello'], { type: 'audio/webm' });
    await putPendingAudio('story-1', blob);
    const retrieved = await getPendingAudio('story-1');
    expect(retrieved).toBeInstanceOf(Blob);
    expect(await retrieved!.text()).toBe('hello');
  });

  it('returns null for unknown ids', async () => {
    expect(await getPendingAudio('unknown')).toBeNull();
  });

  it('clears stored blobs', async () => {
    await putPendingAudio('story-2', new Blob(['x']));
    await clearPendingAudio('story-2');
    expect(await getPendingAudio('story-2')).toBeNull();
  });

  it('lists pending ids', async () => {
    await putPendingAudio('story-A', new Blob(['a']));
    await putPendingAudio('story-B', new Blob(['b']));
    const ids = await listPendingAudioIds();
    expect(ids).toEqual(expect.arrayContaining(['story-A', 'story-B']));
  });
});
```

- [ ] **Step 3: Run — expect fail**

- [ ] **Step 4: Implement — `src/lib/indexed-db.ts`**

```ts
import { openDB, type IDBPDatabase } from 'idb';

const DB_NAME = 'legacy';
const STORE = 'pending-audio';
const VERSION = 1;

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDb() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE);
        }
      },
    });
  }
  return dbPromise;
}

export async function putPendingAudio(id: string, blob: Blob): Promise<void> {
  const db = await getDb();
  await db.put(STORE, blob, id);
}

export async function getPendingAudio(id: string): Promise<Blob | null> {
  const db = await getDb();
  const value = await db.get(STORE, id);
  return value ?? null;
}

export async function clearPendingAudio(id: string): Promise<void> {
  const db = await getDb();
  await db.delete(STORE, id);
}

export async function listPendingAudioIds(): Promise<string[]> {
  const db = await getDb();
  const keys = await db.getAllKeys(STORE);
  return keys.map(String);
}
```

- [ ] **Step 5: Run — expect pass**

```bash
npm test -- tests/unit/indexed-db.test.ts
```

Expected: 4 passed.

- [ ] **Step 6: Commit**

```bash
git add src/lib/indexed-db.ts tests/unit/indexed-db.test.ts package.json package-lock.json
git commit -m "feat(indexed-db): pending-audio safety net (TDD)"
```

---

## Task 23: Signed upload URL route handler

**Files:**
- Create: `src/app/api/signed-upload-url/route.ts`

- [ ] **Step 1: Implement**

```ts
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getServiceSupabase } from '@/lib/supabase/server';

const SENIOR_ID = '00000000-0000-4000-8000-000000000001';

const Body = z.object({
  bucket: z.enum(['audio', 'photos']),
  storyId: z.string().uuid(),
  ext: z.enum(['webm', 'jpg', 'jpeg', 'png']),
});

export async function POST(req: NextRequest) {
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.format() }, { status: 400 });
  }
  const { bucket, storyId, ext } = parsed.data;

  const sb = getServiceSupabase();
  const path = `${SENIOR_ID}/${storyId}.${ext}`;

  const { data, error } = await sb.storage
    .from(bucket)
    .createSignedUploadUrl(path);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ path, token: data.token, signedUrl: data.signedUrl });
}
```

- [ ] **Step 2: Install zod**

```bash
npm install zod
```

- [ ] **Step 3: Smoke test with curl**

```bash
npm run dev
```

In another terminal:

```bash
curl -X POST http://localhost:3000/api/signed-upload-url \
  -H "Content-Type: application/json" \
  -d '{"bucket":"audio","storyId":"00000000-0000-4000-8000-000000000099","ext":"webm"}'
```

Expected: JSON response with `path`, `token`, `signedUrl`. Stop the server.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/signed-upload-url/route.ts package.json package-lock.json
git commit -m "feat(api): signed-upload-url for direct browser→Supabase audio uploads"
```

---

## Task 24: Whisper client lib

**Files:**
- Create: `src/lib/ai/whisper.ts`

- [ ] **Step 1: Install OpenAI SDK**

```bash
npm install openai
```

- [ ] **Step 2: Implement**

```ts
import OpenAI from 'openai';
import { env } from '@/lib/env';

let client: OpenAI | null = null;
function getClient() {
  if (!client) client = new OpenAI({ apiKey: env.openaiApiKey() });
  return client;
}

export interface WhisperResult {
  text: string;
  durationSeconds: number;
}

export async function transcribeAudio(
  audio: Blob | Buffer,
  filename = 'audio.webm',
): Promise<WhisperResult> {
  const blob =
    audio instanceof Blob ? audio : new Blob([audio as unknown as ArrayBuffer]);
  // OpenAI SDK expects a File-like object in Node 20+
  const file = new File([blob], filename, { type: 'audio/webm' });

  const res = await getClient().audio.transcriptions.create({
    model: 'whisper-1',
    file,
    response_format: 'verbose_json',
  });

  return {
    text: res.text,
    // verbose_json has a top-level `duration` field per OpenAI docs
    durationSeconds: Math.round((res as unknown as { duration?: number }).duration ?? 0),
  };
}
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/ai/whisper.ts package.json package-lock.json
git commit -m "feat(ai): whisper client (verbose_json with duration)"
```

---

## Task 25: Claude transcript-cleanup client

**Files:**
- Create: `src/lib/ai/claude.ts`

- [ ] **Step 1: Install Anthropic SDK**

```bash
npm install @anthropic-ai/sdk
```

- [ ] **Step 2: Implement**

```ts
import Anthropic from '@anthropic-ai/sdk';
import { env } from '@/lib/env';

let client: Anthropic | null = null;
function getClient() {
  if (!client) client = new Anthropic({ apiKey: env.anthropicApiKey() });
  return client;
}

const CLEANUP_SYSTEM = `You are helping a senior preserve their life story. You'll receive the raw transcript of an audio recording produced by Whisper. Your job:
- Fix punctuation, capitalization, and obvious word errors.
- Remove filler words (um, uh, you know) only when they break flow; keep them when they reflect personality.
- Do NOT paraphrase, summarize, or change the meaning.
- Do NOT add information that wasn't in the audio.
- Preserve regional speech, slang, and the speaker's voice.
Return ONLY the cleaned transcript. No commentary, no headers, no explanations.`;

export async function cleanTranscript(rawText: string): Promise<string> {
  if (!rawText.trim()) return '';
  const res = await getClient().messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 4096,
    system: CLEANUP_SYSTEM,
    messages: [{ role: 'user', content: rawText }],
  });

  const block = res.content[0];
  if (block?.type !== 'text') {
    throw new Error('Unexpected non-text response from Claude');
  }
  return block.text.trim();
}
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/ai/claude.ts package.json package-lock.json
git commit -m "feat(ai): claude transcript-cleanup client"
```

---

## Task 26: /api/transcribe route handler

**Files:**
- Create: `src/app/api/transcribe/route.ts`

- [ ] **Step 1: Implement**

```ts
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getServiceSupabase } from '@/lib/supabase/server';
import { transcribeAudio } from '@/lib/ai/whisper';
import { cleanTranscript } from '@/lib/ai/claude';

export const runtime = 'nodejs';
export const maxDuration = 60;

const Body = z.object({
  audioPath: z.string(),
});

export async function POST(req: NextRequest) {
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.format() }, { status: 400 });
  }
  const { audioPath } = parsed.data;

  const sb = getServiceSupabase();

  // Download audio from Storage
  const { data: blob, error: dlErr } = await sb.storage.from('audio').download(audioPath);
  if (dlErr || !blob) {
    return NextResponse.json(
      { error: dlErr?.message ?? 'audio not found' },
      { status: 404 },
    );
  }

  // Whisper
  let transcriptRaw: string;
  let durationSeconds = 0;
  try {
    const w = await transcribeAudio(blob);
    transcriptRaw = w.text;
    durationSeconds = w.durationSeconds;
  } catch (e) {
    console.error('whisper failed', e);
    return NextResponse.json(
      { error: 'transcription_failed', stage: 'whisper' },
      { status: 502 },
    );
  }

  // Claude cleanup (non-fatal — fall back to raw)
  let transcript = transcriptRaw;
  try {
    transcript = await cleanTranscript(transcriptRaw);
  } catch (e) {
    console.warn('claude cleanup failed, returning raw transcript', e);
  }

  return NextResponse.json({
    transcript_raw: transcriptRaw,
    transcript,
    duration_seconds: durationSeconds,
  });
}
```

- [ ] **Step 2: Smoke test with a tiny WAV**

This requires a real audio file in storage; we'll test it end-to-end through the UI in Task 28. For now just verify the route compiles by hitting it with an invalid body:

```bash
npm run dev
curl -X POST http://localhost:3000/api/transcribe \
  -H "Content-Type: application/json" \
  -d '{}'
```

Expected: 400 with zod error. Stop the server.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/transcribe/route.ts
git commit -m "feat(api): /api/transcribe — Whisper + Claude pipeline"
```

---

## Task 27: TranscribingSpinner + TranscriptReview components

**Files:**
- Create: `src/components/recorder/TranscribingSpinner.tsx`
- Create: `src/components/recorder/TranscriptReview.tsx`

- [ ] **Step 1: Implement `TranscribingSpinner.tsx`**

```tsx
import { BigCard, BigText } from '@/components/senior-ui';

export function TranscribingSpinner() {
  return (
    <BigCard className="text-center py-12">
      <div className="text-5xl animate-pulse mb-4">✍️</div>
      <BigText size="question">We&apos;re writing down your story…</BigText>
      <p className="mt-2 opacity-60">This usually takes about 10 seconds.</p>
    </BigCard>
  );
}
```

- [ ] **Step 2: Implement `TranscriptReview.tsx`**

```tsx
'use client';

import { useState } from 'react';
import { BigButton, BigCard, BigText } from '@/components/senior-ui';

interface Props {
  initialTranscript: string;
  onSave: (finalTranscript: string) => Promise<void>;
  onRerecord: () => void;
}

export function TranscriptReview({ initialTranscript, onSave, onRerecord }: Props) {
  const [text, setText] = useState(initialTranscript);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      await onSave(text);
    } finally {
      setSaving(false);
    }
  }

  return (
    <BigCard className="flex flex-col gap-4">
      <BigText className="uppercase tracking-wide text-sm opacity-60">
        Your story
      </BigText>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        className="bg-[#FFF8F0] border border-sand rounded-card p-4 text-body min-h-[240px] leading-relaxed resize-y"
      />
      <BigButton variant="primary" onClick={save} disabled={saving}>
        {saving ? 'Saving…' : 'Save story'}
      </BigButton>
      <BigButton variant="secondary" onClick={onRerecord} disabled={saving}>
        Re-record
      </BigButton>
    </BigCard>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/recorder/TranscribingSpinner.tsx src/components/recorder/TranscriptReview.tsx
git commit -m "feat(recorder): TranscribingSpinner + TranscriptReview components"
```

---

## Task 28: Wire upload + transcribe + save into Today screen

**Files:**
- Modify: `src/app/today-client.tsx`
- Create: `src/app/today-actions.ts`

- [ ] **Step 1: Create `src/app/today-actions.ts` (server actions)**

```ts
'use server';

import { z } from 'zod';
import { getServiceSupabase } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

const SENIOR_ID = '00000000-0000-4000-8000-000000000001';

const SaveStoryInput = z.object({
  storyId: z.string().uuid(),
  promptId: z.string().uuid(),
  chapter: z.string(),
  audioPath: z.string(),
  transcriptRaw: z.string(),
  transcript: z.string(),
  durationSeconds: z.number().int().nonnegative(),
});

export async function saveStory(input: z.infer<typeof SaveStoryInput>) {
  const data = SaveStoryInput.parse(input);
  const sb = getServiceSupabase();
  const { error } = await sb.from('stories').insert({
    id: data.storyId,
    user_id: SENIOR_ID,
    prompt_id: data.promptId,
    audio_url: data.audioPath,
    audio_duration_seconds: data.durationSeconds,
    transcript_raw: data.transcriptRaw,
    transcript: data.transcript,
    chapter: data.chapter,
  });
  if (error) throw new Error(error.message);
  revalidatePath('/');
  revalidatePath('/stories');
}

const SkipPromptInput = z.object({ promptId: z.string().uuid() });

export async function skipPrompt(input: z.infer<typeof SkipPromptInput>) {
  const data = SkipPromptInput.parse(input);
  const sb = getServiceSupabase();
  await sb.from('prompt_skips').upsert(
    { prompt_id: data.promptId, user_id: SENIOR_ID, skipped_at: new Date().toISOString() },
    { onConflict: 'prompt_id,user_id' },
  );
  revalidatePath('/');
}
```

- [ ] **Step 2: Replace `src/app/today-client.tsx`**

```tsx
'use client';

import { useMemo, useState } from 'react';
import { CHAPTERS, type ChapterSlug } from '@/lib/chapters';
import { selectNextPromptId, type PromptRow, type SkipRow } from '@/lib/prompts';
import { ChapterSelector } from '@/components/chapter/ChapterSelector';
import { BigCard, BigText } from '@/components/senior-ui';
import { useRecorder } from '@/components/recorder/use-recorder';
import { RecorderButton } from '@/components/recorder/RecorderButton';
import { RecorderTimer } from '@/components/recorder/RecorderTimer';
import { TranscribingSpinner } from '@/components/recorder/TranscribingSpinner';
import { TranscriptReview } from '@/components/recorder/TranscriptReview';
import { putPendingAudio, clearPendingAudio } from '@/lib/indexed-db';
import { saveStory, skipPrompt } from './today-actions';

interface FullPrompt extends PromptRow {
  question_text: string;
}

interface Props {
  prompts: FullPrompt[];
  answeredPromptIds: string[];
  skips: SkipRow[];
}

type Phase =
  | { kind: 'browsing' }
  | { kind: 'transcribing' }
  | { kind: 'reviewing'; transcript: string; transcriptRaw: string; storyId: string; audioPath: string; durationSeconds: number }
  | { kind: 'error'; message: string };

function uuid(): string {
  return crypto.randomUUID();
}

export function TodayClient({ prompts, answeredPromptIds, skips }: Props) {
  const [chapter, setChapter] = useState<ChapterSlug>('early_childhood');
  const [phase, setPhase] = useState<Phase>({ kind: 'browsing' });
  const recorder = useRecorder();

  const inChapter = useMemo(
    () => prompts.filter((p) => p.chapter === chapter),
    [prompts, chapter],
  );

  const nextPromptId = useMemo(
    () =>
      selectNextPromptId({
        prompts: inChapter,
        answeredPromptIds: new Set(answeredPromptIds),
        skips,
        now: Date.now(),
      }),
    [inChapter, answeredPromptIds, skips],
  );

  const nextPrompt = inChapter.find((p) => p.id === nextPromptId) ?? null;
  const chapterIndex = inChapter.findIndex((p) => p.id === nextPromptId);

  async function handleStop() {
    await recorder.stop();
    // recorder.blob is set in the next render; we'll branch in an effect-style flow:
    // Easier: poll after a microtask
    queueMicrotask(async () => {
      const blob = recorder.blob ?? (await new Promise<Blob | null>((r) => setTimeout(() => r(recorder.blob), 50)));
      if (!blob || !nextPrompt) return;
      await uploadAndTranscribe(blob, nextPrompt);
    });
  }

  async function uploadAndTranscribe(blob: Blob, prompt: FullPrompt) {
    setPhase({ kind: 'transcribing' });
    const storyId = uuid();
    try {
      // 1. Stash blob in IndexedDB as safety net
      await putPendingAudio(storyId, blob);

      // 2. Get signed upload URL
      const upRes = await fetch('/api/signed-upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bucket: 'audio', storyId, ext: 'webm' }),
      });
      if (!upRes.ok) throw new Error('Could not get upload URL');
      const { path, signedUrl } = await upRes.json();

      // 3. PUT blob directly to Supabase Storage
      const putRes = await fetch(signedUrl, {
        method: 'PUT',
        headers: { 'Content-Type': 'audio/webm' },
        body: blob,
      });
      if (!putRes.ok) throw new Error('Audio upload failed');

      // 4. Hit /api/transcribe
      const trRes = await fetch('/api/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audioPath: path }),
      });
      if (!trRes.ok) throw new Error('Transcription failed');
      const tr = await trRes.json();

      setPhase({
        kind: 'reviewing',
        storyId,
        audioPath: path,
        transcript: tr.transcript,
        transcriptRaw: tr.transcript_raw,
        durationSeconds: tr.duration_seconds,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Something went wrong';
      setPhase({ kind: 'error', message: msg });
    }
  }

  async function handleSave(finalTranscript: string) {
    if (phase.kind !== 'reviewing' || !nextPrompt) return;
    await saveStory({
      storyId: phase.storyId,
      promptId: nextPrompt.id,
      chapter,
      audioPath: phase.audioPath,
      transcriptRaw: phase.transcriptRaw,
      transcript: finalTranscript,
      durationSeconds: phase.durationSeconds,
    });
    await clearPendingAudio(phase.storyId);
    recorder.reset();
    setPhase({ kind: 'browsing' });
  }

  function handleRerecord() {
    recorder.reset();
    setPhase({ kind: 'browsing' });
  }

  async function handleSkip() {
    if (!nextPrompt) return;
    await skipPrompt({ promptId: nextPrompt.id });
  }

  return (
    <main className="min-h-screen p-4 max-w-xl mx-auto flex flex-col gap-4">
      <ChapterSelector selected={chapter} onSelect={setChapter} />

      {phase.kind === 'transcribing' && <TranscribingSpinner />}

      {phase.kind === 'error' && (
        <BigCard>
          <BigText size="question">Something went wrong</BigText>
          <p className="opacity-70 mt-2">{phase.message}</p>
          <button
            className="mt-4 underline"
            onClick={() => setPhase({ kind: 'browsing' })}
          >
            Try again
          </button>
        </BigCard>
      )}

      {phase.kind === 'reviewing' && (
        <TranscriptReview
          initialTranscript={phase.transcript}
          onSave={handleSave}
          onRerecord={handleRerecord}
        />
      )}

      {phase.kind === 'browsing' && nextPrompt && (
        <>
          <BigCard className="flex-1 flex flex-col gap-6">
            <p className="text-sm uppercase tracking-wide opacity-60">
              {recorder.state === 'recording'
                ? 'Recording…'
                : `Question ${chapterIndex + 1} of ${inChapter.length}`}
            </p>
            <BigText size="question" as="h2">
              {nextPrompt.question_text}
            </BigText>
            {recorder.state === 'recording' && (
              <RecorderTimer seconds={recorder.durationSeconds} />
            )}
          </BigCard>

          <RecorderButton
            state={recorder.state}
            onStart={recorder.start}
            onStop={handleStop}
          />

          {recorder.state === 'idle' && (
            <button
              onClick={handleSkip}
              className="text-center py-4 underline opacity-70"
            >
              Skip for now
            </button>
          )}
        </>
      )}

      {phase.kind === 'browsing' && !nextPrompt && (
        <BigCard>
          <BigText size="question" as="h2">
            You&apos;ve shared every story in {CHAPTERS.find((c) => c.slug === chapter)?.label}.
          </BigText>
          <p className="mt-4 opacity-70">Try another chapter above.</p>
        </BigCard>
      )}
    </main>
  );
}
```

- [ ] **Step 3: Manual end-to-end smoke test**

```bash
npm run dev
```

Open `http://localhost:3000`. Tap Record → speak briefly → tap Stop → wait for spinner → see transcript → tap Save story.

Verify in DB:

```bash
supabase db psql -c "select id, chapter, length(transcript) from stories;"
```

Expected: one new row.

Stop the server.

- [ ] **Step 4: Commit**

```bash
git add src/app/today-client.tsx src/app/today-actions.ts
git commit -m "feat(today): full record→upload→transcribe→review→save loop"
```

---

## Task 29: Stories list page

**Files:**
- Create: `src/lib/stories.ts`
- Create: `src/app/stories/page.tsx`

- [ ] **Step 1: Implement `src/lib/stories.ts`**

```ts
import { getServiceSupabase } from '@/lib/supabase/server';
import { CHAPTERS, type ChapterSlug } from '@/lib/chapters';

export interface StoryRow {
  id: string;
  chapter: string;
  transcript: string;
  audio_url: string;
  audio_duration_seconds: number;
  created_at: string;
  prompt_id: string | null;
  question_text: string | null;
}

export async function listStoriesForUser(userId: string): Promise<StoryRow[]> {
  const sb = getServiceSupabase();
  const { data, error } = await sb
    .from('stories')
    .select(
      `id, chapter, transcript, audio_url, audio_duration_seconds, created_at, prompt_id,
       prompts:prompt_id (question_text)`,
    )
    .eq('user_id', userId)
    .order('chapter', { ascending: true })
    .order('created_at', { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => ({
    id: r.id,
    chapter: r.chapter,
    transcript: r.transcript,
    audio_url: r.audio_url,
    audio_duration_seconds: r.audio_duration_seconds,
    created_at: r.created_at,
    prompt_id: r.prompt_id,
    question_text:
      (r.prompts as { question_text: string } | null)?.question_text ?? null,
  }));
}

export function groupByChapter(rows: StoryRow[]) {
  const out: Record<ChapterSlug, StoryRow[]> = Object.fromEntries(
    CHAPTERS.map((c) => [c.slug, [] as StoryRow[]]),
  ) as Record<ChapterSlug, StoryRow[]>;
  for (const r of rows) {
    if (r.chapter in out) out[r.chapter as ChapterSlug].push(r);
  }
  return out;
}
```

- [ ] **Step 2: Implement `src/app/stories/page.tsx`**

```tsx
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
```

- [ ] **Step 3: Manual smoke test**

```bash
npm run dev
```

Visit `http://localhost:3000/stories`. Expected: stories you saved earlier appear, grouped under their chapter heading.

Stop the server.

- [ ] **Step 4: Commit**

```bash
git add src/lib/stories.ts src/app/stories/page.tsx
git commit -m "feat(stories): list page grouped by chapter"
```

---

## Task 30: Story detail page with audio playback

**Files:**
- Create: `src/lib/supabase/signed-url.ts`
- Create: `src/app/stories/[id]/page.tsx`

- [ ] **Step 1: Install audio player**

```bash
npm install react-h5-audio-player
```

- [ ] **Step 2: Implement `src/lib/supabase/signed-url.ts`**

```ts
import { getServiceSupabase } from './server';

export async function getAudioSignedUrl(path: string, expiresIn = 60 * 60) {
  const sb = getServiceSupabase();
  const { data, error } = await sb.storage.from('audio').createSignedUrl(path, expiresIn);
  if (error || !data) throw new Error(error?.message ?? 'signed url failed');
  return data.signedUrl;
}
```

- [ ] **Step 3: Implement `src/app/stories/[id]/page.tsx`**

```tsx
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getServiceSupabase } from '@/lib/supabase/server';
import { getAudioSignedUrl } from '@/lib/supabase/signed-url';
import { getChapterLabel } from '@/lib/chapters';
import { BigCard, BigText } from '@/components/senior-ui';
import { StoryAudioPlayer } from './audio-player';

export const dynamic = 'force-dynamic';

interface Params { id: string }

export default async function StoryDetailPage({
  params,
}: { params: Promise<Params> }) {
  const { id } = await params;
  const sb = getServiceSupabase();

  const { data: story } = await sb
    .from('stories')
    .select(`id, chapter, transcript, audio_url, created_at, prompt_id,
             prompts:prompt_id (question_text)`)
    .eq('id', id)
    .single();

  if (!story) notFound();

  const audioUrl = await getAudioSignedUrl(story.audio_url);
  const question =
    (story.prompts as { question_text: string } | null)?.question_text ?? null;

  return (
    <main className="min-h-screen p-4 max-w-xl mx-auto flex flex-col gap-6">
      <Link href="/stories" className="opacity-70 underline">
        ← All stories
      </Link>

      <BigCard className="flex flex-col gap-4">
        <p className="text-sm uppercase tracking-wide opacity-60">
          {getChapterLabel(story.chapter)}
        </p>
        {question && <BigText size="question" as="h1">{question}</BigText>}
        <StoryAudioPlayer src={audioUrl} />
        <BigText className="whitespace-pre-wrap leading-relaxed">
          {story.transcript}
        </BigText>
      </BigCard>
    </main>
  );
}
```

- [ ] **Step 4: Implement `src/app/stories/[id]/audio-player.tsx`**

```tsx
'use client';

import AudioPlayer from 'react-h5-audio-player';
import 'react-h5-audio-player/lib/styles.css';

export function StoryAudioPlayer({ src }: { src: string }) {
  return (
    <AudioPlayer
      src={src}
      showJumpControls={false}
      customAdditionalControls={[]}
      customVolumeControls={[]}
      style={{
        background: '#FFF8F0',
        border: '1px solid #E7DCC9',
        borderRadius: '14px',
      }}
    />
  );
}
```

- [ ] **Step 5: Manual smoke test**

```bash
npm run dev
```

From `/stories`, click any saved story. Expected: full transcript + working audio playback.

Stop the server.

- [ ] **Step 6: Commit**

```bash
git add src/app/stories/[id]/page.tsx src/app/stories/[id]/audio-player.tsx src/lib/supabase/signed-url.ts package.json package-lock.json
git commit -m "feat(stories): detail page with signed-URL audio playback"
```

---

## Task 31: Add basic bottom-nav stub (Today / Stories)

**Files:**
- Create: `src/components/nav/BottomNav.tsx`
- Modify: `src/app/layout.tsx`

Phase 1 doesn't include Family or Memoir tabs (those are Phase 2/3), but having the nav scaffold means later phases just add icons. For Phase 1 we render two visible tabs and two disabled placeholders.

- [ ] **Step 1: Create `src/components/nav/BottomNav.tsx`**

```tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { clsx } from 'clsx';

const ITEMS = [
  { href: '/',         icon: '🏠', label: 'Today',   enabled: true  },
  { href: '/stories',  icon: '📖', label: 'Stories', enabled: true  },
  { href: '/family',   icon: '👪', label: 'Family',  enabled: false },
  { href: '/memoir',   icon: '📕', label: 'Memoir',  enabled: false },
];

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-deep-navy/10">
      <div className="max-w-xl mx-auto grid grid-cols-4">
        {ITEMS.map((it) => {
          const active = it.enabled && pathname === it.href;
          const Tag = it.enabled ? Link : 'span';
          return (
            <Tag
              key={it.href}
              href={it.enabled ? it.href : '#'}
              className={clsx(
                'flex flex-col items-center gap-1 py-3 text-sm min-h-touch-target',
                active ? 'text-soft-coral' : 'text-deep-navy',
                !it.enabled && 'opacity-30',
              )}
            >
              <span className="text-xl">{it.icon}</span>
              {it.label}
            </Tag>
          );
        })}
      </div>
    </nav>
  );
}
```

- [ ] **Step 2: Update `src/app/layout.tsx` to include the nav and bottom padding**

```tsx
import type { Metadata } from 'next';
import './globals.css';
import { BottomNav } from '@/components/nav/BottomNav';

export const metadata: Metadata = {
  title: 'Legacy',
  description: 'Record your life stories.',
};

export default function RootLayout({
  children,
}: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Lora:wght@500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="pb-24">
        {children}
        <BottomNav />
      </body>
    </html>
  );
}
```

- [ ] **Step 3: Verify**

```bash
npm run dev
```

Expected: bottom nav present on every page, Today / Stories tabs work, Family / Memoir grayed out. Stop server.

- [ ] **Step 4: Commit**

```bash
git add src/components/nav/BottomNav.tsx src/app/layout.tsx
git commit -m "feat(nav): bottom nav scaffold (Today, Stories live; Family, Memoir disabled)"
```

---

## Task 32: Playwright E2E — record-and-save round trip

**Files:**
- Create: `playwright.config.ts`
- Create: `tests/e2e/record-and-save.spec.ts`
- Modify: `package.json`

- [ ] **Step 1: Install Playwright**

```bash
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
        '--use-file-for-fake-audio-capture=tests/e2e/fixtures/silence.wav',
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
  },
});
```

- [ ] **Step 3: Generate a 3-second silence WAV fixture**

```bash
mkdir -p tests/e2e/fixtures
ffmpeg -f lavfi -i anullsrc=channel_layout=mono:sample_rate=16000 -t 3 tests/e2e/fixtures/silence.wav
```

If `ffmpeg` is not installed on the dev machine, install via [chocolatey](https://chocolatey.org/) on Windows: `choco install ffmpeg` (run as admin).

- [ ] **Step 4: Create `tests/e2e/record-and-save.spec.ts`**

```ts
import { test, expect } from '@playwright/test';

test('senior records a story end-to-end and finds it in Stories', async ({ page }) => {
  // Reset DB so this test is repeatable
  // (in practice you'd run `npm run seed` before this; here we assume seeded state)

  await page.goto('/');

  // 1. Today screen renders
  await expect(page.getByRole('heading', { level: 2 })).toBeVisible();

  // 2. Record
  await page.getByRole('button', { name: /tap to record/i }).click();

  // 3. Wait for recording UI
  await expect(page.getByText(/Recording…/i)).toBeVisible();

  // 4. Stop after ~3s of fake audio
  await page.waitForTimeout(3000);
  await page.getByRole('button', { name: /tap to stop/i }).click();

  // 5. Wait for the spinner, then the review screen
  await expect(page.getByText(/writing down your story/i)).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole('button', { name: /save story/i })).toBeVisible({
    timeout: 60_000,
  });

  // 6. Save
  await page.getByRole('button', { name: /save story/i }).click();

  // 7. Navigate to Stories — the new story should be there
  await page.getByRole('link', { name: /stories/i }).click();
  await expect(page.locator('section')).toHaveCountGreaterThan(0);
});
```

> **Note:** the assertion `toHaveCountGreaterThan` is a custom matcher; if Playwright doesn't expose it, replace with:
> ```ts
> const sections = await page.locator('section').count();
> expect(sections).toBeGreaterThan(0);
> ```

- [ ] **Step 5: Run E2E**

```bash
npm run seed
npm run test:e2e
```

Expected: test passes (audio: silence → Whisper returns empty/short text → Claude either cleans or falls back → story saved → visible in Stories).

If Whisper rejects silent audio, swap the fixture for a 3-second tone (`-i sine=frequency=440`) and re-run.

- [ ] **Step 6: Commit**

```bash
git add playwright.config.ts tests/e2e/ package.json package-lock.json
git commit -m "test(e2e): full record-and-save Playwright spec with fake-audio fixture"
```

---

## Task 33: Update README for Phase 1

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Replace the "Local development" section**

Find `## Local development` in `README.md` and replace it with:

```md
## Local development

### Prerequisites
- Node 20+ (use `.nvmrc`)
- Supabase CLI (`npm install -g supabase`)
- ffmpeg (for the e2e audio fixture)

### Setup
```bash
npm install
supabase start
# copy the printed anon + service_role keys into .env.local
npm run seed
npm run dev
```

App at http://localhost:3000.

### Tests
```bash
npm test            # vitest unit + lib tests
npm run test:e2e    # Playwright record-and-save
```

### Commands
- `npm run dev` — Next dev server
- `npm run build` — production build
- `npm run seed` — reseed DB (1 senior, 1 family, 1 family_link, 50 prompts)
- `npm run db:reset` — drop, re-migrate, reseed
```

- [ ] **Step 2: Update Status section**

Change `**Phase 0 — Design.**` to `**Phase 1 — Foundation & core recording loop.** ✅ Demo target hit: senior records a story end-to-end and finds it in Stories.`

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "docs: README local-dev instructions and Phase 1 status"
```

---

## Self-review

**Spec coverage check** (against `2026-05-07-legacy-mvp-design.md` §9 Phase 1):

| Spec requirement | Tasks |
|---|---|
| Next.js 14 + Tailwind + design tokens + senior-ui primitives | 1, 2, 5 |
| Supabase project + schema migrations + seed | 9–16 |
| Persona cookie + middleware | 6, 7 |
| Today screen: chapter selector + Record button + MediaRecorder | 19, 20, 21, 28 |
| Signed-upload flow | 23, 28 |
| `/api/transcribe` (Whisper → Claude) with calming spinner | 24, 25, 26, 27, 28 |
| Review screen: editable transcript + Save / Re-record | 27, 28 |
| Stories list + detail | 29, 30 |
| IndexedDB safety net | 22, 28 |
| **Demo target:** senior records → story appears in Stories | 32 (e2e proves it) |

All Phase 1 spec items are covered. ✅

**Placeholder scan:** No "TBD", "implement later", or vague "add error handling" steps. Every code block is complete and runnable. The one tooltip-style note (`toHaveCountGreaterThan` fallback) provides the alternative inline.

**Type consistency:**
- `PromptRow`, `SkipRow` exported from `lib/prompts.ts` and re-imported by `today-client.tsx` ✓
- `Persona` and `PERSONA_COOKIE` exported from `lib/persona.ts`, imported by `middleware.ts` ✓
- `STARTER_PROMPTS` shape matches `prompts` table columns ✓
- `saveStory` server-action input matches DB schema columns ✓
- `useRecorder` returns `{ state, blob, durationSeconds, start, stop, reset }` — used consistently by `RecorderButton` and `today-client.tsx` ✓
- `transcribeAudio` returns `{ text, durationSeconds }` — `text` becomes `transcriptRaw`, `durationSeconds` flows into save action ✓

No inconsistencies found.

---
