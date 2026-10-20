# Mingleza engineering rules

- Keep changes small, reviewable and behavior-preserving unless explicitly requested.
- Never rewrite published Git history or force-push shared branches.
- Never commit secrets, credentials, tokens, personal data or real message bodies.
- Treat client input as untrusted; privileged operations require server-side validation.
- Verify dependency and import usage before deleting packages or UI components.
- Never claim lint, typecheck, tests, builds or deployments passed unless they were run.
- Use database migrations for schema changes; do not manually edit production schemas.
- Document incomplete work in `docs/DEFERRED.md`.
- Preserve the visual identity documented in `docs/design-tokens.md`.
