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
