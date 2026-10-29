# Phase 6 — Security verification and release readiness

## Automated controls
- Keep dating matches, conversations, messages, and notifications protected by row-level security.
- Require an active mutual match, adult verification for both participants, and no block between participants to read or send dating messages.
- Restrict notification reads to the owning adult-verified member; notification state changes go through the authenticated RPC.
- Test direct table-write denial, notification ownership, blocking, unmatching, and adult-verification revocation.
- Keep the phase migrations additive and forward-only. Do not apply them to production from this repository task.

## CI gates
- [ ] Lint
- [ ] Typecheck
- [ ] Unit tests
- [ ] Production build
- [ ] Formatting check
- [ ] Local Supabase migrations, database tests, and RLS regression tests

## Production release gates (manual; not certified by repository CI)
- [ ] Reconcile migration history with the dedicated production Supabase schema before applying reviewed migrations.
- [ ] Verify Vercel environment values and confirm the server-only service-role key belongs to the dedicated Mingleza project; never expose or log it.
- [ ] Verify production Supabase Auth redirects, email confirmation, password recovery, and controlled provider delivery in a non-production environment first.
- [ ] Verify profile avatar bucket visibility against the approved privacy policy.
- [ ] Complete legal review of Terms and Privacy pages and publish a verified support contact.
- [ ] Assign trusted moderators and operationalize report/block escalation, retention, and response expectations.
- [ ] Confirm a successful production Vercel deployment and smoke-test signup/signin, profile preferences, discovery, mutual matches, dating chat, notifications, blocking, and unmatching.

## Explicitly not delivered by this phase
Real-time subscriptions, external email/push notifications, paid plans, M-Pesa, final legal approval, and live production-provider certification remain out of scope. A passing local test suite does not certify production configuration.
