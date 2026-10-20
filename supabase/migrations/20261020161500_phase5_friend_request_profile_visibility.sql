-- Pending request participants need enough profile visibility to review the request.
drop policy if exists profiles_read_discoverable_adults on public.profiles;
create policy profiles_read_discoverable_adults
on public.profiles
for select
to authenticated
using (
  id = (select auth.uid())
  or (
    private.is_adult_verified(id)
    and not private.is_blocked_between((select auth.uid()), id)
    and (
      is_discoverable
      or exists (
        select 1 from public.friendships f
        where f.status in ('pending', 'accepted')
          and (
            (f.requester_id = (select auth.uid()) and f.addressee_id = profiles.id)
            or (f.addressee_id = (select auth.uid()) and f.requester_id = profiles.id)
          )
      )
    )
  )
);
