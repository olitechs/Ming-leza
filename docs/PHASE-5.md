# Phase 5 — Profile visibility and connection preferences

## Scope
- Let adult-verified members control whether their profile appears in Discover.
- Let members independently opt into friendship discovery and dating discovery.
- Persist preferences through an authenticated server action and a database RPC, not direct browser-side table updates.
- Preserve the existing default that incomplete profiles are not discoverable.
- Keep dating opt-in; never store or display birth dates or age.

## Validation rules
- Only the signed-in adult-verified member can change their own preferences.
- A discoverable profile must have a real display name, a city, and at least one enabled intent.
- Hiding a profile does not delete the account, matches, friend connections, or conversation history.
- Turning off an intent removes the profile from that intent's discovery results without affecting the other intent.
- Database discovery queries remain the enforcement layer; hiding a profile is not just a UI state.

## Verification
The additive migration and pgTAP test are part of this pull request. CI must pass lint, typecheck, unit tests, build, formatting, and local Supabase database/RLS tests. The migration is not applied to production by this repository change.
