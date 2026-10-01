# Nuxt

Nuxt 支持直接使用已发布的 `moe-icons@0.0.17` Vue 组件。没有 Nuxt 模块、自动导入
或 Provider，SSR 行为未认证。

## 支持状态

| 项目 | 状态 |
| --- | --- |
| Nuxt 3 SSR | 直接组件可用 |
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
