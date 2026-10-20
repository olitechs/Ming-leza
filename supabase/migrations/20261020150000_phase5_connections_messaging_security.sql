-- Phase 5: server-authorized friend requests and direct messaging.
-- Schema is based on the deployed mingleza-social database.
create or replace function public.request_friendship(p_addressee_id uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_user uuid := auth.uid(); v_id uuid;
begin
  if v_user is null then raise exception 'not_authenticated' using errcode='28000'; end if;
  if p_addressee_id is null or p_addressee_id = v_user then raise exception 'invalid_recipient' using errcode='22023'; end if;
  if not private.is_adult_verified(v_user) or not private.is_adult_verified(p_addressee_id) then raise exception 'adult_verification_required' using errcode='42501'; end if;
  if private.is_blocked_between(v_user,p_addressee_id) then raise exception 'blocked' using errcode='42501'; end if;
  if not exists(select 1 from public.profiles p where p.id=p_addressee_id and p.is_discoverable and p.friends_enabled) then raise exception 'recipient_unavailable' using errcode='42501'; end if;
  if exists(select 1 from public.friendships f where f.requester_id=p_addressee_id and f.addressee_id=v_user and f.status='pending'::public.connection_status) then
    raise exception 'incoming_request_exists' using errcode='23505';
  end if;
  insert into public.friendships(requester_id,addressee_id,status)
  values(v_user,p_addressee_id,'pending'::public.connection_status)
  returning id into v_id;
  return v_id;
end; $$;

create or replace function public.respond_friendship(p_friendship_id uuid,p_accept boolean)
returns boolean language plpgsql security definer set search_path = '' as $$
declare v_user uuid := auth.uid(); v_row public.friendships%rowtype;
begin
  if v_user is null then raise exception 'not_authenticated' using errcode='28000'; end if;
  select * into v_row from public.friendships where id=p_friendship_id for update;
  if not found or v_row.addressee_id <> v_user or v_row.status <> 'pending'::public.connection_status then raise exception 'request_not_actionable' using errcode='42501'; end if;
  if private.is_blocked_between(v_row.requester_id,v_row.addressee_id) then raise exception 'blocked' using errcode='42501'; end if;
  update public.friendships set status=case when p_accept then 'accepted'::public.connection_status else 'declined'::public.connection_status end, updated_at=now() where id=p_friendship_id;
  return true;
end; $$;

create or replace function public.cancel_friendship(p_friendship_id uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
declare v_user uuid := auth.uid();
begin
  if v_user is null then raise exception 'not_authenticated' using errcode='28000'; end if;
  update public.friendships set status='declined'::public.connection_status, updated_at=now()
    where id=p_friendship_id and requester_id=v_user and status='pending'::public.connection_status;
  if not found then raise exception 'request_not_actionable' using errcode='42501'; end if;
  return true;
end; $$;

create or replace function public.start_direct_conversation(p_other_user uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_user uuid := auth.uid(); v_conversation uuid;
begin
  if v_user is null then raise exception 'not_authenticated' using errcode='28000'; end if;
  if p_other_user is null or p_other_user=v_user then raise exception 'invalid_recipient' using errcode='22023'; end if;
  if not private.is_adult_verified(v_user) or not private.is_adult_verified(p_other_user) then raise exception 'adult_verification_required' using errcode='42501'; end if;
  if private.is_blocked_between(v_user,p_other_user) then raise exception 'blocked' using errcode='42501'; end if;
  if not exists(select 1 from public.friendships f where f.status='accepted'::public.connection_status and ((f.requester_id=v_user and f.addressee_id=p_other_user) or (f.requester_id=p_other_user and f.addressee_id=v_user))) then raise exception 'friendship_required' using errcode='42501'; end if;
  select c.id into v_conversation from public.conversations c
   where exists(select 1 from public.conversation_members a where a.conversation_id=c.id and a.user_id=v_user)
     and exists(select 1 from public.conversation_members b where b.conversation_id=c.id and b.user_id=p_other_user)
     and (select count(*) from public.conversation_members m where m.conversation_id=c.id)=2
   order by c.created_at desc limit 1;
  if v_conversation is not null then return v_conversation; end if;
  insert into public.conversations(created_by) values(v_user) returning id into v_conversation;
  insert into public.conversation_members(conversation_id,user_id) values(v_conversation,v_user),(v_conversation,p_other_user);
  return v_conversation;
end; $$;

create or replace function public.send_direct_message(p_conversation_id uuid,p_body text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_user uuid := auth.uid(); v_other uuid; v_id uuid; v_body text := btrim(p_body);
begin
  if v_user is null then raise exception 'not_authenticated' using errcode='28000'; end if;
  if v_body is null or char_length(v_body)<1 or char_length(v_body)>4000 then raise exception 'invalid_message' using errcode='22023'; end if;
  if not private.is_adult_verified(v_user) or not exists(select 1 from public.conversation_members where conversation_id=p_conversation_id and user_id=v_user) then raise exception 'conversation_unavailable' using errcode='42501'; end if;
  select user_id into v_other from public.conversation_members where conversation_id=p_conversation_id and user_id<>v_user limit 1;
  if v_other is null or private.is_blocked_between(v_user,v_other) then raise exception 'blocked_or_unavailable' using errcode='42501'; end if;
  insert into public.messages(conversation_id,sender_id,body) values(p_conversation_id,v_user,v_body) returning id into v_id;
  return v_id;
end; $$;

-- Mutations must go through the checked RPCs rather than broad client table writes.
drop policy if exists friendships_update_participant on public.friendships;
drop policy if exists friendships_update_recipient_pending on public.friendships;
create policy friendships_update_recipient_pending on public.friendships for update to authenticated
using (addressee_id=(select auth.uid()) and status='pending'::public.connection_status)
with check (addressee_id=(select auth.uid()) and status in ('accepted'::public.connection_status,'declined'::public.connection_status));

drop policy if exists conversation_members_insert_self_or_creator on public.conversation_members;
drop policy if exists conversation_members_insert_self on public.conversation_members;
revoke insert, delete on public.conversation_members from authenticated;
revoke insert, update, delete on public.conversations from authenticated;
revoke insert, update on public.messages from authenticated;
grant select on public.conversations, public.conversation_members, public.messages, public.friendships to authenticated;

grant execute on function public.request_friendship(uuid) to authenticated;
grant execute on function public.respond_friendship(uuid,boolean) to authenticated;
grant execute on function public.cancel_friendship(uuid) to authenticated;
grant execute on function public.start_direct_conversation(uuid) to authenticated;
grant execute on function public.send_direct_message(uuid,text) to authenticated;
revoke all on function public.request_friendship(uuid) from public,anon;
revoke all on function public.respond_friendship(uuid,boolean) from public,anon;
revoke all on function public.cancel_friendship(uuid) from public,anon;
revoke all on function public.start_direct_conversation(uuid) from public,anon;
revoke all on function public.send_direct_message(uuid,text) from public,anon;
