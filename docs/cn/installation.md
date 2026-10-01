# 安装方式

今天有两种受支持的消费方式。第三种（CLI）是实验性的，且当前无法与已发布包配合使用。

| 方式 | 包 | 样式 | 状态 |
| --- | --- | --- | --- |
| 组件包 | `moe-icons` | 单一（Moe Outline） | 已发布并验证 |
| 原始资源 | 官网下载 | 全部免费样式组 | 已发布 |
| CLI 项目代理 | `@moewolf/moe-icons-cli` | 多种 | 实验性，见下文 |

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

## CLI（实验性）

CLI 以 `@moewolf/moe-icons-cli@0.0.1` 发布，要求 Node.js 22+：

```sh
npm install -D @moewolf/moe-icons-cli
npx moeicons --version   # 0.0.1
```

**请勿把 CLI 流程当作可用。** 在 `0.0.1` 中：

1. `moeicons install free` 请求 `release-descriptor.json.sha256`，而当前 `v0.0.17`
   GitHub 发布未包含该资源，下载以 404 失败。
2. 即使下载成功，生成的 React/Vue 代理会从 `moe-icons/free/...` 与
   `moe-icons/pro/...` 导入，而已发布的 `moe-icons@0.0.17` 不提供这些导出。

在兼容版本发布前，请使用组件包或原始资源。`0.0.1` 的确切命令面见
[CLI 命令](/cn/cli)，阻塞项见 [CLI 状态](/cn/cli#release-status)。

## Pro

Pro 资源需要已激活授权的账号。已发布的组件包不包含 Pro。官网在购买后解锁 Pro 组的
浏览；见[免费与付费](/cn/free-vs-pro)。CLI 的 `moeicons login` 存在，但 Pro 安装
路径与上述免费路径有相同阻塞。

## 更新

- 组件包：修改版本并重新安装（`npm install moe-icons@x`）。
- 原始资源：重新下载较新文件；URL 带有发布版本。

## 故障排查

| 现象 | 处理 |
| --- | --- |
| 找不到 `moe-icons/react` | 确认是 `moe-icons@0.0.17`；只发布 `.`、`./react`、`./vue`。 |
| 图标巨大 / 300×150 | 传 `width`/`height`（React 无默认尺寸）。 |
| Vue 图标忽略 `width` | Tailwind 的 `w-6 h-6` 标记类可能优先；移除/覆盖或改用 CSS。 |
| `moeicons install` 返回 404 | `0.0.1` 已知发布阻塞；请用组件包或资源。 |
| React/Vue 版本重复 | `moe-icons` 会引入 React/Vue 依赖；去重或对齐版本。 |
