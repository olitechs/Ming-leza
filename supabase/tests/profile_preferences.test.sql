begin;
create extension if not exists pgtap with schema extensions;
select plan(6);

insert into auth.users (id, aud, role, email, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
 ('50000000-0000-4000-8000-000000000001','authenticated','authenticated','profile-preferences-a@example.invalid','{}'::jsonb,'{}'::jsonb,now(),now()),
 ('50000000-0000-4000-8000-000000000002','authenticated','authenticated','profile-preferences-b@example.invalid','{}'::jsonb,'{}'::jsonb,now(),now()),
 ('50000000-0000-4000-8000-000000000003','authenticated','authenticated','profile-preferences-c@example.invalid','{}'::jsonb,'{}'::jsonb,now(),now());

insert into public.profiles (id, display_name, city, friends_enabled, dating_enabled, is_discoverable)
values
 ('50000000-0000-4000-8000-000000000001','Preference Member A','Watamu',true,false,true),
 ('50000000-0000-4000-8000-000000000002','New Member',null,true,false,false),
 ('50000000-0000-4000-8000-000000000003','Preference Member C','Malindi',true,false,false);

insert into public.age_verifications (user_id, is_18_plus)
values
 ('50000000-0000-4000-8000-000000000001',true),
 ('50000000-0000-4000-8000-000000000002',true);

set local role authenticated;
select set_config('request.jwt.claim.sub','50000000-0000-4000-8000-000000000001',true);
select lives_ok(
  $$select public.update_my_discovery_preferences(false, true, false)$$,
  'adult member can hide their own profile'
);
select is(
  (select is_discoverable from public.profiles where id = auth.uid()),
  false,
  'visibility preference is persisted on the caller profile'
);
select lives_ok(
  $$select public.update_my_discovery_preferences(true, true, false)$$,
  'complete profile can enable visibility with an active intent'
);
select throws_ok(
  $$select public.update_my_discovery_preferences(true, false, false)$$,
  '22023', null, 'visible profiles must have at least one enabled intent'
);

select set_config('request.jwt.claim.sub','50000000-0000-4000-8000-000000000002',true);
select throws_ok(
  $$select public.update_my_discovery_preferences(true, true, false)$$,
  '22023', null, 'incomplete profile cannot become discoverable'
);

select set_config('request.jwt.claim.sub','50000000-0000-4000-8000-000000000003',true);
select throws_ok(
  $$select public.update_my_discovery_preferences(false, true, false)$$,
  '42501', null, 'unverified member cannot change discovery preferences'
);

reset role;
select * from finish();
rollback;
