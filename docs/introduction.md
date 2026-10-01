# Introduction

Moe Icons is a semantic SVG icon library. Each icon has a stable ID (for
example `ui-search`) and is drawn in several **style groups**, so the same
semantic ID looks different depending on the style set you use.

## Core concepts

| Concept | Meaning | Example |
| --- | --- | --- |
| Icon ID | Stable lowercase kebab-case identifier | `ui-search`, `arrow-bold-right` |
| Style group | A visual treatment of the whole icon set | `moe-outline`, `moe-solid`, `moe-colored` |
| Theme key | A logical alias a project may map to a style group | `outline`, `solid` |
| Site theme | Light/dark appearance of the website | unrelated to style groups |

## What ships

- **554 icons** per style group.
- **Vector SVG** groups: `moe-outline`, `moe-lite-outline`, `moe-solid`,
  `moe-colored`, `moe-duotone`, `moe-pixel-lite-outline`, `moe-pixel-outline`,
  `moe-pixel-solid`, `moe-sticker`.
- **Bitmap** group: `moe-3d-metal` (PNG/WebP at 128, 256, 512), Pro only.

Free groups: `moe-outline`, `moe-lite-outline`, `moe-solid`, `moe-colored`.
Pro adds the remaining groups. See [Free vs Pro](/free-vs-pro).

SVG icons are `24x24` (`viewBox="0 0 24 24"`). The published files are static
and contain no animation metadata.

## Consumption channels (important)

| Channel | What you get | Status |
| --- | --- | --- |
| npm `moe-icons@0.0.17` | React/Vue components for **one** style set (Moe Outline) | Published and verified |
| Website search | Preview of all groups + SVG/bitmap downloads | Published |
| CLI `@moewolf/moe-icons-cli@0.0.1` | Install/generate workflow for multi-style projects | **Experimental; not consumable yet** — see [CLI status](/cli#release-status) |

The npm component package and the multi-style CLI are different products. The
published package does not switch styles; the CLI that would generate such
proxies is not yet consumable with the published packages. Do not assume the
CLI workflow works until the [CLI release status](/cli#release-status) notes it.

## Supported targets

| Target | Status |
| --- | --- |
| React (`moe-icons/react`) | Published; width/height + SVG props |
| Vue (`moe-icons/vue`) | Published; Tailwind-dependent default size |
| Next.js / Nuxt | Manual; direct components or downloaded assets (not certified for SSR tooling) |
| Vanilla DOM | Download SVG assets and mount them yourself |
| Windows | Not certified for the CLI |

## Limits to know upfront

- No stylesheet ships. `moe-icon` is an unstyled marker class (Vue also adds
  `w-6 h-6`). Size React icons with explicit `width`/`height`.
- Published components have **no `size` prop**, no Provider and no automatic
  `role`/`aria-hidden` handling.
- Only one style set is published in the component package; other Free styles
  are available as website downloads.
- Bitmap (`moe-3d-metal`) icons require Pro.

## Licensing and sources

The code packages are published under Apache-2.0. Free icon assets follow the
[license shown on the pricing page](https://moeicons.com/pricing); Pro assets
require a valid license. The four Free style groups and these docs live in the
public `moe-icons` repository; Pro assets are available through a licensed
account.

## Next steps

- [Installation](/installation) — install the package or download assets.
- [Usage](/usage) — render, size and colour icons.
- [Free vs Pro](/free-vs-pro) — capabilities and licensing.
