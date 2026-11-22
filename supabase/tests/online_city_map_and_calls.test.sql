begin;
create extension if not exists pgtap with schema extensions;
select plan(13);

select has_table('public', 'user_presence', 'online heartbeat table exists');
select ok((select relrowsecurity from pg_class where oid = 'public.user_presence'::regclass), 'online heartbeat table has RLS');
select ok(exists (
  select 1 from pg_policies
  where schemaname = 'public' and tablename = 'user_presence' and policyname = 'user_presence_self_only'
), 'members can read only their own heartbeat row');
select ok(exists (
  select 1 from pg_policies
  where schemaname = 'realtime' and tablename = 'messages' and policyname = 'call_channel_receive'
), 'private call receive policy exists');
select ok(exists (
  select 1 from pg_policies
  where schemaname = 'realtime' and tablename = 'messages' and policyname = 'call_channel_send'
), 'private call send policy exists');

insert into auth.users (id, aud, role, email, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
 ('60000000-0000-4000-8000-000000000001','authenticated','authenticated','presence-a@example.invalid','{}'::jsonb,'{}'::jsonb,now(),now()),
 ('60000000-0000-4000-8000-000000000002','authenticated','authenticated','presence-b@example.invalid','{}'::jsonb,'{}'::jsonb,now(),now()),
 ('60000000-0000-4000-8000-000000000003','authenticated','authenticated','presence-c@example.invalid','{}'::jsonb,'{}'::jsonb,now(),now()),
 ('60000000-0000-4000-8000-000000000004','authenticated','authenticated','presence-d@example.invalid','{}'::jsonb,'{}'::jsonb,now(),now());

insert into public.profiles (id, display_name, city, region, country_code, is_discoverable, friends_enabled, dating_enabled)
values
 ('60000000-0000-4000-8000-000000000001','Presence A','Nairobi','Nairobi County','KE',true,true,false),
 ('60000000-0000-4000-8000-000000000002','Presence B','Nairobi','Nairobi County','KE',true,true,false),
 ('60000000-0000-4000-8000-000000000003','Presence C','Nairobi','Nairobi County','KE',true,true,false),
 ('60000000-0000-4000-8000-000000000004','Presence D','Mombasa','Coast','KE',true,true,false);
insert into public.age_verifications (user_id, is_18_plus) values
 ('60000000-0000-4000-8000-000000000001',true),
 ('60000000-0000-4000-8000-000000000002',true),
 ('60000000-0000-4000-8000-000000000003',true),
 ('60000000-0000-4000-8000-000000000004',true);
insert into public.user_preferences (user_id, show_online_status, map_discovery_enabled) values
 ('60000000-0000-4000-8000-000000000001',true,true),
 ('60000000-0000-4000-8000-000000000002',true,true),
 ('60000000-0000-4000-8000-000000000003',true,true),
 ('60000000-0000-4000-8000-000000000004',true,true);
insert into public.user_presence (user_id, last_seen_at) values
 ('60000000-0000-4000-8000-000000000002',now()),
 ('60000000-0000-4000-8000-000000000003',now());
insert into public.friendships (requester_id, addressee_id, status)
values ('60000000-0000-4000-8000-000000000001','60000000-0000-4000-8000-000000000002','accepted');
insert into public.conversations (id, created_by, kind)
values
 ('70000000-0000-4000-8000-000000000001','60000000-0000-4000-8000-000000000001','direct'),
 ('70000000-0000-4000-8000-000000000002','60000000-0000-4000-8000-000000000001','group');
insert into public.conversation_members (conversation_id, user_id) values
 ('70000000-0000-4000-8000-000000000001','60000000-0000-4000-8000-000000000001'),
 ('70000000-0000-4000-8000-000000000001','60000000-0000-4000-8000-000000000002'),
 ('70000000-0000-4000-8000-000000000002','60000000-0000-4000-8000-000000000001'),
 ('70000000-0000-4000-8000-000000000002','60000000-0000-4000-8000-000000000002'),
 ('70000000-0000-4000-8000-000000000002','60000000-0000-4000-8000-000000000003');

set local role authenticated;
select set_config('request.jwt.claim.sub','60000000-0000-4000-8000-000000000001',true);
select lives_ok($$select public.heartbeat_my_presence()$$, 'verified member can refresh their own presence');
select is((select count(*) from public.user_presence),1::bigint,'member can read only their own heartbeat row');
select is(public.can_access_call_topic('call:70000000-0000-4000-8000-000000000001'),true,'accepted adult friends can join the direct call topic');
select is(public.can_access_call_topic('call:70000000-0000-4000-8000-000000000002'),false,'group conversations cannot join one-to-one call topics');
select is((select online_count from public.get_live_city_presence() where city = 'Nairobi'),3,'city counts are returned only after three opted-in adults are online');
insert into public.blocks (blocker_id, blocked_id) values ('60000000-0000-4000-8000-000000000001','60000000-0000-4000-8000-000000000002');
select is(public.can_access_call_topic('call:70000000-0000-4000-8000-000000000001'),false,'a block revokes call-channel access');
select is((select count(*) from public.get_live_city_presence()),0::bigint,'blocked members are removed before the minimum city count is applied');
select set_config('request.jwt.claim.sub','60000000-0000-4000-8000-000000000004',true);
select is(public.can_access_call_topic('call:70000000-0000-4000-8000-000000000001'),false,'non-members cannot join another conversation call topic');

select * from finish();
rollback;
