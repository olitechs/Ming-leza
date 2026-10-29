# Privacy and launch-readiness audit

- **Status:** Engineering review, not a legal opinion or launch approval.
- **Reviewed:** 2026-10-29
- **Scope:** Repository implementation only. Production Supabase settings,
  deployed environment variables, legal entity details, staffing, and operating
  procedures have not been independently verified.

## Confirmed findings

### P0 — Public profile-avatar objects

The migration `supabase/migrations/20261020140500_profile_avatar_storage.sql`
creates the `profile-avatars` bucket as public and grants public reads on
`storage.objects`. The `src/components/Avatar.tsx` component builds public
object URLs.

Anyone with an avatar URL can fetch that image, even if its profile is hidden
from discovery. UI visibility is not equivalent to private image storage.

Required remediation:
1. Use a private bucket and short-lived signed URLs or an authenticated image
   endpoint.
2. Enforce profile visibility and block rules at the image-serving boundary.
3. Test anonymous access, non-discoverable profiles, blocked pairs, expired
   URLs, object-path validation, and owner upload/update/delete.
4. Deploy application and migration together, with rollback and existing-image
   compatibility verified.

Do not make the bucket private without deploying compatible application code:
the current avatar component depends on public URLs.

### P0 — Privacy policy is a placeholder

The page `src/routes/privacy.tsx` labels the policy as a draft.

Required remediation:
- Obtain review for the actual operating entity and target jurisdictions.
- Accurately describe data, purposes, legal basis where applicable, retention,
  processors, transfers, user rights, contact details, and safety processes.
- Confirm the published policy matches production behavior and vendor setup.
- Do not treat this audit as legal approval.

### P1 — Account deletion requires end-to-end verification

The migration
`20261025120000_account_data_rights_support.sql` describes account deletion
and export as a phase. The current `src/lib/profile/server.ts` does not export
a self-service deletion handler; trace the complete application flow before
concluding the feature is absent.

Required remediation:
- Use a trusted server-only administrative path, recent authentication,
  explicit confirmation, idempotency, and a clear completion state.
- Audit cascades and storage objects, identities, messages, reports, support
  records, and legally required retention.
- Define minimized or pseudonymized safety-record retention.
- Test cross-account authorization and safe retries after partial failure.

### P1 — Moderation queue does not prove staffed safety coverage

The routes and services in `src/routes/moderation.tsx` and
`src/lib/moderation/server.ts` require trusted `app_metadata.role` values
of `moderator` or `admin`. The queue alone does not provide staffed coverage,
response guarantees, or emergency escalation.

Required remediation:
- Provision trusted roles through an audited administrator process.
- Define ownership, coverage hours, severity, response targets, appeals,
  escalation, and retention.
- Test authorization on handlers as well as routes.
- Publish only support commitments operations can meet.

### P1 — Support intake operations need verification

`src/lib/support/server.ts` limits each user to five support requests per
hour and allows users to view their own requests. Queue access, notifications,
triage, spam handling, retention, monitoring, and accountable ownership still
need operational verification. Test that users cannot read or modify another
user's support records. Do not promise response times before staffing exists.

## Release gates

- [ ] Private avatar access model is implemented and tested, or public image
      access is explicitly disclosed.
- [ ] A reviewed privacy policy is published.
- [ ] Account export and deletion are verified end to end.
- [ ] Moderator role provisioning and escalation procedures are operational.
- [ ] Support intake is monitored by an accountable owner.
- [ ] RLS and negative authorization tests pass in an isolated environment.
- [ ] Production configuration and migrations are reviewed without unapproved
      production changes.
- [ ] Smoke tests cover signup, age gate, discovery preferences, block/report,
      mutual matches, chat, theme toggle, and account settings.

## Scope limits

This document does not verify production configuration, legal sufficiency, or
launch readiness. Each gate needs evidence from code, isolated tests, deployment
configuration, and the responsible operational owner.
