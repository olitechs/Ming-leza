-- Phase 4: match-gated dating chat and in-app notifications.
-- Additive migration only. Apply through the reviewed migration workflow; do not edit production manually.

create table if not exists public.dating_conversations (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null unique references public.dating_matches(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.dating_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.dating_conversations(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 1 and 2000),
  created_at timestamptz not null default now()
);

create index if not exists dating_messages_conversation_created_idx
  on public.dating_messages (conversation_id, created_at desc, id desc);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  notification_type text not null check (notification_type in ('new_match', 'dating_message')),
  match_id uuid references public.dating_matches(id) on delete cascade,
  message_id uuid references public.dating_messages(id) on delete cascade,
  created_at timestamptz not null default now(),
  read_at timestamptz,
  constraint notifications_match_required check (
    (notification_type = 'new_match' and match_id is not null and message_id is null)
    or (notification_type = 'dating_message' and match_id is not null and message_id is not null)
  )
);

create unique index if not exists notifications_one_match_per_user_idx
  on public.notifications (user_id, match_id, notification_type)
  where notification_type = 'new_match';
create index if not exists notifications_user_unread_idx
  on public.notifications (user_id, created_at desc)
  where read_at is null;

alter table public.dating_conversations enable row level security;
alter table public.dating_messages enable row level security;
alter table public.notifications enable row level security;

revoke all on public.dating_conversations from anon, authenticated;
revoke all on public.dating_messages from anon, authenticated;
revoke all on public.notifications from anon, authenticated;
grant select on public.dating_conversations, public.dating_messages, public.notifications to authenticated;

drop policy if exists dating_conversations_active_match_participant on public.dating_conversations;
create policy dating_conversations_active_match_participant
  on public.dating_conversations for select to authenticated
  using (
    exists (
      select 1 from public.dating_matches m
      where m.id = dating_conversations.match_id
        and m.status = 'active'
        and (m.user_low_id = (select auth.uid()) or m.user_high_id = (select auth.uid()))
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
        and not private.is_blocked_between(
          (select auth.uid()),
          case when m.user_low_id = (select auth.uid()) then m.user_high_id else m.user_low_id end
        )
    )
  );

drop policy if exists notifications_read_own on public.notifications;
create policy notifications_read_own
  on public.notifications for select to authenticated
  using (user_id = (select auth.uid()));

create or replace function public.open_dating_conversation(p_match_id uuid)
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
  if not private.is_adult_verified(v_user) then
    raise exception 'adult verification required' using errcode = '42501';
  end if;
  if p_match_id is null or not exists (
    select 1 from public.dating_matches m
    where m.id = p_match_id
      and m.status = 'active'
      and (m.user_low_id = v_user or m.user_high_id = v_user)
      and private.is_adult_verified(case when m.user_low_id = v_user then m.user_high_id else m.user_low_id end)
      and not private.is_blocked_between(
        v_user,
        case when m.user_low_id = v_user then m.user_high_id else m.user_low_id end
      )
  ) then
    raise exception 'active dating match required' using errcode = '42501';
  end if;

  insert into public.dating_conversations (match_id)
  values (p_match_id)
  on conflict (match_id) do nothing;

  select c.id into v_conversation_id
  from public.dating_conversations c
  where c.match_id = p_match_id;

  return v_conversation_id;
end;
$$;

create or replace function public.send_dating_message(p_conversation_id uuid, p_body text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_match public.dating_matches%rowtype;
  v_match_id uuid;
  v_other_user uuid;
  v_message_id uuid;
  v_body text := btrim(coalesce(p_body, ''));
begin
  if v_user is null then
    raise exception 'authentication required' using errcode = '28000';
  end if;
  if char_length(v_body) < 1 or char_length(v_body) > 2000 then
    raise exception 'invalid message body' using errcode = '22023';
  end if;

  select c.match_id into v_match_id
  from public.dating_conversations c
  where c.id = p_conversation_id;
  select * into v_match
  from public.dating_matches m
  where m.id = v_match_id
    and m.status = 'active'
    and (m.user_low_id = v_user or m.user_high_id = v_user);

  if not found
     or not private.is_adult_verified(v_user)
     or private.is_blocked_between(
       v_user,
       case when v_match.user_low_id = v_user then v_match.user_high_id else v_match.user_low_id end
     ) then
    raise exception 'active dating match required' using errcode = '42501';
  end if;

  v_other_user := case when v_match.user_low_id = v_user then v_match.user_high_id else v_match.user_low_id end;
  if not private.is_adult_verified(v_other_user) then
    raise exception 'active dating match required' using errcode = '42501';
  end if;

  insert into public.dating_messages (conversation_id, sender_id, body)
  values (p_conversation_id, v_user, v_body)
  returning id into v_message_id;

  return v_message_id;
end;
$$;

create or replace function public.mark_notification_read(p_notification_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'authentication required' using errcode = '28000';
  end if;
  update public.notifications
  set read_at = coalesce(read_at, now())
  where id = p_notification_id and user_id = auth.uid();
  if not found then
    raise exception 'notification unavailable' using errcode = '42501';
  end if;
end;
$$;

create or replace function public.notify_dating_match_created()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'active' then
    insert into public.notifications (user_id, actor_id, notification_type, match_id)
    values
      (new.user_low_id, new.user_high_id, 'new_match', new.id),
      (new.user_high_id, new.user_low_id, 'new_match', new.id)
    on conflict do nothing;
  end if;
  return new;
end;
$$;

create or replace function public.notify_dating_message_created()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_match_id uuid;
  v_recipient uuid;
begin
  select m.id,
         case when m.user_low_id = new.sender_id then m.user_high_id else m.user_low_id end
    into v_match_id, v_recipient
  from public.dating_conversations c
  join public.dating_matches m on m.id = c.match_id
  where c.id = new.conversation_id
    and m.status = 'active'
    and (m.user_low_id = new.sender_id or m.user_high_id = new.sender_id)
    and not private.is_blocked_between(
      new.sender_id,
      case when m.user_low_id = new.sender_id then m.user_high_id else m.user_low_id end
    );

  if v_match_id is not null and v_recipient is not null then
    insert into public.notifications (user_id, actor_id, notification_type, match_id, message_id)
    values (v_recipient, new.sender_id, 'dating_message', v_match_id, new.id);
  end if;
  return new;
end;
$$;

drop trigger if exists dating_match_created_notification on public.dating_matches;
create trigger dating_match_created_notification
  after insert on public.dating_matches
  for each row execute function public.notify_dating_match_created();

drop trigger if exists dating_message_created_notification on public.dating_messages;
create trigger dating_message_created_notification
  after insert on public.dating_messages
  for each row execute function public.notify_dating_message_created();

revoke all on function public.open_dating_conversation(uuid) from public, anon;
revoke all on function public.send_dating_message(uuid, text) from public, anon;
revoke all on function public.mark_notification_read(uuid) from public, anon;
revoke all on function public.notify_dating_match_created() from public, anon, authenticated;
revoke all on function public.notify_dating_message_created() from public, anon, authenticated;
grant execute on function public.open_dating_conversation(uuid) to authenticated;
grant execute on function public.send_dating_message(uuid, text) to authenticated;
grant execute on function public.mark_notification_read(uuid) to authenticated;

comment on table public.dating_messages is
  'Private messages available only while both members retain an active mutual dating match.';
comment on table public.notifications is
  'Member-scoped in-app notifications; message bodies are never copied into notification records.';
