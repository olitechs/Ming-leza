-- Mingleza social schema baseline.
-- Mirrors the three migrations already applied to Supabase project ipctvjtmuafhuhqjatvt.
-- Keep this migration reviewable and replayable in local Supabase/CI; no user data is seeded.

create extension if not exists postgis with schema extensions;
create type public.connection_status as enum ('pending', 'accepted', 'declined');
create type public.report_status as enum ('open', 'reviewing', 'resolved', 'dismissed');

create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(trim(display_name)) between 1 and 60),
  bio text not null default '' check (char_length(bio) <= 500),
  avatar_path text,
  country_code text check (country_code is null or country_code ~ '^[A-Z]{2}$'),
  region text check (region is null or char_length(region) <= 100),
  city text check (city is null or char_length(city) <= 100),
  friends_enabled boolean not null default true,
  dating_enabled boolean not null default false,
  is_discoverable boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.age_verifications (
  user_id uuid primary key references auth.users(id) on delete cascade,
  is_18_plus boolean not null,
  checked_at timestamptz not null default now()
);
create table public.blocks (
  blocker_id uuid not null references auth.users(id) on delete cascade,
  blocked_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);
create table public.friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references auth.users(id) on delete cascade,
  addressee_id uuid not null references auth.users(id) on delete cascade,
  status public.connection_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (requester_id <> addressee_id),
  unique (requester_id, addressee_id)
);
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
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 5000),
  created_at timestamptz not null default now(),
  edited_at timestamptz,
  deleted_at timestamptz
);
create table public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 3000),
  media_path text,
  visibility text not null default 'public' check (visibility in ('public','friends')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create table public.post_likes (
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);
create table public.post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 1000),
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users(id) on delete cascade,
  reported_user_id uuid references auth.users(id) on delete set null,
  post_id uuid references public.posts(id) on delete set null,
  message_id uuid references public.messages(id) on delete set null,
  reason text not null check (char_length(trim(reason)) between 3 and 100),
  details text not null default '' check (char_length(details) <= 2000),
  status public.report_status not null default 'open',
  created_at timestamptz not null default now()
);
create table public.user_presence (
  user_id uuid primary key references auth.users(id) on delete cascade,
  is_online boolean not null default false,
  last_seen_at timestamptz not null default now(),
  map_opt_in boolean not null default false,
  approximate_location extensions.geography(point, 4326),
  updated_at timestamptz not null default now()
);

create index profiles_discovery_idx on public.profiles (is_discoverable, updated_at desc);
create index friendships_requester_status_idx on public.friendships (requester_id, status);
create index friendships_addressee_status_idx on public.friendships (addressee_id, status);
create index conversations_created_by_idx on public.conversations (created_by);
create index conversation_members_user_idx on public.conversation_members (user_id);
create index messages_conversation_created_idx on public.messages (conversation_id, created_at desc);
create index messages_sender_idx on public.messages (sender_id);
create index posts_author_created_idx on public.posts (author_id, created_at desc);
create index posts_visibility_created_idx on public.posts (visibility, created_at desc);
create index post_likes_user_idx on public.post_likes (user_id);
create index post_comments_post_created_idx on public.post_comments (post_id, created_at);
create index post_comments_author_idx on public.post_comments (author_id);
create index reports_reporter_created_idx on public.reports (reporter_id, created_at desc);
create index reports_reported_user_idx on public.reports (reported_user_id);
create index reports_post_idx on public.reports (post_id);
create index reports_message_idx on public.reports (message_id);

create or replace function private.is_adult_verified(p_user uuid)
returns boolean language sql stable security definer set search_path = ''
as $$ select exists (select 1 from public.age_verifications av where av.user_id = p_user and av.is_18_plus); $$;
create or replace function private.is_blocked_between(a uuid, b uuid)
returns boolean language sql stable security definer set search_path = ''
as $$ select exists (select 1 from public.blocks x where (x.blocker_id = a and x.blocked_id = b) or (x.blocker_id = b and x.blocked_id = a)); $$;
create or replace function private.is_conversation_member(p_conversation uuid, p_user uuid)
returns boolean language sql stable security definer set search_path = ''
as $$ select exists (select 1 from public.conversation_members cm where cm.conversation_id = p_conversation and cm.user_id = p_user); $$;

revoke all on function private.is_adult_verified(uuid) from public, anon;
revoke all on function private.is_blocked_between(uuid,uuid) from public, anon;
revoke all on function private.is_conversation_member(uuid,uuid) from public, anon;
grant execute on function private.is_adult_verified(uuid) to authenticated;
grant execute on function private.is_blocked_between(uuid,uuid) to authenticated;
grant execute on function private.is_conversation_member(uuid,uuid) to authenticated;

create or replace function public.discover_profiles(p_intent text, p_limit integer default 20)
returns table(id uuid, display_name text, bio text, avatar_path text, country_code text, region text, city text, friends_enabled boolean, dating_enabled boolean)
language plpgsql stable security definer set search_path = ''
as $$
declare v_user uuid := auth.uid();
begin
 if v_user is null then raise exception 'authentication required' using errcode = '28000'; end if;
 if p_intent not in ('friends','dating') then raise exception 'invalid intent' using errcode = '22023'; end if;
 p_limit := least(greatest(coalesce(p_limit,20),1),50);
 if not private.is_adult_verified(v_user) then raise exception 'adult verification required' using errcode = '42501'; end if;
 return query select p.id,p.display_name,p.bio,p.avatar_path,p.country_code,p.region,p.city,p.friends_enabled,p.dating_enabled
 from public.profiles p where p.id <> v_user and p.is_discoverable and private.is_adult_verified(p.id)
 and case when p_intent = 'friends' then p.friends_enabled else p.dating_enabled end
 and not private.is_blocked_between(v_user,p.id) order by p.updated_at desc limit p_limit;
end; $$;
revoke all on function public.discover_profiles(text,integer) from public, anon;
grant execute on function public.discover_profiles(text,integer) to authenticated;

alter table public.profiles enable row level security;
alter table public.age_verifications enable row level security;
alter table public.blocks enable row level security;
alter table public.friendships enable row level security;
alter table public.conversations enable row level security;
alter table public.conversation_members enable row level security;
alter table public.messages enable row level security;
alter table public.posts enable row level security;
alter table public.post_likes enable row level security;
alter table public.post_comments enable row level security;
alter table public.reports enable row level security;
alter table public.user_presence enable row level security;

create policy profiles_insert_self on public.profiles for insert to authenticated with check (id = (select auth.uid()));
create policy profiles_read_discoverable_adults on public.profiles for select to authenticated using (id = (select auth.uid()) or (is_discoverable and private.is_adult_verified(id) and not private.is_blocked_between((select auth.uid()),id)));
create policy profiles_update_self on public.profiles for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));
create policy age_verifications_read_self on public.age_verifications for select to authenticated using (user_id = (select auth.uid()));
create policy blocks_read_involved on public.blocks for select to authenticated using (blocker_id = (select auth.uid()) or blocked_id = (select auth.uid()));
create policy blocks_insert_self on public.blocks for insert to authenticated with check (blocker_id = (select auth.uid()) and blocked_id <> (select auth.uid()));
create policy blocks_delete_self on public.blocks for delete to authenticated using (blocker_id = (select auth.uid()));
create policy friendships_create_requester on public.friendships for insert to authenticated with check (requester_id = (select auth.uid()) and status = 'pending' and private.is_adult_verified(requester_id) and private.is_adult_verified(addressee_id) and not private.is_blocked_between(requester_id,addressee_id));
create policy friendships_read_participant on public.friendships for select to authenticated using ((requester_id = (select auth.uid()) or addressee_id = (select auth.uid())) and not private.is_blocked_between(requester_id,addressee_id));
create policy friendships_update_participant on public.friendships for update to authenticated using (requester_id = (select auth.uid()) or addressee_id = (select auth.uid())) with check ((requester_id = (select auth.uid()) or addressee_id = (select auth.uid())) and not private.is_blocked_between(requester_id,addressee_id));
create policy conversations_create_self on public.conversations for insert to authenticated with check (created_by = (select auth.uid()) and exists (select 1 from public.age_verifications av where av.user_id = (select auth.uid()) and av.is_18_plus));
create policy conversations_read_member on public.conversations for select to authenticated using (private.is_conversation_member(id,(select auth.uid())));
create policy conversation_members_insert_self_or_creator on public.conversation_members for insert to authenticated with check (((user_id = (select auth.uid())) and private.is_adult_verified(user_id)) or (exists (select 1 from public.conversations c where c.id = conversation_id and c.created_by = (select auth.uid())) and private.is_adult_verified(user_id) and not private.is_blocked_between((select auth.uid()),user_id)));
create policy conversation_members_read_member on public.conversation_members for select to authenticated using (private.is_conversation_member(conversation_id,(select auth.uid())));
create policy messages_insert_sender_member on public.messages for insert to authenticated with check (sender_id = (select auth.uid()) and private.is_adult_verified(sender_id) and private.is_conversation_member(conversation_id,(select auth.uid())) and not exists (select 1 from public.conversation_members cm where cm.conversation_id = messages.conversation_id and private.is_blocked_between((select auth.uid()),cm.user_id)));
create policy messages_read_member on public.messages for select to authenticated using (private.is_conversation_member(conversation_id,(select auth.uid())) and not exists (select 1 from public.conversation_members cm where cm.conversation_id = messages.conversation_id and private.is_blocked_between((select auth.uid()),cm.user_id)));
create policy messages_update_own on public.messages for update to authenticated using (sender_id = (select auth.uid())) with check (sender_id = (select auth.uid()));
create policy posts_insert_self_adult on public.posts for insert to authenticated with check (author_id = (select auth.uid()) and private.is_adult_verified(author_id));
create policy posts_read_visible on public.posts for select to authenticated using (deleted_at is null and not private.is_blocked_between((select auth.uid()),author_id) and private.is_adult_verified(author_id) and (visibility = 'public' or author_id = (select auth.uid()) or exists (select 1 from public.friendships f where f.status='accepted' and ((f.requester_id=posts.author_id and f.addressee_id=(select auth.uid())) or (f.addressee_id=posts.author_id and f.requester_id=(select auth.uid()))))));
create policy posts_update_self on public.posts for update to authenticated using (author_id = (select auth.uid())) with check (author_id = (select auth.uid()));
create policy posts_delete_self on public.posts for delete to authenticated using (author_id = (select auth.uid()));
create policy post_likes_read_visible_post on public.post_likes for select to authenticated using (exists (select 1 from public.posts p where p.id=post_id and p.deleted_at is null));
create policy post_likes_insert_self on public.post_likes for insert to authenticated with check (user_id = (select auth.uid()) and exists (select 1 from public.posts p where p.id=post_id and p.deleted_at is null));
create policy post_likes_delete_self on public.post_likes for delete to authenticated using (user_id = (select auth.uid()));
create policy post_comments_read_visible_post on public.post_comments for select to authenticated using (deleted_at is null and exists (select 1 from public.posts p where p.id=post_id and p.deleted_at is null));
create policy post_comments_insert_self_adult on public.post_comments for insert to authenticated with check (author_id = (select auth.uid()) and private.is_adult_verified(author_id) and exists (select 1 from public.posts p where p.id=post_id and p.deleted_at is null));
create policy post_comments_update_self on public.post_comments for update to authenticated using (author_id = (select auth.uid())) with check (author_id = (select auth.uid()));
create policy post_comments_delete_self on public.post_comments for delete to authenticated using (author_id = (select auth.uid()));
create policy reports_create_self_adult on public.reports for insert to authenticated with check (reporter_id = (select auth.uid()) and private.is_adult_verified(reporter_id));
create policy reports_read_reporter on public.reports for select to authenticated using (reporter_id = (select auth.uid()));
create policy user_presence_no_client_access on public.user_presence for all to anon, authenticated using (false) with check (false);

grant select, insert, update on public.profiles to authenticated;
grant select on public.age_verifications to authenticated;
grant select, insert, delete on public.blocks to authenticated;
grant select, insert, update on public.friendships to authenticated;
grant select, insert on public.conversations to authenticated;
grant select, insert on public.conversation_members to authenticated;
grant select, insert, update on public.messages to authenticated;
grant select, insert, update, delete on public.posts to authenticated;
grant select, insert, delete on public.post_likes to authenticated;
grant select, insert, update, delete on public.post_comments to authenticated;
grant select, insert on public.reports to authenticated;
revoke all on public.user_presence from anon, authenticated;
