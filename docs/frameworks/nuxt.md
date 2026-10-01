# Nuxt

Nuxt support uses the published `moe-icons@0.0.17` Vue components directly.
There is no Nuxt module, auto-import or provider, and SSR behavior is not
certified.

## Support status

| Item | Status |
| --- | --- |
| Nuxt 3 SSR | Direct components usable |
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
