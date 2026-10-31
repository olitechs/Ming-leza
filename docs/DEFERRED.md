# Deferred work

## Implemented product baseline

The app includes email/password sign-up and sign-in, password recovery, account metadata capture, adult verification, validated profile setup, Supabase-backed profiles and discovery, friend requests, and direct messages between accepted friends. Incomplete profiles remain out of Discover; friend and pending-request relationships are excluded. Profile photos use the existing profile-avatar storage bucket with an initials fallback. Explore is a privacy-safe coming-soon state rather than a demo map.

Logged-out visitors see the public marketing homepage and a searchable, categorized FAQ at `/faq`; signed-in, age-verified members continue to see Discover at `/`. Public `/terms` and `/privacy` pages are clearly marked draft placeholders pending legal review. The public sitemap lists `/`, `/faq`, `/terms`, and `/privacy`; application and member-profile routes remain excluded from crawler discovery. The `/likes` destination shows incoming dating likes and mutual matches; `/matches` is reserved for incoming and outgoing friendship requests. `/notifications` is the single notification inbox. Likes and Notifications are in the shared member navigation, not duplicated in page headers. Active mutual matches can use persisted dating chat at `/chat/$matchId`; match and dating-message events create member-scoped in-app notifications at `/notifications`.

The app stores only a derived adult-verification result and check time; it does not store a date of birth or birth year and does not display member ages. The current age check is self-attestation, not identity-document or biometric verification. Do not add age storage or display without an approved product decision.

## Verification and deployment gaps

`docs/homepage-verification.md` records the earlier homepage checks, responsive screenshots, contrast measurements, and a locally simulated edge-cache Lighthouse run. The edge simulation is not a production deployment measurement. `docs/product-completeness-audit.md` records the feature review, evidence, remaining gaps, and validation results.

Production deployment, live SMS/email authentication, and migrations against the production Supabase project have not been verified. Configure Supabase email confirmation and password-reset templates, set the deployed `SITE_URL`, allow `<SITE_URL>/auth-callback` and its `next=reset-password` redirect in Supabase Auth redirects, and confirm supported-country seed data before production use. Verify storage-bucket visibility and deployed security settings against the final privacy commitments.

- Verify directly in the Supabase/Vercel settings that the server-only `SUPABASE_SERVICE_ROLE_KEY` value belongs to the dedicated Mingleza project. A configured variable name alone does not prove its value is correct. Never copy the key into source control, logs, issues, or chat.
- The automated email-link session regression test exercises OTP request setup, PKCE exchange, SSR session-cookie persistence, profile creation, and authenticated onboarding state against a local HTTP test double. Still complete a controlled live phone/email OTP and adult-verification test in a non-production environment; confirm provider delivery, session-cookie handling, profile creation, derived age-verification persistence, and redirect behavior. Do not store the submitted date of birth.
- Reconcile the repository migration history with the dedicated Supabase project's deployed schema before production migrations. Do not assume local migration files and remote schema are identical.
- Review database/RPC authorization for friendship state transitions, conversation membership, message mutations, and visibility when either member has blocked the other; preserve these checks in database/RLS regression tests.

The Terms and Privacy pages are placeholders, not final legal text or legal advice; obtain legal review before treating them as policy documents. Member-facing report/block controls, a restricted moderator queue, in-app support intake, personal-data export, and self-service account deletion are implemented in code. They are not a staffed or externally verified support service until the owner assigns trusted moderator accounts, defines response/retention/escalation procedures, and completes a live deployment verification. No external support inbox or URL has been verified.

## Remaining product work

- Operationalize the safety workflow: assign trusted moderator accounts through Supabase Auth `app_metadata`, staff the queue, define response-time expectations, escalation and evidence-retention rules, and verify the production workflow. Code and a restricted queue exist, but monitoring is not configured by repository changes alone.
- Publish a verified external support contact and obtain legal approval for data-retention rules. In-app support intake, personal-data export, and account deletion are implemented; verify avatar cleanup, cascaded deletion, and support handling in the deployed Supabase project before launch.
- Real-time updates for both friend and dating conversations; current chat screens refresh on open and after sending rather than subscribing to live events.
- External email/push notifications, notification preferences, and message-management controls.
- Explore map and location/distance-based discovery.
- Premium plans, paid entitlements, provider checkout/webhooks, and M-Pesa remain unimplemented pending approved pricing, plan limits, provider selection, and billing/refund policy. See [premium readiness audit](premium-readiness.md); do not add fake payment-success states or require subscriptions for existing member workflows.
- Final Terms and Privacy text after legal review; privacy review for publicly retrievable profile-avatar assets.
- Product decisions for availability outside Kenya, support and safety escalation, pricing, premium payments, and M-Pesa.
