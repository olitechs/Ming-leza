# Mingleza

Mingleza is a Kenya-first, adults-only social networking app for friendship, opt-in dating and local discovery. The current release includes OTP authentication and age-verification flows, profile intent preferences, and database-backed Discover results through a server-side discovery RPC. This is an early implementation, not a launch-ready product: real-provider OTP and age-verification end-to-end checks, profile editing, complete messaging authorization, moderation workflows, privacy-safe live map discovery and payments remain unfinished.

## Stack

- TanStack Start and TanStack Router
- React 19, TypeScript and Vite
- Tailwind CSS 4, shadcn/Radix UI and Lucide
- TanStack Query and Vitest
- Supabase Auth, Postgres/RLS and server-side RPC
- Nitro for Vercel deployment

## Requirements

- Node.js 22.12 or newer
- pnpm 10.12.4

## Setup

```sh
git clone https://github.com/olitechs/Ming-leza.git
cd Ming-leza
pnpm install
cp .env.example .env.local
pnpm dev
```

Configure the placeholder values in `.env.local` with the dedicated Mingleza social Supabase project values. Never commit credentials.

## Scripts

| Command | Purpose |
| --- | --- |
| `pnpm dev` | Start development server |
| `pnpm build` | Build for production |
| `pnpm preview` | Preview the build |
| `pnpm lint` | Run ESLint |
| `pnpm typecheck` | Run TypeScript without emitting files |
| `pnpm test` | Run Vitest once |
| `pnpm format` | Format files with Prettier |
| `pnpm format:check` | Check formatting |

## Environment variables

- `VITE_SUPABASE_URL`: Supabase project URL; safe for browser use.
- `VITE_SUPABASE_PUBLISHABLE_KEY`: Supabase publishable key; safe for browser use when RLS is correct.
- `SUPABASE_SERVICE_ROLE_KEY`: privileged server-only key required by the age-verification admin client. Set it in Vercel's server environment settings using the key from the dedicated `mingleza-social` Supabase project. Never prefix it with `VITE_`, expose it to browser code, commit it, or paste it into issues or chat. The presence of a Vercel variable name alone does not prove its value is current or correct.

All client-accessible tables must enforce RLS. Never use the service-role key to authorize ordinary user actions.

## Project structure

- `src/routes/` — file-based routes
- `src/components/` — shared components
- `src/components/ui/` — UI primitives
- `src/lib/` — server and client utilities
- `supabase/migrations/` — reviewable schema migrations
- `supabase/tests/` — database/RLS tests
- `docs/design-tokens.md` — visual reference
- `docs/DEFERRED.md` — incomplete work and verification gaps

## Security and contribution rules

- Keep changes small and reviewable; do not rewrite published history.
- Do not add secrets, credentials or personal data to source, logs or analytics.
- Store only derived adult-verification status and timestamp; do not persist date of birth.
- Keep privileged Supabase access in server-only modules.
- Keep precise location private; map visibility must be opt-in and dating must remain opt-in separately from friendship.
- Use migrations for schema changes and preserve block enforcement in both directions.
- Run lint, typecheck, tests, database/RLS tests and build before merging.
- Do not claim end-to-end auth, messaging, or location behavior without real runtime verification.

## Deployment

The project uses TanStack Start and Nitro on Vercel. Production deployment is configured from this repository. After changing environment variables, redeploy and verify the affected server flows. See `docs/DEFERRED.md` for known gaps.
