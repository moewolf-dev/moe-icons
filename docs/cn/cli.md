# CLI 命令

`moeicons` 以 `@moewolf/moe-icons-cli@0.0.1` 发布，要求 Node.js 22+。本页说明
`0.0.1` 的确切行为及当前发布状态。

## 发布状态

**当前 CLI 流程无法与已发布包配合使用。**

1. `moeicons install free` 拉取 `v0.0.17` GitHub 发布。它首先请求
   `release-descriptor.json.sha256`，而该发布未包含此资源，下载以 `NOT_FOUND`
   （HTTP 404）失败。
2. 当发行版可用时，生成的 React/Vue 代理会从 `moe-icons/free/react/<group>`、
   `moe-icons/free/vue/<group>` 及 Pro 对应路径导入。已发布
   `moe-icons@0.0.17` 只导出 `.`、`./react`、`./vue`，这些导入无法解析。

在兼容版本与包发布前，请使用 [`moe-icons` 组件包](/cn/installation)或
[下载资源](/cn/website-search)。下文命令参考仅用于记录命令面，不是生产推荐。

## 命令总览

```text
moeicons                      交互式引导流程（free / pro / login）
moeicons install [group]      安装图标组（free | pro）
moeicons login                浏览器登录（PKCE）
moeicons logout               清除本地会话
moeicons account              显示账号/层级信息
moeicons groups               列出可用图标组
moeicons generate             生成 React/Vue 代理组件
moeicons init                 创建 moeicons.config.jsonc
moeicons mcp                  启动 MCP stdio 服务
moeicons --version            显示版本
moeicons --help               显示帮助
```

`groups` 可被接受但未实现，以 `NOT_IMPLEMENTED` 退出 `1`。`doctor`、`recover`、
`update` **不属于** `0.0.1`。

## 全局选项

| 选项 | 作用 |
| --- | --- |
| `--json` | 机器可读 JSON 输出。 |
| `--yes` | 非交互模式下自动确认。 |
| `--target <t>` | 输出目标：`react`、`vue`、`vanilla`、`assets`。 |
| `--no-tailwind` | 跳过 Tailwind 配置自动接入。 |
| `--pro` / `--ent` | 映射到 `install` 的旧别名。 |
| `--help` / `-h`、`--version` / `-v` | 帮助或版本。 |

不带参数启动交互式向导；非 TTY 会拒绝（`NOT_TTY`）且不写入。

## install

```sh
moeicons install free
moeicons install pro
moeicons install free --target vue
```

需要检测到项目且可读取配置。`free` 不需要账号；`pro` 需要有效授权。不接受单个
样式组名。当前阻塞见[发布状态](#发布状态)。

## init

```sh
moeicons init
```

写入 schema 版本 2 的 `moeicons.config.jsonc`，不修改应用入口。JSON 模式返回
`{ "ok": true, "created": "<path>" }`。

## generate

```sh
moeicons generate
moeicons generate --target assets
moeicons generate --no-tailwind
```

读取已安装产物并写入 `outputDir`。需要先完成 `install`。Tailwind 4 退出码为
`TAILWIND_VERSION_UNSUPPORTED`。生成的 React/Vue 代码导入未发布的
`moe-icons/<tier>/...` 子路径（见[发布状态](#发布状态)）。

## login / logout / account

- `login` 打开浏览器并把会话存入操作系统钥匙串（或明确允许的 `0600` 文件回退）。
  令牌永不打印。
- `account` 打印本地账号，在线时附带层级/授权。
- `logout` 尽可能远程撤销会话并清除本地状态。

## mcp

启动 MCP stdio JSON-RPC 服务。此版本 `install_icon_group` 失败关闭；仅作发现用途。

## 退出码

| 码 | 含义 |
| --- | --- |
| `0` | 成功、帮助、版本或取消 |
| `1` | 校验错误、`NOT_TTY`、未实现、不支持的 Tailwind |
| `2` | 认证错误（`AUTH_ERROR`）或禁止（`FORBIDDEN`） |
| `3` | 网络错误 |
| `4` | 未找到 |
| `5` | 未预期错误 |

JSON 失败为 `{ "ok": false, "code": "...", "message": "..." }`。
