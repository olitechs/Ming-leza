begin;
select plan(35);

select has_table('public', 'profiles', 'profiles table exists');
select ok(exists (select 1 from storage.buckets where id = 'profile-avatars' and public = false), 'profile avatar bucket is private');
select ok(not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'profile_avatars_public_read'), 'public avatar read policy is removed');
select ok(exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'profile_avatars_read_visible_profile' and cmd = 'SELECT'), 'visible-profile avatar read policy exists');
select has_table('public', 'age_verifications', 'age verification table exists');
select has_table('public', 'messages', 'messages table exists');
select has_column('public', 'moderation_reports', 'status', 'moderation reports have workflow status');
select ok(not has_column_privilege('authenticated', 'public.moderation_reports', 'status', 'INSERT'), 'members cannot set moderation workflow status');
select ok(not has_column_privilege('authenticated', 'public.moderation_reports', 'reviewed_by', 'INSERT'), 'members cannot assign moderators');
select has_table('public', 'support_requests', 'in-app support request table exists');
select ok(exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'support_requests' and policyname = 'support_requests_read_self'), 'members can read only their own support requests');
select ok(not has_column_privilege('authenticated', 'public.support_requests', 'status', 'INSERT'), 'members cannot set support workflow status');
select ok(not has_column_privilege('authenticated', 'public.support_requests', 'response_message', 'INSERT'), 'members cannot forge staff support replies');
select ok(exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'profiles' and policyname = 'profiles_read_self_or_discoverable'), 'profile discovery policy exists');
select ok(exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'profiles' and policyname = 'profiles_insert_self'), 'profile insert is self-only');
select ok(exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'profiles' and policyname = 'profiles_update_self'), 'profile update is self-only');
select ok(exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'age_verifications' and policyname = 'age_verification_read_self'), 'age verification is read-only to users');
select ok(exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'messages' and policyname = 'messages_read_members'), 'messages are participant-readable');
select ok(exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'messages' and policyname = 'messages_insert_members'), 'message sends require membership');
select ok(exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'messages' and policyname = 'messages_update_own'), 'message edits are sender-only');
select ok(exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'blocks' and policyname = 'blocks_read_as_blocker'), 'only the blocker can list their blocks');
select ok(exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'blocks' and policyname = 'blocks_insert_as_blocker'), 'users can only create their own blocks');
select ok(exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'blocks' and policyname = 'blocks_delete_as_blocker'), 'users can only remove their own blocks');
select ok(not public.is_blocked_between(gen_random_uuid(), gen_random_uuid()), 'unrelated users are not blocked');

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
 ('10000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'rls-a@example.test', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
 ('10000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'rls-b@example.test', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now());
insert into public.profiles (id, display_name, city, is_discoverable) values
 ('10000000-0000-4000-8000-000000000001', 'Test A', 'Nairobi', true),
 ('10000000-0000-4000-8000-000000000002', 'Test B', 'Nairobi', true);
update public.profiles set avatar_path = '10000000-0000-4000-8000-000000000001/avatar.jpg' where id = '10000000-0000-4000-8000-000000000001';
update public.profiles set avatar_path = '10000000-0000-4000-8000-000000000002/avatar.jpg' where id = '10000000-0000-4000-8000-000000000002';
insert into storage.objects (bucket_id, name) values
 ('profile-avatars', '10000000-0000-4000-8000-000000000001/avatar.jpg'),
 ('profile-avatars', '10000000-0000-4000-8000-000000000002/avatar.jpg');
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
select is((select count(*) from storage.objects where bucket_id = 'profile-avatars' and name = '10000000-0000-4000-8000-000000000001/avatar.jpg'), 1::bigint, 'member can read own avatar object for signing');
select is((select count(*) from storage.objects where bucket_id = 'profile-avatars' and name = '10000000-0000-4000-8000-000000000002/avatar.jpg'), 1::bigint, 'member can read discoverable adult avatar');
select is((select count(*) from public.profiles where id = '10000000-0000-4000-8000-000000000002'), 1::bigint, 'verified discoverable profile can be read');
select is((select count(*) from public.age_verifications where user_id = '10000000-0000-4000-8000-000000000002'), 0::bigint, 'other users cannot read age-verification records');
select is((select count(*) from public.user_preferences where user_id = '10000000-0000-4000-8000-000000000002'), 0::bigint, 'other users cannot read private preferences');
select is((select count(*) from public.messages), 1::bigint, 'user sees only messages in conversations they belong to');
insert into public.blocks (blocker_id, blocked_id) values ('10000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000002');
select is((select count(*) from public.profiles where id = '10000000-0000-4000-8000-000000000002'), 0::bigint, 'blocker no longer sees blocked profile');
select is((select count(*) from storage.objects where bucket_id = 'profile-avatars' and name = '10000000-0000-4000-8000-000000000002/avatar.jpg'), 0::bigint, 'blocker cannot read blocked member avatar for signing');
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);
select is((select count(*) from public.profiles where id = '10000000-0000-4000-8000-000000000001'), 0::bigint, 'blocked user also cannot see the blocker profile');
select is((select count(*) from storage.objects where bucket_id = 'profile-avatars' and name = '10000000-0000-4000-8000-000000000001/avatar.jpg'), 0::bigint, 'blocked member cannot read blocker avatar for signing');
select ok(public.is_blocked_between('10000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001'), 'block lookup is symmetric for the blocked user');
select * from finish();
rollback;
