-- Member safety workflow: keep all changes additive and forward-only.
alter table public.moderation_reports
  add column if not exists status text not null default 'new'
    check (status in ('new', 'reviewing', 'actioned', 'dismissed')),
  add column if not exists reviewed_by uuid references auth.users(id) on delete set null,
  add column if not exists reviewed_at timestamptz,
  add column if not exists resolution_note text
    check (resolution_note is null or char_length(resolution_note) <= 2000);

create index if not exists moderation_reports_queue_idx
  on public.moderation_reports (status, created_at asc);

comment on column public.moderation_reports.status is
  'Workflow state. Access to the moderator queue must be authorized server-side using trusted app_metadata claims.';
comment on column public.moderation_reports.resolution_note is
  'Internal moderator note; never returned to the reporting member.';

-- Members may submit reports and see their own submission only. Moderator queue access
-- uses the server-only service client after checking the trusted app_metadata.role claim.
revoke all on public.moderation_reports from anon;
revoke insert on public.moderation_reports from authenticated;
grant select on public.moderation_reports to authenticated;
grant insert (reporter_id, reported_user_id, message_id, reason, details)
  on public.moderation_reports to authenticated;
