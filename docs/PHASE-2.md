# Phase 2 — Backend and authentication

## Password authentication

Mingleza uses Supabase Auth email/password signup and sign-in. `/welcome` exposes registration, sign-in, and password recovery; `/auth-callback` handles signup confirmation and password-recovery links. Existing Auth user IDs and profile rows are preserved. Existing members who previously used passwordless auth must establish a password through Forgot password?; do not create duplicate accounts or send credentials.

Registration first submits only age bracket and date of birth to the server-side eligibility check. A signed, short-lived eligibility assertion is required for signup; under-18 brackets and failed date checks are rejected. DOB is discarded; existing `age_verifications` stores only the adult result and check time. Signup requires full name, verified email flow, password (minimum 6 chars), international phone, active country and an adult age bracket. Full name, E.164 phone and self-reported age bracket are stored in `member_account_details`, keyed to the unchanged Supabase Auth UUID. RLS permits a member to read only their own record; public profile/discovery projections do not select these fields.

## Local setup and provider configuration

1. Install the Supabase CLI and Docker using official Supabase instructions.
2. Copy `.env.example` to `.env.local` and set `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, and server-only `SUPABASE_SERVICE_ROLE_KEY` from a disposable/non-production Supabase project.
3. Keep `.env.local` untracked. Never put service-role keys in `VITE_` variables or browser modules.
4. Run `supabase start`, then `supabase db reset` to apply migrations and reference seed data.
5. In Supabase Auth, configure email/password sign-in, signup email confirmation, secure recovery email, redirect allowlists for exact production and Preview callback origins, provider-native rate limits, and email deliverability. Ensure Vercel Preview callbacks can be allowed safely. Do not use production test accounts.
6. Run `pnpm install`, `pnpm dev`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, and `supabase test db`.

For reliable cross-browser callbacks, configure the Supabase confirmation and recovery email templates to deliver the token hash to the app callback, not a normal magic-link login. Signup's `emailRedirectTo` contains `?flow=signup`; its confirmation template should link to `{{ .RedirectTo }}&token_hash={{ .TokenHash }}&type=signup`. Recovery's redirect contains `?flow=recovery`; its template should link to `{{ .RedirectTo }}&token_hash={{ .TokenHash }}&type=recovery`. Escape query separators as `&amp;` in HTML templates. Keep the corresponding exact callback URLs in the Auth redirect allowlist. The callback rejects old `type=email` passwordless tokens and requires the explicit `flow` value.

The application uses the existing request-scoped Supabase SSR client for cookie-backed sessions. Passwords are sent only to Supabase Auth and are never written to app tables or logs. Recovery responses are intentionally generic. New passwords must be at least six characters; provider-side stronger policy may enforce more. Password changes use Supabase Auth and request sign-out from other sessions.

## Security model

- Browser code uses the public Supabase project URL and publishable key only. The admin client is server-only and used to create private account details and initialize the existing Auth user's profile/age-verification state.
- Normal protected reads/writes use a request-scoped SSR client so PostgreSQL RLS sees the authenticated user JWT.
- Passwords, reset tokens, confirmation tokens, age input and phone input must never be logged or sent to analytics.
- `age_verifications` stores only `is_18_plus` and `checked_at`; never store date of birth or birth year. The signup age bracket is self-reported and is not a separate proof-of-age signal.
- A minor cannot create an account. The server validates DOB during eligibility preflight and signs a short-lived, bracket-bound assertion; signup validates the assertion again. Only a derived adult result is persisted.
- Email uniqueness and password hashing are delegated to Supabase Auth. All account detail writes use the existing Auth user UUID; no new authentication provider or user table is introduced.
- RLS and explicit profile/discovery projections prevent access to private account details. Dating remains opt-in and defaults off.

## Existing-account transition

No Auth users or profiles are deleted, re-keyed, or recreated. Existing passwordless members with no password should use the password-reset workflow to set one, subject to Supabase project confirmation/recovery settings and the member's verified email. Phone-only accounts without a verified email need a provider-supported account-claim process before rollout; do not silently link by unverified phone or create a duplicate. Keep backup and rollback plans for the first production migration. The previous OTP/magic-link login endpoints and UI are removed from this branch, so do not deploy until the existing-account recovery path and provider configuration are tested on controlled non-production identities.

## Deployment gates and remaining blockers

- Apply `20261025100000_password_auth_private_details.sql` through a reviewed migration workflow and validate RLS with `supabase test db` against a disposable database.
- Configure signup confirmation and password-recovery email templates to redirect to `/auth-callback`; template variables, allowed redirects, SMTP, expiry, single-use behavior and deliverability are project settings and cannot be verified from repository code.
- Verify a new user can confirm, establish a session, complete onboarding and reach Discover; verify existing members can recover a password and retain their original profile, friendships and messages.
- Run a controlled reset/signup confirmation test in non-production. Do not use production accounts or retain passwords/tokens.
- CI and local HTTP test doubles cannot certify live provider settings, production RLS, SMTP delivery, throttling, or backup/rollback execution. Do not claim production verification until those checks are performed.
- Other launch blockers remain in `docs/product-completeness-audit.md`, including member reporting/blocking, moderation operations, account/data deletion, support contact, final legal review, profile privacy controls, and real-time notifications.

## Social interactions, realtime chat, and Premium billing follow-up

The social-interactions branch adds following, shareable profiles, accepted friend and member-approved message requests, and friend-only groups. The realtime follow-up subscribes to Supabase Realtime `messages` inserts and falls back to five-second polling while disconnected. Video-chat interactions remain invitations only, not live video calls. The additive `20261028100000_enable_message_realtime.sql` migration adds message change delivery to `supabase_realtime`; it does not weaken message RLS.

The Premium feature branch defines KES 200/month Premium and KES 1,000/month VIP. Both include phone-visibility access when the number owner opts in. Flutterwave card billing uses monthly auto-renewing plans; M-Pesa is a one-time monthly checkout and must be manually paid again. Card renewal can be canceled, with access preserved to the paid-period end. The phone number remains excluded from public data and is retrieved only by a service-role database function that checks adult verification, non-blocked relationship, unexpired entitlement and owner consent.

Before enabling checkout, configure server-only `FLW_SECRET_KEY` and `FLW_SECRET_HASH`, create the two monthly KES card plans at the approved amounts and set numeric `FLW_PLAN_PREMIUM_200` and `FLW_PLAN_VIP_1000` IDs, register `/api/webhooks/flutterwave`, and enable provider webhook retries. Flutterwave's per-payment `payment_options` setting is respected only when **Enable Dashboard Payment Options** is unchecked in account settings; otherwise dashboard-level methods can override the method selected by the app. Checkout remains disabled when required secrets/plan configuration are missing. Apply all migrations and execute `supabase/tests/premium_tiers.test.sql`, `supabase/tests/realtime_messages.test.sql`, and social interaction SQL tests against a disposable Supabase project. Then test card and M-Pesa charges, paid renewal, duplicate webhook delivery, card cancellation, expiration, owner opt-out and blocked-viewer denial using non-production provider credentials. No provider credentials were present and no live payment was attempted in the implementation sandbox; do not treat code/test-double validation as payment certification.

Provider reference notes: Flutterwave lists `mpesa` as the KES M-Pesa option and documents the account preference that controls per-payment method selection ([Payment Methods](https://developer.flutterwave.com/docs/collections-inflow/payment-methods), [Checkout](https://developer.flutterwave.com/docs/collections-inflow/flutterwave-standard)). Its `subscription.cancelled` example supplies the customer's email and plan but no subscription ID; the webhook therefore rechecks active subscriptions by email and plan before changing local status, while self-service cancellation targets the exact subscription ID ([Payment Plans](https://developer.flutterwave.com/docs/payment-plans-1), [Get all subscriptions](https://developer.flutterwave.com/reference/get-all-subscriptions)).

## Gift diamonds and redemptions

Gift diamonds cost KES 1 each and can be purchased through the app's one-time Flutterwave card or M-Pesa checkout. The webhook verifies the exact KES amount, account email, transaction reference, payment type and intent before crediting the private wallet; duplicate provider events do not credit twice. Catalog gifts debit the sender and credit the recipient atomically, with both sides recorded in the append-only wallet ledger. Sending and receiving are limited to adult-verified, discoverable, non-blocked members.

Members may request manual PayPal or gift-card redemption of at least 200 diamonds at KES 0.80 per diamond (KES 160 minimum). A request reserves the diamonds. Configure the server-only `GIFT_REDEMPTION_ADMIN_EMAILS` allowlist; an approved admin must fulfill the PayPal/gift-card payment outside the app and mark it paid, or reject it to restore the diamonds. This branch does not initiate PayPal transfers or issue gift-card codes automatically. Configure Flutterwave secrets and apply `20261119120000_gift_diamonds.sql`; run `supabase/tests/gift_diamonds.test.sql` and test paid top-ups, duplicate webhooks, insufficient-balance gifts, redemption rejection/refund and admin authorization against a disposable Supabase project before deployment. No live payment or payout has been tested; finalize redemption terms and legal review before enabling public cash-equivalent redemptions.
