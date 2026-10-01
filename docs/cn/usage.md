# 使用方式

本页说明 `moe-icons@0.0.17` 的已发布组件。它们是普通 SVG 组件，没有 Provider，也
没有主题切换。

## React 组件

```tsx
import { ArrowBoldRight, UiSearch } from 'moe-icons/react';

export function Toolbar() {
  return (
    <>
      <UiSearch width={20} height={20} aria-label="Search" />
      <ArrowBoldRight width={20} height={20} aria-hidden="true" />
    </>
  );
}
```

组件签名：

```tsx
({ strokeWidth = 2, className, ...props }) => <svg ... {...props} />
```

SVG 根渲染为：

```jsx
<svg
  className={className ? `moe-icon ${className}` : 'moe-icon'}
  stroke="currentColor"
  fill="none"
  strokeWidth={2}
  viewBox="0 0 24 24"
  {...props}
/>
```

因为 `props` 最后展开，你可以覆盖 `stroke`、`fill`、`strokeWidth`、`viewBox`，并
添加任意 SVG 属性（`width`、`height`、`color`、`id`、`style`）或事件处理器。

### 属性

| 属性 | 类型 | 默认 | 说明 |
| --- | --- | --- | --- |
| `width` / `height` | number \| string | 无 | **用它设置尺寸。** 没有默认尺寸。 |
| `strokeWidth` | number | `2` | 描边类图标。 |
| `className` | string | — | 合并进 `moe-icon`。 |
| `color` | string | — | 透传到 SVG。 |
| `stroke` / `fill` | string | `currentColor` / `none` | 透传并覆盖默认值。 |

**没有 `size` 属性**，没有 `forwardRef`，也不自动处理 `role` 或 `aria-hidden`。
其余 SVG 属性全部透传。

## Vue 组件

```vue
<script setup lang="ts">
import { ArrowBoldRight, UiSearch } from 'moe-icons/vue';
</script>

<template>
  <UiSearch width="20" height="20" aria-label="Search" />
  <ArrowBoldRight aria-hidden="true" />
</template>
```

Vue 组件通过 `$attrs` 接受相同的 SVG 属性，外加类型化的 `strokeWidth?: number` 与
`class?: string`（`VueIconProps`）。它们带标记类 `moe-icon w-6 h-6`：

- 若安装了 Tailwind 且扫描到这些类，图标渲染为 24px，`w-6 h-6` 的 CSS 会覆盖
  `width`/`height` 属性。
- 没有 Tailwind（或覆盖了 class）时，用 `width`/`height` 或自有 CSS 设置尺寸。

## 颜色

两个包对 outline 图标都渲染 `stroke="currentColor"` 与 `fill="none"`。通过继承或
覆盖属性着色：

```tsx
<UiSearch className="text-blue-600" width={20} height={20} />
<UiSearch color="#2563eb" width={20} height={20} />
<UiSearch stroke="var(--brand)" width={20} height={20} />
```

## 无障碍

组件**不会**自动添加语义，请自行处理：

```tsx
{/* 有语义的图标：给出名称 */}
<button>
  <UiSearch aria-label="Search" role="img" width={16} height={16} />
</button>

{/* 装饰性图标：对辅助技术隐藏 */}
<button>
  <Trash aria-hidden="true" width={16} height={16} />
  Delete
</button>
```

## 样式切换

已发布 `moe-icons` 只有**单一**样式集且没有 Provider，因此不能在运行时切换样式。
当前与框架无关的做法：

- 在[搜索页](/cn/website-search)下载同一图标 ID 的其他免费样式组资源并替换。
- 或同时渲染两个图标，切换显示哪一个。

CLI 旨在生成多样式代理，但其 `0.0.1` 版本无法与已发布包配合使用。见
[CLI 状态](/cn/cli#release-status)。

## 实验性 CLI 代理 API（仅供参考）

若未来版本修复导入契约，`0.0.1` 生成器的行为如下。**当前不可用。**

- React：`MoeiconsProvider` 仅接受 `theme?: Theme`，首次挂载时
  `useState(props.theme ?? defaultTheme)`；没有 `defaultTheme` 属性、没有
  `onThemeChange`，外部 `theme` 变化不会更新内部状态。`useMoeiconsTheme()` 在
  Provider 外抛错，图标代理会调用它，因此必须在 Provider 内。
- Vue：`MoeiconsProvider` 声明带默认值的 `theme` 属性，复制进 ref，不 watch、不
  emit；`useMoeiconsTheme()` 在 Provider 外抛错（Vue 图标代理则回退到默认主题）。
- 尺寸以动态 `w-[Npx] h-[Npx]` 类实现，并把 `size` 透传到底层组件；没有 Tailwind
  时可能不会改变尺寸。

## 打包体积

`moe-icons/react` 与 `moe-icons/vue` 是较大的桶文件；支持 tree-shaking 的打包器可
去除未使用图标。请按名导入以便 tree-shaking 生效。
