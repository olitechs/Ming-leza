-- Phase 3: create mutual dating matches from reciprocal likes.
-- All writes remain behind authenticated SECURITY DEFINER RPCs; no production DB is changed here.

create table if not exists public.dating_matches (
  id uuid primary key default gen_random_uuid(),
  user_low_id uuid not null references auth.users(id) on delete cascade,
  user_high_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  status text not null default 'active' check (status in ('active', 'unmatched')),
  unmatched_by uuid references auth.users(id) on delete set null,
  unmatched_at timestamptz,
  constraint dating_matches_ordered_pair check (user_low_id < user_high_id),
  constraint dating_matches_unmatch_state check (
    (status = 'active' and unmatched_at is null)
    or (status = 'unmatched' and unmatched_at is not null)
  ),
  constraint dating_matches_pair_unique unique (user_low_id, user_high_id)
);

create index if not exists dating_matches_low_active_idx
  on public.dating_matches (user_low_id, created_at desc) where status = 'active';
create index if not exists dating_matches_high_active_idx
  on public.dating_matches (user_high_id, created_at desc) where status = 'active';

alter table public.dating_matches enable row level security;
revoke all on public.dating_matches from anon, authenticated;
grant select on public.dating_matches to authenticated;

drop policy if exists dating_matches_read_active_participant on public.dating_matches;
create policy dating_matches_read_active_participant
  on public.dating_matches for select to authenticated
  using (
    status = 'active'
    and (user_low_id = (select auth.uid()) or user_high_id = (select auth.uid()))
    and not private.is_blocked_between(
      (select auth.uid()),
      case when user_low_id = (select auth.uid()) then user_high_id else user_low_id end
    )
  );

-- The RPC now returns a match ID when a reciprocal like creates or finds an active match.
drop function if exists public.submit_profile_swipe(uuid, text);
create function public.submit_profile_swipe(
  p_target_id uuid,
  p_decision text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_match_id uuid;
begin
  if v_user is null then
    raise exception 'authentication required' using errcode = '28000';
  end if;
  if p_target_id is null or p_target_id = v_user
     or p_decision is null or p_decision not in ('like', 'pass') then
    raise exception 'invalid swipe' using errcode = '22023';
  end if;
  if not private.is_adult_verified(v_user)
     or not private.is_adult_verified(p_target_id) then
    raise exception 'adult verification required' using errcode = '42501';
  end if;
  if private.is_blocked_between(v_user, p_target_id)
     or not exists (
       select 1 from public.profiles p
       where p.id = p_target_id
         and p.is_discoverable
         and p.dating_enabled
         and nullif(btrim(p.display_name), '') is not null
         and lower(btrim(p.display_name)) <> 'new member'
     ) then
    raise exception 'profile unavailable' using errcode = '42501';
  end if;

  insert into public.profile_swipes (swiper_id, target_id, decision)
  values (v_user, p_target_id, p_decision)
  on conflict (swiper_id, target_id)
  do update set decision = excluded.decision, updated_at = now();

  if p_decision = 'like' and exists (
    select 1 from public.profile_swipes s
    where s.swiper_id = p_target_id
      and s.target_id = v_user
      and s.decision = 'like'
  ) then
    insert into public.dating_matches (user_low_id, user_high_id)
    values (least(v_user, p_target_id), greatest(v_user, p_target_id))
    on conflict (user_low_id, user_high_id) do nothing;

    select m.id into v_match_id
    from public.dating_matches m
    where m.user_low_id = least(v_user, p_target_id)
      and m.user_high_id = greatest(v_user, p_target_id)
      and m.status = 'active';
  end if;

  return v_match_id;
end;
$$;

revoke all on function public.submit_profile_swipe(uuid, text) from public, anon;
grant execute on function public.submit_profile_swipe(uuid, text) to authenticated;

create or replace function public.list_incoming_dating_likes()
returns table (
  liker_id uuid,
  liked_at timestamptz,
  display_name text,
  avatar_path text,
  city text,
  region text,
  country_code text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then
    raise exception 'authentication required' using errcode = '28000';
  end if;
  if not private.is_adult_verified(v_user) then
    raise exception 'adult verification required' using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.profiles me
    where me.id = v_user and me.is_discoverable and me.dating_enabled
  ) then
    return;
  end if;

  return query
  select s.swiper_id, s.created_at, p.display_name, p.avatar_path, p.city, p.region, p.country_code
  from public.profile_swipes s
  join public.profiles p on p.id = s.swiper_id
  where s.target_id = v_user
    and s.decision = 'like'
    and p.is_discoverable
    and p.dating_enabled
    and private.is_adult_verified(p.id)
    and not private.is_blocked_between(v_user, p.id)
    and not exists (
      select 1 from public.profile_swipes own
      where own.swiper_id = v_user and own.target_id = p.id
    )
  order by s.created_at desc
  limit 50;
end;
$$;

create or replace function public.list_my_dating_matches()
returns table (
  match_id uuid,
  matched_at timestamptz,
  other_user_id uuid,
  display_name text,
  avatar_path text,
  city text,
  region text,
  country_code text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then
    raise exception 'authentication required' using errcode = '28000';
  end if;
  if not private.is_adult_verified(v_user) then
    raise exception 'adult verification required' using errcode = '42501';
  end if;

  return query
  select m.id, m.created_at,
         case when m.user_low_id = v_user then m.user_high_id else m.user_low_id end,
         p.display_name, p.avatar_path, p.city, p.region, p.country_code
  from public.dating_matches m
  join public.profiles p
    on p.id = case when m.user_low_id = v_user then m.user_high_id else m.user_low_id end
  where m.status = 'active'
    and (m.user_low_id = v_user or m.user_high_id = v_user)
    and private.is_adult_verified(p.id)
    and not private.is_blocked_between(v_user, p.id)
  order by m.created_at desc
  limit 100;
end;
$$;

create or replace function public.unmatch_dating_profile(p_match_id uuid)
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
  if not private.is_adult_verified(v_user) then
    raise exception 'adult verification required' using errcode = '42501';
  end if;

  update public.dating_matches
  set status = 'unmatched', unmatched_by = v_user, unmatched_at = now()
  where id = p_match_id
    and status = 'active'
    and (user_low_id = v_user or user_high_id = v_user);
  if not found then
    raise exception 'match unavailable' using errcode = '42501';
  end if;
end;
$$;

revoke all on function public.list_incoming_dating_likes() from public, anon;
revoke all on function public.list_my_dating_matches() from public, anon;
revoke all on function public.unmatch_dating_profile(uuid) from public, anon;
grant execute on function public.list_incoming_dating_likes() to authenticated;
grant execute on function public.list_my_dating_matches() to authenticated;
grant execute on function public.unmatch_dating_profile(uuid) to authenticated;
