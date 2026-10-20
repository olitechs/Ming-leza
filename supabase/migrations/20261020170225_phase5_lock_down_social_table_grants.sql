-- Defense in depth: table privileges must not allow bypassing the intended RPC workflow.
-- Row-level security remains enabled; authenticated users receive only the operations the app needs.

revoke all on table public.friendships from public, anon, authenticated;
revoke all on table public.conversations from public, anon, authenticated;
revoke all on table public.conversation_members from public, anon, authenticated;
revoke all on table public.messages from public, anon, authenticated;

grant select on table public.friendships to authenticated;
grant select on table public.conversations to authenticated;
grant select on table public.conversation_members to authenticated;
grant select, insert on table public.messages to authenticated;

-- Friendship state changes and conversation/member creation must use validated RPC functions.
drop policy if exists friendships_create_requester on public.friendships;
drop policy if exists messages_update_own on public.messages;
drop policy if exists conversations_create_self on public.conversations;
drop policy if exists conversation_members_insert_self_or_creator on public.conversation_members;
