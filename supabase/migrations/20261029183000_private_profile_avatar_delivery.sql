-- Make existing profile avatar objects private without changing their object paths.
-- The application now requests short-lived signed URLs for existing avatar_path values.
update storage.buckets
set public = false,
    file_size_limit = 5242880,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
where id = 'profile-avatars';

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('profile-avatars', 'profile-avatars', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "profile_avatars_public_read" on storage.objects;
drop policy if exists "profile_avatars_read_visible_profile" on storage.objects;
create policy "profile_avatars_read_visible_profile"
on storage.objects for select
to authenticated
using (
  bucket_id = 'profile-avatars'
  and exists (
    select 1
    from public.profiles p
    where p.id::text = (storage.foldername(name))[1]
      and p.avatar_path = name
  )
);

-- Keep the existing owner-scoped insert/update/delete policies in place.
-- The SELECT policy relies on profiles RLS, including adult verification,
-- discovery/friend visibility, and symmetric block restrictions. Signed URLs
-- are deliberately short-lived; an already-issued URL remains valid until expiry.
