# Mingleza design tokens

Mingleza is a mobile-first dating and friendship app. Pink is the primary action color. White is the dominant light-mode surface; dark mode uses near-black backgrounds and elevated charcoal cards. Use semantic CSS variables and Tailwind utilities from `src/styles.css` rather than hard-coded surface colors.

## Core palette

| Token / use | Light mode | Dark mode |
| --- | --- | --- |
| Primary action / likes / active state | `#FF4A6E` · `oklch(0.645 0.246 16.439)` | `#FF5C7A` · `oklch(0.68 0.23 16.5)` |
| Background | `#FFFFFF` · `oklch(1 0 0)` | `#0A0A0A` · `oklch(0.09 0 0)` |
| Card / popover | `#FFFFFF` | `#1C1C1E` |
| Foreground | `#111113` · `oklch(0.145 0 0)` | `#FFFFFF` |
| Border / input | `#E9E9EB` · `oklch(0.92 0.004 286.32)` | `#27272A` |
| Secondary / muted | `#F4F4F5` | `#26262A` |
| Accent | `#FFF1F2` | Muted pink tint |
| Online indicator | `#34C759` only for verified live presence | `#34C759` only for verified live presence |
| Radius | `1.5rem` base | `1.5rem` base |

## Interaction color rules

- Buttons, hearts, active navigation, selected tabs and underlines, focus rings, and outgoing chat bubbles use the semantic pink primary token.
- Light mode cards remain white; secondary and muted surfaces use soft neutral grey.
- Dark mode cards use charcoal, with secondary surfaces slightly lighter than the background.
- Swipe actions use a neutral grey pass action and pink like action. A message action is only shown when a valid conversation exists.
- Likes avatars are 64px circular images. A green online dot is permitted only when presence data is real, current, and available; do not infer presence from profile activity.
- Match-score badges may only be displayed when a trustworthy matching score is returned. Never fabricate a percentage.

## Wordmark and typography

- Use the exact lowercase wordmark `mingleza.` in the Sora/display face, bold weight, and tight tracking.
- On white/light surfaces, render letters near-black and the final dot pink.
- On dark surfaces, render letters white and the final dot purple.
- Keep Manrope for body text and Sora for display headings.

## Accessibility and contrast

- Target WCAG 2.2 AA: at least 4.5:1 for normal text and 3:1 for large text and essential UI boundaries/icons.
- The supplied pink is the brand action color. Verify white-on-pink text in rendered UI; if a specific label does not meet contrast, use a darker pink treatment or dark foreground for that label without changing the brand token.
- Muted text must remain readable against both white and charcoal surfaces. Never rely on color alone for active, online, selected, or unread states; add labels, icons, or accessible names.
- Keep visible keyboard focus, minimum 44px interactive targets, accessible names for icon-only controls, mobile safe-area insets, and reduced-motion support.

## Data integrity

Dating likes and passes are stored in `public.profile_swipes`; incoming likes and mutual matches use member-scoped database RPCs. Active matches can be ended with the validated unmatch RPC; ended matches are hidden from both members and are not silently recreated. Do not show fabricated match percentages or online indicators, and do not represent preview chat messages as delivered or persisted. Existing Supabase authentication, adult verification, profile completion, blocking, and friend-request server functions remain authoritative.
