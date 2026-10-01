# Search icons on the website

The website icon browser at [moeicons.com/search](https://moeicons.com/search)
lets you find an icon, preview it in the available styles, copy integration
code and download assets. This page walks through the flow.

## Availability

The icon browser may be disabled in some deployments. When it is off, the page
reports that the browser is not enabled in that deployment.

## The flow

### 1. Search

- Use the search box on the page, or the site-wide search (`Ctrl`/`Cmd` + `K`)
  and press Enter. The query is stored in the URL as `?q=`.
- Searching is case-insensitive and matches icon IDs and names.
- Press the clear (✕) button to reset the query; IME composition is handled.

### 2. Filter by style group

- Style tabs across the top switch style groups. The default is
  `moe-outline`.
- Locked Pro groups show a lock badge. Selecting one shows a gate panel instead
  of icons (see [Free vs Pro](/free-vs-pro)).
- The category sidebar narrows results within the selected group.

The URL keeps `?q=`, `?style=` and `?category=` so a search can be shared or
bookmarked. Back/forward and refresh restore the state.

### 3. Preview

- Scrolling loads previews lazily; icons off-screen are not requested.
- The four Free SVG groups can be previewed without an account.
- Pro and bitmap groups require an active Pro account; a locked group shows no
  icons.
- Use the colour settings popover to recolour a preview locally.

### 4. Copy code or download

Click an icon to open the detail modal. It offers:

- **Copy code** for a target: React, Vue, Vanilla/Adapter, or Raw asset. The
  snippet is generated for the selected icon and style.
- **Download** the SVG (vector groups) or a bitmap variant
  (`128-webp`, `256-webp`, and so on).

There is no dedicated "copy ID" button; copy the generated code or read the
name from the card.

### 5. Put an icon in your project

Use the published component package for the Moe Outline set, or download an SVG
for any other Free group.

**React (component package):**

```tsx
import { UiSearch } from 'moe-icons/react';

export function Search() {
  return <UiSearch width={24} height={24} aria-label="Search" />;
}
```

**Vue (component package):**

```vue
<script setup lang="ts">
import { UiSearch } from 'moe-icons/vue';
</script>

<template>
  <UiSearch width="24" height="24" aria-label="Search" />
</template>
```

**Downloaded SVG (any Free group):**

1. Download `ui-search.svg`.
2. Place it in your static/public folder, for example
   `public/icons/moe-outline/ui-search.svg`.
3. Reference it:

```html
<img src="/icons/moe-outline/ui-search.svg" alt="Search" width="24" height="24" />
```

To let the SVG follow the text colour, inline the file contents you downloaded
rather than using `<img>`. Only inline SVG you obtained from the official site
or package; do not inject arbitrary remote SVG.

The CLI would generate multi-style proxies, but its `0.0.1` release is not yet
consumable. See [CLI status](/cli#release-status).

## What each account state can do

| State | Free groups | Pro groups |
| --- | --- | --- |
| Signed out | Browse, preview, copy, download | Locked; gate offers Login and Pricing |
| Free (signed in) | Browse, preview, copy, download | Locked; gate offers Pricing |
| Pro (active) | Full access | Browse, preview, copy, download |

Whether a group is unlocked follows your account status; a locked group shows a
gate instead of icons.

## Troubleshooting

| Symptom | Cause / fix |
| --- | --- |
| No icons appear | The icon browser may be disabled in a deployment. |
| A group shows a lock | It is Pro-only or your account is not active. See [Free vs Pro](/free-vs-pro). |
| A bitmap variant is missing | Choose a `format`/`size` the group offers. |
| Download fails | Retry; sign in again if your account is not active. |
| Deep link shows the wrong state | The URL restores `q`, `style` and `category`; reload after signing in. |
