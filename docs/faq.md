# FAQ and troubleshooting

Answers reflect the published packages: `moe-icons@0.0.17` (components) and
`@moewolf/moe-icons-cli@0.0.1` (CLI, experimental). Each answer points at the
relevant page.

## Components and rendering

**An icon is not found.**
Import from `moe-icons/react` or `moe-icons/vue` only. The published package
does not export `moe-icons/free/...` or per-style-group paths.

**The icon is huge or 300×150.**
React components have no default size. Pass `width` and `height`.

**The Vue icon ignores `width`/`height`.**
Vue components add `moe-icon w-6 h-6`. With Tailwind those classes can win;
override the class or use CSS. See [Vue](/frameworks/vue).

**Colour has no effect.**
The SVG uses `stroke="currentColor"` / `fill="none"`. Set a parent `color`, or
override `color`/`stroke`/`fill`. Hard-coded `fill` in your CSS wins.

**Can I use two styles of the same icon?**
Not from the published package (single style). Download the other Free group's
SVG from the [search page](/website-search), or wait for the CLI.

## Package and dependencies

**`moe-icons` added React/Vue to my project.**
`moe-icons@0.0.17` lists `react`, `react-dom` and `vue` as non-optional peers
**and** as `dependencies` for react/vue. Dedupe or align versions.

**`ReactIconProps` is not exported from `moe-icons/react`.**
Import type helpers from the package root:

```ts
import type { ReactIconProps, VueIconProps } from 'moe-icons';
```

## React warnings

**`Invalid DOM property 'stroke-linecap'`.**
The published React components pass kebab-case SVG attributes. React warns but
renders correctly. See [React](/frameworks/react#known-react-warning).

## Accessibility

**The icon is read as an image with no name, or ignored.**
The components do not add `role`/`aria-hidden`. For meaningful icons pass
`aria-label` (and `role="img"`); for decorative icons pass
`aria-hidden="true"`. See [Usage](/usage).

## Website search

**No icons appear.**
The icon browser may be disabled in that deployment
(`The new icon browser is not enabled...`).

**A style group shows a lock.**
It is Pro-only or your entitlement is inactive. See
[Free vs Pro](/free-vs-pro).

**There is no "copy ID" button.**
Correct. Copy the generated code, or read the ID from the card. See
[Website search](/website-search).

**A bitmap variant is missing / download fails.**
Pick a supported `format`/`size`; a locked or expired entitlement returns 403.
Reload after signing in.

## CLI

**Why does `moeicons install free` fail with 404?**
The `0.0.1` release requests a descriptor checksum asset that the `v0.0.17`
GitHub release does not publish. See
[CLI release status](/cli#release-status).

**Why do generated proxies fail to import?**
They import `moe-icons/free/...` / `moe-icons/pro/...`, which `moe-icons@0.0.17`
does not export. Use the component package or assets until this is fixed.

**Does the CLI have `doctor`, `recover` or `update`?**
No. Those are not part of `0.0.1`.

**`unknown field "icons" in theme`.**
Per-theme `icons` is unsupported; use the top-level `icons` list. See
[Configuration](/configuration).

**`style group "moe-colored" is not available in free tier`.**
The `0.0.1` bundled catalog treats `moe-colored` as Pro-only. Use
`moe-outline`, `moe-lite-outline` or `moe-solid`.

## Pro

**How do I get Pro?**
Buy on [moeicons.com/pricing](https://moeicons.com/pricing); the server webhook
activates your entitlement and `/payment-success` polls for it. See
[Free vs Pro](/free-vs-pro).

**Can I embed Pro resources in the front end?**
No. Do not embed credentials or token-gated assets in front-end source.

## Assets and deployment

**A downloaded SVG is a 404 after deploy.**
The path depends on where you copied the file. Fix the `src`/base path; the
repo does not manage your hosting layout.

**Bitmap 404.**
Bitmap icons are Pro-only and need the exact `format`/`imageSize`; confirm the
variant exists on the search page.

**Tailwind not applied.**
No stylesheet ships; `moe-icon` is an unstyled marker class (Vue adds
`w-6 h-6`). Use explicit `width`/`height` or your own CSS.

## Animation

The icon files are static SVG with no animation metadata. Animate them with
your own CSS or JavaScript. See [Introduction](/introduction).
