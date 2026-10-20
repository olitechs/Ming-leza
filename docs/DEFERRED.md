# Deferred work

## Phase 1 — De-Lovable

- Generate and commit `pnpm-lock.yaml` using pnpm 10.12.4 in a network-enabled environment. This editing environment cannot run package-manager installs.
- Run frozen install, lint, typecheck, tests, build and a repository-wide case-insensitive search for `lovable`. No runtime test results are claimed yet.
- Inspect all files in `src/components/ui/` and run a dependency checker before deleting unused components or dependencies. No UI components have been deleted.
- Verify the Vercel production build and SSR error recovery in a real runtime.
- Confirm application environment variables when backend work begins; do not add secrets to `.env.example`.

## Later product phases not started

Authentication, Supabase, age verification, RLS, real profiles, persistent messaging, moderation, premium payments, live Explore Map and Android/Expo are out of scope until Phase 1 is reviewed and accepted.
