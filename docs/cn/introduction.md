# 图标库介绍

Moe Icons 是一个语义化 SVG 图标库。每个图标拥有稳定的 ID（例如 `ui-search`），并
以多个**样式组**绘制，因此同一语义 ID 在不同样式集下外观不同。

## 核心概念

| 概念 | 含义 | 示例 |
| --- | --- | --- |
| 图标 ID | 稳定的 kebab-case 标识 | `ui-search`、`arrow-bold-right` |
| 样式组 | 整套图标的一种视觉风格 | `moe-outline`、`moe-solid`、`moe-colored` |
| 主题键 | 项目为样式组起的逻辑别名 | `outline`、`solid` |
| 网站主题 | 网站自身的浅色/深色外观 | 与样式组无关 |

## 内容

- 每个样式组 **554 个图标**。
- **矢量 SVG** 样式组：`moe-outline`、`moe-lite-outline`、`moe-solid`、
  `moe-colored`、`moe-duotone`、`moe-pixel-lite-outline`、`moe-pixel-outline`、
  `moe-pixel-solid`、`moe-sticker`。
- **位图**样式组：`moe-3d-metal`（PNG/WebP，128/256/512），仅 Pro。

免费样式组：`moe-outline`、`moe-lite-outline`、`moe-solid`、`moe-colored`。Pro
包含其余样式组。见[免费与付费](/cn/free-vs-pro)。

SVG 图标为 `24x24`（`viewBox="0 0 24 24"`）。已发布文件是静态的，不含动画元数据。

## 消费渠道（重要）

| 渠道 | 提供内容 | 状态 |
| --- | --- | --- |
| npm `moe-icons@0.0.17` | React/Vue 组件，**单一**样式集（Moe Outline） | 已发布并验证 |
| 官网搜索 | 预览各样式组并下载 SVG/位图 | 已发布 |
| CLI `@moewolf/moe-icons-cli@0.0.1` | 多样式项目的安装/生成流程 | **实验性，暂不可用** —— 见 [CLI 状态](/cn/cli#release-status) |

npm 组件包与多样式 CLI 是不同产品。已发布包不能切换样式；用于生成此类代理的 CLI
当前无法与已发布包配合使用。在 [CLI 状态](/cn/cli#release-status) 说明可用前，请勿
假定 CLI 流程可用。

## 支持的目标

| 目标 | 状态 |
| --- | --- |
| React（`moe-icons/react`） | 已发布；width/height + SVG 属性 |
| Vue（`moe-icons/vue`） | 已发布；默认尺寸依赖 Tailwind |
| Next.js / Nuxt | 手工；使用直接组件或下载资源（SSR 工具未认证） |
| Vanilla DOM | 下载 SVG 资源自行挂载 |
| Windows | CLI 未认证 |

## 需提前了解的限制

- 不附带样式表。`moe-icon` 是未样式化的标记类（Vue 还会加 `w-6 h-6`）。React 图标
  必须用显式 `width`/`height`。
- 已发布组件**没有 `size` 属性**，没有 Provider，也不自动处理 `role`/`aria-hidden`。
- 组件包只发布一种样式集；其他免费样式请从官网下载。
- 位图（`moe-3d-metal`）需要 Pro。

## 许可与来源

代码包以 Apache-2.0 发布。免费图标资源遵循[价格页所示许可](https://moeicons.com/pricing)；
Pro 资源需要有效授权。四个免费样式组及本文档位于公开 `moe-icons` 仓库；Pro 资源通过
已授权账号获取。

## 下一步

- [安装方式](/cn/installation) —— 安装组件包或下载资源。
- [使用方式](/cn/usage) —— 渲染、尺寸与颜色。
- [免费与付费](/cn/free-vs-pro) —— 能力与授权。
