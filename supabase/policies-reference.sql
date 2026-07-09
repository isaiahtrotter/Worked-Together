-- Reference only — NOT executed automatically, and not applied by this repo.
-- Run manually in the Supabase SQL editor if the dashboard hits a 403/permission
-- error on one of these actions. Column/table names assumed from the existing
-- prototype files (test-locally.html, login-test.html); adjust if they differ.
--
-- profiles.user_id is assumed to be a uuid column referencing auth.users(id).
-- connection_requests.requester_id / recipient_id and connection_notes.profile_id /
-- work_samples.profile_id are assumed to reference profiles(id).

-- 1. Let a signed-in user search other people's profiles by name (needed for
--    "Find someone" on the Connections page). Only exposes id/name/avatar_url
--    at the column level via the app's query, but RLS itself is row-level —
--    if you want to restrict which columns are visible to other users, do
--    that with a view instead of loosening the base table's SELECT policy.
create policy "authenticated users can search profiles by name"
  on public.profiles for select
  to authenticated
  using (true);

-- 2. Let a user update their own profile row.
create policy "users can update own profile"
  on public.profiles for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 3. connection_requests: send, view, and respond to requests.
create policy "users can view own connection requests"
  on public.connection_requests for select
  to authenticated
  using (
    requester_id in (select id from public.profiles where user_id = auth.uid())
    or recipient_id in (select id from public.profiles where user_id = auth.uid())
  );

create policy "users can send connection requests as themselves"
  on public.connection_requests for insert
  to authenticated
  with check (
    requester_id in (select id from public.profiles where user_id = auth.uid())
  );

create policy "recipients can respond to connection requests"
  on public.connection_requests for update
  to authenticated
  using (
    recipient_id in (select id from public.profiles where user_id = auth.uid())
  );

-- 4. connection_notes: a user's private notes about their own connections.
--    The dashboard upserts on (connection_request_id, profile_id) — add a
--    unique constraint on that pair if one doesn't already exist:
--    alter table public.connection_notes
--      add constraint connection_notes_request_profile_unique
--      unique (connection_request_id, profile_id);
create policy "users can manage own connection notes"
  on public.connection_notes for all
  to authenticated
  using (
    profile_id in (select id from public.profiles where user_id = auth.uid())
  )
  with check (
    profile_id in (select id from public.profiles where user_id = auth.uid())
  );

-- 5. work_samples: a user manages their own portfolio items.
create policy "users can manage own work samples"
  on public.work_samples for all
  to authenticated
  using (
    profile_id in (select id from public.profiles where user_id = auth.uid())
  )
  with check (
    profile_id in (select id from public.profiles where user_id = auth.uid())
  );

-- 6. Per-user widget appearance settings (corner radius / theme / shadow).
--    One jsonb column so more knobs can be added later without another
--    migration. Defaults match today's hardcoded widget values.
alter table public.profiles
  add column if not exists widget_settings jsonb
  default '{"theme":"light","cornerRadius":24,"shadow":true}'::jsonb;

-- 7. Storage: "avatars" and "work-samples" buckets already exist per Isaiah.
--    These policies assume the upload path convention used by the app:
--      avatars:       {profile_id}.{ext}
--      work-samples:  {profile_id}/{uuid}.{ext}
--    i.e. the first path segment (or the whole filename for avatars) is the
--    uploader's own profile id. Public SELECT is required because the
--    embedded widget is viewed by anonymous visitors on other people's sites.
create policy "public can view avatars"
  on storage.objects for select
  to public
  using (bucket_id = 'avatars');

create policy "public can view work samples"
  on storage.objects for select
  to public
  using (bucket_id = 'work-samples');

create policy "users can manage own avatar file"
  on storage.objects for all
  to authenticated
  using (
    bucket_id = 'avatars'
    and split_part(name, '.', 1) in (
      select id::text from public.profiles where user_id = auth.uid()
    )
  )
  with check (
    bucket_id = 'avatars'
    and split_part(name, '.', 1) in (
      select id::text from public.profiles where user_id = auth.uid()
    )
  );

create policy "users can manage own work sample files"
  on storage.objects for all
  to authenticated
  using (
    bucket_id = 'work-samples'
    and split_part(name, '/', 1) in (
      select id::text from public.profiles where user_id = auth.uid()
    )
  )
  with check (
    bucket_id = 'work-samples'
    and split_part(name, '/', 1) in (
      select id::text from public.profiles where user_id = auth.uid()
    )
  );
