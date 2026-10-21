# Deferred work

## Implemented through Batch 1

The app now has passwordless SMS-code and email-link sign-in, adult verification, server-validated profile setup, Supabase-backed profiles and discovery, friend requests, and direct messages between accepted friends. Incomplete profiles remain out of Discover. Profile photos use the existing public avatar bucket with an initials fallback. Discover excludes members who are already friends or have a pending request in either direction. The Explore area map is a coming-soon state.

The app stores only an adult-verification flag; it does not store birth dates or birth years and does not display member ages. Do not add age storage or display until the open product decision is resolved.

## Verification gaps

The six project checks were run locally for Batch 1. Database migration execution, RLS behavior, Storage policies, and live SMS/email authentication have not been verified against a Supabase project. Docker and the Supabase CLI are unavailable in the current environment. Before deployment, apply the migrations, confirm the `supported_countries` reference table is seeded, configure the phone provider and passwordless email template, and allow `<SITE_URL>/auth-callback` in Supabase Auth redirects.

## Remaining product work

Batch 2 design-system and accessibility improvements are being handled in a separate branch and are not part of this Batch 1 branch. Keep the following for later batches; do not start them until requested:

- Real-time messaging and notifications.
- Block and report UI, settings, account deletion, private avatars, rate limits, and legal pages.
- Dating likes and matches.
- Explore map and location discovery.
- Premium features, M-Pesa payments, and PWA support.
