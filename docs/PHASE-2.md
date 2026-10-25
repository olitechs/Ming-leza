# Phase 2 — Backend and authentication

## Local setup

1. Install the Supabase CLI and Docker using the official Supabase instructions.
2. Copy `.env.example` to `.env.local` and fill in `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, and server-only `SUPABASE_SERVICE_ROLE_KEY` from your own Supabase project.
3. Keep `.env.local` untracked. Never use the service-role key in a `VITE_` variable or browser module.
4. Run `supabase start`, then `supabase db reset` to apply migrations and reference seed data.
5. Configure SMS delivery and phone OTP in Supabase Auth. Configure the email template to display the one-time token (not a magic link), and set exact production site/redirect URLs.
6. Run `pnpm install`, `pnpm dev`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, and `supabase test db`.

The Vitest suite includes a hermetic server-side email-link flow test. It uses the real Supabase SSR client against a local HTTP test double to exercise OTP request setup, PKCE callback exchange, session-cookie persistence, profile creation, and authenticated-but-not-yet-age-verified access. It sends no real email and does not use a deployed database, so it does not replace the controlled provider test below.

## Security model

- Browser code uses the public project URL and publishable key only. The admin client is restricted to age-attestation writes and must never be imported into browser-facing modules.
- Normal reads/writes use a request-scoped SSR client so PostgreSQL RLS sees the authenticated user JWT.
- OTP values and date-of-birth inputs are transient request data; do not log them or include them in analytics.
- `age_verifications` stores only `is_18_plus` and `checked_at`; never store date of birth or birth year. This is self-attestation, not government-ID or biometric verification.
- An under-18 attestation is recorded as false and the session is signed out. Reverification requires a separately reviewed recovery/appeal workflow.
- Dating is opt-in and defaults off. The database rejects dating-enabled profiles unless the age-verification row is true.
- Precise coordinates are not included. Map discovery remains disabled by default.
- RLS restricts preferences, blocks, messages and reports. Blocking is checked in both directions for discovery, connection requests and message sends.

## Deployment

- Configure all three environment values in Vercel. `SUPABASE_SERVICE_ROLE_KEY` must be server-only.
- Configure Supabase Auth URL allowlists for the exact production domain.
- Apply migrations through a reviewed deployment workflow; never edit production tables manually.
- CI cannot prove live provider configuration or production RLS behavior without a configured Supabase project.

## Boundaries

- Real SMS/email delivery requires a configured Supabase project and provider.
- The automated email-link session test verifies the app/SSR-client exchange against a local test server; inbox delivery, provider configuration, and a live callback still require a controlled non-production test.
- Production rate limits, deliverability, account appeals and operational moderation require additional review.
- Messaging, connections and profiles have schema/RLS foundations; replacing all hardcoded cards with live database queries remains a subsequent integration task.
