# Vanilla DOM and raw assets

There are two framework-free routes. Raw SVG assets are the verified route
today; the CLI `vanilla` target is experimental and not consumable with the
published packages.

## Raw SVG assets (verified)

Download an icon from [moeicons.com/search](https://moeicons.com/search), or
use the Free release assets directly. Render with an `<img>`:

```html
<img src="/icons/moe-outline/ui-search.svg" alt="Search" width="24" height="24" />
```

To inherit `currentColor`, inline the SVG instead of using `<img>`:

```js
const res = await fetch('/icons/moe-outline/ui-search.svg');
const svg = await res.text();
container.innerHTML = svg;
```

The files are `viewBox="0 0 24 24"` with `stroke="currentColor"` (outline
groups) so they follow the surrounding text colour once inlined.

## Bitmap limitation

Bitmap groups (`moe-3d-metal`) are Pro-only and cannot be used with the CLI
`vanilla` target.

## CLI `vanilla` target (experimental)

The `0.0.1` generator emits, under `outputDir`:

```text
types.ts
<styleGroup>/<Pascal>.ts      # create<Pascal>(options) -> SVGElement, default export
<styleGroup>/index.ts         # export { default as <camelCase>, create<Pascal> }
index.ts                      # export * from './<styleGroup>'
```

There is **no** `runtime.ts`, `createRuntime` or `MoeOutline` namespace. A
factory looks like:

```ts
import { createUiSearch } from './moeicons/moe-outline';

const node = createUiSearch({ className: 'icon', strokeWidth: 2, width: 24, height: 24 });
document.body.append(node);
```

`VanillaIconOptions` accepts `className`, `strokeWidth` and any extra
`string | number` attributes applied to the root `<svg>`.

### Multi-group caveat

The top-level `index.ts` re-exports every group with `export *`. When two
groups export the same factory name (for example `createUiSearch`), the
re-export is ambiguous and cannot be used. Import from the per-group subpath
(`./moeicons/moe-outline`) when using more than one style group.

### Lifecycle

`create<Pascal>` returns an `SVGElement`; append it, keep the reference, and
remove it with `element.remove()` when done. There is no update API — create a
new element to change appearance.
