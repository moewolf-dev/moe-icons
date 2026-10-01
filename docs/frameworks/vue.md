# Vue

Vue support is provided by the published `moe-icons@0.0.17` package. Each icon
is a component definition; there is no plugin, provider or composable.

## Support status

| Item | Status |
| --- | --- |
| `moe-icons/vue` | Published and verified |
| Style switching | Not supported by the published package |
| Nuxt | Direct components usable; see [Nuxt](/frameworks/nuxt) |
| CLI-generated proxies | Experimental, not consumable; see [CLI status](/cli#release-status) |

## Setup

```sh
npm install moe-icons
```

> `moe-icons@0.0.17` lists `vue` (and `react`/`react-dom`) as non-optional peer
> dependencies and also depends on `vue`. Install your framework explicitly and
> dedupe.

## Import and render

```vue
<script setup lang="ts">
import { ArrowBoldRight, UiSearch } from 'moe-icons/vue';
</script>

<template>
  <UiSearch width="20" height="20" aria-label="Search" />
  <ArrowBoldRight aria-hidden="true" />
</template>
```

## Sizing caveat

The Vue components are compiled with a marker class:

```html
<svg class="moe-icon w-6 h-6" stroke="currentColor" fill="none" viewBox="0 0 24 24" ...>
```

- With Tailwind present and scanning those classes, icons render at 24px and
  the `w-6 h-6` CSS can win over `width`/`height` attributes.
- Without Tailwind, keep `w-6 h-6` as inert classes and set `width`/`height` or
  your own CSS.

## Props

Vue components accept arbitrary SVG attributes via `$attrs` (merged after the
defaults) plus:

| Prop | Type | Notes |
| --- | --- | --- |
| `strokeWidth` | number | Default `2`. |
| `class` | string | Merged with the marker class. |
| `width`, `height` | string \| number | Forwarded as SVG attributes. |

There is no `size` prop, no `provide`/`inject` and no theme control.

## Accessibility

Add names yourself:

```vue
<UiSearch width="16" height="16" aria-label="Search" role="img" />
<Trash width="16" height="16" aria-hidden="true" />
```

## Type checking

`VueIconProps` is exported from the package **root**, not the `vue` subpath:

```ts
import type { VueIconProps } from 'moe-icons';
```

`VueIconProps` is `{ class?: string; strokeWidth?: number }`.
