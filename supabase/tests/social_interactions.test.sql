begin;
create extension if not exists pgtap with schema extensions;
select plan(10);

select has_table('public','member_follows','follow edges table exists');
select has_table('public','message_requests','recipient-approved message requests table exists');
select ok((select relrowsecurity from pg_class where oid='public.member_follows'::regclass),'follow edges have RLS enabled');
select ok((select relrowsecurity from pg_class where oid='public.message_requests'::regclass),'message requests have RLS enabled');
select ok(not has_table_privilege('authenticated','public.member_follows','insert'),'clients cannot insert follows directly');
select ok(not has_table_privilege('authenticated','public.message_requests','insert'),'clients cannot insert message requests directly');
select ok(exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='follow_member'),'follow RPC exists');
select ok(exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='send_message_request'),'message request RPC exists');
select ok(exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='respond_to_message_request'),'consent response RPC exists');
select ok(exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='create_friend_group'),'friend group RPC exists');

select * from finish();
rollback;
