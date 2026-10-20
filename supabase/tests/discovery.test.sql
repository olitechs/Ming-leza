begin;
create extension if not exists pgtap with schema extensions;
select plan(5);

insert into auth.users (id, aud, role, email, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
 ('10000000-0000-4000-8000-000000000001','authenticated','authenticated','mingleza-test-a@example.invalid','{}'::jsonb,'{}'::jsonb,now(),now()),
 ('10000000-0000-4000-8000-000000000002','authenticated','authenticated','mingleza-test-b@example.invalid','{}'::jsonb,'{}'::jsonb,now(),now()),
 ('10000000-0000-4000-8000-000000000003','authenticated','authenticated','mingleza-test-c@example.invalid','{}'::jsonb,'{}'::jsonb,now(),now()),
 ('10000000-0000-4000-8000-000000000004','authenticated','authenticated','mingleza-test-d@example.invalid','{}'::jsonb,'{}'::jsonb,now(),now());

insert into public.profiles (id,display_name,friends_enabled,dating_enabled,is_discoverable)
values
 ('10000000-0000-4000-8000-000000000001','Test Adult A',true,true,true),
 ('10000000-0000-4000-8000-000000000002','Test Adult B',true,true,true),
 ('10000000-0000-4000-8000-000000000003','Test Adult C',true,false,true),
 ('10000000-0000-4000-8000-000000000004','Test NonAdult D',true,true,true);
insert into public.age_verifications (user_id,is_18_plus)
values
 ('10000000-0000-4000-8000-000000000001',true),
 ('10000000-0000-4000-8000-000000000002',true),
 ('10000000-0000-4000-8000-000000000003',true),
 ('10000000-0000-4000-8000-000000000004',false);

set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',true);
select is((select count(*)::int from public.discover_profiles('dating',20)), 1, 'dating discovery only returns matching eligible profiles');
select is((select count(*)::int from public.discover_profiles('friends',20)), 2, 'friends discovery returns profiles with friendship intent enabled');
select throws_ok($$select * from public.discover_profiles('invalid',20)$$, '22023', null, 'invalid discovery intent is rejected');

reset role;
insert into public.blocks (blocker_id,blocked_id)
values ('10000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000002');
set local role authenticated;
select is((select count(*)::int from public.discover_profiles('dating',20)), 0, 'profiles are excluded after a block in either direction');

reset role;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000004',true);
set local role authenticated;
select throws_ok($$select * from public.discover_profiles('dating',20)$$, '42501', null, 'unverified adult status cannot discover profiles');
reset role;

select * from finish();
rollback;
