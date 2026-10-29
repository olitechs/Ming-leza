begin;
create extension if not exists pgtap with schema extensions;
select plan(18);

insert into auth.users (id, aud, role, email, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
 ('60000000-0000-4000-8000-000000000001','authenticated','authenticated','security-a@example.invalid','{}'::jsonb,'{}'::jsonb,now(),now()),
 ('60000000-0000-4000-8000-000000000002','authenticated','authenticated','security-b@example.invalid','{}'::jsonb,'{}'::jsonb,now(),now()),
 ('60000000-0000-4000-8000-000000000003','authenticated','authenticated','security-c@example.invalid','{}'::jsonb,'{}'::jsonb,now(),now());

insert into public.profiles (id, display_name, city, friends_enabled, dating_enabled, is_discoverable)
values
 ('60000000-0000-4000-8000-000000000001','Security Member A','Watamu',false,true,true),
 ('60000000-0000-4000-8000-000000000002','Security Member B','Malindi',false,true,true),
 ('60000000-0000-4000-8000-000000000003','Security Member C','Kilifi',false,true,true);

insert into public.age_verifications (user_id, is_18_plus)
values
 ('60000000-0000-4000-8000-000000000001',true),
 ('60000000-0000-4000-8000-000000000002',true),
 ('60000000-0000-4000-8000-000000000003',true);

set local role authenticated;
select set_config('request.jwt.claim.sub','60000000-0000-4000-8000-000000000001',true);
select lives_ok(
  $$select public.submit_profile_swipe('60000000-0000-4000-8000-000000000002','like')$$,
  'first member can like the second member'
);

select set_config('request.jwt.claim.sub','60000000-0000-4000-8000-000000000002',true);
select lives_ok(
  $$select public.submit_profile_swipe('60000000-0000-4000-8000-000000000001','like')$$,
  'reciprocal like creates a mutual match'
);

select set_config('request.jwt.claim.sub','60000000-0000-4000-8000-000000000001',true);
select set_config('test.match_id',(select match_id::text from public.list_my_dating_matches() limit 1),true);
select lives_ok(
  $$select public.open_dating_conversation(current_setting('test.match_id')::uuid)$$,
  'match participant can open a dating conversation'
);
select set_config(
  'test.conversation_id',
  public.open_dating_conversation(current_setting('test.match_id')::uuid)::text,
  true
);
select set_config(
  'test.message_id',
  public.send_dating_message(current_setting('test.conversation_id')::uuid,'Security regression message')::text,
  true
);
select is(
  (select count(*)::int from public.dating_messages where conversation_id = current_setting('test.conversation_id')::uuid),
  1,
  'sender can read their persisted dating message'
);

select set_config('request.jwt.claim.sub','60000000-0000-4000-8000-000000000002',true);
select is(
  (select count(*)::int from public.dating_messages where conversation_id = current_setting('test.conversation_id')::uuid),
  1,
  'the other match participant can read the dating message'
);

select set_config('request.jwt.claim.sub','60000000-0000-4000-8000-000000000003',true);
select is(
  (select count(*)::int from public.dating_messages),
  0,
  'unrelated member cannot read dating messages'
);
select is(
  (select count(*)::int from public.notifications),
  0,
  'unrelated member cannot read another member notifications'
);

select set_config('request.jwt.claim.sub','60000000-0000-4000-8000-000000000002',true);
select is(
  (select count(*)::int from public.notifications where notification_type = 'dating_message'),
  1,
  'only the message recipient receives a dating-message notification'
);

reset role;
delete from public.age_verifications
where user_id = '60000000-0000-4000-8000-000000000002';

set local role authenticated;
select set_config('request.jwt.claim.sub','60000000-0000-4000-8000-000000000002',true);
select is(
  (select count(*)::int from public.dating_messages where conversation_id = current_setting('test.conversation_id')::uuid),
  0,
  'a member whose adult verification is revoked cannot read dating messages'
);
select is(
  (select count(*)::int from public.notifications),
  0,
  'a member whose adult verification is revoked cannot read notifications'
);
select throws_ok(
  $select public.send_dating_message(current_setting('test.conversation_id')::uuid, 'unverified send attempt')$,
  '42501', null, 'a member whose adult verification is revoked cannot send dating messages'
);

select set_config('request.jwt.claim.sub','60000000-0000-4000-8000-000000000001',true);
select is(
  (select count(*)::int from public.list_my_dating_matches()),
  0,
  'verified members do not receive match details for an unverified participant'
);

reset role;
insert into public.age_verifications (user_id, is_18_plus)
values ('60000000-0000-4000-8000-000000000002',true);
set local role authenticated;
select set_config('request.jwt.claim.sub','60000000-0000-4000-8000-000000000002',true);
select throws_ok(
  $$insert into public.dating_messages (conversation_id, sender_id, body)
    values (current_setting('test.conversation_id')::uuid, auth.uid(), 'direct insert attempt')$$,
  '42501', null, 'clients cannot bypass the validated dating-message RPC'
);
select throws_ok(
  $$update public.notifications set read_at = now() where user_id = auth.uid()$$,
  '42501', null, 'clients cannot update notification rows directly'
);

reset role;
insert into public.notifications (id, user_id, actor_id, notification_type, match_id, message_id)
values (
  '60000000-0000-4000-8000-000000000099',
  '60000000-0000-4000-8000-000000000001',
  '60000000-0000-4000-8000-000000000002',
  'dating_message',
  current_setting('test.match_id')::uuid,
  current_setting('test.message_id')::uuid
);

set local role authenticated;
select set_config('request.jwt.claim.sub','60000000-0000-4000-8000-000000000002',true);
select throws_ok(
  $$select public.mark_notification_read('60000000-0000-4000-8000-000000000099')$$,
  '42501', null, 'member cannot mark another members notification as read'
);

select set_config('request.jwt.claim.sub','60000000-0000-4000-8000-000000000001',true);
insert into public.blocks (blocker_id, blocked_id)
values (auth.uid(), '60000000-0000-4000-8000-000000000002');
select throws_ok(
  $$select public.send_dating_message(current_setting('test.conversation_id')::uuid, 'blocked send attempt')$$,
  '42501', null, 'blocking a match prevents further dating messages'
);
select lives_ok(
  $$select public.unmatch_dating_profile(current_setting('test.match_id')::uuid)$$,
  'match participant can end the dating match'
);
select throws_ok(
  $$select public.open_dating_conversation(current_setting('test.match_id')::uuid)$$,
  '42501', null, 'unmatched member cannot reopen dating chat'
);

reset role;
select * from finish();
rollback;
