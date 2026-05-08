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
