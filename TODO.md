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
