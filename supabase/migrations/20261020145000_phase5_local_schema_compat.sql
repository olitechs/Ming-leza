-- Phase 5 compatibility for fresh local databases whose original schema used
-- public.connections. The deployed project already has public.friendships.
-- This additive migration creates the deployed table shape only when absent.

do $$ begin
  create type public.connection_status as enum ('pending', 'accepted', 'declined');
exception when duplicate_object then null;
end $$;

create table if not exists public.friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references auth.users(id) on delete cascade,
  addressee_id uuid not null references auth.users(id) on delete cascade,
  status public.connection_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (requester_id <> addressee_id),
  unique (requester_id, addressee_id)
);

alter table public.friendships enable row level security;
grant select on public.friendships to authenticated;

do $$ begin
  create policy friendships_read_participant on public.friendships
    for select to authenticated
    using (
      (requester_id = (select auth.uid()) or addressee_id = (select auth.uid()))
      and not private.is_blocked_between(requester_id, addressee_id)
    );
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy friendships_create_requester on public.friendships
    for insert to authenticated
    with check (
      requester_id = (select auth.uid())
      and status = 'pending'::public.connection_status
      and private.is_adult_verified(requester_id)
      and private.is_adult_verified(addressee_id)
      and not private.is_blocked_between(requester_id, addressee_id)
    );
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy friendships_update_participant on public.friendships
    for update to authenticated
    using (
      (requester_id = (select auth.uid()) or addressee_id = (select auth.uid()))
      and not private.is_blocked_between(requester_id, addressee_id)
    )
    with check (
      (requester_id = (select auth.uid()) or addressee_id = (select auth.uid()))
      and not private.is_blocked_between(requester_id, addressee_id)
    );
exception when duplicate_object then null;
end $$;
