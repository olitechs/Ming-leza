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
