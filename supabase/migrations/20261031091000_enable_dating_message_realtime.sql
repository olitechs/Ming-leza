-- Enable Supabase Realtime delivery for match-gated dating chat.
-- Row-level security on dating_messages remains the authorization boundary for change events.
do $$
begin
  alter publication supabase_realtime add table public.dating_messages;
exception
  when duplicate_object then null;
end;
$$;
