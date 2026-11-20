-- Keep profiles without a real display name and city out of member discovery.
-- Additive hardening: existing age_verifications remains the single server-controlled age source.
-- Apply through the reviewed Supabase migration workflow; this file does not change production by itself.

-- Replace the deployed permissive policy by its actual name. PostgreSQL ORs
-- permissive policies, so leaving the old policy in place would bypass this gate.
drop policy if exists profiles_read_discoverable_adults on public.profiles;
create policy profiles_read_discoverable_adults on public.profiles
for select to authenticated using (
  id = (select auth.uid()) or (
    private.is_adult_verified(id)
    and not private.is_blocked_between((select auth.uid()), id)
    and (
      (
        is_discoverable = true
        and nullif(btrim(display_name), '') is not null
        and lower(btrim(display_name)) <> 'new member'
        and nullif(btrim(city), '') is not null
      )
      or exists (
        select 1 from public.friendships f
        where f.status in ('pending', 'accepted')
          and ((f.requester_id = (select auth.uid()) and f.addressee_id = profiles.id)
            or (f.addressee_id = (select auth.uid()) and f.requester_id = profiles.id))
      )
    )
  )
);

create or replace function public.discover_profiles(p_intent text, p_limit integer default 20)
returns table (
  id uuid,
  display_name text,
  bio text,
  avatar_path text,
  country_code text,
  region text,
  city text,
  friends_enabled boolean,
  dating_enabled boolean
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
  if p_intent is null or p_intent not in ('friends', 'dating') then
    raise exception 'invalid intent' using errcode = '22023';
  end if;
  p_limit := least(greatest(coalesce(p_limit, 20), 1), 50);
  if not private.is_adult_verified(v_user) then
    raise exception 'adult verification required' using errcode = '42501';
  end if;

  return query
  select p.id, p.display_name, p.bio, p.avatar_path, p.country_code, p.region,
         p.city, p.friends_enabled, p.dating_enabled
  from public.profiles p
  where p.id <> v_user
    and p.is_discoverable
    and nullif(btrim(p.display_name), '') is not null
    and lower(btrim(p.display_name)) <> 'new member'
    and nullif(btrim(p.city), '') is not null
    and private.is_adult_verified(p.id)
    and case when p_intent = 'friends' then p.friends_enabled else p.dating_enabled end
    and not private.is_blocked_between(v_user, p.id)
    and not exists (
      select 1 from public.profile_swipes s
      where s.swiper_id = v_user and s.target_id = p.id
    )
    and not exists (
      select 1 from public.friendships f
      where f.status in ('pending', 'accepted')
        and ((f.requester_id = v_user and f.addressee_id = p.id)
          or (f.requester_id = p.id and f.addressee_id = v_user))
    )
  order by p.updated_at desc
  limit p_limit;
end;
$$;

revoke all on function public.discover_profiles(text, integer) from public, anon;
grant execute on function public.discover_profiles(text, integer) to authenticated;

-- Swipe writes enforce the same eligibility constraints even if the client is bypassed.
create or replace function public.submit_profile_swipe(
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
         and nullif(btrim(p.city), '') is not null
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

-- Incoming likes should not reveal members whose profile setup is incomplete.
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
    and nullif(btrim(p.display_name), '') is not null
    and lower(btrim(p.display_name)) <> 'new member'
    and nullif(btrim(p.city), '') is not null
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

revoke all on function public.list_incoming_dating_likes() from public, anon;
grant execute on function public.list_incoming_dating_likes() to authenticated;
