-- Keep Discover in sync with the friendships table added after the original RPC.
-- Do not recreate schema objects or relax the existing age, intent, visibility, or block checks.
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
    and not exists (
      select 1
      from public.friendships f
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
