-- 0007 — story language

alter table stories
  add column language text not null default 'en';

-- BCP-47-style codes; we store the user's selected language at recording time.
-- Examples: en, zh, es, pt, fr, ko, ja, ar, hi, vi.

create index on stories (language);
