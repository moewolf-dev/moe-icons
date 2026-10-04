# Nuxt
Two separate integrations are available. CLI-generated components are described first; the direct npm component package has its own support status below.

## CLI-generated components (verified)

`@moewolf/moe-icons-cli@0.0.3` with icon resources `0.0.18` passed production build, SSR, browser hydration and theme interaction checks for Free/Pro, single/multiple themes, and SVG/bitmap icons. See [CLI](/cli) for configuration and commands. This example selects `ui-search`, uses the `outline` theme and the default output directory `src/moeicons`.

Import the local provider and icons explicitly, and keep the initial theme identical on the server and client. SSR verification does not rely on `ClientOnly`. There is no Nuxt module or auto-import integration.

```vue
<!-- components/IconPanel.vue -->
<script setup lang="ts">
import { MoeiconsProvider, UiSearch } from '../src/moeicons';
</script>

<template>
  <MoeiconsProvider theme="outline"><UiSearch :size="24" aria-label="Search" /></MoeiconsProvider>
</template>
```

This verification covers CLI-generated components. The direct npm component package keeps its separate status below. Custom Nuxt modules and other automatic integrations need separate verification.

## Direct npm component package

Nuxt support uses the published `moe-icons@0.0.17` Vue components directly.
There is no Nuxt module, auto-import or provider, and SSR behavior is not
certified.

## Support status

| Item | Status |
| --- | --- |
| Nuxt 3 SSR | Manual example; no production build/hydration verification |
| Auto-imports | Not provided |
| Theme/Provider | Not provided by the published package |
| Bitmap assets | Not verified |

## Setup

```sh
npm install moe-icons
```

## Use a component

```vue
<script setup lang="ts">
import { UiSearch } from 'moe-icons/vue';
</script>

<template>
  <UiSearch width="20" height="20" aria-label="Search" />
</template>
```

`moe-icons/vue` is the npm package path; it is not a local `./moeicons` folder.
Only use a relative path if you copied the generated files into your project.

## Root layout

No provider is needed. If you want a shared default size, wrap icons in your
own component or set CSS on the `moe-icon` class in `app.vue`.

```vue
<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>
```

## Sizing

Vue components carry `moe-icon w-6 h-6`. Without Tailwind, pass `width`/`height`
or add CSS for `.moe-icon`. See [Vue](/frameworks/vue).

## Unverified areas

- SSR/hydration under Nuxt's renderer.
- Bitmap asset path resolution.
- Any auto-import or module integration (none exists).
