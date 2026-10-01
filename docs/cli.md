# CLI commands

The `moeicons` binary is published as `@moewolf/moe-icons-cli@0.0.1` and
requires Node.js 22+. This page describes exactly what `0.0.1` implements, and
its current release status.

## Release status

**The CLI workflow is not consumable with the published packages today.**

1. `moeicons install free` fetches the `v0.0.17` GitHub release. It first
   requests `release-descriptor.json.sha256`, which that release does not
   publish, so the download fails with `NOT_FOUND` (HTTP 404).
2. When a release is available, generated React/Vue proxies import
   `moe-icons/free/react/<group>`, `moe-icons/free/vue/<group>` and the Pro
   equivalents. The published `moe-icons@0.0.17` package exports only `.`,
   `./react` and `./vue`, so those imports cannot resolve.

Until a compatible release and package are published, use the
[`moe-icons` component package](/installation) or
[downloaded assets](/website-search). The command reference below is provided so
the surface is documented, not as a recommendation to use it in production.

## Command overview

```text
moeicons                      interactive guided flow (free / pro / login)
moeicons install [group]      install an icon group (free | pro)
moeicons login                browser login (PKCE)
moeicons logout               clear local session
moeicons account              show account/tier info
moeicons groups               list available icon groups
moeicons generate             generate React/Vue proxy components
moeicons init                 create moeicons.config.jsonc
moeicons mcp                  start the MCP stdio server
moeicons --version            show version
moeicons --help               show help
```

`groups` is accepted but not implemented; it exits `1` with `NOT_IMPLEMENTED`.
`doctor`, `recover` and `update` are **not** part of `0.0.1`.

## Global options

| Option | Effect |
| --- | --- |
| `--json` | Machine-readable JSON output. |
| `--yes` | Accept confirmations in non-interactive mode. |
| `--target <t>` | Output target: `react`, `vue`, `vanilla`, `assets`. |
| `--no-tailwind` | Skip Tailwind config auto-integration. |
| `--pro` / `--ent` | Legacy aliases that map to `install`. |
| `--help` / `-h`, `--version` / `-v` | Help or version. |

Without arguments the CLI starts the interactive wizard; a non-TTY stream
refuses (`NOT_TTY`) and writes nothing.

## install

```sh
moeicons install free
moeicons install pro
moeicons install free --target vue
```

Requires a detected project and a readable config. `free` needs no account;
`pro` needs an active entitlement. A single style-group name is rejected. It
downloads the release for the tier and target. See
[release status](#release-status) for the current blocker.

## init

```sh
moeicons init
```

Writes `moeicons.config.jsonc` (schema version 2) and does not modify your
application entry. JSON mode returns `{ "ok": true, "created": "<path>" }`.

## generate

```sh
moeicons generate
moeicons generate --target assets
moeicons generate --no-tailwind
```

Reads the installed artifact and writes files to `outputDir`. Requires a
completed `install`. Tailwind 4 exits with `TAILWIND_VERSION_UNSUPPORTED`.
Generated React/Vue code imports unpublished `moe-icons/<tier>/...` subpaths
(see [release status](#release-status)).

## login / logout / account

- `login` opens the browser and stores a session in the OS keychain (or an
  explicit `0600` file fallback). Tokens are never printed.
- `account` prints the local account and, when online, the tier/entitlement.
- `logout` revokes the session remotely when possible and clears local state.

## mcp

Starts an MCP stdio JSON-RPC server. `install_icon_group` fails closed in this
release; treat MCP as discovery-only.

## Exit codes

| Code | Meaning |
| --- | --- |
| `0` | Success, help, version, or cancellation |
| `1` | Validation error, `NOT_TTY`, not implemented, unsupported Tailwind |
| `2` | Authentication (`AUTH_ERROR`) or forbidden (`FORBIDDEN`) |
| `3` | Network error |
| `4` | Not found |
| `5` | Unexpected error |

JSON failures are `{ "ok": false, "code": "...", "message": "..." }`.
