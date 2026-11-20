# Mingleza

Mingleza is a Kenya-first, adults-only social app for friendship and opt-in dating. Members register and sign in with email and password; registration captures full name and contact/account details privately, separately from public profiles. Returning users from the former passwordless flow retain their profile IDs and application data and can use Forgot password to establish a password. Authenticated, age-verified members can create profiles, discover by enabled intent, send friend requests, and message accepted friends. Members can hide their profile or independently enable friendship and dating discovery. Incomplete profiles stay out of Discover. The app does not store dates of birth or display member ages.

Logged-out visitors see a public, crawler-visible landing page with sign-up/sign-in links; signed-in, age-verified members see Discover at `/`. The searchable public `/faq` page is available to everyone; `/terms` and `/privacy` are draft placeholders pending legal review.

Dating likes and passes are stored per member, and reciprocal likes create mutual matches; active matches have persisted chat and a member-scoped in-app notification inbox. The social-interactions work adds following, shareable profiles, recipient-approved message requests, friend-only group chats, and five-second polling in open conversations; polling is not instant realtime, and video-chat requests are invitations only. Premium and VIP membership status, consent-gated phone visibility, card/M-Pesa checkout flows, and payment verification/webhook handling are implemented in code, but checkout depends on provider configuration and final operational/legal review. Gifts & diamonds support a wallet, gift transfers, and redemption requests; purchase checkout likewise requires provider setup. Do not treat the presence of these flows as proof of live provider/deployment readiness. External email/push notifications and Explore’s map/location discovery remain unimplemented. Support contact details and final legal text are still being prepared. The “Friend requests” area is for friendship requests, not dating matches.

## Stack

- TanStack Start and TanStack Router
- React 19, TypeScript and Vite
- Tailwind CSS 4, shadcn/Radix UI and Lucide
- TanStack Query and Vitest
- Supabase Auth, Postgres and Storage
- Nitro for Vercel deployment

## Requirements

- Node.js 22.12 or newer
- pnpm 10.12.4

## Setup

```sh
git clone https://github.com/olitechs/Ming-leza.git
cd Ming-leza
pnpm install --frozen-lockfile
cp .env.example .env.local
pnpm dev
```

Email confirmation and password recovery are controlled by Supabase Auth. Set the Supabase project URL and publishable key in `.env.local`. `SUPABASE_SERVICE_ROLE_KEY` is server-only and must never be exposed to browser code or committed. `SITE_URL` is optional for local auth redirects, which otherwise use the request origin. Set it to the public origin in deployment for absolute canonical/social URLs and the public sitemap; allow the production and exact Preview `/auth-callback` URLs in Supabase Auth redirects. Configure email/password signup, confirmation and reset-email templates, keep email/password sign-in enabled, and apply migrations before testing signed-in flows. Legacy OTP sign-in endpoints are disabled.

## Scripts

| Command             | Purpose                               |
| ------------------- | ------------------------------------- |
| `pnpm dev`          | Start development server              |
| `pnpm build`        | Build for production                  |
| `pnpm preview`      | Preview the build                     |
| `pnpm lint`         | Run ESLint                            |
| `pnpm typecheck`    | Run TypeScript without emitting files |
| `pnpm test`         | Run Vitest once                       |
| `pnpm format`       | Format files with Prettier            |
| `pnpm format:check` | Check formatting                      |

## Project structure

- `src/routes/` — file-based routes, including public FAQ, Terms/Privacy and SEO endpoints
- `src/components/` — shared application components
- `src/components/ui/` — UI primitives
- `src/lib/` — server functions and utilities
- `supabase/migrations/` — database migrations
- `src/styles.css` — global styles and design tokens
- `docs/design-tokens.md` — visual reference and contrast records
- `docs/DEFERRED.md` — incomplete work and verification gaps
- `docs/product-completeness-audit.md` — feature audit, evidence, priorities, and owner decisions
- `tools/og-mingleza.html` — editable source for the generated social-share image

## Contribution rules

- Keep changes small and reviewable; never rewrite published history.
- Do not add secrets, credentials or personal data to source, logs or analytics.
- Verify dependency and import usage before removing packages or components.
- Use migrations for database schema and policy changes.
- Run lint, typecheck, tests, build and formatting checks before claiming a change is verified.
- Preserve the established Mingleza visual identity.

## Deployment

The project uses TanStack Start and Nitro for Vercel. Configure the public Supabase URL and publishable key, the server-only service-role key, and the public `SITE_URL` through Vercel environment settings. `SITE_URL` supplies canonical URLs, social metadata, `robots.txt`, and `sitemap.xml`; auth callbacks use the request origin on Vercel Preview. Add approved production and Preview callback URLs to the Supabase Auth redirect allowlist, configure confirmation and password-recovery email templates, and verify email deliverability and provider throttling in a non-production project. Do not put service-role credentials in `VITE_` variables.
