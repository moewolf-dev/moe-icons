# React

React 支持由已发布的 `moe-icons@0.0.17` 包提供。每个图标是普通函数组件，没有
Provider、hook 或 context。

## 支持状态

| 项目 | 状态 |
| --- | --- |
| `moe-icons/react` | 已发布并验证 |
| 样式切换 | 已发布包不支持 |
| Next.js App Router | 直接组件可用；见 [Next.js](/cn/frameworks/next) |
| CLI 生成代理 | CLI 0.0.3 本地生成组件已验证；见 [CLI 状态](/cn/cli#发布状态) |

## 安装

```sh
npm install moe-icons
```

> `moe-icons@0.0.17` 把 `react` 与 `vue` 作为常规依赖引入（并把它们声明为非可选
> peer）。请显式安装所用框架并对重复 React 去重。

## 导入与渲染

```tsx
import { ArrowBoldRight, UiSearch } from 'moe-icons/react';

export function Toolbar() {
  return (
    <header>
      <UiSearch width={20} height={20} aria-label="Search" />
      <ArrowBoldRight width={20} height={20} aria-hidden="true" />
    </header>
  );
}
```

## 组件签名

```tsx
const Icon = ({ strokeWidth = 2, className, ...props }) => (
  <svg
    className={className ? `moe-icon ${className}` : 'moe-icon'}
    stroke="currentColor"
    fill="none"
    strokeWidth={strokeWidth}
    viewBox="0 0 24 24"
    {...props}
  />
);
```

`props` 最后展开，因此任意 SVG 属性（`width`、`height`、`color`、`style`、`id`、
`onClick`）都可覆盖默认值。

## 属性

| 属性 | 类型 | 默认 | 说明 |
| --- | --- | --- | --- |
| `width` / `height` | number \| string | 无 | **可预期尺寸必须显式设置。** |
| `strokeWidth` | number | `2` | |
| `className` | string | — | 合并进 `moe-icon`。 |
| `color`、`stroke`、`fill` | string | — | 透传到 SVG。 |

没有 `size` 属性，也没有 ref 转发。

## 没有 Provider

不必也不应挂载 Provider——已发布包中不存在。在需要处直接渲染图标即可。

## 已知 React 警告

已发布组件透传 kebab-case SVG 属性（`stroke-linecap`、`stroke-linejoin`）。React 会
打印 `Invalid DOM property 'stroke-linecap'`，但渲染仍然正确。这是打包警告，不是
渲染失败。

## 无障碍

组件不设置 `role` 或 `aria-hidden`，请自行添加：

```tsx
<UiSearch width={16} height={16} aria-label="Search" role="img" />
<Trash width={16} height={16} aria-hidden="true" />
```

## 类型

`ReactIconProps` 从包**根**导出，而不是 `react` 子路径：

```ts
import type { ReactIconProps } from 'moe-icons';
```

`ReactIconProps extends ComponentProps<'svg'>`，外加 `strokeWidth?: number`。
