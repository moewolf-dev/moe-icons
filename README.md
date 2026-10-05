<div align="center">

# Moe Icons

**554 semantic SVG icons for React, Vue and Vanilla — one icon ID, many styles.**

[Website](https://moeicons.com) · [Documentation](https://moeicons.com/docs/) · [Icon search](https://moeicons.com/search) · [CLI on npm](https://www.npmjs.com/package/@moewolf/moe-icons-cli)

</div>

Moe Icons is an icon library built around a simple idea: one semantic icon ID
(for example `ui-search`) exists in every style group, so you can switch from
outline to solid to coloured without renaming a single import.

- **554 icons per style group**, drawn on the same 24×24 grid.
- **Four Free style groups** — no account required.
- **Published React, Vue and Vanilla components** plus downloadable SVG assets.
- **A published CLI** that installs the icons you pick and generates local
  components for your framework.

## Preview

Browse, preview and copy any icon in every Free style group on the
[icon search page](https://moeicons.com/search). Each icon shows its style
variants and a ready-to-copy snippet.

## Quick start (Free component package)

```sh
npm install moe-icons
```

React:

```tsx
import { ArrowBoldRight } from 'moe-icons/react';

export function NextButton() {
  return <ArrowBoldRight width={32} height={32} aria-label="Next" />;
}
```

Vue:

```vue
<script setup lang="ts">
import { ArrowBoldRight } from 'moe-icons/vue';
</script>

<template>
  <ArrowBoldRight width="32" height="32" aria-label="Next" />
</template>
```

The published `moe-icons@0.0.17` package ships the **Moe Outline** set. For the
other Free groups, download the SVG from the website or use the CLI. See
[Quick start](https://moeicons.com/docs/getting-started) for props, sizing and
accessibility.

## CLI

`@moewolf/moe-icons-cli` installs verified icon resources and generates typed
local components for React, Vue or Vanilla. It requires Node.js 22 or later.

```sh
npm install -D @moewolf/moe-icons-cli
npx moeicons init
npx moeicons install free
npx moeicons generate
```

`init` writes a `moeicons.config.jsonc` (schema version 3) where you choose the
target, style groups and icon IDs. Free installation needs no account; Pro
installation signs in and checks the account entitlement. Generated projects are
verified for Vite React/Vue and Next.js App Router / Nuxt SSR. See the
[CLI reference](https://moeicons.com/docs/cli).

## Editor plugin

A VS Code extension for completion and diagnostics of CLI-generated exports is
**in development and not yet published** to the marketplace. Treat it as a
preview and do not rely on it as an install path yet.

## Styles and formats

| Style group | Tier | Format |
| --- | --- | --- |
| `moe-outline` | Free | SVG |
| `moe-lite-outline` | Free | SVG |
| `moe-solid` | Free | SVG |
| `moe-colored` | Free | SVG |
| `moe-3d-metal` | Pro | PNG/WebP bitmaps (128/256/512) |
| `moe-duotone` | Pro | SVG |
| `moe-pixel-lite-outline` | Pro | SVG |
| `moe-pixel-outline` | Pro | SVG |
| `moe-pixel-solid` | Pro | SVG |
| `moe-sticker` | Pro | SVG |

All vector style groups are SVG and use `currentColor` where applicable. The Pro
`moe-3d-metal` group is delivered as PNG and WebP bitmaps only, with no SVG.

## Free vs Pro

| | Free | Pro |
| --- | --- | --- |
| Style groups | 4 | 10 (adds the 6 Pro groups) |
| Icons | 554 per group | 554 per group |
| Formats | SVG | SVG; `moe-3d-metal` is PNG/WebP bitmaps (128/256/512) |
| Account | Not required | Required, active entitlement |
| Price | Free | One-time payment (see the pricing page) |
| Usage | In your own products, per the license | In your own products, per the license |

The [pricing page](https://moeicons.com/pricing) is the source of truth for the
current price, and the license shown at checkout is the source of truth for usage
rights. See [Free vs Pro](https://moeicons.com/docs/free-vs-pro).

## Documentation and contributing

- Documentation: <https://moeicons.com/docs/>
- Public docs source: [`docs/`](./docs/README.md) in this repository. This is the
  single source for the Free documentation; it is mirrored to the website after
  review.
- Developer log: [`docs/developer-log/`](./docs/developer-log)

Local checks before opening a pull request:

```bash
npm install
npm run docs:check
npm run docs:build
```

## Repository structure

- `icons/<style>/` — the public Free SVG sources, one directory per style group.
- `docs/` — the public Free documentation (English and Chinese).
- `contracts/` — the Free style-group and website projection contracts.
- `scripts/` — documentation, release and sync tooling.

## License

Free style groups and the documentation are available without an account; the Pro
groups are a one-time purchase. The exact usage terms are in the license shown at
checkout and the [Terms of Service](https://moeicons.com/terms), which are the
authoritative texts.
