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

-- Lets a requester cancel (delete) their own still-pending outgoing request.
create policy "requesters can cancel own connection requests"
  on public.connection_requests for delete
  to authenticated
  using (
    requester_id in (select id from public.profiles where user_id = auth.uid())
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

-- 8. Profile banner image. Reuses the existing "avatars" bucket/policy above
--    with path "<profile_id>.banner.<ext>" — a uuid never contains ".", so
--    split_part(name, '.', 1) still equals the profile id and no new
--    storage policy is needed, just the column.
alter table public.profiles
  add column if not exists banner_url text;

-- 9. endorsements: public recommendations one connection writes about
--    another (distinct from connection_notes, which are private). Viewed by
--    anonymous visitors on the embed, so SELECT is public. The app upserts
--    on (from_profile_id, to_profile_id) — add a unique constraint on that
--    pair if one doesn't already exist:
--    alter table public.endorsements
--      add constraint endorsements_from_to_unique
--      unique (from_profile_id, to_profile_id);
create policy "public can view endorsements"
  on public.endorsements for select
  to public
  using (true);

create policy "users can manage own endorsements"
  on public.endorsements for all
  to authenticated
  using (
    from_profile_id in (select id from public.profiles where user_id = auth.uid())
  )
  with check (
    from_profile_id in (select id from public.profiles where user_id = auth.uid())
  );

-- 10. Placeholder ("added without an account") profiles — added when someone
--     connects to a person who hasn't signed up yet, just a name + one link.
--     user_id is null for a placeholder. placeholder_owner_id tracks who
--     added it (only they can edit/merge/delete it). merge_dismissed_target_id
--     remembers a rejected merge suggestion so it stops reappearing for that
--     specific candidate. Merging repoints the existing connection_requests
--     row (and reassigns endorsements) onto the real profile, then deletes
--     the placeholder — see mergeProfiles in
--     src/app/dashboard/connections/actions.ts.
alter table public.profiles
  alter column user_id drop not null;  -- run only if it's currently NOT NULL

alter table public.profiles
  add column if not exists placeholder_owner_id uuid references public.profiles(id);

alter table public.profiles
  add column if not exists merge_dismissed_target_id uuid references public.profiles(id);

-- A policy ON profiles whose own condition subqueries profiles again (to
-- look up "my own profile id") causes Postgres to re-apply that same
-- policy to the inner subquery, forever — "infinite recursion detected in
-- policy for relation profiles" (42P17). A SECURITY DEFINER function
-- breaks the cycle: it runs with the function owner's privileges, which
-- bypass RLS, so the lookup inside it never re-triggers these policies.
create or replace function public.my_profile_id()
returns uuid
language sql
security definer
stable
set search_path = public
as $$
  select id from public.profiles where user_id = auth.uid()
$$;

create policy "users can create placeholder profiles they own"
  on public.profiles for insert
  to authenticated
  with check (
    user_id is null
    and placeholder_owner_id = public.my_profile_id()
  );

create policy "owners can manage their placeholder profiles"
  on public.profiles for all
  to authenticated
  using (
    user_id is null
    and placeholder_owner_id = public.my_profile_id()
  )
  with check (
    user_id is null
    and placeholder_owner_id = public.my_profile_id()
  );

-- Storage: let an owner upload an avatar for their placeholder the same way
-- they upload their own (path convention unchanged: {profile_id}.{ext}).
create policy "owners can manage their placeholder's avatar file"
  on storage.objects for all
  to authenticated
  using (
    bucket_id = 'avatars'
    and split_part(name, '.', 1) in (
      select id::text from public.profiles
      where placeholder_owner_id = public.my_profile_id()
    )
  )
  with check (
    bucket_id = 'avatars'
    and split_part(name, '.', 1) in (
      select id::text from public.profiles
      where placeholder_owner_id = public.my_profile_id()
    )
  );

-- 11. Let either side of an already-accepted connection remove it (not just
--     the requester cancelling a still-pending one, per policy 3 above).
--     Additive — Postgres OR's multiple policies for the same action
--     together, so this doesn't need to touch the existing delete policy.
create policy "either side can remove an accepted connection"
  on public.connection_requests for delete
  to authenticated
  using (
    status = 'accepted'
    and (
      requester_id in (select id from public.profiles where user_id = auth.uid())
      or recipient_id in (select id from public.profiles where user_id = auth.uid())
    )
  );

-- 12. Merging a placeholder is no longer instant. "Merge" now sends a normal
--     connection invitation to the real account; only once THEY accept it
--     does the placeholder actually fold into their profile (endorsements
--     reassigned, the placeholder deleted). merge_placeholder_id marks a
--     pending connection_requests row as "accepting this also finalizes a
--     merge." Both finalize_placeholder_merge and accept_connection_request
--     are SECURITY DEFINER: finalizing a merge has to touch rows owned by
--     whichever side didn't initiate it (the placeholder's own
--     connection_requests/connection_notes rows belong to its owner, and
--     any endorsement being reassigned may have been written by a third
--     party entirely), which plain RLS as either party can't reach.
-- on delete set null: if the placeholder gets deleted (deletePlaceholderConnection)
-- while an invitation sent on its behalf is still pending, the invitation
-- itself shouldn't be blocked/destroyed -- it just stops being a merge and
-- becomes a normal connection request.
alter table public.connection_requests
  add column if not exists merge_placeholder_id uuid references public.profiles(id) on delete set null;

create or replace function public.finalize_placeholder_merge(placeholder_id uuid, target_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  placeholder_owner uuid;
begin
  select placeholder_owner_id into placeholder_owner
  from public.profiles
  where id = placeholder_id and user_id is null;

  if placeholder_owner is null then
    raise exception 'Not a placeholder profile';
  end if;

  -- Only the placeholder's own owner, or the account it's being merged
  -- into, may trigger this -- and only once the two are for-real connected
  -- (checked here independently of whoever calls this, since it's directly
  -- callable via rpc()).
  if public.my_profile_id() is distinct from placeholder_owner
     and public.my_profile_id() is distinct from target_id then
    raise exception 'Not authorized to merge this profile';
  end if;

  if not exists (
    select 1 from public.connection_requests
    where status = 'accepted'
      and (
        (requester_id = placeholder_owner and recipient_id = target_id)
        or (requester_id = target_id and recipient_id = placeholder_owner)
      )
  ) then
    raise exception 'Not connected yet -- send a merge invitation instead';
  end if;

  update public.endorsements set to_profile_id = target_id where to_profile_id = placeholder_id;
  update public.endorsements set from_profile_id = target_id where from_profile_id = placeholder_id;

  delete from public.connection_notes
    where connection_request_id in (
      select id from public.connection_requests
      where requester_id = placeholder_owner and recipient_id = placeholder_id
    );
  delete from public.connection_requests
    where requester_id = placeholder_owner and recipient_id = placeholder_id;

  delete from public.profiles where id = placeholder_id;
end;
$$;

create or replace function public.accept_connection_request(request_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  req record;
  placeholder_owner uuid;
  merge_target uuid;
begin
  select * into req from public.connection_requests where id = request_id;
  if req is null then
    raise exception 'Request not found';
  end if;
  if req.recipient_id is distinct from public.my_profile_id() then
    raise exception 'Not authorized to respond to this request';
  end if;

  update public.connection_requests set status = 'accepted' where id = request_id;

  if req.merge_placeholder_id is not null then
    -- The merge target is whichever side of this request ISN'T the
    -- placeholder's owner -- merge_placeholder_id can end up on a request
    -- that was already pending in the other direction (see
    -- inviteMergeConnection's "ride along on an existing request" branch),
    -- so don't assume requester = owner, recipient = target.
    select placeholder_owner_id into placeholder_owner
    from public.profiles where id = req.merge_placeholder_id;

    merge_target := case
      when req.requester_id = placeholder_owner then req.recipient_id
      else req.requester_id
    end;
    perform public.finalize_placeholder_merge(req.merge_placeholder_id, merge_target);
  end if;
end;
$$;

-- 13. Deleting your own account has to leave zero trace in anyone else's
--     network -- not just your own connection_requests, but the *other*
--     party's private note about you too (connection_notes' own policy
--     only lets its author manage it, so plain RLS as you can never
--     delete their note). SECURITY DEFINER breaks that restriction safely:
--     my_id is derived from auth.uid() inside the function, never taken
--     as a parameter, so this can only ever delete the caller's own
--     account. Called from deleteAccount in src/app/dashboard/actions.ts,
--     which then also deletes the actual auth.users row via the admin API
--     (see src/lib/supabase/admin.ts) if SUPABASE_SERVICE_ROLE_KEY is
--     configured.
--
--     Does NOT touch storage.objects -- Supabase runs a protective trigger
--     that blocks direct SQL DELETEs against it ("Direct deletion from
--     storage tables is not allowed. Use the Storage API instead."), since a
--     raw SQL delete would drop the metadata row without removing the
--     actual file from the object store. Avatar/work-sample files are
--     removed via supabase.storage...remove() in deleteAccount itself,
--     before this function runs.
create or replace function public.delete_own_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  my_id uuid;
  placeholder_id uuid;
begin
  my_id := public.my_profile_id();
  if my_id is null then
    raise exception 'No profile for this account';
  end if;

  -- Placeholders I added (never had their own account) -- delete
  -- everything attached to each one, then the placeholder itself.
  for placeholder_id in
    select id from public.profiles where placeholder_owner_id = my_id
  loop
    delete from public.connection_notes
      where connection_request_id in (
        select id from public.connection_requests
        where requester_id = placeholder_id or recipient_id = placeholder_id
      );
    delete from public.connection_requests
      where requester_id = placeholder_id or recipient_id = placeholder_id;
    delete from public.endorsements
      where from_profile_id = placeholder_id or to_profile_id = placeholder_id;
  end loop;

  delete from public.profiles where placeholder_owner_id = my_id;

  -- Every real connection I'm part of, including whichever note the OTHER
  -- side wrote about me -- otherwise it'd be an orphaned row only they
  -- could normally clean up.
  delete from public.connection_notes
    where connection_request_id in (
      select id from public.connection_requests
      where requester_id = my_id or recipient_id = my_id
    );
  delete from public.connection_requests
    where requester_id = my_id or recipient_id = my_id;

  delete from public.endorsements
    where from_profile_id = my_id or to_profile_id = my_id;

  delete from public.work_samples where profile_id = my_id;

  delete from public.profiles where id = my_id;
end;
$$;

-- 14. "First external load" -- the activation timestamp for a given user's
--     embed: the first time it genuinely loaded on a real external site, as
--     opposed to being copied but never installed, or only ever seen in the
--     dashboard's own live preview / the marketing demo. Written by
--     src/app/api/beacon/route.ts (via the service-role client -- an
--     anonymous visitor's beacon has no session to write through RLS with),
--     set once and never touched again.
alter table public.profiles
  add column if not exists first_external_load_at timestamptz;
