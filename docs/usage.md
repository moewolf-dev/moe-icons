# Usage

This page documents the published components from `moe-icons@0.0.17`. They are
plain SVG components with no provider and no theme switching.

## React components

```tsx
import { ArrowBoldRight, UiSearch } from 'moe-icons/react';

export function Toolbar() {
  return (
    <>
      <UiSearch width={20} height={20} aria-label="Search" />
      <ArrowBoldRight width={20} height={20} aria-hidden="true" />
    </>
  );
}
```

The component signature is:

```tsx
({ strokeWidth = 2, className, ...props }) => <svg ... {...props} />
```

The root SVG is rendered as:

```jsx
<svg
  className={className ? `moe-icon ${className}` : 'moe-icon'}
  stroke="currentColor"
  fill="none"
  strokeWidth={2}
  viewBox="0 0 24 24"
  {...props}
/>
```

Because `props` is spread last, you can override `stroke`, `fill`,
`strokeWidth`, `viewBox` and add any SVG attribute (including `width`,
`height`, `color`, `id`, `style`) or event handler.

### Props

| Prop | Type | Default | Notes |
| --- | --- | --- | --- |
| `width` / `height` | number \| string | none | **Set these to size the icon.** There is no default size. |
| `strokeWidth` | number | `2` | Stroke-based icons. |
| `className` | string | — | Merged into `moe-icon`. |
| `color` | string | — | Forwarded to the SVG. |
| `stroke` / `fill` | string | `currentColor` / `none` | Forwarded; overrides the defaults. |

There is **no `size` prop**, no `forwardRef`, and no automatic `role` or
`aria-hidden`. All other SVG props pass through.

## Vue components

```vue
<script setup lang="ts">
import { ArrowBoldRight, UiSearch } from 'moe-icons/vue';
</script>

<template>
  <UiSearch width="20" height="20" aria-label="Search" />
  <ArrowBoldRight aria-hidden="true" />
</template>
```

Vue components accept the same SVG attributes via `$attrs` plus a typed
`strokeWidth?: number` and `class?: string` (`VueIconProps`). They are compiled
with a marker class `moe-icon w-6 h-6`:

- If Tailwind is installed and scans those classes, icons render at 24px and
  the `w-6 h-6` CSS wins over `width`/`height` attributes.
- Without Tailwind (or if you override the class), use `width`/`height` or
  your own CSS to size.

## Colour

Both packages render `stroke="currentColor"` and `fill="none"` for outline
icons. Colour them by inheritance or by overriding props:

```tsx
<UiSearch className="text-blue-600" width={20} height={20} />
<UiSearch color="#2563eb" width={20} height={20} />
<UiSearch stroke="var(--brand)" width={20} height={20} />
```

## Accessibility

The components do **not** add semantics automatically. Do it yourself:

```tsx
{/* Meaningful icon: give it a name */}
<button>
  <UiSearch aria-label="Search" role="img" width={16} height={16} />
</button>

{/* Decorative icon: hide it from assistive tech */}
<button>
  <Trash aria-hidden="true" width={16} height={16} />
  Delete
</button>
```

## Style switching

The published `moe-icons` package has a **single style set** and no provider,
so it cannot switch styles at runtime. To change style in a
framework-agnostic way today:

- Download the same icon ID from a different Free style group on the
  [search page](/website-search) and swap the asset.
- Or render the icon twice and toggle which one is shown.

The CLI is intended to generate multi-style proxies, but its `0.0.1` release is
not consumable with the published package. See
[CLI status](/cli#release-status).

## Experimental CLI proxy API (for reference)

If a future release fixes the import contract, the `0.0.1` generator output
behaves as follows. Treat this as **not usable today**.

- React: `MoeiconsProvider` accepts only `theme?: Theme` and initialises state
  once (`useState(props.theme ?? defaultTheme)`); there is no `defaultTheme`
  prop, no `onThemeChange`, and external `theme` changes do not update state.
  `useMoeiconsTheme()` throws outside the provider, and the icon proxies call
  it, so proxies must be inside the provider.
- Vue: `MoeiconsProvider` declares a `theme` prop with a default, copies it
  into a ref, and does not watch or emit; `useMoeiconsTheme()` throws outside
  the provider (the Vue icon proxy falls back to the default theme instead).
- Size is applied as dynamic `w-[Npx] h-[Npx]` classes and a `size` prop is
  forwarded to the underlying component; without Tailwind this may not resize.

## Bundle size

`moe-icons/react` and `moe-icons/vue` are large barrels; a bundler with
tree-shaking can drop unused icons. Import named components so tree-shaking can
work.
