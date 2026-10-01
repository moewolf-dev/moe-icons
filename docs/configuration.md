# Configuration

The CLI reads a single project config file. This page documents the file
lookup and the schema that `@moewolf/moe-icons-cli@0.0.1` validates. Because the
CLI workflow is not yet consumable, see [CLI status](/cli#release-status).

## File name and lookup

The CLI uses the first existing file, in this order:

1. `moeicons.config.jsonc`
2. `moeicons.config.json`
3. `moeicons.config.ts`
4. `moeicons.config.js`

JSON and JSONC are supported (comments and trailing commas allowed). TypeScript
and JavaScript configs are rejected with a message asking for
`moeicons.config.jsonc`. `moeicons init` writes `moeicons.config.jsonc`.

## Schema versions

| `schemaVersion` | Notes |
| --- | --- |
| `1` | Legacy: requires `framework` (`react`/`vue`), forbids `target`. Migrated to `target` in memory. |
| `2` | Requires `target`, rejects `framework`. Written by `init`. |

Schema version 3, `downloadMode` and the `integration` block are **not part of
`0.0.1`**. They exist only in unreleased work.

## Example

```jsonc
{
  "schemaVersion": 2,
  "tier": "free",
  "target": "react",
  "outputDir": "src/moeicons",
  "defaultTheme": "outline",
  "icons": ["ui-search", "arrow-bold-right"],
  "themes": {
    "outline": { "styleGroup": "moe-outline" },
    "solid": { "styleGroup": "moe-solid" }
  }
}
```

`init` writes a larger skeleton with all icons grouped by prefix; a flat array
is also accepted.

## Top-level fields

| Field | Type / allowed | Default | Effect |
| --- | --- | --- | --- |
| `schemaVersion` | `1` \| `2` | — | Validation/migration mode. |
| `tier` | `free` \| `pro` | — | Download tier; must match the install command. |
| `target` | `react` \| `vue` \| `vanilla` \| `assets` | `react` | Output type. |
| `outputDir` | relative POSIX path | `src/moeicons` | Generated file location. |
| `defaultTheme` | key of `themes` | `outline` | Initial theme. |
| `themes` | object | — | Theme key → theme entry. |
| `icons` | `string[]` or `{ prefix: string[] }` | — | Registered icon IDs; must be non-empty before install. |
| `missingIconPolicy` | `fallback` \| `error` | `fallback` | Accepted by the schema; see the note below. |

### Theme entry fields

| Field | Type / allowed | Notes |
| --- | --- | --- |
| `styleGroup` | `moe-*` string | Required. Must exist in the catalog. |
| `styles` | `string[]` | Legacy, accepted for migration. |
| `format` | `svg` \| `webp` \| `png` | Bitmap groups only. |
| `imageSize` | `64` \| `128` \| `256` \| `512` | Bitmap groups only. |
| `defaultSize` | number > 0 | Accepted; effect on generated SVG proxies is not guaranteed. |
| `strokeWidth` | number >= 0 | Accepted. |
| `className` | string | Applied to the theme's generated icons. |

A theme entry **cannot** contain an `icons` field in `0.0.1`; doing so fails
with `unknown field "icons" in theme "<name>"`. Use the top-level `icons` list.

## Icon registration and validation

- `icons` registers the allowed IDs. Install requires at least one.
- The generator checks that **every registered icon exists in every configured
  theme's style group**. If an icon is missing from any theme, generation fails:
  `icon "<id>" is not available in style group "<group>" for theme "<theme>"`.
- There is no per-theme subset and no "requested theme → default → ASCII
  fallback" selection in `0.0.1`; `missingIconPolicy` is accepted but does not
  implement that behaviour.

## Catalog and Free group caveat

The `0.0.1` package bundles catalog `0.0.17`, in which `moe-colored` is still
**Pro-only**. A Free config that uses `moe-colored` fails with
`style group "moe-colored" is not available in free tier`. The website and the
current Free release contract treat `moe-colored` as Free; the CLI catalog lags
behind. Until the CLI is updated, use `moe-outline`, `moe-lite-outline` and
`moe-solid` for Free CLI configs.

## After changing configuration

The `0.0.1` release has no `update` command. Change the config, then run
`install` and `generate` again.

## Common errors

| Message (abridged) | Cause |
| --- | --- |
| `unknown field "icons" in theme ...` | Per-theme `icons` is unsupported. |
| `style group "moe-colored" is not available in free tier` | `0.0.1` catalog lag. |
| `icon "<id>" is not available in style group ...` | Icon missing from a configured theme. |
| `unknown icon "<id>"` | ID not in the catalog. |
| Unsupported/invalid `schemaVersion` | Not 1 or 2. |
