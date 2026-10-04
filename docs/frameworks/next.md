# Next.js
Two separate integrations are available. CLI-generated components are described first; the direct npm component package has its own support status below.

## CLI-generated components (verified)

`@moewolf/moe-icons-cli@0.0.3` with icon resources `0.0.18` passed production build, SSR, browser hydration and theme interaction checks for Free/Pro, single/multiple themes, and SVG/bitmap icons. See [CLI](/cli) for configuration and commands. This example selects `ui-search`, uses the `outline` theme and the default output directory `src/moeicons`.

Keep page/layout as Server Components and declare `use client` on the icon/provider subtree. The CLI does not choose an App Router client boundary automatically.

```tsx
// app/icon-panel.tsx
'use client';
import { MoeiconsProvider, UiSearch } from '../src/moeicons';

export default function IconPanel() {
  return <MoeiconsProvider theme="outline"><UiSearch size={24} aria-label="Search" /></MoeiconsProvider>;
}
```

```tsx
// app/page.tsx
import IconPanel from './icon-panel';
export default function Page() { return <main><IconPanel /></main>; }
```

This verification covers CLI-generated components. The direct npm component package keeps its separate status below. Pages Router, `next/image` and custom App Router integrations need separate verification.

## Direct npm component package

Next.js support uses the published `moe-icons@0.0.17` components directly.
There is no provider or automatic integration, and Next-specific behavior is
not certified.

## Support status

| Item | Status |
| --- | --- |
| App Router | Manual example; no production build/render verification |
| Pages Router | Manual example; not verified |
| Server Components | Not verified in a real Next build |
| Automatic root wrapping | Not provided |
| `next/image` with bitmap assets | Not verified |

## Setup

```sh
npm install moe-icons
```

## App Router usage

The components have no hooks, so they can be rendered from a server component:

```tsx
import { ArrowBoldRight, UiSearch } from 'moe-icons/react';

export default function Toolbar() {
  return (
    <nav>
      <UiSearch width={20} height={20} aria-label="Search" />
      <ArrowBoldRight width={20} height={20} aria-hidden="true" />
    </nav>
  );
}
```

If you need click handlers, put the icon in a client component (`'use client'`).

## Sizing and styling

Pass `width`/`height`; `className`, `style`, `color` and other SVG props are
forwarded. There is no Tailwind requirement.

## Unverified areas

- Bitmap Pro assets through `next/image`.
- Any automatic provider or theme integration (none exists).
- Cross-component sizing under Next's CSS pipeline.

If you need these, verify them in your own app or use the
[search page](/website-search) assets.
