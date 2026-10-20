-- Phase 5: secure friend-request transitions and persistent 1:1 messaging.
-- The live schema already contains friendships, blocks, conversations, conversation_members,
-- and messages. This migration hardens those existing tables rather than recreating them.

create unique index if not exists friendships_one_pair_idx
  on public.friendships (least(requester_id, addressee_id), greatest(requester_id, addressee_id));

alter table public.friendships
  drop constraint if exists friendships_not_self_check;
alter table public.friendships
  add constraint friendships_not_self_check check (requester_id <> addressee_id);

-- Clients must not mutate friendship status directly; state transitions go through RPCs.
drop policy if exists friendships_update_participant on public.friendships;
drop policy if exists conversations_create_self on public.conversations;
drop policy if exists conversation_members_insert_self_or_creator on public.conversation_members;

create or replace function public.send_friend_request(p_addressee_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_requester uuid := auth.uid();
  v_id uuid;
begin
  if v_requester is null then
    raise exception 'authentication required' using errcode = '28000';
  end if;
  if p_addressee_id is null or p_addressee_id = v_requester then
    raise exception 'invalid addressee' using errcode = '22023';
  end if;
  if not private.is_adult_verified(v_requester)
     or not private.is_adult_verified(p_addressee_id) then
    raise exception 'adult verification required' using errcode = '42501';
  end if;
  if private.is_blocked_between(v_requester, p_addressee_id) then
    raise exception 'connection unavailable' using errcode = '42501';
  end if;

  select f.id into v_id
  from public.friendships f
  where (f.requester_id = v_requester and f.addressee_id = p_addressee_id)
     or (f.requester_id = p_addressee_id and f.addressee_id = v_requester)
  limit 1;

  if v_id is not null then
    if exists (select 1 from public.friendships f where f.id = v_id and f.status = 'accepted') then
      raise exception 'already connected' using errcode = '23505';
    end if;
    if exists (select 1 from public.friendships f where f.id = v_id and f.status = 'pending') then
      raise exception 'request already pending' using errcode = '23505';
    end if;
    update public.friendships
      set requester_id = v_requester, addressee_id = p_addressee_id,
          status = 'pending', updated_at = now()
      where id = v_id;
    return v_id;
  end if;

  insert into public.friendships (requester_id, addressee_id, status)
  values (v_requester, p_addressee_id, 'pending')
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.respond_to_friend_request(
  p_request_id uuid,
  p_accept boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_request public.friendships%rowtype;
begin
  if v_user is null then
    raise exception 'authentication required' using errcode = '28000';
  end if;
  select * into v_request
  from public.friendships
  where id = p_request_id
  for update;

  if not found or v_request.addressee_id <> v_user or v_request.status <> 'pending' then
    raise exception 'request unavailable' using errcode = '42501';
  end if;
  if private.is_blocked_between(v_request.requester_id, v_request.addressee_id) then
    raise exception 'request unavailable' using errcode = '42501';
  end if;

  update public.friendships
  set status = case when p_accept then 'accepted'::public.connection_status
                    else 'declined'::public.connection_status end,
      updated_at = now()
  where id = p_request_id;
end;
$$;

create or replace function public.cancel_friend_request(p_request_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'authentication required' using errcode = '28000';
  end if;
  delete from public.friendships
  where id = p_request_id
    and requester_id = auth.uid()
    and status = 'pending';
  if not found then
    raise exception 'request unavailable' using errcode = '42501';
  end if;
end;
$$;

create or replace function public.open_friend_conversation(p_other_user_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_conversation_id uuid;
begin
  if v_user is null then
    raise exception 'authentication required' using errcode = '28000';
  end if;
  if p_other_user_id is null or p_other_user_id = v_user then
    raise exception 'invalid recipient' using errcode = '22023';
  end if;
  if not private.is_adult_verified(v_user)
     or not private.is_adult_verified(p_other_user_id)
     or private.is_blocked_between(v_user, p_other_user_id)
     or not exists (
       select 1 from public.friendships f
       where f.status = 'accepted'
         and ((f.requester_id = v_user and f.addressee_id = p_other_user_id)
           or (f.requester_id = p_other_user_id and f.addressee_id = v_user))
     ) then
    raise exception 'conversation unavailable' using errcode = '42501';
  end if;

  select c.id into v_conversation_id
  from public.conversations c
  where (select count(*) from public.conversation_members cm where cm.conversation_id = c.id) = 2
    and exists (select 1 from public.conversation_members cm where cm.conversation_id = c.id and cm.user_id = v_user)
    and exists (select 1 from public.conversation_members cm where cm.conversation_id = c.id and cm.user_id = p_other_user_id)
  order by c.created_at desc
  limit 1;

  if v_conversation_id is not null then
    return v_conversation_id;
  end if;

  insert into public.conversations (created_by) values (v_user)
  returning id into v_conversation_id;
  insert into public.conversation_members (conversation_id, user_id)
  values (v_conversation_id, v_user), (v_conversation_id, p_other_user_id);
  return v_conversation_id;
end;
$$;

revoke all on function public.send_friend_request(uuid) from public, anon;
revoke all on function public.respond_to_friend_request(uuid, boolean) from public, anon;
revoke all on function public.cancel_friend_request(uuid) from public, anon;
revoke all on function public.open_friend_conversation(uuid) from public, anon;
grant execute on function public.send_friend_request(uuid) to authenticated;
grant execute on function public.respond_to_friend_request(uuid, boolean) to authenticated;
grant execute on function public.cancel_friend_request(uuid) to authenticated;
grant execute on function public.open_friend_conversation(uuid) to authenticated;

-- Conversation/member creation is now exclusively through open_friend_conversation().
