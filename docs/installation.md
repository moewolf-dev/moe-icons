# Installation

There are two supported ways to consume Moe Icons today. A third (the CLI) is
experimental and not yet consumable with the published packages.

| Approach | Package | Styles | Status |
| --- | --- | --- | --- |
| Component package | `moe-icons` | One (Moe Outline) | Published and verified |
| Raw assets | website downloads | All Free groups | Published |
| CLI project proxies | `@moewolf/moe-icons-cli` | Multiple | Experimental — see below |

## Install the component package

```sh
npm install moe-icons
```

> **Dependency note.** `moe-icons@0.0.17` declares `react`, `react-dom` and
> `vue` as peer dependencies (not marked optional) and also lists `react` and
> `vue` under `dependencies`. Installing it may add React and Vue to your
> project even if you only use one. Install your framework explicitly and dedupe
> if your package manager reports duplicates.

React:

```tsx
import { Archive, ArrowBoldRight } from 'moe-icons/react';
```

Vue:

```ts
import { Archive, ArrowBoldRight } from 'moe-icons/vue';
```

The package root also exposes namespaces:

```ts
import { React, Vue } from 'moe-icons';
```

There is no `moe-icons/free/...`, `moe-icons/pro/...` or per-style-group
subpath in the published package. Only `.`, `./react` and `./vue` exist.

## Download raw SVG assets

Open [moeicons.com/search](https://moeicons.com/search), pick a style group and
icon, and use the detail modal to download the SVG (or a bitmap variant for Pro
groups). Free groups are available without an account. Use the SVG directly:

```html
<img src="/assets/moe-outline/ui-search.svg" alt="Search" width="24" height="24" />
```

The SVGs use `currentColor`, so inlining them lets them follow the text colour.

## CLI (experimental)

The CLI package is published as `@moewolf/moe-icons-cli@0.0.1` and requires
Node.js 22+:

```sh
npm install -D @moewolf/moe-icons-cli
npx moeicons --version   # 0.0.1
```

**Do not treat the CLI workflow as working yet.** In the `0.0.1` release:

1. `moeicons install free` requests a `release-descriptor.json.sha256` asset
   that the current `v0.0.17` GitHub release does not publish, so the download
   fails with a 404.
2. Even if a release were downloaded, generated React/Vue proxies import
   `moe-icons/free/...` and `moe-icons/pro/...`, which the published
   `moe-icons@0.0.17` package does not export.

Until a compatible release is published, use the component package or raw
assets. See [CLI commands](/cli) for the exact `0.0.1` surface and
[CLI status](/cli#release-status) for the blockers.

## Pro

Pro resources require an account with an active entitlement. Pro is not
available through the published component package. On the website you can
browse Pro groups only after purchase; see [Free vs Pro](/free-vs-pro).
`moeicons login` exists in the CLI but the Pro install path shares the same
release blockers as Free above.

## Updating

- Component package: change the version and reinstall (`npm install moe-icons@x`).
- Raw assets: download the newer file again; the URL carries the release
  version.

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| `moe-icons/react` not found | Confirm `moe-icons@0.0.17`; only `.`, `./react`, `./vue` are published. |
| Icon renders huge / 300×150 | Pass `width`/`height` (React has no default size). |
| Vue icon ignores `width` | Tailwind's `w-6 h-6` marker class may win; remove/override it or use CSS. |
| `moeicons install` returns 404 | Known `0.0.1` release blocker; use the component package or assets. |
| Duplicate React/Vue versions | `moe-icons` pulls React/Vue as dependencies; dedupe or align versions. |
