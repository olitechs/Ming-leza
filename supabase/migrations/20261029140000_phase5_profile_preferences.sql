-- Phase 5: member-controlled profile visibility and connection intents.
-- Additive, forward-only migration. Production schemas are not changed by this repository commit.

create or replace function public.update_my_discovery_preferences(
  p_is_discoverable boolean,
  p_friends_enabled boolean,
  p_dating_enabled boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_profile public.profiles%rowtype;
begin
  if v_user is null then
    raise exception 'authentication required' using errcode = '28000';
  end if;
  if not private.is_adult_verified(v_user) then
    raise exception 'adult verification required' using errcode = '42501';
  end if;
  if p_is_discoverable is null
     or p_friends_enabled is null
     or p_dating_enabled is null then
    raise exception 'preferences are required' using errcode = '22023';
  end if;

  select * into v_profile
  from public.profiles p
  where p.id = v_user
  for update;

  if not found then
    raise exception 'complete profile setup first' using errcode = '42501';
  end if;

  if p_is_discoverable and (
    nullif(btrim(v_profile.display_name), '') is null
    or lower(btrim(v_profile.display_name)) = 'new member'
    or nullif(btrim(v_profile.city), '') is null
  ) then
    raise exception 'complete your display name and city before becoming discoverable' using errcode = '22023';
  end if;

  if p_is_discoverable and not p_friends_enabled and not p_dating_enabled then
    raise exception 'enable friendship or dating before becoming discoverable' using errcode = '22023';
  end if;

  update public.profiles
  set is_discoverable = p_is_discoverable,
      friends_enabled = p_friends_enabled,
      dating_enabled = p_dating_enabled,
      updated_at = now()
  where id = v_user;
end;
$$;

revoke all on function public.update_my_discovery_preferences(boolean, boolean, boolean) from public, anon;
grant execute on function public.update_my_discovery_preferences(boolean, boolean, boolean) to authenticated;

comment on function public.update_my_discovery_preferences(boolean, boolean, boolean) is
  'Allows an adult-verified member to control their own visibility and friendship/dating discovery intents.';
