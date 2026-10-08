# CLI commands

`@moewolf/moe-icons-cli@0.0.6` provides the `moeicons` command and requires
Node.js 22 or later. The CLI installs verified icon resources and generates
local components. These components are imported from your project, separately
from the direct `moe-icons` npm package.

## Release status

This release uses icon resources `0.0.19`. Free installation needs no account;
Pro installation requires login and an active entitlement.

| Integration | Verified scope |
| --- | --- |
| Vite React / Vue | Generated components, production build and browser rendering |
| Next App Router / Nuxt SSR | Generated components, single/multiple themes, server rendering and browser hydration |
| Windows x64 | Node 22/24, npm/pnpm, Free React/Vue core commands, production build and interrupted-write recovery |

Windows Pro flows and interactive terminal/PTY behavior, Next Pages Router and custom Nuxt
modules are outside this verification. Direct `moe-icons@0.0.17` component
examples retain their own support status; see [Next.js](/frameworks/next) and
[Nuxt](/frameworks/nuxt).

## First installation

Run these commands in an existing React or Vue project:

```sh
npm install -D @moewolf/moe-icons-cli
npx moeicons init
```

For Vue, use `npx moeicons init --target vue`. Review the generated
`moeicons.config.jsonc`; it uses schema version 3. Choose your icon IDs and
themes before installing. A minimal React selection is:

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

The final `init` reconciles project integration after generation. Review entry
changes and any dependency instructions before building. Import generated
components and the provider from your configured output directory. Adding
icons or changing themes, format or image size requires another `install` or
`update` before `generate`.

## Download modes

| `downloadMode` | Behavior |
| --- | --- |
| `auto` | Selected resources when advertised; a legacy release without that capability uses its full archive. |
| `icons` | Selected resources required; unsupported releases or invalid/missing resources fail. |
| `full` | Download and verify the complete archive. |

Authorization failures, invalid ranges, digest mismatches and download errors
never trigger an automatic full download after selected resources have been
advertised. Warm caches reduce resource traffic; Pro installation still checks
current entitlement. Generation works offline from verified installed files.

## Commands

| Command | Purpose |
| --- | --- |
| `install free` / `install pro` | Install resources for the configured tier and target. |
| `generate` | Generate local components from the installed selection. |
| `init` / `init --dry-run` | Create config and reconcile project integration, or review a plan. |
| `doctor --check` | Diagnose project anchors without writes; fail if required anchors are unhealthy. |
| `recover` | Restore an interrupted transaction before retrying the original command. |
| `update` | Update installed resources and reconcile the current selection. |
| `update metadata` | Update metadata for the installed code version. |
| `login` / `logout` / `account` | Manage login and inspect the account. |
| `mcp` | Start the project MCP stdio server. |
| `--version` / `--help` | Show version or command help. |

`groups` remains unimplemented. Without arguments the command opens its
interactive flow; a non-TTY invocation refuses instead of silently writing.
Use `--json` for structured results and `--yes` for explicit non-interactive
confirmation. A target override must agree with your config.

## Pro and recovery

Run `moeicons login`, select `tier: "pro"` in your config, then install Pro.
Never commit credentials or place them in browser source or MCP configuration.
Consult the official license for redistribution terms.

After a process interruption, run `moeicons recover` at the project root.
Recovery preserves conflicting user edits and retains backups for review; do
not delete journals or backups to bypass a conflict. This covers interrupted
processes, not power loss or a hostile filesystem.
