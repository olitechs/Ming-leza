-- Social interactions: explicit follows, recipient-approved message requests, and friend-only groups.

create table public.member_follows (
  follower_id uuid not null references auth.users(id) on delete cascade,
  followed_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, followed_id),
  check (follower_id <> followed_id)
);
create index member_follows_followed_idx on public.member_follows(followed_id, created_at desc);
alter table public.member_follows enable row level security;
revoke all on public.member_follows from anon, authenticated;
grant select on public.member_follows to authenticated;
create policy member_follows_read_participants on public.member_follows
  for select to authenticated using (follower_id = auth.uid() or followed_id = auth.uid());

create table public.message_requests (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references auth.users(id) on delete cascade,
  recipient_id uuid not null references auth.users(id) on delete cascade,
  note text not null default '' check (char_length(note) <= 500),
  status text not null default 'pending' check (status in ('pending','accepted','declined','cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (requester_id <> recipient_id)
);
create unique index message_requests_one_pending_pair on public.message_requests
  (least(requester_id, recipient_id), greatest(requester_id, recipient_id)) where status = 'pending';
create index message_requests_recipient_idx on public.message_requests(recipient_id, status, created_at desc);
alter table public.message_requests enable row level security;
revoke all on public.message_requests from anon, authenticated;
grant select on public.message_requests to authenticated;
create policy message_requests_read_participant on public.message_requests
  for select to authenticated using (requester_id = auth.uid() or recipient_id = auth.uid());

alter table public.conversations add column kind text not null default 'direct' check (kind in ('direct','group'));
alter table public.conversations add column title text check (title is null or char_length(trim(title)) between 1 and 80);

-- All relationship-state writes happen via security-definer RPCs, not client table writes.
revoke insert, update, delete on public.conversations from authenticated;
revoke insert, delete on public.conversation_members from authenticated;
drop policy if exists conversations_insert_creator on public.conversations;
drop policy if exists conversation_members_insert_by_creator on public.conversation_members;

drop function if exists public.follow_member(uuid);
create function public.follow_member(p_followed_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or p_followed_id is null or p_followed_id = auth.uid()
     or not private.is_adult_verified(auth.uid())
     or not private.is_adult_verified(p_followed_id)
     or private.is_blocked_between(auth.uid(), p_followed_id)
     or not exists (select 1 from public.profiles p where p.id=p_followed_id and p.is_discoverable) then
    raise exception 'member unavailable' using errcode='42501';
  end if;
  insert into public.member_follows(follower_id, followed_id) values(auth.uid(), p_followed_id)
  on conflict do nothing;
end $$;
create function public.unfollow_member(p_followed_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'authentication required' using errcode='28000'; end if;
  delete from public.member_follows where follower_id=auth.uid() and followed_id=p_followed_id;
end $$;

create function public.send_message_request(p_recipient_id uuid, p_note text default '') returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  if auth.uid() is null then raise exception 'authentication required' using errcode='28000'; end if;
  if p_recipient_id is null or p_recipient_id=auth.uid() or char_length(coalesce(p_note,''))>500
    or not private.is_adult_verified(auth.uid()) or not private.is_adult_verified(p_recipient_id)
    or private.is_blocked_between(auth.uid(),p_recipient_id)
    or not exists(select 1 from public.profiles p where p.id=p_recipient_id and p.is_discoverable)
  then raise exception 'message request unavailable' using errcode='42501'; end if;
  if exists(select 1 from public.friendships f where f.status='accepted' and
     ((f.requester_id=auth.uid() and f.addressee_id=p_recipient_id) or (f.requester_id=p_recipient_id and f.addressee_id=auth.uid()))) then
    raise exception 'already friends' using errcode='23505';
  end if;
  if exists(select 1 from public.message_requests r where r.status='pending' and
     ((r.requester_id=auth.uid() and r.recipient_id=p_recipient_id) or (r.requester_id=p_recipient_id and r.recipient_id=auth.uid()))) then
    raise exception 'request already pending' using errcode='23505';
  end if;
  insert into public.message_requests(requester_id,recipient_id,note) values(auth.uid(),p_recipient_id,coalesce(p_note,'')) returning id into v_id;
  return v_id;
end $$;

create function public.respond_to_message_request(p_request_id uuid,p_accept boolean) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_request public.message_requests%rowtype; v_conversation uuid;
begin
  if auth.uid() is null then raise exception 'authentication required' using errcode='28000'; end if;
  select * into v_request from public.message_requests where id=p_request_id for update;
  if not found or v_request.recipient_id<>auth.uid() or v_request.status<>'pending'
     or private.is_blocked_between(v_request.requester_id,v_request.recipient_id) then
    raise exception 'request unavailable' using errcode='42501';
  end if;
  update public.message_requests set status=case when p_accept then 'accepted' else 'declined' end, updated_at=now() where id=p_request_id;
  if not p_accept then return null; end if;
  insert into public.conversations(created_by,kind) values(auth.uid(),'direct') returning id into v_conversation;
  insert into public.conversation_members(conversation_id,user_id) values(v_conversation,v_request.requester_id),(v_conversation,v_request.recipient_id);
  return v_conversation;
end $$;

create function public.create_friend_group(p_title text,p_friend_ids uuid[]) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_conversation uuid; v_id uuid;
begin
  if auth.uid() is null then raise exception 'authentication required' using errcode='28000'; end if;
  if char_length(trim(coalesce(p_title,''))) not between 1 and 80 or coalesce(array_length(p_friend_ids,1),0)<2 or array_length(p_friend_ids,1)>19 then
    raise exception 'group details invalid' using errcode='22023';
  end if;
  if (select count(distinct x) from unnest(p_friend_ids) x)<>array_length(p_friend_ids,1)
     or auth.uid()=any(p_friend_ids) then raise exception 'group members invalid' using errcode='22023'; end if;
  foreach v_id in array p_friend_ids loop
    if not private.is_adult_verified(v_id) or private.is_blocked_between(auth.uid(),v_id)
      or not exists(select 1 from public.friendships f where f.status='accepted' and
        ((f.requester_id=auth.uid() and f.addressee_id=v_id) or (f.requester_id=v_id and f.addressee_id=auth.uid()))) then
      raise exception 'group members must be accepted friends and not blocked' using errcode='42501';
    end if;
  end loop;
  insert into public.conversations(created_by,kind,title) values(auth.uid(),'group',trim(p_title)) returning id into v_conversation;
  insert into public.conversation_members(conversation_id,user_id) values(v_conversation,auth.uid());
  insert into public.conversation_members(conversation_id,user_id) select v_conversation, unnest(p_friend_ids);
  return v_conversation;
end $$;

-- Allow direct conversations only for accepted friends or accepted message requests.
create or replace function public.open_friend_conversation(p_other_user_id uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_user uuid:=auth.uid(); v_conversation_id uuid;
begin
  if v_user is null then raise exception 'authentication required' using errcode='28000'; end if;
  if p_other_user_id is null or p_other_user_id=v_user or not private.is_adult_verified(v_user)
    or not private.is_adult_verified(p_other_user_id) or private.is_blocked_between(v_user,p_other_user_id)
    or not (
      exists(select 1 from public.friendships f where f.status='accepted' and ((f.requester_id=v_user and f.addressee_id=p_other_user_id) or (f.requester_id=p_other_user_id and f.addressee_id=v_user)))
      or exists(select 1 from public.message_requests r where r.status='accepted' and ((r.requester_id=v_user and r.recipient_id=p_other_user_id) or (r.requester_id=p_other_user_id and r.recipient_id=v_user)))
    ) then raise exception 'conversation unavailable' using errcode='42501'; end if;
  select c.id into v_conversation_id from public.conversations c
  where c.kind='direct' and (select count(*) from public.conversation_members cm where cm.conversation_id=c.id)=2
    and exists(select 1 from public.conversation_members cm where cm.conversation_id=c.id and cm.user_id=v_user)
    and exists(select 1 from public.conversation_members cm where cm.conversation_id=c.id and cm.user_id=p_other_user_id)
  order by c.created_at desc limit 1;
  if v_conversation_id is not null then return v_conversation_id; end if;
  insert into public.conversations(created_by,kind) values(v_user,'direct') returning id into v_conversation_id;
  insert into public.conversation_members(conversation_id,user_id) values(v_conversation_id,v_user),(v_conversation_id,p_other_user_id);
  return v_conversation_id;
end $$;

revoke all on function public.follow_member(uuid) from public,anon;
revoke all on function public.unfollow_member(uuid) from public,anon;
revoke all on function public.send_message_request(uuid,text) from public,anon;
revoke all on function public.respond_to_message_request(uuid,boolean) from public,anon;
revoke all on function public.create_friend_group(text,uuid[]) from public,anon;
revoke all on function public.open_friend_conversation(uuid) from public,anon;
grant execute on function public.follow_member(uuid) to authenticated;
grant execute on function public.unfollow_member(uuid) to authenticated;
grant execute on function public.send_message_request(uuid,text) to authenticated;
grant execute on function public.respond_to_message_request(uuid,boolean) to authenticated;
grant execute on function public.create_friend_group(text,uuid[]) to authenticated;
grant execute on function public.open_friend_conversation(uuid) to authenticated;
