-- Phase 2: persist dating decisions without conflating them with friendship requests.
-- Additive only; no production database is changed by this repository commit.

create table if not exists public.profile_swipes (
  swiper_id uuid not null references auth.users(id) on delete cascade,
  target_id uuid not null references auth.users(id) on delete cascade,
  decision text not null check (decision in ('like', 'pass')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (swiper_id, target_id),
  constraint profile_swipes_not_self check (swiper_id <> target_id)
);

create index if not exists profile_swipes_target_decision_idx
  on public.profile_swipes (target_id, decision);

alter table public.profile_swipes enable row level security;
revoke all on public.profile_swipes from anon, authenticated;
grant select on public.profile_swipes to authenticated;

drop policy if exists profile_swipes_read_own on public.profile_swipes;
create policy profile_swipes_read_own
  on public.profile_swipes for select to authenticated
  using (swiper_id = (select auth.uid()));

create or replace function public.submit_profile_swipe(
  p_target_id uuid,
  p_decision text
)
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
end;
$$;

revoke all on function public.submit_profile_swipe(uuid, text) from public, anon;
grant execute on function public.submit_profile_swipe(uuid, text) to authenticated;

-- Once a dating decision is saved, keep that member out of the same user's dating feed.
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
language plpgsql stable security definer set search_path = ''
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
    and private.is_adult_verified(p.id)
    and case when p_intent = 'friends' then p.friends_enabled else p.dating_enabled end
    and not private.is_blocked_between(v_user, p.id)
    and not exists (
      select 1 from public.friendships f
      where f.status in ('pending', 'accepted')
        and ((f.requester_id = v_user and f.addressee_id = p.id)
          or (f.requester_id = p.id and f.addressee_id = v_user))
    )
    and (
      p_intent <> 'dating'
      or not exists (
        select 1 from public.profile_swipes s
        where s.swiper_id = v_user and s.target_id = p.id
      )
    )
  order by p.updated_at desc
  limit p_limit;
end;
$$;

revoke all on function public.discover_profiles(text, integer) from public, anon;
grant execute on function public.discover_profiles(text, integer) to authenticated;
