-- Phase 2: coarse, same-city discovery without GPS or precise coordinates.
-- Additive RPC; existing discovery and profile data remain unchanged.
create or replace function public.discover_nearby_profiles(p_intent text, p_limit integer default 20)
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
  v_city text;
begin
  if v_user is null then
    raise exception 'authentication required' using errcode = '28000';
  end if;
  if p_intent is null or p_intent not in ('friends', 'dating') then
    raise exception 'invalid intent' using errcode = '22023';
  end if;
  if not private.is_adult_verified(v_user) then
    raise exception 'adult verification required' using errcode = '42501';
  end if;

  select nullif(lower(btrim(p.city)), '')
    into v_city
    from public.profiles p
   where p.id = v_user;

  if v_city is null then
    raise exception 'add a city to your profile to use nearby discovery' using errcode = '22023';
  end if;

  p_limit := least(greatest(coalesce(p_limit, 20), 1), 40);

  return query
  select p.id, p.display_name, p.bio, p.avatar_path, p.country_code, p.region,
         p.city, p.friends_enabled, p.dating_enabled
    from public.profiles p
   where p.id <> v_user
     and p.is_discoverable
     and nullif(btrim(p.display_name), '') is not null
     and lower(btrim(p.display_name)) <> 'new member'
     and nullif(lower(btrim(p.city)), '') = v_city
     and private.is_adult_verified(p.id)
     and case when p_intent = 'friends' then p.friends_enabled else p.dating_enabled end
     and not private.is_blocked_between(v_user, p.id)
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

revoke all on function public.discover_nearby_profiles(text, integer) from public, anon;
grant execute on function public.discover_nearby_profiles(text, integer) to authenticated;
comment on function public.discover_nearby_profiles(text, integer) is
  'Returns adult-verified discoverable profiles in the current member city; never reads or returns precise coordinates.';
