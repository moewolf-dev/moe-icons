# Next.js

Next.js support uses the published `moe-icons@0.0.17` components directly.
There is no provider or automatic integration, and Next-specific behavior is
not certified.

## Support status

| Item | Status |
| --- | --- |
| App Router | Direct components usable |
| Pages Router | Direct components usable |
| Server Components | Components are hook-free functions and can render on the server |
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
