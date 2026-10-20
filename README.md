# Mingleza

Mingleza is a Kenya-first, adults-only social networking prototype for friendship, opt-in dating and local discovery. Profile and conversation data are currently hardcoded. Authentication, persistence, server-enforced age verification, messaging authorization, privacy-safe live location discovery and payments are not implemented.

## Stack
- TanStack Start and TanStack Router
- React 19, TypeScript and Vite
- Tailwind CSS 4, shadcn/Radix UI and Lucide
- TanStack Query and Vitest
- Nitro for Vercel deployment

## Requirements
- Node.js 22.12 or newer
- pnpm 10.12.4

## Setup
```sh
git clone https://github.com/olitechs/violet-coral-meet-cute.git
cd violet-coral-meet-cute
pnpm install
pnpm dev
```

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
Copy `.env.example` to `.env.local` when needed. Never commit credentials. `VITE_` variables are exposed to browser code and must not contain secrets. Keep server credentials in deployment settings.

## Project structure
- `src/routes/` — file-based routes
- `src/components/` — shared components
- `src/components/ui/` — UI primitives
- `src/lib/` — data and utilities
- `src/styles.css` — global styles
- `docs/design-tokens.md` — visual reference
- `docs/DEFERRED.md` — incomplete work and verification gaps

## Contribution rules
- Keep changes small and reviewable; never rewrite published history.
- Do not add secrets, credentials or personal data to source, logs or analytics.
- Verify dependency and import usage before removing packages or components.
- Use migrations for future database schema changes.
- Run lint, typecheck, tests and build before claiming a change is verified.
- Preserve the established Mingleza visual identity.

## Deployment
The project uses TanStack Start and Nitro for Vercel. Import the repository in Vercel and use detected framework settings. Add required environment variables through project settings. The current prototype has no required application secrets.
