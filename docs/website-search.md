# Search icons on the website

The website icon browser at [moeicons.com/search](https://moeicons.com/search)
lets you find an icon, preview it in the available styles, copy integration
code and download assets. This page walks through the flow.

## Support status

The browser is behind a site feature flag. If it is disabled in a deployment,
the page shows "The new icon browser is not enabled in this deployment yet."

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
- For the four Free SVG groups, previews are served anonymously from the public
  asset host.
- Pro and bitmap groups load through the entitlement-checked API; a locked
  group never issues catalog or asset requests.
- Use the colour settings popover to recolour a preview locally without new
  requests.

### 4. Copy code or download

Click an icon to open the detail modal. It offers:

- **Copy code** for a target: React, Vue, Vanilla/Adapter, or Raw asset. The
  snippet is generated for the selected icon and style.
- **Download** the SVG (vector groups) or a bitmap variant
  (`128-webp`, `256-webp`, and so on).

The modal does not currently have a dedicated "copy ID" button. To integrate a
single icon, copy the generated code; to integrate the whole set, use the
[CLI](/cli).

### 5. Integrate in your project

- **Component package:** copy the icon's PascalCase name and import it from
  `moe-icons/react` or `moe-icons/vue` (the published package ships the Moe
  Outline set). See [Quick start](/getting-started).
- **Any Free style group:** download the SVG and use it directly, or swap the
  file when you change style. See [Vanilla & assets](/frameworks/vanilla).
- **Single snippet:** paste the copied code, adjusting the import path to your
  setup.

The CLI would generate multi-style proxies, but its `0.0.1` release is not yet
consumable. See [CLI status](/cli#release-status).

## What each account state can do

| State | Free groups | Pro groups |
| --- | --- | --- |
| Signed out | Browse, preview, copy, download | Locked; gate offers Login and Pricing |
| Free (signed in) | Browse, preview, copy, download | Locked; gate offers Pricing |
| Pro (active entitlement) | Full access | Browse, preview, copy, download |

Authorization is enforced by the server. The client never decides whether a
group is unlocked; it only renders the `locked` flag returned by the API and
never requests assets for a locked group.

## Troubleshooting

| Symptom | Cause / fix |
| --- | --- |
| No icons appear | The icon browser feature flag is off in that deployment. |
| A group shows a lock | It is Pro-only or your entitlement is not active. Sign in or check [Free vs Pro](/free-vs-pro). |
| A bitmap variant is missing | Choose a supported `format`/`size`, or use the CLI to install the exact variant. |
| Download fails | Retry; a locked or expired entitlement returns 403. Sign in again. |
| Deep link shows the wrong state | The URL restores `q`, `style` and `category`; reload after signing in. |
