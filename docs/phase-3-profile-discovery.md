# Phase 3 — Profile discovery

## Implemented in this branch

- Added a server function for authenticated profile discovery.
- Requires a valid Supabase-authenticated user and an affirmative `is_18_plus` record.
- Accepts only a bounded result limit and an explicit `friends` or `dating` intent.
- Selects only profile ID and display name; it does not select date of birth, age, or coordinates.
- Excludes the current user and attempts to exclude blocks in both directions.
- Fails closed when age, profile, or block queries fail.

## Not complete

- The existing Discover screen still renders local demo profiles; it is not wired to this server function yet.
- The actual deployed database schema and RLS policies have not been verified from this repository or the live Supabase project.
- The block-column names used here (`blocker_id`, `blocked_id`) must be checked against the applied migration before merge.
- No lint, typecheck, unit test, build, or live integration test has been run in this environment.
- Profile photos, bios, interests, approximate area, pagination, and empty/loading/error UI remain to be integrated.
- No production deployment has been performed.

## Required before merge

1. Verify the applied schema and RLS policies, including reciprocal block enforcement.
2. Add tests for unauthenticated access, age gate, both intents, self-exclusion, reciprocal blocks, and query errors.
3. Wire the Discover UI to the server function and remove demo profiles from the live discovery path.
4. Run frozen dependency install, lint, typecheck, tests, build, and review the deployment preview.
