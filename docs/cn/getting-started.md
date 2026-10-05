# 快速开始

本页使用已发布的 npm 包 `moe-icons@0.0.17`，让 React 或 Vue 项目显示第一个图标。
这些组件是普通 SVG 组件，无需 Provider、CLI 或构建插件。

## 环境前提

- Node.js 18 或更高版本（构建工具要求）。
- React（`>=17`）或 Vue（`>=3.2`）项目，带打包器。

## React

### 1. 安装

```sh
npm install moe-icons
```

> `moe-icons@0.0.17` 把 `react`、`react-dom`、`vue` 同时列为 peer 依赖（且未标记
> 可选），并把 `react` 和 `vue` 放进 `dependencies`。即使只用其中一个框架，安装时
> 也可能带上 React 和 Vue。请显式安装所用框架，必要时去重。

### 2. 渲染图标

```tsx
import { ArrowBoldRight } from 'moe-icons/react';

export function NextButton() {
  return <ArrowBoldRight width={32} height={32} aria-label="Next" />;
}
```

用 `width`/`height` 设置尺寸（没有 `size` 属性）。用 `color`、`stroke` 或周围的
`currentColor` 设置颜色。

### 3. 预期结果

一个 32×32、继承文字颜色的箭头图标。SVG 根为 `viewBox="0 0 24 24"`，带
`stroke="currentColor"` 和 `fill="none"`，其余属性透传到 `<svg>`。

## Vue

```sh
npm install moe-icons
```

```vue
<script setup lang="ts">
import { ArrowBoldRight } from 'moe-icons/vue';
</script>

<template>
  <ArrowBoldRight width="32" height="32" aria-label="Next" />
</template>
```

> Vue 组件带有标记类 `moe-icon w-6 h-6`。若项目有 Tailwind，这些类会决定尺寸；否则
> 请传 `width`/`height` 或使用自有 CSS。见 [Vue](/cn/frameworks/vue)。

## 该包能做什么、不能做什么

- 只提供**一种样式集**（Moe Outline），已发布包内没有主题/Provider 切换。
- 不会自动处理无障碍名称：有语义的图标请自行传 `aria-label` 或 `title` 与 `role`。
- 不含其他免费样式组。请在[图标搜索页](/cn/website-search)下载，或使用
  [CLI](/cn/cli) 安装。

## 其他入口

- [安装方式](/cn/installation) —— 所有受支持的安装途径。
- [使用方式](/cn/usage) —— 属性、尺寸与无障碍。
- [前端框架](/cn/frameworks/react) —— 各框架细节。
- [官网搜索](/cn/website-search) —— 查找图标并复制代码。
