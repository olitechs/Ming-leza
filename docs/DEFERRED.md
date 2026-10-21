# Deferred work

## Implemented through Batch 2

The app now includes passwordless SMS-code and email-link sign-in, adult verification, validated profile setup, Supabase-backed profiles and discovery, friend requests, and direct messages between accepted friends. Incomplete profiles remain out of Discover; friend and pending-request relationships are excluded. Profile photos use the existing avatar bucket with an initials fallback. Explore is a privacy-safe coming-soon state rather than a demo map. Batch 2 adds the shared design system, accessible controls, self-hosted fonts, mobile-safe layouts, and contrast improvements.

The app stores only an adult-verification flag; it does not store birth dates or birth years and does not display member ages. Do not add age storage or display until the open product decision is resolved.

## Verification and deployment gaps

GitHub Actions passed for the current feature heads, including dependency installation, lint, typecheck, unit tests, production build, formatting, local Supabase reset, and database/RLS tests. Vercel preview deployments for the application PRs were blocked by the provider's build-rate limit, so those previews could not be inspected. Production deployment, live SMS/email authentication, and migrations against the production Supabase project have not been verified. Before production use, configure the phone provider and passwordless email template, allow `<SITE_URL>/auth-callback` in Supabase Auth redirects, and confirm the supported-country seed data.

## Remaining product work

Keep the following for later batches; do not start them until requested:

- Real-time messaging and notifications.
- Block/report UI, settings, account deletion, private avatars, rate limits, and legal pages.
- Dating likes and matches.
