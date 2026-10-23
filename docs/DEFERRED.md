# Deferred work

## Implemented through the public-homepage branch

The app includes passwordless SMS-code and email-link sign-in, adult verification, validated profile setup, Supabase-backed profiles and discovery, friend requests, and direct messages between accepted friends. Incomplete profiles remain out of Discover; friend and pending-request relationships are excluded. Profile photos use the existing avatar bucket with an initials fallback. Explore is a privacy-safe coming-soon state rather than a demo map.

The logged-out `/` experience is now a public marketing homepage; age-verified signed-in members continue to see Discover there. `/terms` and `/privacy` are public, indexable draft placeholders explicitly pending legal review. The homepage exposes only the homepage and those two public legal routes in its sitemap; application and profile routes are excluded from crawler discovery.

The app stores only an adult-verification flag; it does not store birth dates or birth years and does not display member ages. Do not add age storage or display until the open product decision is resolved.

## Verification and deployment gaps

Local homepage validation, responsive screenshots, contrast measurements, and Lighthouse results are recorded in `docs/homepage-verification.md`. This feature branch still needs its own GitHub Actions and Vercel preview checks. Production deployment, live SMS/email authentication, and migrations against the production Supabase project have not been verified. Configure the phone provider and passwordless email template, set the deployed `SITE_URL`, allow `<SITE_URL>/auth-callback` in Supabase Auth redirects, and confirm supported-country seed data before production use.

The Terms and Privacy pages are placeholders, not final legal text or legal advice; obtain legal review before treating them as policy documents. No support contact address has been published yet.

## Remaining product work

- In-app report/block controls, ongoing discoverability settings, and moderation tooling.
- Dating likes and matches.
- Real-time messaging and notifications.
- Explore map and location/distance-based discovery.
- Final Terms and Privacy text after legal review, plus a published support contact.
- Account deletion, private avatars, rate limits, premium payments, and M-Pesa.
