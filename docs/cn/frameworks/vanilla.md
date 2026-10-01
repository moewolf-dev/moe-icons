# Vanilla DOM 与原始资源

有两种无框架方式。原始 SVG 资源是当前已验证的方式；CLI `vanilla` 目标是实验性的，
无法与已发布包配合使用。

## 原始 SVG 资源（已验证）

从 [moeicons.com/search](https://moeicons.com/search) 下载图标，或直接使用免费发布
资源。用 `<img>` 渲染：

```html
<img src="/icons/moe-outline/ui-search.svg" alt="Search" width="24" height="24" />
```

若需继承 `currentColor`，请内联 SVG 而不是用 `<img>`：

```js
const res = await fetch('/icons/moe-outline/ui-search.svg');
const svg = await res.text();
container.innerHTML = svg;
```

文件为 `viewBox="0 0 24 24"`，outline 组带 `stroke="currentColor"`，内联后随文字
颜色变化。

## 位图限制

位图样式组（`moe-3d-metal`）仅 Pro，且不能用于 CLI `vanilla` 目标。

## CLI `vanilla` 目标（实验性）

`0.0.1` 生成器在 `outputDir` 下写入：

```text
types.ts
<styleGroup>/<Pascal>.ts      # create<Pascal>(options) -> SVGElement，默认导出
<styleGroup>/index.ts         # export { default as <camelCase>, create<Pascal> }
index.ts                      # export * from './<styleGroup>'
```

**没有** `runtime.ts`、`createRuntime` 或 `MoeOutline` 命名空间。工厂形如：

```ts
import { createUiSearch } from './moeicons/moe-outline';

const node = createUiSearch({ className: 'icon', strokeWidth: 2, width: 24, height: 24 });
document.body.append(node);
```

`VanillaIconOptions` 接受 `className`、`strokeWidth` 及任意额外
`string | number` 属性，应用到根 `<svg>`。

### 多组注意

顶层 `index.ts` 用 `export *` 重导出每个组。当两个组导出同名工厂（例如
`createUiSearch`）时，重导出有歧义而不可用。使用多个样式组时，请从每组子路径
（`./moeicons/moe-outline`）导入。

### 生命周期

`create<Pascal>` 返回 `SVGElement`；挂载后保留引用，用 `element.remove()` 移除。
没有更新 API——改变外观请创建新元素。
