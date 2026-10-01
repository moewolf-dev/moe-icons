# Next.js

Next.js 支持直接使用已发布的 `moe-icons@0.0.17` 组件。没有 Provider 或自动接入，
且 Next 特定行为未认证。

## 支持状态

| 项目 | 状态 |
| --- | --- |
| App Router | 直接组件可用 |
| Pages Router | 直接组件可用 |
| Server Components | 组件是无 hook 函数，可在服务端渲染 |
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
