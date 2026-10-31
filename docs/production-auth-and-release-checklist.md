# Production configuration and release checks

This repository change cannot edit Vercel project settings or the Supabase Dashboard. Complete these operator steps before relying on production auth redirects or applying the new migrations.

## Vercel environment

In the Vercel project serving `https://mingleza-peach.vercel.app`, add the following variable for **Production** (and Preview only if previews should use the production canonical domain):

| Name       | Value                               |
| ---------- | ----------------------------------- |
| `SITE_URL` | `https://mingleza-peach.vercel.app` |

Redeploy the production deployment after saving the variable. The server-side auth helper already falls back to the current request origin when `SITE_URL` is absent; setting this variable explicitly makes reset/sign-up redirect targets and canonical SEO metadata deterministic. Never set it to localhost in production.

## Supabase Auth URL configuration

In Supabase Dashboard → Authentication → URL Configuration, add this exact production redirect URL to the redirect allow list:

`https://mingleza-peach.vercel.app/auth-callback`

Keep the configured Site URL set to the production origin if this project uses it for default email links. Add localhost and preview URLs only for the environments actually used; do not use a wildcard redirect to compensate for missing configuration.

After the change, test:

- Existing password login and sign-up confirmation.
- Forgot-password email, opening the link in the same browser, and saving the new password.
- Expired/used links return the user to sign-in without exposing auth tokens.

## Age verification source of truth

The current app already records the server-verified adult decision in `public.age_verifications`, and server routes plus the `private.is_adult_verified(...)` database helper use that record. Keep this as the single source of truth unless a reviewed migration moves every helper, server action, policy, and test together. Mirroring the same decision into a second client-writable `profiles.is_adult_verified` flag would create conflicting authorization state. The age gate must remain server/database enforced; a local-storage confirmation is not sufficient.

## Migration and verification gates

The migrations added in this branch are not applied automatically. Review them against the deployed schema in a dedicated Supabase environment, run the dating-chat/discovery SQL tests including two-user and blocked-user cases, and only then follow the project's normal migration deployment process. Do not apply directly to production as part of a code-only change.

After the branch is ready, run the repository's prescribed checks:

```sh
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm format
```

Also verify the Vercel deployment and manually test real member discovery, reciprocal dating likes, active-match chat, block behavior, and the mobile/desktop navigation. A successful Vercel deployment alone does not prove Supabase migrations or authorization behavior are correct.
