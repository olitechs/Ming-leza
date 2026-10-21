-- Ensure existing installations have the soft-delete marker used by message reads.
-- This is idempotent and complements the column addition in the earlier migration,
-- which is needed for fresh database resets before the grant is applied.
alter table public.messages add column if not exists deleted_at timestamptz;
grant update (body, edited_at, deleted_at) on table public.messages to authenticated;
