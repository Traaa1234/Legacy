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
