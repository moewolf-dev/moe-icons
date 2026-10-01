# Quick start

This page gets a published Moe Icons component onto the screen in a React or
Vue project. It uses the verified npm package `moe-icons@0.0.17`, whose
components are plain SVG components — no provider, no CLI and no build plugin
required.

## Prerequisites

- Node.js 18 or later (Vite/React/Vue tooling).
- A React (`>=17`) or Vue (`>=3.2`) project with a bundler.

## React

### 1. Install

```sh
npm install moe-icons
```

> `moe-icons@0.0.17` lists `react`, `react-dom` and `vue` as peer dependencies
> **and** lists `react` and `vue` under `dependencies`, and it does not mark the
> peers optional. Installing it may pull React and Vue even if you only use one.
> Install the framework you actually use and dedupe if needed.

### 2. Render an icon

```tsx
import { ArrowBoldRight } from 'moe-icons/react';

export function NextButton() {
  return <ArrowBoldRight width={32} height={32} aria-label="Next" />;
}
```

Set the size with `width`/`height` (the component has no `size` prop). Colour it
with `color`, `stroke`, or the surrounding `currentColor`.

### 3. Expected result

A 32×32 arrow icon that inherits the text colour. The SVG root is
`viewBox="0 0 24 24"` with `stroke="currentColor"` and `fill="none"`, and your
extra props are spread onto the `<svg>`.

## Vue

```sh
npm install moe-icons
```

```vue
<script setup lang="ts">
import { ArrowBoldRight } from 'moe-icons/vue';
</script>

<template>
  <ArrowBoldRight width="32" height="32" aria-label="Next" />
</template>
```

> The Vue components are generated with a marker class `moe-icon w-6 h-6`. If
> Tailwind is present those classes control the size; otherwise pass
> `width`/`height` or your own CSS. See [Vue](/frameworks/vue).

## What this package does and does not do

- Ships **one style set** (Moe Outline). There is no theme/provider switch in
  the published package.
- Has no automatic accessible-name logic: pass `aria-label` or `title` and a
  `role` yourself for meaningful icons.
- Does not include the other Free style groups. Download those from the
  [icon search page](/website-search) or see the experimental [CLI](/cli).

## Other routes

- [Installation](/installation) — every supported install path.
- [Usage](/usage) — props, sizing and accessibility.
- [Frameworks](/frameworks/react) — per-framework details.
- [Website search](/website-search) — find an icon and copy its code.
