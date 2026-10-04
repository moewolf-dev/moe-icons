# Next.js
支持两种独立接入方式。下方先说明 CLI 生成组件；直接 npm 组件包的范围单独列出。

## CLI 生成组件（已验证）

使用 `@moewolf/moe-icons-cli@0.0.3` 与 `0.0.18` 图标资源，完成生产构建、SSR、浏览器水合和主题交互验证；覆盖 Free/Pro、单/多主题与 SVG/位图。配置和命令见 [CLI](/cn/cli)。下面使用 `ui-search` 图标、`outline` 主题及默认输出目录 `src/moeicons`。

保留 server page/layout，在包含图标与 Provider 的子树显式声明 `use client`。CLI 不自动选择 App Router 的 client boundary。

```tsx
// app/icon-panel.tsx
'use client';
import { MoeiconsProvider, UiSearch } from '../src/moeicons';

export default function IconPanel() {
  return <MoeiconsProvider theme="outline"><UiSearch size={24} aria-label="Search" /></MoeiconsProvider>;
}
```

```tsx
// app/page.tsx
import IconPanel from './icon-panel';
export default function Page() { return <main><IconPanel /></main>; }
```

上述认证适用于 CLI 生成组件，不改变下面直接 npm 组件包的支持状态。Pages Router、`next/image` 和自定义 App Router 接入仍需自行验证。

## 直接 npm 组件包

Next.js 支持直接使用已发布的 `moe-icons@0.0.17` 组件。没有 Provider 或自动接入，
且 Next 特定行为未认证。

## 支持状态

| 项目 | 状态 |
| --- | --- |
| App Router | 手工示例；未做生产构建/渲染验证 |
| Pages Router | 手工示例；未验证 |
| Server Components | 未在真实 Next 构建中验证 |
| 自动根包装 | 未提供 |
| `next/image` 与位图 | 未验证 |

## 安装

```sh
npm install moe-icons
```

## App Router 用法

组件没有 hook，可从 server component 渲染：

```tsx
import { ArrowBoldRight, UiSearch } from 'moe-icons/react';

export default function Toolbar() {
  return (
    <nav>
      <UiSearch width={20} height={20} aria-label="Search" />
      <ArrowBoldRight width={20} height={20} aria-hidden="true" />
    </nav>
  );
}
```

若需要点击处理，请把图标放入客户端组件（`'use client'`）。

## 尺寸与样式

传 `width`/`height`；`className`、`style`、`color` 及其他 SVG 属性都会透传。不要求
Tailwind。

## 未验证部分

- 位图 Pro 资源与 `next/image`。
- 任何自动 Provider 或主题接入（不存在）。
- Next CSS 管线下的跨组件尺寸。

若需要这些，请在自己的应用中验证，或使用[搜索页](/cn/website-search)资源。
