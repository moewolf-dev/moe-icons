# 免费与付费

Moe Icons 提供无需账号的免费层级，以及通过一次性授权解锁其余样式组的 Pro 层级。
本页概述差异及 Pro 激活方式。

## 对比

| | 免费 | 付费 |
| --- | --- | --- |
| 样式组 | `moe-outline`、`moe-lite-outline`、`moe-solid`、`moe-colored` | 全部样式组：额外包含 `moe-3d-metal`、`moe-duotone`、`moe-pixel-lite-outline`、`moe-pixel-outline`、`moe-pixel-solid`、`moe-sticker` |
| 图标数量 | 每组 554 个 | 每组 554 个 |
| 格式 | SVG | SVG 加位图 PNG/WebP（3D 金属，128/256/512） |
| 目标 | React、Vue、Vanilla、原始资源 | React、Vue、原始资源（位图不支持 Vanilla） |
| CLI | `moeicons install free` | 登录后 `moeicons install pro` |
| 官网搜索 | 浏览并下载免费组 | 浏览并下载全部组 |
| 更新 | 免费线 | 终身访问 Pro 图标库，包含未来新增 |
| 支持 | 社区 | 以价格页所列方案为准 |
| 价格 | 免费 | 一次性付费 |

官网[价格页](https://moeicons.com/pricing)是当前价格与许可文本的事实源。撰写时
（2026-10-01）Pro 为一次性购买，显示为 **39 美元**，含终身访问，不是订阅。请始终
以线上价格页为准。

## 免费访问

- 无需账号或登录。
- `npx moeicons install free` 下载并校验免费发行版。
- 官网从公开资源主机匿名提供免费 SVG 预览。

## Pro 访问

### 购买与激活

1. 打开 [moeicons.com/pricing](https://moeicons.com/pricing)。
2. 点击 **Buy Moeicons Pro**。若未登录，会先进入登录流程，再确认购买。
3. 在支付服务商托管页完成付款。
4. `payment-success` 页面会在最多 30 秒内轮询授权并确认激活。授权由服务端
   webhook 授予，而非浏览器。

### 使用 Pro 资源

已发布组件包（`moe-icons@0.0.17`）只包含默认样式集，因此不提供 Pro 组。在官网，有效
Pro 账号可解锁全部组的浏览、复制与下载。见[官网搜索](/cn/website-search)。

CLI 提供 `login` / `install pro`，但其 `0.0.1` 版本无法与已发布包配合使用。见
[CLI 发布状态](/cn/cli#发布状态)。

### 查看授权

```sh
npx moeicons account
```

或打开 [moeicons.com/account](https://moeicons.com/account)（仅对有效 Pro 账号
开放）。

## 许可与安全

- Pro 许可面向图标资源；购买时需接受结账页展示的条款。
- 切勿把 Pro 凭据或令牌嵌入前端源码。CLI 把会话存放在操作系统钥匙串，并让令牌
  远离项目文件。
- Pro 资源经授权校验端点交付。在官网预览 Pro 图标并不因此获得下载权。

## 降级与过期

当授权不再有效时：

- 官网关闭详情视图、中止进行中的 Pro 请求、撤销已下载的 blob，并重新锁定 Pro 组。
- CLI 阻止新的 Pro 安装与更新，但保留磁盘上的缓存归档。重新认证
  `moeicons login` 即可恢复访问。

项目中已生成的文件不会自动删除；若许可结束请自行移除。
