# CLI 命令

`@moewolf/moe-icons-cli@0.0.3` 提供 `moeicons` 命令，要求 Node.js 22 或更新版本。
CLI 下载并验证图标资源，在项目内生成本地组件。这些组件从项目目录导入，与直接使用
`moe-icons` npm 组件包的方式分别说明。

## 发布状态

本版本使用 `0.0.18` 图标资源。Free 安装不需要账号；Pro 安装需要登录及有效授权。

| 集成 | 已验证范围 |
| --- | --- |
| Vite React / Vue | 本地生成组件、生产构建与浏览器渲染 |
| Next App Router / Nuxt SSR | 本地生成组件、单/多主题、服务端渲染与浏览器水合 |
| Windows x64 | Node 22/24、npm/pnpm、Free React/Vue 核心命令、生产构建与写入中断恢复 |

Windows Pro 流程与交互终端/PTY、Next Pages Router、自定义 Nuxt 模块不属于上述验证范围。
直接使用 `moe-icons@0.0.17` 的示例仍按各自支持状态说明，见
[Next.js](/cn/frameworks/next)与 [Nuxt](/cn/frameworks/nuxt)。

## 首次安装

在已有 React 或 Vue 项目中运行：

```sh
npm install -D @moewolf/moe-icons-cli@0.0.3
npx moeicons init
```

Vue 使用 `npx moeicons init --target vue`。检查生成的 `moeicons.config.jsonc`
（schema 版本 3），安装前先选择图标 ID 和主题。最小 React 配置示例：

```json
{
  "schemaVersion": 3,
  "tier": "free",
  "target": "react",
  "outputDir": "src/moeicons",
  "downloadMode": "icons",
  "icons": ["ui-search"],
  "defaultTheme": "outline",
  "themes": {
    "outline": { "styleGroup": "moe-outline" },
    "solid": { "styleGroup": "moe-solid" }
  },
  "missingIconPolicy": "fallback"
}
```

```sh
npx moeicons install free
npx moeicons generate
npx moeicons init --yes
npx moeicons doctor --check
```

最后一次 `init` 在生成后协调项目集成。构建前检查入口变更及 CLI 提示的依赖安装要求。
从配置的输出目录导入生成组件及 Provider。增加图标或修改主题、格式、尺寸后，先重新
`install` 或 `update`，再执行 `generate`。

## 下载模式

| `downloadMode` | 行为 |
| --- | --- |
| `auto` | 发布支持逐图标资源时按选择下载；旧版未声明能力时使用整包。 |
| `icons` | 必须提供逐图标资源；不支持、资源缺失或内容非法时失败。 |
| `full` | 下载并验证完整压缩包。 |

发布已声明逐图标能力后，授权失败、非法 Range、摘要不符或下载错误都不会自动改为
整包下载。暖缓存减少资源传输量，但 Pro 安装仍校验当前授权。已经验证并安装到项目中的
资源可以离线生成代码。

## 命令

| 命令 | 用途 |
| --- | --- |
| `install free` / `install pro` | 按配置的层级与目标安装资源。 |
| `generate` | 根据已安装的选择生成本地组件。 |
| `init` / `init --dry-run` | 创建配置、协调项目集成，或只查看计划。 |
| `doctor --check` | 只读诊断项目锚点；必需锚点异常时返回失败。 |
| `recover` | 恢复中断的事务，然后重试原命令。 |
| `update` | 更新已安装资源并协调当前选择。 |
| `update metadata` | 更新已安装代码版本对应的元数据。 |
| `login` / `logout` / `account` | 管理登录并查看账号。 |
| `mcp` | 启动项目 MCP stdio 服务。 |
| `--version` / `--help` | 显示版本或命令帮助。 |

`groups` 仍未实现。不带参数会打开交互流程；非 TTY 调用会拒绝，不会静默写入。
使用 `--json` 获取结构化结果，使用 `--yes` 明确确认非交互操作。目标覆盖参数必须与
配置一致。

## Pro 与恢复

运行 `moeicons login`，在配置中选择 `tier: "pro"` 后安装 Pro。不要提交凭据，
也不要把凭据放进浏览器源码或 MCP 配置。资源再分发条款以官方许可证为准。

进程中断后，在项目根目录运行 `moeicons recover`。恢复遇到用户修改冲突时会保留修改与
备份供检查，不要删除 journal 或备份来绕过冲突。恢复范围是进程中断，不包含断电或
恶意文件系统。
