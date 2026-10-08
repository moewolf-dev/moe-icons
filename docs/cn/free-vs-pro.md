# 免费与付费

Moe Icons 提供无需账号的免费层级，以及解锁其余样式组的 Pro 层级。本页概述差异及各自
的使用方式。

## 对比

| | 免费 | 付费 |
| --- | --- | --- |
| 样式组 | `moe-outline`、`moe-lite-outline`、`moe-solid`、`moe-colored` | 全部样式组：额外包含 `moe-3d-metal`、`moe-3d-plastic-green`、`moe-duotone`、`moe-pixel-lite-outline`、`moe-pixel-outline`、`moe-pixel-solid`、`moe-sticker` |
| 图标数量 | 每组 554 个 | 每组 554 个 |
| 格式 | SVG | SVG；Metal 和 Plastic Green 为 PNG/WebP 位图（128/256/512） |
| 当前可用渠道 | npm 组件包（Moe Outline）、官网下载与 CLI | 有效 Pro 账号的官网下载与 CLI |
| 官网搜索 | 浏览、复制并下载免费组 | 浏览、复制并下载全部组 |
| 更新 | 免费线 | 以购买时展示的许可为准 |
| 价格 | 免费 | 一次性付费 |

官网[价格页](https://moeicons.com/pricing)是当前价格与产品描述的事实源；结账时展示的
"Moe Icons License Agreement" 是使用权利的事实源。撰写时（2026-10-01）Pro 为一次性
购买，显示为 **39 美元**。请以线上价格页为准。

CLI（`@moewolf/moe-icons-cli@0.0.6`，图标资源 `0.0.19`）可安装免费与 Pro 资源，
并为 React、Vue、Vanilla 生成本地组件。免费安装无需账号；Pro 安装需要登录并校验
授权。见 [CLI 发布状态](/cn/cli#发布状态)。

## 免费访问

- 无需账号或登录。
- 使用已发布组件（`moe-icons/react`、`moe-icons/vue`）获取 Moe Outline 样式集。见
  [快速开始](/cn/getting-started)。
- 其他免费样式组请从[搜索页](/cn/website-search)下载。

## Pro 访问

### 购买与激活

1. 打开 [moeicons.com/pricing](https://moeicons.com/pricing)。
2. 点击 **Buy Moeicons Pro**。若未登录，先登录再确认购买。
3. 在支付服务商托管页完成付款。
4. 返回站点，等待账号激活后打开
   [moeicons.com/account](https://moeicons.com/account)。

### 使用 Pro 资源

在官网，有效 Pro 账号可解锁全部组的浏览、复制与下载。已发布的 npm 组件包只提供
Moe Outline 集，不含 Pro 组。

### 允许的用途

- **用于自有产品：** 许可允许在你自己拥有或控制的软件、应用、网站等材料中集成图标。
  确切条款以结账时展示的许可为准。
- **切勿公开凭据：** 不要把账号令牌或其他凭据写入前端源码或公开仓库。这是安全规则，
  不是对使用图标的限制。
- **禁止独立再分发：** 不得转售或再分发图标，或让他人将其作为独立文件抽取。确切条款
  见许可。

本页不构成法律条款。结账时展示的许可与[服务条款](https://moeicons.com/terms)是权威
文本。

## 账号状态

- 组的访问权跟随账号授权。若某组被锁定，说明账号未激活或不包含该组。
- 访问结束后，官网会重新锁定 Pro 组。可保留与使用的范围由许可文本定义，而非本页。
