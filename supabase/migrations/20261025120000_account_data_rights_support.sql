-- Phase 3: self-service data export, account deletion, and in-app support intake.
create table if not exists public.support_requests (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references auth.users(id) on delete cascade,
  category text not null check (category in ('account', 'privacy', 'technical', 'safety', 'other')),
  subject text not null check (char_length(subject) between 3 and 120),
  details text not null check (char_length(details) between 10 and 4000),
  status text not null default 'new' check (status in ('new', 'reviewing', 'resolved', 'closed')),
  created_at timestamptz not null default now(),
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  resolution_note text check (resolution_note is null or char_length(resolution_note) <= 2000),
  response_message text check (response_message is null or char_length(response_message) <= 2000)
);

create index if not exists support_requests_queue_idx
  on public.support_requests (status, created_at asc);
create index if not exists support_requests_requester_idx
  on public.support_requests (requester_id, created_at desc);

alter table public.support_requests enable row level security;
revoke all on public.support_requests from public, anon, authenticated;
grant select on public.support_requests to authenticated;
grant insert (requester_id, category, subject, details) on public.support_requests to authenticated;

create policy support_requests_read_self
  on public.support_requests for select to authenticated
  using (requester_id = (select auth.uid()));
create policy support_requests_insert_self
  on public.support_requests for insert to authenticated
  with check (requester_id = (select auth.uid()));

comment on table public.support_requests is
  'In-app support intake. The owner must assign trusted staff and define response and retention procedures before promising monitored support.';
