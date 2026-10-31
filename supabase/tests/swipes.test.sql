begin;
create extension if not exists pgtap with schema extensions;
select plan(10);

insert into auth.users (id, aud, role, email, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
 ('20000000-0000-4000-8000-000000000001','authenticated','authenticated','swipe-test-a@example.invalid','{}'::jsonb,'{}'::jsonb,now(),now()),
 ('20000000-0000-4000-8000-000000000002','authenticated','authenticated','swipe-test-b@example.invalid','{}'::jsonb,'{}'::jsonb,now(),now()),
 ('20000000-0000-4000-8000-000000000003','authenticated','authenticated','swipe-test-c@example.invalid','{}'::jsonb,'{}'::jsonb,now(),now());

insert into public.profiles (id, display_name, city, friends_enabled, dating_enabled, is_discoverable)
values
 ('20000000-0000-4000-8000-000000000001','Swipe Tester A','Nairobi',true,true,true),
 ('20000000-0000-4000-8000-000000000002','Swipe Tester B','Mombasa',true,true,true),
 ('20000000-0000-4000-8000-000000000003','Unverified Tester','Watamu',true,true,true);

insert into public.age_verifications (user_id, is_18_plus)
values
 ('20000000-0000-4000-8000-000000000001',true),
 ('20000000-0000-4000-8000-000000000002',true),
 ('20000000-0000-4000-8000-000000000003',false);

set local role authenticated;
select set_config('request.jwt.claim.sub','20000000-0000-4000-8000-000000000001',true);
select lives_ok(
  $$select public.submit_profile_swipe('20000000-0000-4000-8000-000000000002','like')$$,
  'adult member can save a dating like'
);
select is(
  (select decision from public.profile_swipes where swiper_id = auth.uid() and target_id = '20000000-0000-4000-8000-000000000002'),
  'like',
  'saved like is visible to its owner'
);
select lives_ok(
  $$select public.submit_profile_swipe('20000000-0000-4000-8000-000000000002','pass')$$,
  'a saved decision can be updated'
);
select is(
  (select decision from public.profile_swipes where swiper_id = auth.uid() and target_id = '20000000-0000-4000-8000-000000000002'),
  'pass',
  'upsert changes the previous decision to pass'
);
select is(
  (select count(*)::int from public.discover_profiles('dating',20)),
  0,
  'previously swiped dating profiles are removed from the discovery feed'
);
select throws_ok(
  $$select public.submit_profile_swipe('20000000-0000-4000-8000-000000000001','like')$$,
  '22023', null, 'member cannot swipe on self'
);
select throws_ok(
  $$select public.submit_profile_swipe('20000000-0000-4000-8000-000000000002','maybe')$$,
  '22023', null, 'invalid decision is rejected'
);
select throws_ok(
  $$select public.submit_profile_swipe('20000000-0000-4000-8000-000000000003','like')$$,
  '42501', null, 'unverified target cannot receive a swipe'
);
select throws_ok(
  $$insert into public.profile_swipes (swiper_id,target_id,decision) values ('20000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000002','like')$$,
  '42501', null, 'clients cannot bypass the validated swipe RPC'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub','20000000-0000-4000-8000-000000000002',true);
select is(
  (select count(*)::int from public.profile_swipes),
  0,
  'another member cannot read another member swipe history'
);

reset role;
select * from finish();
rollback;
