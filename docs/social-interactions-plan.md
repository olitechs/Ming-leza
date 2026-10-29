# Social interactions and community chat plan

## Scope

Extend existing authenticated profiles, Discover, friendships and Supabase conversations rather than introducing a separate social graph. Deliver follow/unfollow, friend/message requests, shareable profile links, group chats among already accepted friends, and explicit privacy copy. Keep the existing one-to-one messaging workflow intact.

Do not expose account phone numbers in profiles, discovery, messaging, or share links. There is no verified subscription/entitlement system; premium phone visibility is therefore not implementable safely in this slice. Even with a future paid tier, phone disclosure should require explicit member consent and a clear privacy decision.

Add an asynchronous video-call request interaction only if it can be represented honestly as a request and recipient consent; do not imply a live call is available without selecting/configuring a WebRTC provider. For this slice, a request may be an in-app invitation/message, not an active video session.

## Architecture

- `src/lib/social/server.ts`: authenticated server functions; reuse Supabase RLS and RPC-backed state transitions.
- `src/routes/index.tsx`, `src/routes/u.$id.tsx`: discover/profile actions and share link.
- `src/routes/matches.tsx`, `src/routes/messages.tsx`: request inbox and group conversations while preserving friend-request and 1:1 behavior.
- A new additive Supabase migration defines follower edges and message requests, then secure RPCs for follow, send/respond to message request, and create group conversations. Group recipients must be adult verified, accepted friends of the creator, and not blocked. No client-written relationship states.
- Add matching pgTAP tests and update route manifest, roadmap, and public-facing constraints.

## Visual direction

Use the existing Mingleza brand system: warm, approachable social UI with clear consent states, accessible controls, mobile-first cards and explicit privacy language. Interaction must distinguish Follow, Friend request, and Message request; no action silently opens unsolicited chat.

## Implementation status

The feature branch now implements follow/unfollow actions, friendship requests, recipient-approved message requests, shareable member-profile URLs, friend-only group creation, and open-chat refresh every five seconds. A video-chat invitation is delivered as a message request and clearly states that it is not a live call. Phone numbers remain private; no premium subscription/entitlement or phone-sharing consent mechanism exists. Database behavior is covered by new pgTAP structure/privilege assertions, but running Supabase tests still requires the CLI/Docker or project test environment.

## Follow-up: realtime messaging and Premium phone visibility

Replace normal five-second polling with Supabase Realtime `postgres_changes` subscriptions filtered by `conversation_id`. Keep five-second polling only as a degraded fallback when the WebSocket subscription is not connected. Do not weaken `messages` SELECT RLS; the stream must rely on that authorization and message membership policies. Ensure `public.messages` is in `supabase_realtime` publication and report connection/reconnection state in the chat UI.

Add a subscription entitlement that is written only from verified payment-provider webhooks and cannot be self-assigned by a client. Phone-number access remains server-only: the viewer must have an active paid entitlement and the profile owner must explicitly opt in to share the number with Premium members. Default to private, show a clear owner consent switch, expose the phone number only through a narrowly scoped server function, and include access revocation/cancellation handling. Never include phone numbers in public profile payloads, discovery, or Realtime event payloads.

The production billing path requires the business's selected payment provider, configured credentials and an approved Premium price/currency/billing interval. Current [Flutterwave M-Pesa docs](https://developer.flutterwave.com/docs/m-pesa) describe KES M-Pesa charges, while its [payment plan docs](https://developer.flutterwave.com/docs/payment-plans-1) say plan enrollment fixes payment method to card. [Paystack's payment channel docs](https://paystack.com/docs/payments/payment-channels/) describe Kenya M-Pesa charges; its [subscription docs](https://paystack.com/docs/payments/subscriptions/) list cards and Nigeria direct debit. Do not claim automatic M-Pesa renewals. Await the owner's decision on price and whether to offer card auto-renewal, M-Pesa manual monthly renewal, or both before exposing a purchasable plan.
