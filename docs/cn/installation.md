# 安装方式

今天有三种受支持的消费方式。

| 方式 | 包 | 样式 | 状态 |
| --- | --- | --- | --- |
| 组件包 | `moe-icons` | 单一（Moe Outline） | 已发布并验证 |
| 原始资源 | 官网下载 | 全部免费样式组 | 已发布 |
| CLI 项目代理 | `@moewolf/moe-icons-cli` | 多种 | 已发布并验证，见下文 |

## 安装组件包

```sh
npm install moe-icons
```

> **依赖说明。** `moe-icons@0.0.17` 把 `react`、`react-dom`、`vue` 列为 peer 依赖
> （未标记可选），并在 `dependencies` 中包含 `react` 与 `vue`。即使只用其中一个，
> 安装也可能引入 React 和 Vue。请显式安装所用框架，并在包管理器提示重复时去重。

React：

```tsx
import { Archive, ArrowBoldRight } from 'moe-icons/react';
```

Vue：

```ts
import { Archive, ArrowBoldRight } from 'moe-icons/vue';
```

包根还暴露命名空间：

```ts
import { React, Vue } from 'moe-icons';
```

已发布包中没有 `moe-icons/free/...`、`moe-icons/pro/...` 或按样式组划分的子路径，
只有 `.`、`./react`、`./vue`。

## 下载原始 SVG 资源

打开 [moeicons.com/search](https://moeicons.com/search)，选择样式组和图标，在详情
弹窗下载 SVG（Pro 组可选位图变体）。免费组无需账号。直接使用：

```html
<img src="/assets/moe-outline/ui-search.svg" alt="Search" width="24" height="24" />
```

SVG 使用 `currentColor`，内联时可随文字颜色变化。

## CLI

CLI 以 `@moewolf/moe-icons-cli@0.0.6` 发布，要求 Node.js 22+：

```sh
npm install -D @moewolf/moe-icons-cli
npx moeicons init
npx moeicons install free
npx moeicons generate
```

`init` 会写入 `moeicons.config.jsonc`（schema 版本 3）。免费安装无需账号；Pro 安装
需要登录并校验账号授权。生成组件已在 Vite React/Vue 与 Next.js App Router / Nuxt
SSR 上验证。完整命令见 [CLI 命令](/cn/cli)，验证范围见
[CLI 状态](/cn/cli#release-status)。

## Pro

Pro 资源需要已激活授权的账号。已发布的组件包不包含 Pro，但 CLI 可在
`moeicons login` 后安装 Pro 资源。官网在购买后解锁 Pro 组的浏览；见
[免费与付费](/cn/free-vs-pro)。

## 更新

- 组件包：修改版本并重新安装（`npm install moe-icons@x`）。
- 原始资源：重新下载较新文件；URL 带有发布版本。

## 故障排查

| 现象 | 处理 |
| --- | --- |
| 找不到 `moe-icons/react` | 确认是 `moe-icons@0.0.17`；只发布 `.`、`./react`、`./vue`。 |
| 图标巨大 / 300×150 | 传 `width`/`height`（React 无默认尺寸）。 |
| Vue 图标忽略 `width` | Tailwind 的 `w-6 h-6` 标记类可能优先；移除/覆盖或改用 CSS。 |
| `moeicons install` 失败 | 确认 `@moewolf/moe-icons-cli@0.0.6` 与 Node 22+，然后运行 `moeicons doctor --check`。 |
| React/Vue 版本重复 | `moe-icons` 会引入 React/Vue 依赖；去重或对齐版本。 |
