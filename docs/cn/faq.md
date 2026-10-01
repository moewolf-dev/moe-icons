# Q&A 与故障排查

答案基于已发布包：`moe-icons@0.0.17`（组件）与 `@moewolf/moe-icons-cli@0.0.1`
（CLI，实验性）。每项指向相关页面。

## 组件与渲染

**找不到图标。**
只能从 `moe-icons/react` 或 `moe-icons/vue` 导入。已发布包不导出
`moe-icons/free/...` 或按样式组的路径。

**图标巨大或 300×150。**
React 组件没有默认尺寸，请传 `width` 与 `height`。

**Vue 图标忽略 `width`/`height`。**
Vue 组件带 `moe-icon w-6 h-6`。有 Tailwind 时这些类可能优先；请覆盖 class 或改用
CSS。见 [Vue](/cn/frameworks/vue)。

**颜色无效。**
SVG 使用 `stroke="currentColor"` / `fill="none"`。设置父级 `color`，或覆盖
`color`/`stroke`/`fill`。CSS 中硬编码的 `fill` 会优先。

**能用同一图标的两种样式吗？**
已发布包不行（单一集）。请从[搜索页](/cn/website-search)下载各免费样式组的 SVG。CLI
代理路径尚不可用，见 [CLI 发布状态](/cn/cli#发布状态)。

## 包与依赖

**`moe-icons` 引入了 React/Vue。**
`moe-icons@0.0.17` 把 `react`、`react-dom`、`vue` 列为非可选 peer，同时把
react/vue 放进 `dependencies`。请去重或对齐版本。

**`ReactIconProps` 不从 `moe-icons/react` 导出。**
类型辅助从包根导入：

```ts
import type { ReactIconProps, VueIconProps } from 'moe-icons';
```

## React 警告

**`Invalid DOM property 'stroke-linecap'`。**
已发布 React 组件透传 kebab-case SVG 属性。React 会警告但渲染正确。见
[React](/cn/frameworks/react)。

## 无障碍

**图标被读作无名称图片，或被忽略。**
组件不加 `role`/`aria-hidden`。有语义的图标请传 `aria-label`（及 `role="img"`）；
装饰性图标传 `aria-hidden="true"`。见[使用方式](/cn/usage)。

## 官网搜索

**看不到图标。**
该部署可能关闭了图标浏览器（显示 `The new icon browser is not enabled...`）。

**某样式组显示锁。**
该组仅 Pro，或授权未生效。见[免费与付费](/cn/free-vs-pro)。

**没有“复制 ID”按钮。**
正确。请复制生成的代码，或从卡片读取 ID。见[官网搜索](/cn/website-search)。

**位图变体缺失/下载失败。**
选择该组提供的 `format`/`size`；账号未激活时请重新登录后再试。

## CLI

**为什么 `moeicons install free` 报 404？**
`0.0.1` 请求的 descriptor 校验资源在 `v0.0.17` GitHub 发布中不存在。见
[CLI 发布状态](/cn/cli#发布状态)。

**为什么生成的代理导入失败？**
它们从 `moe-icons/free/...` / `moe-icons/pro/...` 导入，而 `moe-icons@0.0.17`
不导出这些路径。修复前请用组件包或资源。

**CLI 有 `doctor`、`recover`、`update` 吗？**
没有。这些不属于 `0.0.1`。

**报 `unknown field "icons" in theme`。**
不支持每主题 `icons`；请用顶层 `icons`。见[配置文件](/cn/configuration)。

**报 `style group "moe-colored" is not available in free tier`。**
`0.0.1` 内置 catalog 把 `moe-colored` 视为 Pro。请用 `moe-outline`、
`moe-lite-outline` 或 `moe-solid`。

## Pro

**如何获得 Pro？**
在 [moeicons.com/pricing](https://moeicons.com/pricing) 购买，然后返回站点等待账号
激活。见[免费与付费](/cn/free-vs-pro)。

**能把 Pro 图标用于自有产品吗？**
可以，以结账时展示的许可为限：可在你拥有或控制的产品中集成图标。不得把账号凭据写入
前端源码，也不得把图标作为独立资源库再分发。确切条款见[免费与付费](/cn/free-vs-pro)
与许可文本。

## 资源与部署

**部署后下载的 SVG 404。**
路径取决于你把文件复制到的位置。修正 `src`/基础路径；仓库不管理你的托管布局。

**位图 404。**
位图仅 Pro，且需要确切 `format`/`imageSize`；请在搜索页确认变体存在。

**Tailwind 未生效。**
不附带样式表；`moe-icon` 是未样式化的标记类（Vue 还加 `w-6 h-6`）。请用显式
`width`/`height` 或自有 CSS。

## 动画

图标文件是静态 SVG，不含动画元数据。请用自有 CSS 或 JavaScript 实现动画。见
[图标库介绍](/cn/introduction)。
