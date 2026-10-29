# Mingleza design tokens

Dark-first dating and friendship interface. Use semantic CSS variables in `src/styles.css` for shadcn/Radix surfaces and the hex values below for the reference-specific profile surfaces.

## Core palette

| Token / use               | Value                    |
| ------------------------- | ------------------------ |
| App background            | `#0A0A0A`                |
| Cards / elevated surfaces | `#1C1C1E`                |
| Primary (like / CTA)      | `#FF4A6E`                |
| Primary alternate         | `#FF5A5F`                |
| Accent / onboarding CTA   | `#FFE15A`                |
| Main text                 | `#FFFFFF`                |
| Muted text                | `#8E8E93`                |
| Online indicator          | `#34D399`                |
| Subtle border             | `rgba(255,255,255,0.11)` |

## Interaction and layout

- Default theme is dark; preserve `color-scheme: dark` and the mobile safe-area insets.
- Profile imagery uses rounded 2xl/3xl cards, full-bleed photos and a bottom gradient scrim.
- Primary like actions use coral; onboarding's primary action uses yellow with dark foreground.
- Online status is always accompanied by a textual label where needed; don't rely on color alone.
- Mobile navigation is fixed at the bottom and must not obscure scrollable page content.
- Keep the existing Manrope body font and Sora display font.
- Maintain accessible keyboard focus, readable contrast and reduced-motion-friendly transitions.

## Data integrity

Likes and match cards currently use clearly illustrative local data until a dedicated likes/matches query is available. Do not represent preview chat messages as delivered or persisted. Existing Supabase authentication, adult verification, profile completion and friend-request server functions remain authoritative.
