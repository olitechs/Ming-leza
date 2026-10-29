# Privacy and launch-readiness audit

- **Status:** Engineering review; not a legal opinion or launch approval.
- **Reviewed:** 2026-10-29
- **Scope:** Repository implementation only. Production Supabase settings, deployed environment variables, legal entity details, staffing, and operational procedures were not independently verified.

## Confirmed findings

### P0 — Public profile-avatar objects

Evidence: `supabase/migrations/20261020140500_profile_avatar_storage.sql` creates the `profile-avatars` bucket with `public = true` and a `storage.objects` SELECT policy for `to public`. `src/components/Avatar.tsx` builds direct public-object URLs.

Implication: possession of an avatar URL is sufficient to fetch that image, regardless of whether a viewer is signed in or the profile remains discoverable. Hiding a profile in the application is not equivalent to making its image private.

Required remediation before claiming private avatars:
1. Define the intended visibility rule (e.g. signed-in users who are allowed to view the profile; possibly stricter for blocked members).
2. Migrate to a private bucket and replace direct public URLs with short-lived signed URLs or an authenticated image endpoint.
3. Enforce the same visibility and block rules at the image-serving boundary; never rely only on UI hiding.
4. Add tests for anonymous access, non-discoverable profiles, blocked pairs, expired URLs, object-path traversal, and owner upload/update/delete.
5. Deploy the additive migration and application change together through the normal release process; verify rollback and existing-image compatibility first.

Do not flip the bucket to private as a standalone change: the current `Avatar` component depends on public URLs and would stop displaying existing photos.

### P0 — Privacy policy is still a placeholder

Evidence: `src/routes/privacy.tsx` explicitly labels the page a draft and says the final document is still being prepared.

Required remediation:
- Obtain a policy reviewed for the actual operating entity and target jurisdictions.
- Describe data categories, purposes, lawful basis where applicable, retention, processors, international transfers, user rights, contact details, and safety/reporting processes accurately.
- Verify the published policy matches production behavior and vendor configuration.
- Do not publish placeholder text as a final policy or treat this repository audit as legal approval.

### P1 — Account deletion needs end-to-end verification

Evidence: migration `20261025120000_account_data_rights_support.sql` describes account deletion and export as a phase, but the current `src/lib/profile/server.ts` exports profile read/edit, discovery preferences, and avatar-path functions; it does not export a self-service account-deletion handler.

Required remediation:
- Trace any account deletion/export flow elsewhere in the repository and the deployed app before concluding it is absent from the product.
- Implement deletion using a server-only trusted administrative path, recent-authentication/confirmation safeguards, idempotency, and an explicit completion state.
- Audit foreign-key cascades and storage objects (including avatar files), auth identities, messages, reports, support records, and legally required retention.
- Define whether retained safety records are minimized/pseudonymized and document the retention exception.
- Test that one account cannot delete another account and that partial failures can be safely retried.

### P1 — Moderation queue is not proof of a staffed safety service

Evidence: `src/routes/moderation.tsx` and `src/lib/moderation/server.ts` restrict queue access to a trusted `app_metadata.role` of `moderator` or `admin`. The UI itself states that the queue does not create a staffed service, response-time guarantee, or emergency escalation channel.

Required remediation:
- Assign trusted roles through a documented, audited administrator procedure (never user-editable metadata).
- Define ownership, coverage hours, severity levels, response targets, appeals, escalation, and retention.
- Test unauthorized access to list/update handlers, not only the route.
- Publish only support and safety commitments that operations can actually meet.

### P1 — Support intake has a per-user rate limit, but operations remain unverified

Evidence: `src/lib/support/server.ts` limits support intake to five requests per user per hour and allows users to view their own requests.

Required remediation:
- Verify queue access, notification/triage workflow, spam handling, response ownership, retention, and monitoring.
- Test that requesters cannot read or modify other users' support records.
- Avoid promising response times until staffing and monitoring are established.

## Release gates

- [ ] Private-avatar access model approved, implemented, and tested; or explicitly disclose that avatar images are public.
- [ ] Final privacy policy reviewed and published.
- [ ] Account export/deletion path located or implemented and tested end-to-end.
- [ ] Moderator roles and moderation escalation procedure operational.
- [ ] Support intake is monitored by an accountable owner.
- [ ] RLS and negative authorization tests pass against an isolated environment.
- [ ] Production configuration and migrations reviewed without making unapproved production changes.
- [ ] Release smoke tests cover signup, age gate, discovery preferences, block/report, mutual matches, chat, theme toggle, and account settings.

## Non-goals of this audit

This document does not claim that production configuration matches repository migrations, that a policy is legally sufficient, or that the product is launch-ready. Each gate requires evidence from the relevant code, isolated tests, deployment configuration, and operational owner.
