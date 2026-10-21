-- Preserve sender-only message edits while restricting them to existing conversation members.
-- Column-level grants prevent changing sender_id, conversation_id, or created_at.

alter table public.messages add column if not exists deleted_at timestamptz;

grant update (body, edited_at, deleted_at) on table public.messages to authenticated;

drop policy if exists messages_update_own on public.messages;
create policy messages_update_own
on public.messages
for update
to authenticated
using (
  sender_id = (select auth.uid())
  and public.is_conversation_member(conversation_id, (select auth.uid()))
  and not exists (
    select 1
    from public.conversation_members cm
    where cm.conversation_id = messages.conversation_id
      and private.is_blocked_between((select auth.uid()), cm.user_id)
  )
)
with check (
  sender_id = (select auth.uid())
  and public.is_conversation_member(conversation_id, (select auth.uid()))
  and not exists (
    select 1
    from public.conversation_members cm
    where cm.conversation_id = messages.conversation_id
      and private.is_blocked_between((select auth.uid()), cm.user_id)
  )
);
