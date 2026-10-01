# Vue

Vue 支持由已发布的 `moe-icons@0.0.17` 包提供。每个图标是一个组件定义，没有插件、
Provider 或 composable。

## 支持状态

| 项目 | 状态 |
| --- | --- |
| `moe-icons/vue` | 已发布并验证 |
| 样式切换 | 已发布包不支持 |
| Nuxt | 直接组件可用；见 [Nuxt](/cn/frameworks/nuxt) |
| CLI 生成代理 | 实验性，不可用；见 [CLI 状态](/cn/cli#发布状态) |

## 安装

```sh
npm install moe-icons
```

> `moe-icons@0.0.17` 把 `vue`（以及 `react`/`react-dom`）列为非可选 peer 依赖，并
> 依赖 `vue`。请显式安装所用框架并去重。

## 导入与渲染

```vue
<script setup lang="ts">
import { ArrowBoldRight, UiSearch } from 'moe-icons/vue';
</script>

<template>
  <UiSearch width="20" height="20" aria-label="Search" />
  <ArrowBoldRight aria-hidden="true" />
</template>
```

## 尺寸注意

Vue 组件编译时带标记类：

```html
<svg class="moe-icon w-6 h-6" stroke="currentColor" fill="none" viewBox="0 0 24 24" ...>
```

- 若有 Tailwind 且扫描到这些类，图标渲染为 24px，`w-6 h-6` 的 CSS 可能覆盖
  `width`/`height` 属性。
- 没有 Tailwind 时，`w-6 h-6` 只是无效类，请用 `width`/`height` 或自有 CSS。

## 属性

Vue 组件通过 `$attrs` 接受任意 SVG 属性（在默认值之后合并），外加：

| 属性 | 类型 | 说明 |
| --- | --- | --- |
| `strokeWidth` | number | 默认 `2`。 |
| `class` | string | 与标记类合并。 |
| `width`、`height` | string \| number | 透传为 SVG 属性。 |

没有 `size` 属性、没有 `provide`/`inject`、没有主题控制。

## 无障碍

请自行添加名称：

```vue
<UiSearch width="16" height="16" aria-label="Search" role="img" />
<Trash width="16" height="16" aria-hidden="true" />
```

## 类型

`VueIconProps` 从包**根**导出，而不是 `vue` 子路径：

```ts
import type { VueIconProps } from 'moe-icons';
```

`VueIconProps` 为 `{ class?: string; strokeWidth?: number }`。
