-- 0006 — Enable RLS on all tables.
--
-- Phase 1 explicitly deferred auth, leaving RLS off. The anon Supabase key is
-- exposed in browser bundles, so anonymous clients could read/write any table
-- via PostgREST. Server-side code uses the service_role key, which bypasses RLS.
-- Enabling RLS with NO policies = default deny for anon, full access for service.
--
-- Real RLS policies that respect auth.uid() will land when auth is added
-- (Phase 4 / post-MVP). For now, this lockdown is correct and safe.

-- Drop the placeholder policies from 0005 — they reference auth.uid() and
-- only confuse the picture today.
drop policy if exists stories_senior_read on stories;
drop policy if exists stories_senior_write on stories;
drop policy if exists photos_read on photos;

-- Enable RLS on every public table.
alter table users            enable row level security;
alter table family_links     enable row level security;
alter table prompts          enable row level security;
alter table prompt_skips     enable row level security;
alter table stories          enable row level security;
alter table photos           enable row level security;
alter table family_questions enable row level security;
alter table reactions        enable row level security;

-- (Storage buckets are already private; signed URLs handle access.)
