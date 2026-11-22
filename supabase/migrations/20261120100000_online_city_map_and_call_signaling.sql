-- Compatible opt-in online city clusters and conversation-scoped WebRTC signaling.
-- Presence is maintained through security-definer RPCs; no location column is used.

-- The target project already has a presence table with additional legacy columns.
-- IF NOT EXISTS preserves that table and all existing rows and columns.
create table if not exists public.user_presence (
  user_id uuid primary key references auth.users(id) on delete cascade,
  last_seen_at timestamptz not null default now()
);
alter table public.user_presence
  add column if not exists last_seen_at timestamptz not null default now();
alter table public.user_presence
  add column if not exists is_online boolean not null default false;
alter table public.user_presence
  add column if not exists map_opt_in boolean not null default false;
alter table public.user_presence enable row level security;
create index if not exists user_presence_last_seen_idx
  on public.user_presence(last_seen_at desc);
create index if not exists user_presence_online_last_seen_idx
  on public.user_presence(last_seen_at desc)
  where is_online = true;

-- Preserve a stricter pre-existing deny-all policy when present. Fresh installations
-- retain the original self-only access pattern used by the local regression tests.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'user_presence'
      and policyname = 'user_presence_no_client_access'
  ) then
    execute 'grant select, insert, update, delete on public.user_presence to authenticated';
    if not exists (
      select 1 from pg_policies
      where schemaname = 'public'
        and tablename = 'user_presence'
        and policyname = 'user_presence_self_only'
    ) then
      execute $policy$
        create policy user_presence_self_only on public.user_presence
          for all to authenticated
          using (user_id = (select auth.uid()))
          with check (user_id = (select auth.uid()))
      $policy$;
    end if;
  end if;
end;
$$;

-- Online and map participation are separate, explicit opt-ins; existing users stay opted out.
create table if not exists public.user_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  show_online_status boolean not null default false,
  map_discovery_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.user_preferences
  add column if not exists show_online_status boolean not null default false;
alter table public.user_preferences
  add column if not exists map_discovery_enabled boolean not null default false;
alter table public.user_preferences enable row level security;
revoke all on public.user_preferences from public, anon;
grant select, insert, update, delete on public.user_preferences to authenticated;
drop policy if exists preferences_self_all on public.user_preferences;
create policy preferences_self_all on public.user_preferences
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- Ensure legacy conversations can be safely checked for one-to-one call topics.
-- Existing records with more than two members are classified as groups; all other
-- existing records retain the direct default because this schema had no kind field.
alter table public.conversations
  add column if not exists kind text not null default 'direct'
  check (kind in ('direct', 'group'));
update public.conversations c
set kind = 'group'
where c.kind = 'direct'
  and (select count(*) from public.conversation_members cm
       where cm.conversation_id = c.id) > 2;

create or replace function public.heartbeat_my_presence()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_show_online boolean := false;
  v_map_discovery boolean := false;
begin
  if v_user is null then
    raise exception 'authentication required' using errcode = '28000';
  end if;

  if not public.is_adult_verified(v_user) then
    update public.user_presence
       set is_online = false,
           map_opt_in = false
     where user_id = v_user;
    return;
  end if;

  select coalesce(p.show_online_status, false),
         coalesce(p.map_discovery_enabled, false)
    into v_show_online, v_map_discovery
  from public.user_preferences p
  where p.user_id = v_user;

  if not found or not v_show_online then
    -- Keep the row and any unrelated legacy data; only deactivate presence flags.
    update public.user_presence
       set is_online = false,
           map_opt_in = false
     where user_id = v_user;
    return;
  end if;

  insert into public.user_presence (user_id, last_seen_at, is_online, map_opt_in)
  values (v_user, now(), true, v_map_discovery)
  on conflict (user_id) do update
    set last_seen_at = excluded.last_seen_at,
        is_online = true,
        map_opt_in = excluded.map_opt_in;
end;
$$;
revoke all on function public.heartbeat_my_presence() from public, anon;
grant execute on function public.heartbeat_my_presence() to authenticated;

create or replace function public.get_live_city_presence()
returns table(city text, region text, country_code text, online_count integer)
language sql
stable
security definer
set search_path = ''
as $$
  with viewer as (
    select auth.uid() as user_id
    where auth.uid() is not null
      and public.is_adult_verified(auth.uid())
      and exists (
        select 1 from public.user_preferences mine
        where mine.user_id = auth.uid()
          and mine.show_online_status = true
          and mine.map_discovery_enabled = true
      )
  ), eligible as (
    select p.city, p.region, p.country_code, p.id
    from public.user_presence presence
    join public.profiles p on p.id = presence.user_id
    join public.user_preferences prefs on prefs.user_id = p.id
    join public.age_verifications age
      on age.user_id = p.id and age.is_18_plus = true
    cross join viewer
    where presence.is_online = true
      and presence.last_seen_at >= now() - interval '90 seconds'
      and p.is_discoverable = true
      and (p.friends_enabled = true or p.dating_enabled = true)
      and prefs.show_online_status = true
      and prefs.map_discovery_enabled = true
      and nullif(btrim(p.city), '') is not null
      and not exists (
        select 1 from public.blocks b
        where (b.blocker_id = viewer.user_id and b.blocked_id = p.id)
           or (b.blocker_id = p.id and b.blocked_id = viewer.user_id)
      )
  )
  select min(btrim(eligible.city)) as city,
         min(nullif(btrim(eligible.region), '')) as region,
         eligible.country_code,
         count(*)::integer as online_count
  from eligible
  group by lower(btrim(eligible.city)),
           lower(coalesce(btrim(eligible.region), '')),
           eligible.country_code
  having count(*) >= 3
  order by count(*) desc, min(btrim(eligible.city))
  limit 30;
$$;
revoke all on function public.get_live_city_presence() from public, anon;
grant execute on function public.get_live_city_presence() to authenticated;

-- Call signaling is limited to two verified adult members in an accepted friendship,
-- with mutual blocks checked before access. Signals remain ephemeral Realtime Broadcasts.
create or replace function public.can_access_call_topic(p_topic text)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_conversation_id uuid;
  v_members uuid[];
  v_other uuid;
begin
  if v_user is null or p_topic !~ '^call:[0-9a-fA-F-]{36}$' then
    return false;
  end if;

  begin
    v_conversation_id := substring(p_topic from 6)::uuid;
  exception when others then
    return false;
  end;

  if not exists (
    select 1 from public.conversations c
    where c.id = v_conversation_id and c.kind = 'direct'
  ) then
    return false;
  end if;

  select array_agg(cm.user_id order by cm.user_id)
    into v_members
  from public.conversation_members cm
  where cm.conversation_id = v_conversation_id;

  if coalesce(cardinality(v_members), 0) <> 2 or not (v_user = any(v_members)) then
    return false;
  end if;

  v_other := case when v_members[1] = v_user then v_members[2] else v_members[1] end;
  if not public.is_adult_verified(v_user)
     or not public.is_adult_verified(v_other)
     or exists (
       select 1 from public.blocks b
       where (b.blocker_id = v_user and b.blocked_id = v_other)
          or (b.blocker_id = v_other and b.blocked_id = v_user)
     )
     or not exists (
       select 1 from public.friendships f
       where f.status = 'accepted'
         and ((f.requester_id = v_user and f.addressee_id = v_other)
           or (f.requester_id = v_other and f.addressee_id = v_user))
     ) then
    return false;
  end if;

  return true;
end;
$$;
revoke all on function public.can_access_call_topic(text) from public, anon;
grant execute on function public.can_access_call_topic(text) to authenticated;

-- Supabase keeps RLS enabled on realtime.messages; do not alter the table itself.
drop policy if exists call_channel_receive on realtime.messages;
drop policy if exists call_channel_send on realtime.messages;
create policy call_channel_receive on realtime.messages
  for select to authenticated
  using (
    realtime.messages.extension = 'broadcast'
    and public.can_access_call_topic((select realtime.topic()))
  );
create policy call_channel_send on realtime.messages
  for insert to authenticated
  with check (
    realtime.messages.extension = 'broadcast'
    and public.can_access_call_topic((select realtime.topic()))
  );
