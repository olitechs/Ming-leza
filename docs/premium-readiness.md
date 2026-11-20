# Premium and subscription readiness

## Audit result (2026-10-31)

Premium access is not implemented. The repository audit found no premium route, subscription entitlement model, payment-provider integration, or billing webhook flow. The product completeness notes explicitly leave pricing, premium payments, and M-Pesa as unresolved product decisions. This is a code-repository finding; it does not prove anything about external dashboard configuration.

## Safe implementation order

1. Approve the initial plan names, prices, billing periods, currencies, free-tier limits, cancellation/refund rules, and launch countries. Kenya-first pricing should explicitly decide whether M-Pesa is required at launch and whether card payments are also supported.
2. Select the payment provider(s) and verify their official webhook/signature-validation flow in a sandbox before any paid entitlements are granted.
3. Design an additive entitlement model with server-owned subscription status, provider transaction references, idempotent webhook processing, audit history, and explicit grace/expired/cancelled states. Never trust a client-submitted plan name or payment-success redirect.
4. Add row-level security and server-side authorization tests for cross-user subscription reads/writes, forged webhook payloads, replayed events, duplicate transactions, cancelled/expired subscriptions, and users who have not completed adult verification.
5. Add a member-facing plans page only after approved pricing and feature limits exist. Keep payment initiation disabled until sandbox verification succeeds; do not imply a charge or subscription succeeded based on a browser redirect.
6. Verify migration compatibility against the dedicated Supabase project and deploy through the normal release process. Do not make production database changes as part of this audit.

## Explicit non-goals until decisions are approved

- Do not invent prices, trial periods, premium features, or refund terms.
- Do not create fake “active subscription” flags in profile metadata or browser storage.
- Do not add a payment button that appears to charge a real user without a verified provider integration.
- Do not change existing authentication, age verification, profiles, friendships, matches, or messages to require a subscription.
