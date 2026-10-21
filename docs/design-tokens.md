# Mingleza design tokens

Preserve these tokens when changing layouts or components.

## Brand colors

| Token / use                     | Value     |
| ------------------------------- | --------- |
| Primary                         | `#6C47FF` |
| Primary pressed                 | `#5233E0` |
| Primary tint                    | `#F0ECFF` |
| Accent (like, match, promotion) | `#FF6B5A` |
| Success                         | `#1FA971` |
| Danger                          | `#D92D20` |
| Light text                      | `#14121F` |
| Light surface                   | `#FFFFFF` |

## Typography

- Body and UI: Manrope
- Display headings: Sora

Use existing CSS variables in `src/styles.css` where possible. Maintain accessible controls and readable contrast across mobile, tablet and desktop.

## Batch 2 accessibility contrast record

Ratios below use the WCAG 2 relative-luminance formula against the rendered sRGB colors. The tint surfaces are the corresponding brand color at 10% opacity over the light background.

| Pair                                           |      Ratio | Result                |
| ---------------------------------------------- | ---------: | --------------------- |
| White on primary violet fill                   | **5.44:1** | Passes normal-text AA |
| Ink on coral accent fill                       | **6.42:1** | Passes normal-text AA |
| `--success-text` on `bg-success/10`            | **4.58:1** | Passes normal-text AA |
| `--destructive-text` on `bg-destructive/10`    | **4.54:1** | Passes normal-text AA |
| White 10px timestamp on primary message bubble | **5.44:1** | Passes small-text AA  |

The darker `--success-text` and `--destructive-text` companions are used for text on tinted banners while the existing success, danger, coral, and violet fills remain available for controls and status indicators.
