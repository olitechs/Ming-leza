begin;
create extension if not exists pgtap with schema extensions;
select plan(11);

insert into auth.users (id, aud, role, email, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
 ('30000000-0000-4000-8000-000000000001','authenticated','authenticated','match-test-a@example.invalid','{}'::jsonb,'{}'::jsonb,now(),now()),
 ('30000000-0000-4000-8000-000000000002','authenticated','authenticated','match-test-b@example.invalid','{}'::jsonb,'{}'::jsonb,now(),now()),
 ('30000000-0000-4000-8000-000000000003','authenticated','authenticated','match-test-c@example.invalid','{}'::jsonb,'{}'::jsonb,now(),now());

insert into public.profiles (id, display_name, city, friends_enabled, dating_enabled, is_discoverable)
values
 ('30000000-0000-4000-8000-000000000001','Match Tester A','Nairobi',true,true,true),
 ('30000000-0000-4000-8000-000000000002','Match Tester B','Mombasa',true,true,true),
 ('30000000-0000-4000-8000-000000000003','Match Tester C','Watamu',true,true,true);

insert into public.age_verifications (user_id, is_18_plus)
values
 ('30000000-0000-4000-8000-000000000001',true),
 ('30000000-0000-4000-8000-000000000002',true),
 ('30000000-0000-4000-8000-000000000003',true);

set local role authenticated;
select set_config('request.jwt.claim.sub','30000000-0000-4000-8000-000000000002',true);
select lives_ok(
  $$select public.submit_profile_swipe('30000000-0000-4000-8000-000000000001','like')$$,
  'first like saves without prematurely creating a match'
);
select is(
  (select count(*)::int from public.dating_matches),
  0,
  'one-sided like does not create a match'
);

select set_config('request.jwt.claim.sub','30000000-0000-4000-8000-000000000001',true);
select is(
  (select count(*)::int from public.list_incoming_dating_likes()),
  1,
  'incoming likes list shows a member who has liked the current user'
);
select lives_ok(
  $$select public.submit_profile_swipe('30000000-0000-4000-8000-000000000002','like')$$,
  'reciprocal like is accepted'
);
select is(
  (select count(*)::int from public.dating_matches where status = 'active'),
  1,
  'reciprocal likes create exactly one active match'
);
select is(
  (select count(*)::int from public.list_my_dating_matches()),
  1,
  'matched member can list the mutual match'
);
select is(
  (select count(*)::int from public.list_incoming_dating_likes()),
  0,
  'mutual match is no longer shown as an incoming like'
);

select set_config('request.jwt.claim.sub','30000000-0000-4000-8000-000000000003',true);
select is(
  (select count(*)::int from public.dating_matches),
  0,
  'unrelated member cannot read other members matches'
);

select set_config('request.jwt.claim.sub','30000000-0000-4000-8000-000000000001',true);
select lives_ok(
  $$select public.unmatch_dating_profile((select id from public.dating_matches where user_low_id = '30000000-0000-4000-8000-000000000001' and user_high_id = '30000000-0000-4000-8000-000000000002'))$$,
  'a participant can end their match'
);
select is(
  (select count(*)::int from public.list_my_dating_matches()),
  0,
  'unmatched connection disappears from the active match list'
);
select throws_ok(
  $$insert into public.dating_matches (user_low_id,user_high_id) values ('30000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000003')$$,
  '42501', null, 'clients cannot create matches directly'
);

reset role;
select * from finish();
rollback;
