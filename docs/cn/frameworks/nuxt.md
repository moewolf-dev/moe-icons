# Nuxt
支持两种独立接入方式。下方先说明 CLI 生成组件；直接 npm 组件包的范围单独列出。

## CLI 生成组件（已验证）

使用 `@moewolf/moe-icons-cli@0.0.3` 与 `0.0.18` 图标资源，完成生产构建、SSR、浏览器水合和主题交互验证；覆盖 Free/Pro、单/多主题与 SVG/位图。配置和命令见 [CLI](/cn/cli)。下面使用 `ui-search` 图标、`outline` 主题及默认输出目录 `src/moeicons`。

在组件中明确导入本地 Provider 与图标，保持服务端和客户端初始主题一致。SSR 验证不依赖 `ClientOnly`；不提供 Nuxt module 或自动导入。

```vue
<!-- components/IconPanel.vue -->
<script setup lang="ts">
import { MoeiconsProvider, UiSearch } from '../src/moeicons';
</script>

<template>
  <MoeiconsProvider theme="outline"><UiSearch :size="24" aria-label="Search" /></MoeiconsProvider>
</template>
```

上述认证适用于 CLI 生成组件，不改变下面直接 npm 组件包的支持状态。自定义 Nuxt module 和其他自动集成仍需自行验证。

## 直接 npm 组件包

Nuxt 支持直接使用已发布的 `moe-icons@0.0.17` Vue 组件。没有 Nuxt 模块、自动导入
或 Provider，SSR 行为未认证。

## 支持状态

| 项目 | 状态 |
| --- | --- |
| Nuxt 3 SSR | 手工示例；未做生产构建/水合验证 |
| 自动导入 | 未提供 |
| 主题/Provider | 已发布包未提供 |
| 位图资源 | 未验证 |

## 安装

```sh
npm install moe-icons
```

## 使用组件

```vue
<script setup lang="ts">
import { UiSearch } from 'moe-icons/vue';
</script>

<template>
  <UiSearch width="20" height="20" aria-label="Search" />
</template>
```

`moe-icons/vue` 是 npm 包路径，不是本地 `./moeicons` 目录。只有把生成文件复制进
项目时才使用相对路径。

## 根布局

不需要 Provider。若想要统一默认尺寸，可自行封装组件，或在 `app.vue` 中为
`moe-icon` 类设置 CSS。

```vue
<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>
```

## 尺寸

Vue 组件带 `moe-icon w-6 h-6`。没有 Tailwind 时，请传 `width`/`height` 或为
`.moe-icon` 添加 CSS。见 [Vue](/cn/frameworks/vue)。

## 未验证部分

- Nuxt 渲染器下的 SSR/水合。
- 位图资源路径解析。
- 任何自动导入或模块集成（不存在）。
