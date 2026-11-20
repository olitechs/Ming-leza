begin;
create extension if not exists pgtap with schema extensions;
select plan(9);

insert into auth.users (id, aud, role, email, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
 ('40000000-0000-4000-8000-000000000001','authenticated','authenticated','dating-chat-a@example.invalid','{}'::jsonb,'{}'::jsonb,now(),now()),
 ('40000000-0000-4000-8000-000000000002','authenticated','authenticated','dating-chat-b@example.invalid','{}'::jsonb,'{}'::jsonb,now(),now()),
 ('40000000-0000-4000-8000-000000000003','authenticated','authenticated','dating-chat-c@example.invalid','{}'::jsonb,'{}'::jsonb,now(),now());

insert into public.profiles (id, display_name, city, friends_enabled, dating_enabled, is_discoverable)
values
 ('40000000-0000-4000-8000-000000000001','Dating Chat A','Nairobi',true,true,true),
 ('40000000-0000-4000-8000-000000000002','Dating Chat B','Mombasa',true,true,true),
 ('40000000-0000-4000-8000-000000000003','Dating Chat C','Watamu',true,true,true);

insert into public.age_verifications (user_id, is_18_plus)
values
 ('40000000-0000-4000-8000-000000000001',true),
 ('40000000-0000-4000-8000-000000000002',true),
 ('40000000-0000-4000-8000-000000000003',true);

set local role authenticated;
select set_config('request.jwt.claim.sub','40000000-0000-4000-8000-000000000001',true);
select lives_ok(
  $$select public.submit_profile_swipe('40000000-0000-4000-8000-000000000002','like')$$,
  'first member can save a dating like'
);

select set_config('request.jwt.claim.sub','40000000-0000-4000-8000-000000000002',true);
select lives_ok(
  $$select public.submit_profile_swipe('40000000-0000-4000-8000-000000000001','like')$$,
  'reciprocal like creates a mutual match'
);
select is(
  (select count(*)::int from public.notifications where user_id = auth.uid() and notification_type = 'new_match'),
  1,
  'match creation notifies the matched member'
);

select set_config('request.jwt.claim.sub','40000000-0000-4000-8000-000000000001',true);
select is(
  (select count(*)::int from public.notifications where user_id = auth.uid() and notification_type = 'new_match'),
  1,
  'both match participants receive their own notification'
);
select lives_ok(
  $$select public.open_dating_conversation((select match_id from public.list_my_dating_matches() limit 1))$$,
  'a match participant can open a dating conversation'
);
select lives_ok(
  $$select public.send_dating_message((select id from public.dating_conversations limit 1), 'Hello from a real match')$$,
  'a match participant can send a persisted dating message'
);

select set_config('request.jwt.claim.sub','40000000-0000-4000-8000-000000000002',true);
select is(
  (select count(*)::int from public.notifications where user_id = auth.uid() and notification_type = 'dating_message'),
  1,
  'new dating message creates a recipient notification'
);
select lives_ok(
  $$select public.mark_notification_read((select id from public.notifications where user_id = auth.uid() and notification_type = 'dating_message' limit 1))$$,
  'a member can mark their own notification as read'
);

select set_config('request.jwt.claim.sub','40000000-0000-4000-8000-000000000003',true);
select throws_ok(
  $$select public.open_dating_conversation('00000000-0000-4000-8000-000000000001')$$,
  '42501', null, 'a non-participant cannot open an arbitrary dating conversation'
);

reset role;
select * from finish();
rollback;
