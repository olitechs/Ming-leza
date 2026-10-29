# Mingleza design tokens

Mingleza is a mobile-first dating and friendship app. The default experience is dark, with a complete light theme for users who prefer it. Use semantic CSS variables and Tailwind utilities from `src/styles.css`; avoid hard-coded surface colors in app components.

## Core palette

| Token / use | Light theme | Dark theme |
| --- | --- | --- |
| Primary action / like | `#FF4A6E` · `oklch(0.645 0.246 16.439)` | Same pink |
| Accent yellow | `#FFE15A` · `oklch(0.9 0.165 92.918)` | Same yellow |
| Online indicator | `#34C759` | `#34C759` |
| App background | `#FFFFFF` | `#0A0A0A` |
| Card / elevated surface | `#FFFFFF` | `#1C1C1E` |
| Main text | Near-black | `#FFFFFF` |
| Muted text | Neutral grey with accessible contrast | Soft neutral grey |
| Border | Light neutral grey | Subtle white at 11% opacity |
| Radius | `1.5rem` base | `1.5rem` base |

The supplied primary OKLCH value is the canonical CSS token. Hex references are design-reference labels; render semantic `bg-primary`, `text-primary`, and `ring-primary` utilities instead of duplicating color values.

## Wordmark

- Use the exact lowercase wordmark `mingleza.` in the Sora/display face, bold weight, and tight tracking.
- On white/light surfaces, render the letters near-black and the final dot pink.
- On dark surfaces, render the letters white and the final dot purple.
- Use `src/components/MinglezaLogo.tsx` rather than drawing alternate logos or using a generic heart icon as the primary wordmark.

## Dating UI and interaction

- Discover swipe cards: rounded, full-bleed profile photography with a bottom gradient scrim; like/primary actions use pink.
- Matches: responsive profile grid. Only show match percentages when supplied by a trustworthy, real matching score; never fabricate values such as “95%”.
- Likes rail: circular 64px profile images. Show a green online dot only when presence is real and current, with a text alternative for assistive technology.
- Bottom navigation: fixed, rounded mobile navigation with safe-area padding; active navigation uses pink and must remain distinguishable beyond color alone.
- Chat: outgoing messages use a pink bubble with a high-contrast foreground; incoming messages use a white/light or elevated card bubble with dark text in light mode, and a dark elevated bubble with light text in dark mode. Message ownership and timestamps must remain clear.
- Theme toggle: place in the top bar near other activity/actions. It switches between light and dark; the initial default is dark. System preference is supported by the theme provider.
- Keep the existing Manrope body font and Sora display font. Preserve mobile safe-area insets and reduced-motion behavior.

## Accessibility and contrast

- Maintain WCAG 2.2 AA contrast targets: 4.5:1 for normal text and 3:1 for large text and essential UI boundaries/icons. Pink backgrounds may require white bold text or a darker pink foreground depending on measured contrast; verify actual rendered pairs rather than relying on color names.
- The yellow accent should use dark foreground text.
- Never rely on pink, purple, or green alone to communicate state. Provide labels, icons, or accessible names for active, online, selected, and unread states.
- Ensure visible keyboard focus, minimum 44px interactive targets, and accessible names for icon-only controls.
- Test both themes across Discover, Matches, Likes, Messages, notifications, profile forms, dialogs, empty states, and loading states. Replace fixed white/black utility classes on application surfaces with semantic tokens when they prevent theme switching.

## Data integrity

Dating likes and passes are stored in `public.profile_swipes`; incoming likes and mutual matches use member-scoped database RPCs. Active matches can be ended with the validated unmatch RPC; ended matches are hidden from both members and are not silently recreated. Do not show fabricated match percentages or online indicators, and do not represent preview chat messages as delivered or persisted. Existing Supabase authentication, adult verification, profile completion, blocking, and friend-request server functions remain authoritative.
