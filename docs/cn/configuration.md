# 配置文件

CLI 读取单一项目配置文件。本页说明文件查找，以及
`@moewolf/moe-icons-cli@0.0.1` 校验的 schema。由于 CLI 流程当前不可用，见
[CLI 状态](/cn/cli#发布状态)。

## 文件名与查找

CLI 按顺序使用第一个存在的文件：

1. `moeicons.config.jsonc`
2. `moeicons.config.json`
3. `moeicons.config.ts`
4. `moeicons.config.js`

支持 JSON 与 JSONC（允许注释和尾随逗号）。TypeScript 和 JavaScript 配置会被拒绝，
并提示使用 `moeicons.config.jsonc`。`moeicons init` 写入
`moeicons.config.jsonc`。

## Schema 版本

| `schemaVersion` | 说明 |
| --- | --- |
| `1` | 旧版：要求 `framework`（`react`/`vue`），禁止 `target`。内存中迁移为 `target`。 |
| `2` | 要求 `target`，拒绝 `framework`。`init` 写入此版本。 |

schema 版本 3、`downloadMode`、`integration` 块**不属于 `0.0.1`**，仅存在于未发布
的工作中。

## 示例

```jsonc
{
  "schemaVersion": 2,
  "tier": "free",
  "target": "react",
  "outputDir": "src/moeicons",
  "defaultTheme": "outline",
  "icons": ["ui-search", "arrow-bold-right"],
  "themes": {
    "outline": { "styleGroup": "moe-outline" },
    "solid": { "styleGroup": "moe-solid" }
  }
}
```

`init` 写入更大的、按前缀分组的骨架；也接受扁平数组。

## 顶层字段

| 字段 | 类型 / 取值 | 默认 | 作用 |
| --- | --- | --- | --- |
| `schemaVersion` | `1` \| `2` | — | 校验/迁移模式。 |
| `tier` | `free` \| `pro` | — | 下载层级；须与 install 命令一致。 |
| `target` | `react` \| `vue` \| `vanilla` \| `assets` | `react` | 输出类型。 |
| `outputDir` | 相对 POSIX 路径 | `src/moeicons` | 生成文件位置。 |
| `defaultTheme` | `themes` 的键 | `outline` | 初始主题。 |
| `themes` | 对象 | — | 主题键 → 主题条目。 |
| `icons` | `string[]` 或 `{ prefix: string[] }` | — | 注册的图标 ID，install 前须非空。 |
| `missingIconPolicy` | `fallback` \| `error` | `fallback` | schema 接受；见下文说明。 |

### 主题条目字段

| 字段 | 类型 / 取值 | 说明 |
| --- | --- | --- |
| `styleGroup` | `moe-*` 字符串 | 必填，须存在于目录。 |
| `styles` | `string[]` | 旧字段，仅用于迁移。 |
| `format` | `svg` \| `webp` \| `png` | 仅位图样式组。 |
| `imageSize` | `64` \| `128` \| `256` \| `512` | 仅位图样式组。 |
| `defaultSize` | 数值 > 0 | 接受；对 SVG 代理生效性不保证。 |
| `strokeWidth` | 数值 >= 0 | 接受。 |
| `className` | 字符串 | 应用于该主题生成的图标。 |

`0.0.1` 的主题条目**不能**包含 `icons` 字段，否则报
`unknown field "icons" in theme "<name>"`。请使用顶层 `icons`。

## 图标注册与校验

- `icons` 注册允许的 ID。install 至少需要一个。
- 生成器要求**每个已注册图标都存在于每个已配置主题的样式组中**。若任一主题缺失，
  生成失败：`icon "<id>" is not available in style group "<group>" for theme "<theme>"`。
- `0.0.1` 没有每主题子集，也没有“请求主题 → 默认 → ASCII 回退”的选择；
  `missingIconPolicy` 虽被接受，但未实现该行为。

## Catalog 与免费样式组注意

`0.0.1` 内置 catalog `0.0.17`，其中 `moe-colored` 仍为 **Pro**。使用
`moe-colored` 的免费配置会报
`style group "moe-colored" is not available in free tier`。官网与当前免费发布合同
把 `moe-colored` 视为免费，但 CLI catalog 落后。在 CLI 更新前，免费配置请使用
`moe-outline`、`moe-lite-outline`、`moe-solid`。

## 修改配置之后

`0.0.1` 没有 `update` 命令。修改配置后重新运行 `install` 与 `generate`。

## 常见错误

| 消息（节选） | 原因 |
| --- | --- |
| `unknown field "icons" in theme ...` | 不支持每主题 `icons`。 |
| `style group "moe-colored" is not available in free tier` | `0.0.1` catalog 滞后。 |
| `icon "<id>" is not available in style group ...` | 图标在所配置主题中缺失。 |
| `unknown icon "<id>"` | ID 不在 catalog。 |
| 不支持/非法 `schemaVersion` | 不是 1 或 2。 |
