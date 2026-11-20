# Support, safety, and legal readiness

**Status: implementation exists; operational and legal launch gates remain open.** This checklist documents repository findings and decisions needed from the product owner. It is not legal advice or a substitute for an approved privacy notice.

## Existing code paths

- Member report/block controls are implemented in the profile safety actions.
- A moderator queue exists behind role-based authorization; moderator access must be granted intentionally through trusted Supabase Auth app_metadata.
- In-app support intake and queue-based review/replies are implemented.
- Personal-data export and self-service account deletion are implemented in the account workflow; avatar cleanup is attempted by the deletion flow.
- Public /terms and /privacy routes are intentionally labeled as draft placeholders.
- The Likes inbox is /likes, friendship requests are /matches, and the notification inbox is /notifications. The shared desktop/mobile navigation is the only persistent navigation entry point for Likes and Notifications.

These are code-level observations, not confirmation that a live production deployment, database policies, support mailbox, or staffed moderation service is operating.

## Required launch gates

### Support operations

- [ ] Supply and verify an owner-controlled support email or URL; do not publish a guessed contact.
- [ ] Assign a named operational owner and trained, trusted moderators.
- [ ] Define expected response times, escalation for imminent danger or child-safety concerns, appeals, and abuse of reporting.
- [ ] Define what evidence is collected, who can access it, retention/deletion periods, and how access is audited.
- [ ] Test support submission, queue visibility, reply flow, and authorization with at least two separate member accounts and an authorized moderator account.

### Blocking and moderation

- [ ] Verify blocked pairs cannot discover, like, message, or send friendship requests to one another in either direction.
- [ ] Decide and test the effect of blocking on existing friend requests, accepted friendships, dating matches, and prior messages.
- [ ] Confirm moderator-only routes and server actions reject unauthorised users, including forged client requests.
- [ ] Test that report content is visible only to the reporter as appropriate and authorized moderators, not arbitrary members.

### Account deletion and data rights

- [ ] Against a dedicated non-production Supabase project, verify deletion of the auth identity, profile, related social data, and stored avatars; record any intentionally retained records and legal basis.
- [ ] Verify a user cannot export or delete another member's data by changing a submitted identifier.
- [ ] Verify failed storage cleanup is observable and has a safe retry or documented manual remediation path.
- [ ] Approve retention periods and deletion exceptions before describing deletion as complete and immediate.

### Privacy and legal review

- [ ] Have qualified counsel review and approve Terms of Service and Privacy Policy for the jurisdictions in which the service will operate.
- [ ] Document controller/business identity, purposes and legal bases, data categories, processors, retention, user rights, contact details, security practices, and complaint route.
- [ ] Explicitly review the existing public-read profile-avatar bucket. Either approve this exposure and explain it clearly or plan a tested move to private storage with signed access.
- [ ] Explain that 18+ verification currently uses self-attestation/derived verification state; do not claim ID or biometric verification.
- [ ] Confirm cookie/session, analytics, email delivery, breach handling, and cross-border processing disclosures against actual deployment settings.
- [ ] Keep the public pages visibly marked as drafts until approved text replaces the placeholders.

## Verification boundary

No production database changes were made for this phase. Do not run migrations against production until migration history is reconciled with the deployed schema. Live support delivery, moderator staffing, legal approval, deletion/retention behavior, and production environment configuration remain unverified. Run the repository's lint, typecheck, unit tests, build, formatting checks, and Supabase/RLS tests after implementation changes; a GitHub commit alone is not evidence those checks passed.
