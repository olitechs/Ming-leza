# Social interactions and community chat — outcomes

## Follow users and share profiles

- Members can follow and unfollow another visible adult member; follow status is persisted and changes are reflected in the interface.
- Members can share a profile using a copyable canonical Mingleza profile URL; no phone number or private registration details are included.

## Friendship and message requests

- Members can send, accept, decline and cancel friendship requests using the existing request flow.
- A member can submit a separate message request to another member; the recipient must accept before chat messages can be sent. Existing accepted-friend messaging remains available.
- Member profile controls distinguish friend requests from message requests and show clear pending/success states.

## Group conversations

- Members can create a group conversation only with accepted friends, with adult-verification, block, and membership checks enforced server-side.
- Group members can open the conversation and send/read messages under RLS; members outside the group cannot read or send.

## Video-call requests and premium phone privacy

- Do not represent a video-call request as a working live video call unless a provider and consent flow exist; any request must be clearly labeled as an invitation only.
- Keep phone numbers private from other members. Premium visibility remains unavailable until subscriptions/entitlements and explicit phone-sharing consent are implemented; never infer premium status or reveal numbers.

## Launch caveats

- Keep reporting/blocking and moderation requirements visible; implement group/message-request controls without weakening existing block checks.
- Validate schema/RLS on disposable Supabase and leave production configuration and provider-dependent media calls gated.

## Realtime chat

- Replace normal five-second message polling with a Supabase Realtime WebSocket subscription filtered to the active conversation; keep polling only as a fallback while disconnected, show connection/reconnection state, and preserve existing conversation membership/RLS authorization.
- Ensure `messages` is included in the `supabase_realtime` publication; do not weaken message read/write policies to make the WebSocket work.

## Premium phone visibility and payment

- Implement a paid Premium entitlement whose active state is updated only by verified provider webhook events; support checkout, renewal, cancellation, and failure/expiry behavior.
- Keep phone numbers private by default. A profile owner must explicitly opt in before active Premium members can see the number; fetch it only through a server-authorized path, never through profile/discovery payloads or Realtime messages.
- Do not publish a purchasable tier until the owner selects the payment provider, the Premium amount/currency/billing interval, and whether Kenya M-Pesa renewals are manual or card auto-renewal is offered. No charge or live payment configuration is authorized before that choice.
