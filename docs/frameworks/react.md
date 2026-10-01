# React

React support is provided by the published `moe-icons@0.0.17` package. Each
icon is a plain function component; there is no provider, hook or context.

## Support status

| Item | Status |
| --- | --- |
| `moe-icons/react` | Published and verified |
| Style switching | Not supported by the published package |
| Next.js App Router | Direct components usable; see [Next.js](/frameworks/next) |
| CLI-generated proxies | Experimental, not consumable; see [CLI status](/cli#release-status) |

## Setup

```sh
npm install moe-icons
```

> `moe-icons@0.0.17` pulls `react` and `vue` as regular dependencies (and
> declares them as non-optional peers). Install your framework explicitly and
> dedupe duplicate React copies.

## Import and render

```tsx
import { ArrowBoldRight, UiSearch } from 'moe-icons/react';

export function Toolbar() {
  return (
    <header>
      <UiSearch width={20} height={20} aria-label="Search" />
      <ArrowBoldRight width={20} height={20} aria-hidden="true" />
    </header>
  );
}
```

## Component signature

```tsx
const Icon = ({ strokeWidth = 2, className, ...props }) => (
  <svg
    className={className ? `moe-icon ${className}` : 'moe-icon'}
    stroke="currentColor"
    fill="none"
    strokeWidth={strokeWidth}
    viewBox="0 0 24 24"
    {...props}
  />
);
```

`props` is spread last, so any SVG attribute (including `width`, `height`,
`color`, `style`, `id`, `onClick`) overrides the defaults.

## Props

| Prop | Type | Default | Notes |
| --- | --- | --- | --- |
| `width` / `height` | number \| string | none | **Required for a predictable size.** |
| `strokeWidth` | number | `2` | |
| `className` | string | — | Merged into `moe-icon`. |
| `color`, `stroke`, `fill` | string | — | Forwarded to the SVG. |

There is no `size` prop and no `ref` forwarding.

## No provider

Do not mount a provider; it does not exist in the published package. Render
icons directly wherever you need them.

## Known React warning

The published components pass kebab-case SVG attributes
(`stroke-linecap`, `stroke-linejoin`). React logs
`Invalid DOM property 'stroke-linecap'` but still renders correctly. This is a
packaging warning, not a rendering failure.

## Accessibility

The component does not set `role` or `aria-hidden`. Add them yourself:

```tsx
<UiSearch width={16} height={16} aria-label="Search" role="img" />
<Trash width={16} height={16} aria-hidden="true" />
```

## Type checking

`ReactIconProps` is exported from the package **root**, not from the `react`
subpath:

```ts
import type { ReactIconProps } from 'moe-icons';
```

`ReactIconProps extends ComponentProps<'svg'>` plus `strokeWidth?: number`.
