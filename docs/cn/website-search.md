# 在官网搜索图标

官网图标浏览器 [moeicons.com/search](https://moeicons.com/search) 可查找图标、
预览各样式、复制接入代码并下载资源。本页说明该流程。

## 可用性

部分部署可能关闭图标浏览器。关闭时页面会提示该部署未启用浏览器。

## 流程

### 1. 搜索

- 使用页面搜索框，或站点全局搜索（`Ctrl`/`Cmd` + `K`）后回车。查询保存在 URL 的
  `?q=` 中。
- 搜索不区分大小写，匹配图标 ID 与名称。
- 点击清除（✕）重置查询；已处理 IME 组合输入。

### 2. 按样式组筛选

- 顶部样式标签切换样式组，默认 `moe-outline`。
- 锁定的 Pro 组显示锁标记。选中后显示引导面板而非图标（见
  [免费与付费](/cn/free-vs-pro)）。
- 分类侧栏在所选组内收窄结果。

URL 保留 `?q=`、`?style=`、`?category=`，因此搜索可分享或收藏。前进/后退与刷新会
恢复状态。

### 3. 预览

- 滚动时懒加载预览；屏幕外图标不会发起请求。
- 四个免费 SVG 样式组无需账号即可预览。
- Pro 与位图组需要有效 Pro 账号；锁定组不显示图标。
- 使用颜色设置弹窗可在本地重新着色。

### 4. 复制代码或下载

点击图标打开详情弹窗，提供：

- **Copy code**：目标为 React、Vue、Vanilla/Adapter 或 Raw asset。代码片段按所选
  图标与样式生成。
- **下载**：矢量组为 SVG，位图变体为 `128-webp`、`256-webp` 等。

没有独立的“复制 ID”按钮；请复制生成的代码，或从卡片读取名称。

### 5. 将图标放入项目

Moe Outline 集使用已发布组件包；其他免费组下载 SVG。

**React（组件包）：**

```tsx
import { UiSearch } from 'moe-icons/react';

export function Search() {
  return <UiSearch width={24} height={24} aria-label="Search" />;
}
```

**Vue（组件包）：**

```vue
<script setup lang="ts">
import { UiSearch } from 'moe-icons/vue';
</script>

<template>
  <UiSearch width="24" height="24" aria-label="Search" />
</template>
```

**下载的 SVG（任意免费组）：**

1. 下载 `ui-search.svg`。
2. 放入静态/公共目录，例如 `public/icons/moe-outline/ui-search.svg`。
3. 引用：

```html
<img src="/icons/moe-outline/ui-search.svg" alt="Search" width="24" height="24" />
```

若要让 SVG 随文字颜色变化，请内联你下载的文件内容，而不是用 `<img>`。只内联来自
官网或官方包的 SVG，不要注入任意远端 SVG。

CLI 会生成多样式代理，但其 `0.0.1` 版本尚不可用。见 [CLI 状态](/cn/cli#发布状态)。

## 各账号状态可执行的操作

| 状态 | 免费组 | Pro 组 |
| --- | --- | --- |
| 未登录 | 浏览、预览、复制、下载 | 锁定；引导面板提供 Login 与 Pricing |
| 免费（已登录） | 浏览、预览、复制、下载 | 锁定；引导面板提供 Pricing |
| Pro（已激活） | 全部可用 | 浏览、预览、复制、下载 |

组是否解锁跟随账号状态；锁定组显示引导面板而非图标。

## 故障排查

| 现象 | 原因 / 处理 |
| --- | --- |
| 看不到图标 | 该部署可能关闭了图标浏览器。 |
| 某组显示锁 | 该组仅 Pro，或账号未激活。见[免费与付费](/cn/free-vs-pro)。 |
| 位图变体缺失 | 选择该组提供的 `format`/`size`。 |
| 下载失败 | 重试；账号未激活请重新登录。 |
| 深层链接状态错误 | URL 会恢复 `q`、`style`、`category`；登录后请刷新。 |
