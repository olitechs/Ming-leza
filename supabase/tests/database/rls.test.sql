begin;
select plan(21);

select has_table('public', 'profiles', 'profiles table exists');
select has_table('public', 'age_verifications', 'age verification table exists');
select has_table('public', 'messages', 'messages table exists');
select has_policy('public', 'profiles', 'profiles_read_self_or_discoverable', 'profile discovery policy exists');
select has_policy('public', 'profiles', 'profiles_insert_self', 'profile insert is self-only');
select has_policy('public', 'profiles', 'profiles_update_self', 'profile update is self-only');
select has_policy('public', 'age_verifications', 'age_verification_read_self', 'age verification is read-only to users');
select has_policy('public', 'messages', 'messages_read_members', 'messages are participant-readable');
select has_policy('public', 'messages', 'messages_insert_members', 'message sends require membership');
select has_policy('public', 'messages', 'messages_update_own', 'message edits are sender-only');
select has_policy('public', 'blocks', 'blocks_read_as_blocker', 'only the blocker can list their blocks');
select has_policy('public', 'blocks', 'blocks_insert_as_blocker', 'users can only create their own blocks');
select has_policy('public', 'blocks', 'blocks_delete_as_blocker', 'users can only remove their own blocks');
select ok(not public.is_blocked_between(gen_random_uuid(), gen_random_uuid()), 'unrelated users are not blocked');

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
 ('10000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'rls-a@example.test', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
 ('10000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'rls-b@example.test', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now());
insert into public.profiles (id, display_name) values
 ('10000000-0000-4000-8000-000000000001', 'Test A'),
 ('10000000-0000-4000-8000-000000000002', 'Test B');
insert into public.age_verifications (user_id, is_18_plus) values
 ('10000000-0000-4000-8000-000000000001', true),
 ('10000000-0000-4000-8000-000000000002', true);
insert into public.user_preferences (user_id) values
 ('10000000-0000-4000-8000-000000000001'),
 ('10000000-0000-4000-8000-000000000002');
insert into public.conversations (id, created_by) values
 ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001'),
 ('20000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000002');
insert into public.conversation_members (conversation_id, user_id) values
 ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001'),
 ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000002'),
 ('20000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000002');
insert into public.messages (conversation_id, sender_id, body) values
 ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'visible to participants'),
 ('20000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000002', 'private to B');

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select is((select count(*) from public.profiles where id = '10000000-0000-4000-8000-000000000001'), 1::bigint, 'user can read own profile');
select is((select count(*) from public.profiles where id = '10000000-0000-4000-8000-000000000002'), 1::bigint, 'verified discoverable profile can be read');
select is((select count(*) from public.age_verifications where user_id = '10000000-0000-4000-8000-000000000002'), 0::bigint, 'other users cannot read age-verification records');
select is((select count(*) from public.user_preferences where user_id = '10000000-0000-4000-8000-000000000002'), 0::bigint, 'other users cannot read private preferences');
select is((select count(*) from public.messages), 1::bigint, 'user sees only messages in conversations they belong to');
insert into public.blocks (blocker_id, blocked_id) values ('10000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000002');
select is((select count(*) from public.profiles where id = '10000000-0000-4000-8000-000000000002'), 0::bigint, 'blocker no longer sees blocked profile');
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);
select is((select count(*) from public.profiles where id = '10000000-0000-4000-8000-000000000001'), 0::bigint, 'blocked user also cannot see the blocker profile');
select ok(public.is_blocked_between('10000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001'), 'block lookup is symmetric for the blocked user');
select * from finish();
rollback;
