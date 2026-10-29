-- Phase 6: defense-in-depth for dating records after an access/security review.
-- Additive, forward-only migration. No production schema is changed by this commit.

drop policy if exists dating_matches_read_active_participant on public.dating_matches;
create policy dating_matches_read_active_participant
  on public.dating_matches for select to authenticated
  using (
    status = 'active'
    and (user_low_id = (select auth.uid()) or user_high_id = (select auth.uid()))
    and private.is_adult_verified((select auth.uid()))
    and private.is_adult_verified(
      case when user_low_id = (select auth.uid()) then user_high_id else user_low_id end
    )
    and not private.is_blocked_between(
      (select auth.uid()),
      case when user_low_id = (select auth.uid()) then user_high_id else user_low_id end
    )
  );

drop policy if exists dating_conversations_active_match_participant on public.dating_conversations;
create policy dating_conversations_active_match_participant
  on public.dating_conversations for select to authenticated
  using (
    exists (
      select 1 from public.dating_matches m
      where m.id = dating_conversations.match_id
        and m.status = 'active'
        and (m.user_low_id = (select auth.uid()) or m.user_high_id = (select auth.uid()))
        and private.is_adult_verified((select auth.uid()))
        and private.is_adult_verified(
          case when m.user_low_id = (select auth.uid()) then m.user_high_id else m.user_low_id end
        )
        and not private.is_blocked_between(
          (select auth.uid()),
          case when m.user_low_id = (select auth.uid()) then m.user_high_id else m.user_low_id end
        )
    )
  );

drop policy if exists dating_messages_active_match_participant on public.dating_messages;
create policy dating_messages_active_match_participant
  on public.dating_messages for select to authenticated
  using (
    exists (
      select 1
      from public.dating_conversations c
      join public.dating_matches m on m.id = c.match_id
      where c.id = dating_messages.conversation_id
        and m.status = 'active'
        and (m.user_low_id = (select auth.uid()) or m.user_high_id = (select auth.uid()))
        and private.is_adult_verified((select auth.uid()))
        and private.is_adult_verified(
          case when m.user_low_id = (select auth.uid()) then m.user_high_id else m.user_low_id end
        )
        and not private.is_blocked_between(
          (select auth.uid()),
          case when m.user_low_id = (select auth.uid()) then m.user_high_id else m.user_low_id end
        )
    )
  );

drop policy if exists notifications_read_own on public.notifications;
create policy notifications_read_own
  on public.notifications for select to authenticated
  using (
    user_id = (select auth.uid())
    and private.is_adult_verified((select auth.uid()))
  );

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
  order by m.created_at desc;
end;
$$;

revoke all on function public.list_my_dating_matches() from public, anon;
grant execute on function public.list_my_dating_matches() to authenticated;

comment on policy dating_messages_active_match_participant on public.dating_messages is
  'Only adult-verified participants in an active, unblocked mutual dating match can read messages.';
