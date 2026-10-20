-- Phase 3 additive migration for the existing initial_social_schema.
-- Do not recreate tables: 20261020120000_initial_social_schema.sql owns the base schema.
-- This migration adds only the fields/helpers/RPC needed by real-profile discovery.

create extension if not exists postgis with schema extensions;
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

alter table public.profiles add column if not exists avatar_path text;
alter table public.profiles add column if not exists region text;

create or replace function private.is_adult_verified(p_user uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.age_verifications av
    where av.user_id = p_user and av.is_18_plus = true
  );
$$;

create or replace function private.is_blocked_between(a uuid, b uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.blocks x
    where (x.blocker_id = a and x.blocked_id = b)
       or (x.blocker_id = b and x.blocked_id = a)
  );
$$;

revoke all on function private.is_adult_verified(uuid) from public, anon;
revoke all on function private.is_blocked_between(uuid, uuid) from public, anon;
grant execute on function private.is_adult_verified(uuid) to authenticated;
grant execute on function private.is_blocked_between(uuid, uuid) to authenticated;

create index if not exists profiles_discovery_idx
  on public.profiles (is_discoverable, updated_at desc);

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
  if p_intent not in ('friends', 'dating') then
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
    and private.is_adult_verified(p.id)
    and case when p_intent = 'friends' then p.friends_enabled else p.dating_enabled end
    and not private.is_blocked_between(v_user, p.id)
  order by p.updated_at desc
  limit p_limit;
end;
$$;

revoke all on function public.discover_profiles(text, integer) from public, anon;
grant execute on function public.discover_profiles(text, integer) to authenticated;
