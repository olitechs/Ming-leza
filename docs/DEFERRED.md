# Deferred work

## Implemented product baseline

The current auth branch replaces passwordless SMS/email-link sign-in with email/password registration, sign-in and recovery. It adds age preflight, private registration details, and preserves existing profile IDs and onboarding. Supabase provider setup and controlled non-production validation remain pending; see `docs/PHASE-2.md`. Other implemented features include adult verification, validated profile setup, Supabase-backed profiles and discovery, friend requests, and direct messages between accepted friends. Incomplete profiles remain out of Discover; friend and pending-request relationships are excluded. Profile photos use the existing profile-avatar storage bucket with an initials fallback. Explore is a privacy-safe coming-soon state rather than a demo map.

Logged-out visitors see the public marketing homepage and a searchable, categorized FAQ at `/faq`; signed-in, age-verified members continue to see Discover at `/`. Public `/terms` and `/privacy` pages are clearly marked draft placeholders pending legal review. The public sitemap lists `/`, `/faq`, `/terms`, and `/privacy`; application and member-profile routes remain excluded from crawler discovery. Member navigation calls the `/matches` destination “Friend requests” because dating matches are not implemented.

The app stores only a derived adult-verification result and check time; it does not store a date of birth or birth year and does not display member ages. The current age check is self-attestation, not identity-document or biometric verification. Do not add age storage or display without an approved product decision.

## Verification and deployment gaps

`docs/homepage-verification.md` records the earlier homepage checks, responsive screenshots, contrast measurements, and a locally simulated edge-cache Lighthouse run. The edge simulation is not a production deployment measurement. `docs/product-completeness-audit.md` records the feature review, evidence, remaining gaps, and validation results.

Production deployment, live password signup/recovery email authentication, and migrations against the production Supabase project have not been verified. Configure email/password auth, confirmation and reset templates, set deployed `SITE_URL`, allow the approved production and Preview `<origin>/auth-callback` URLs in Supabase Auth redirects, and confirm supported-country seed data before production use. Verify storage-bucket visibility and deployed security settings against the final privacy commitments.

- Verify directly in the Supabase/Vercel settings that the server-only `SUPABASE_SERVICE_ROLE_KEY` value belongs to the dedicated Mingleza project. A configured variable name alone does not prove its value is correct. Never copy the key into source control, logs, issues, or chat.
- Earlier passwordless tests covered OTP requests, PKCE exchange, SSR cookies and profile creation but were removed with the retired login path. New password-auth tests are hermetic and do not confirm live provider behavior. Complete a controlled signup-confirmation and reset-email test in a non-production environment; confirm delivery, callback/session-cookie persistence, private-detail RLS, profile creation, adult result, and returning-member/onboarding redirects. Do not retain dates of birth, passwords, or tokens.
- Reconcile the repository migration history with the dedicated Supabase project's deployed schema before production migrations. Do not assume local migration files and remote schema are identical.
- Review database/RPC authorization for friendship state transitions, conversation membership, message mutations, and visibility when either member has blocked the other; preserve these checks in database/RLS regression tests.

The Terms and Privacy pages are placeholders, not final legal text or legal advice; obtain legal review before treating them as policy documents. No verified support or moderation contact has been published yet.

## Remaining product work

- Member-facing report/block controls and a monitored moderation workflow; the schema alone is not a member or staff support process.
- Self-service account deletion/data requests and a verified support channel, including an approved retention and avatar-cleanup process.
- Ongoing controls to turn profile discoverability and connection intents on or off after onboarding.
- Dating likes, matches, and dating-specific workflows.
- Real-time messaging, message notifications, and message-management controls.
- Explore map and location/distance-based discovery.
- Final Terms and Privacy text after legal review; privacy review for publicly retrievable profile-avatar assets.
- Product decisions for availability outside Kenya, support and safety escalation, pricing, premium payments, and M-Pesa.

## Social interaction feature branch

`feat/social-interactions` (PR to follow) adds member follow/unfollow, shareable profile links, friendship and recipient-approved message requests, friend-only group chats, and five-second polling for open conversations. Polling is not instant realtime delivery and there are no push notifications. Video-chat requests are invitations only; no WebRTC provider/live call exists. Phone numbers remain private; no premium entitlement or consent system exists, so no paid phone-number visibility is advertised or exposed. Database assertions are in `supabase/tests/social_interactions.test.sql`; validate against disposable Supabase before merge/deployment. Report/block moderation and support-contact launch blockers remain unresolved.
