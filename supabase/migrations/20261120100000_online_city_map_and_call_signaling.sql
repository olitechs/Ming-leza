-- Opt-in online city clusters and conversation-scoped WebRTC signaling.
-- No precise location is collected; call signals are ephemeral Realtime Broadcasts.

create table public.user_presence (
  user_id uuid primary key references auth.users(id) on delete cascade,
  last_seen_at timestamptz not null default now()
);
create index user_presence_last_seen_idx on public.user_presence(last_seen_at desc);
alter table public.user_presence enable row level security;
revoke all on public.user_presence from anon, authenticated;
grant select, insert, update, delete on public.user_presence to authenticated;
create policy user_presence_self_only on public.user_presence
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create or replace function public.heartbeat_my_presence()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then
    raise exception 'authentication required' using errcode = '28000';
  end if;

  if not public.is_adult_verified(v_user) or not exists (
    select 1 from public.user_preferences p
    where p.user_id = v_user and p.show_online_status = true
  ) then
    delete from public.user_presence where user_id = v_user;
    return;
  end if;

  insert into public.user_presence (user_id, last_seen_at)
  values (v_user, now())
  on conflict (user_id) do update set last_seen_at = excluded.last_seen_at;
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
    join public.age_verifications age on age.user_id = p.id and age.is_18_plus = true
    cross join viewer
    where presence.last_seen_at >= now() - interval '90 seconds'
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
  group by lower(btrim(eligible.city)), lower(coalesce(btrim(eligible.region), '')), eligible.country_code
  having count(*) >= 3
  order by count(*) desc, min(btrim(eligible.city))
  limit 30;
$$;
revoke all on function public.get_live_city_presence() from public, anon;
grant execute on function public.get_live_city_presence() to authenticated;

-- Realtime call channels accept signals only for a two-person conversation between
-- verified adult members who still have an accepted friendship and no mutual block.
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
  if not public.is_adult_verified(v_user) or not public.is_adult_verified(v_other)
     or private.is_blocked_between(v_user, v_other)
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

-- Supabase keeps RLS enabled on realtime.messages; do not ALTER TABLE here.
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
