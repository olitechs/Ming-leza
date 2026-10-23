# Mingleza

Mingleza is a Kenya-first, adults-only social app for friendship and opt-in dating. Members sign in with an SMS verification code or an emailed passwordless link. Authenticated, age-verified members can set up a profile, discover people by enabled intent, send friend requests, and message accepted friends. New profiles stay out of Discover until they have a real display name and city. The app does not store birth dates or show age on profiles.

Logged-out visitors see a public, crawler-visible landing page that links into the existing passwordless sign-up and sign-in flows. Signed-in, age-verified members continue to see Discover at `/`. Public Terms and Privacy routes currently contain clearly marked draft placeholders pending legal review.

Explore’s area map and location discovery are currently marked as coming soon. Dating likes and matches, real-time messaging, notifications, in-app report/block controls, moderation tools, paid plans, and M-Pesa are not implemented. Support contact details and final legal text are still being prepared.

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

Set the Supabase project URL and publishable key in `.env.local`. `SUPABASE_SERVICE_ROLE_KEY` is server-only and must never be exposed to browser code or committed. `SITE_URL` is optional for local email sign-in redirects, which otherwise use the request origin. Set it to the public origin in deployment to emit absolute canonical/social URLs and the public sitemap; add `<SITE_URL>/auth-callback` to the Supabase Auth redirect allowlist. Configure Supabase Auth for phone OTP and passwordless email links, and apply database migrations before testing signed-in flows.

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

- `src/routes/` — file-based routes, including public Terms/Privacy and SEO endpoints
- `src/components/` — shared application components
- `src/components/ui/` — UI primitives
- `src/lib/` — server functions and utilities
- `supabase/migrations/` — database migrations
- `src/styles.css` — global styles and design tokens
- `docs/design-tokens.md` — visual reference and contrast records
- `docs/DEFERRED.md` — incomplete work and verification gaps
- `tools/og-mingleza.html` — editable source for the generated social-share image

## Contribution rules

- Keep changes small and reviewable; never rewrite published history.
- Do not add secrets, credentials or personal data to source, logs or analytics.
- Verify dependency and import usage before removing packages or components.
- Use migrations for database schema and policy changes.
- Run lint, typecheck, tests, build and formatting checks before claiming a change is verified.
- Preserve the established Mingleza visual identity.

## Deployment

The project uses TanStack Start and Nitro for Vercel. Configure the public Supabase URL and publishable key, the server-only service-role key, and the public `SITE_URL` through Vercel environment settings. `SITE_URL` supplies canonical URLs, social metadata, `robots.txt`, and `sitemap.xml`. Add `<SITE_URL>/auth-callback` to the Supabase Auth redirect allowlist and confirm that the SMS provider and email sign-in template are configured. Do not put service-role credentials in `VITE_` variables.
