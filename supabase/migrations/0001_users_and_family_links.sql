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
