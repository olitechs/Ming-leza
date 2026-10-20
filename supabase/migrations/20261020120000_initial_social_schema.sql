create extension if not exists pgcrypto with schema extensions;

create table public.supported_countries (
  code text primary key check (code ~ '^[A-Z]{2}$'),
  name text not null unique,
  is_active boolean not null default true
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'New member' check (char_length(display_name) between 1 and 60),
  bio text not null default '' check (char_length(bio) <= 500),
  city text check (city is null or char_length(city) <= 100),
  country_code text references public.supported_countries(code),
  friends_enabled boolean not null default true,
  dating_enabled boolean not null default false,
  is_discoverable boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (friends_enabled or dating_enabled)
);

create table public.age_verifications (
  user_id uuid primary key references auth.users(id) on delete cascade,
  is_18_plus boolean not null,
  checked_at timestamptz not null default now()
);
comment on table public.age_verifications is 'Stores only the derived 18+ result and check timestamp. Never store date of birth or birth year.';

create table public.user_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  discoverable_by_city boolean not null default true,
  show_online_status boolean not null default false,
  map_discovery_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.blocks (
  blocker_id uuid not null references auth.users(id) on delete cascade,
  blocked_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);
create index blocks_blocked_id_idx on public.blocks(blocked_id);

create table public.connections (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references auth.users(id) on delete cascade,
  recipient_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('friendship', 'dating')),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'rejected', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (requester_id <> recipient_id),
  unique (requester_id, recipient_id, kind)
);
create index connections_recipient_status_idx on public.connections(recipient_id, status);

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.conversation_members (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);
create index conversation_members_user_id_idx on public.conversation_members(user_id);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 4000),
  created_at timestamptz not null default now(),
  edited_at timestamptz
);
create index messages_conversation_created_idx on public.messages(conversation_id, created_at desc);

create table public.moderation_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users(id) on delete cascade,
  reported_user_id uuid references auth.users(id) on delete set null,
  message_id uuid references public.messages(id) on delete set null,
  reason text not null check (reason in ('spam', 'harassment', 'underage', 'impersonation', 'other')),
  details text check (details is null or char_length(details) <= 2000),
  created_at timestamptz not null default now(),
  check (reported_user_id is not null or message_id is not null),
  check (reported_user_id is null or reported_user_id <> reporter_id)
);

create or replace function public.is_adult_verified(target_user_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.age_verifications av where av.user_id = target_user_id and av.is_18_plus = true);
$$;
revoke all on function public.is_adult_verified(uuid) from public, anon;
grant execute on function public.is_adult_verified(uuid) to authenticated;

create or replace function public.is_blocked_between(user_a uuid, user_b uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce(auth.uid() = user_a or auth.uid() = user_b, false) and exists (
    select 1 from public.blocks b
    where (b.blocker_id = user_a and b.blocked_id = user_b)
       or (b.blocker_id = user_b and b.blocked_id = user_a)
  );
$$;
revoke all on function public.is_blocked_between(uuid, uuid) from public, anon;
grant execute on function public.is_blocked_between(uuid, uuid) to authenticated;

create or replace function public.is_conversation_member(target_conversation_id uuid, target_user_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select target_user_id = auth.uid() and exists (
    select 1 from public.conversation_members cm
    where cm.conversation_id = target_conversation_id and cm.user_id = target_user_id
  );
$$;
revoke all on function public.is_conversation_member(uuid, uuid) from public, anon;
grant execute on function public.is_conversation_member(uuid, uuid) to authenticated;

create or replace function public.set_updated_at() returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end; $$;
create trigger profiles_set_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger preferences_set_updated_at before update on public.user_preferences for each row execute function public.set_updated_at();
create trigger connections_set_updated_at before update on public.connections for each row execute function public.set_updated_at();

alter table public.supported_countries enable row level security;
alter table public.profiles enable row level security;
alter table public.age_verifications enable row level security;
alter table public.user_preferences enable row level security;
alter table public.blocks enable row level security;
alter table public.connections enable row level security;
alter table public.conversations enable row level security;
alter table public.conversation_members enable row level security;
alter table public.messages enable row level security;
alter table public.moderation_reports enable row level security;

grant select on public.supported_countries to anon, authenticated;
grant select, insert, update on public.profiles to authenticated;
grant select on public.age_verifications to authenticated;
grant select, insert, update, delete on public.user_preferences to authenticated;
grant select, insert, delete on public.blocks to authenticated;
grant select, insert on public.connections to authenticated;
grant update (status) on public.connections to authenticated;
grant select, insert on public.conversations to authenticated;
grant select, insert, delete on public.conversation_members to authenticated;
grant select, insert on public.messages to authenticated;
grant update (body, edited_at) on public.messages to authenticated;
grant select, insert on public.moderation_reports to authenticated;

create policy countries_read_active on public.supported_countries for select to anon, authenticated using (is_active);

create policy profiles_read_self_or_discoverable on public.profiles for select to authenticated using (
  id = (select auth.uid()) or (
    is_discoverable = true and public.is_adult_verified(id)
    and not public.is_blocked_between((select auth.uid()), id)
  )
);
create policy profiles_insert_self on public.profiles for insert to authenticated with check (
  id = (select auth.uid()) and (dating_enabled = false or public.is_adult_verified(id))
);
create policy profiles_update_self on public.profiles for update to authenticated using (id = (select auth.uid())) with check (
  id = (select auth.uid()) and (dating_enabled = false or public.is_adult_verified(id))
);

create policy age_verification_read_self on public.age_verifications for select to authenticated using (user_id = (select auth.uid()));

create policy preferences_self_all on public.user_preferences for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy blocks_read_as_blocker on public.blocks for select to authenticated using (blocker_id = (select auth.uid()));
create policy blocks_insert_as_blocker on public.blocks for insert to authenticated with check (blocker_id = (select auth.uid()) and blocked_id <> (select auth.uid()));
create policy blocks_delete_as_blocker on public.blocks for delete to authenticated using (blocker_id = (select auth.uid()));

create policy connections_read_participant on public.connections for select to authenticated using (requester_id = (select auth.uid()) or recipient_id = (select auth.uid()));
create policy connections_request_self on public.connections for insert to authenticated with check (
  requester_id = (select auth.uid()) and public.is_adult_verified(requester_id) and public.is_adult_verified(recipient_id)
  and not public.is_blocked_between(requester_id, recipient_id)
  and (kind <> 'dating' or (select dating_enabled from public.profiles where id = recipient_id))
);
create policy connections_update_participant on public.connections for update to authenticated
  using ((recipient_id = (select auth.uid()) or requester_id = (select auth.uid())) and status = 'pending')
  with check (
    (recipient_id = (select auth.uid()) and status in ('accepted', 'rejected'))
    or (requester_id = (select auth.uid()) and status in ('pending', 'cancelled'))
  );

create policy conversations_read_member on public.conversations for select to authenticated using (
  public.is_conversation_member(id, (select auth.uid()))
);
create policy conversations_insert_creator on public.conversations for insert to authenticated with check (
  created_by = (select auth.uid()) and public.is_adult_verified((select auth.uid()))
);

create policy conversation_members_read_members on public.conversation_members for select to authenticated using (
  public.is_conversation_member(conversation_id, (select auth.uid()))
);
create policy conversation_members_insert_by_creator on public.conversation_members for insert to authenticated with check (
  exists (
    select 1 from public.conversations c
    where c.id = conversation_id and c.created_by = (select auth.uid())
      and public.is_adult_verified(user_id)
      and not public.is_blocked_between(c.created_by, user_id)
  )
);
create policy conversation_members_delete_self_or_creator on public.conversation_members for delete to authenticated using (
  user_id = (select auth.uid()) or exists (
    select 1 from public.conversations c where c.id = conversation_id and c.created_by = (select auth.uid())
  )
);

create policy messages_read_members on public.messages for select to authenticated using (
  public.is_conversation_member(conversation_id, (select auth.uid()))
);
create policy messages_insert_members on public.messages for insert to authenticated with check (
  sender_id = (select auth.uid()) and public.is_conversation_member(conversation_id, (select auth.uid()))
  and not exists (
    select 1 from public.conversation_members other_member
    where other_member.conversation_id = messages.conversation_id
      and other_member.user_id <> (select auth.uid())
      and public.is_blocked_between((select auth.uid()), other_member.user_id)
  )
);
create policy messages_update_own on public.messages for update to authenticated
  using (sender_id = (select auth.uid()) and public.is_conversation_member(conversation_id, (select auth.uid())))
  with check (sender_id = (select auth.uid()) and public.is_conversation_member(conversation_id, (select auth.uid())));

create policy reports_insert_self on public.moderation_reports for insert to authenticated with check (
  reporter_id = (select auth.uid()) and (
    message_id is null or exists (
      select 1 from public.messages m
      where m.id = message_id and public.is_conversation_member(m.conversation_id, (select auth.uid()))
    )
  )
);
create policy reports_read_self on public.moderation_reports for select to authenticated using (reporter_id = (select auth.uid()));
