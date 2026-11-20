-- Enable RLS-filtered Postgres Changes for private friend and dating conversations.
-- Message reads remain governed by each table's existing SELECT policies.
do $$
declare
  v_table text;
begin
  if not exists (select 1 from pg_catalog.pg_publication where pubname = 'supabase_realtime') then
    raise notice 'supabase_realtime publication is unavailable; realtime subscriptions require enabling it in Supabase';
    return;
  end if;

  foreach v_table in array array['messages', 'dating_messages'] loop
    if to_regclass('public.' || v_table) is not null
       and not exists (
         select 1
         from pg_catalog.pg_publication_tables
         where pubname = 'supabase_realtime'
           and schemaname = 'public'
           and tablename = v_table
       ) then
      execute format('alter publication supabase_realtime add table public.%I', v_table);
    end if;
  end loop;
end;
$$;
