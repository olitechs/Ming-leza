# Deferred work and verification gates

## Implemented and merged

- OTP authentication handlers for phone and email, session-aware server client, profile bootstrap, adult-verification flow, and separate friendship/dating preference flags.
- Adult verification stores only `is_18_plus` and `checked_at`; the submitted date of birth is not persisted.
- RLS-backed social schema and a server-side discovery RPC that filters by intent, adult verification, discoverability and bidirectional blocks.
- Discover route reads real profiles from the RPC and provides loading, empty, error and retry states.
- CI passed for Phase 3, and the production deployment for the merged `main` commit reached READY.

## Must resolve before calling authentication production-ready

- Verify that Vercel's `SUPABASE_SERVICE_ROLE_KEY` value is the service-role secret for the dedicated `mingleza-social` project. The environment variable's existence was observed, but its value was not retrieved or verified. Obtain the key from the Supabase Dashboard for project `ipctvjtmuafhuhqjatvt` and set it directly in Vercel Project Settings → Environment Variables for Production, Preview and Development as required. Do not paste the key into source control, logs, issues or chat. Redeploy after changing it.
- Complete a real end-to-end OTP sign-in and adult-verification test using a controlled test account and confirm session cookies, profile creation, age-verification persistence and redirect behavior.
- Review the local migration chain against the dedicated remote social project. The initial local migration and the already-provisioned remote schema have historical naming differences; do not assume full schema parity.
- Review and tighten social-table policies before exposing more functionality. Known areas requiring review include friendship state transitions, conversation-member insertion, message mutation, and post/comment/like visibility in the presence of blocks.
- Correctly distinguish authorization failures from other database failures in the discovery server function.

## Product implementation still needed

- Profile editing and avatar upload with storage policies and safe file validation.
- Profile detail and connection actions backed by server-validated database operations.
- Persistent messaging with conversation membership checks, bidirectional block enforcement, and appropriate Realtime policies.
- Reporting and moderation workflows.
- Map provider selection and privacy-safe approximate-location discovery; consent must be off by default and precise coordinates must never be exposed to clients.
- Premium payments using verified, idempotent server callbacks and integer minor units.
- Android/Expo client and low-end Android/slow-network testing.
- Full regression review of the original UI and repository-wide search for obsolete branding/references.

## Phase 1 repository hygiene

- Confirm the committed `pnpm-lock.yaml` is reproducible with pnpm 10.12.4 and a frozen install.
- Review UI component/dependency usage before deleting anything.
- Continue requiring lint, typecheck, unit tests, database/RLS tests, formatting and production build to pass before merge.
- Do not store date of birth, secrets, or precise location in logs, analytics, or client-visible data.
