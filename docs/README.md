# Moe Icons public documentation

This directory is the single source of truth for the public (Free) Moe Icons
developer documentation. Free docs changes must be submitted here. Changes are
mirrored to the private website repository and published to
<https://moeicons.com/docs/> after human review.

> This `README.md` is a repository-only contribution guide. It is not synced to
> the website, so it will not appear as a published page.

## Directory layout

- `docs/` (this directory) — English documentation, the default language.
- `docs/cn/` — Chinese documentation (`lang: zh-CN` compatibility alias; do
  not create a second `docs/zh-cn/` tree).
- `docs/frameworks/` and `docs/cn/frameworks/` — per-framework pages. These are
  content subdirectories, not locales.
- `docs/locales.json` — the declarative locale registry. It carries each
  locale's `nav` and `sidebar`, which the private website VitePress config
  reads and renders. Add a language by adding its directory and one registry
  entry.
- Other language directories follow the same convention (lowercase,
  hyphenated slugs; canonical BCP-47 `lang`).

## Page map

| Page | Purpose |
| --- | --- |
| `index.md`, `cn/index.md` | Home / entry point |
| `getting-started.md` | Quick start (C01) |
| `introduction.md` | Library overview (C02) |
| `installation.md` | Install CLI / package / assets (C03) |
| `usage.md` | Rendering, props, themes (C04) |
| `cli.md` | CLI commands and exit codes (C05) |
| `configuration.md` | Config schema and fields (C06) |
| `frameworks/*.md` | React, Vue, Next, Nuxt, Vanilla (C07) |
| `website-search.md` | Website search flow (C08) |
| `free-vs-pro.md` | Free/Pro comparison (C09) |
| `faq.md` | Q&A and troubleshooting (C10) |
| `markdown-examples.md`, `api-examples.md` | Redirect stubs for old links |

## Rules for contributors

- Write public documentation in English by default; keep translations under
  their own language directory (for example `docs/cn/`).
- Never add `docs/pro/`. The `pro/` directory is reserved for the private
  website and must not exist in this public repository.
- Do not commit `.DS_Store`, VitePress caches, environment files, or any file
  that looks like a secret.
- Keep in-page links in VitePress route form. English pages link to `/page`;
  Chinese pages link to `/cn/page`. Do not use private repository paths.
- Only the documentation source lives here. VitePress theme, navigation, and
  build configuration are owned by the private website repository. Navigation
  is declared in `docs/locales.json`, not in the website config.
- Document released capabilities only, verified against the npm archives, not
  the working tree. The verified path is `moe-icons@0.0.17`
  (`moe-icons/react`, `moe-icons/vue`) plus website asset downloads. The CLI
  `@moewolf/moe-icons-cli@0.0.1` is **experimental**: `install free` currently
  404s (missing `release-descriptor.json.sha256`) and it generated proxies that
  import unpublished `moe-icons/free|pro/...` subpaths — keep that limitation
  stated. Next.js and Nuxt are manual/uncertified; Windows is not certified.
- Keep the coordination-workspace audit record
  (`AUDIT-2026-10-01-DOCS-AUTHORING-PUBLISHING.md`) in sync. Do not reintroduce
  removed claims such as a `size` prop, Provider `defaultTheme`/`onThemeChange`,
  `downloadMode`, theme-level `icons`, or a Vanilla `runtime.ts`.

## Local checks

Before opening a pull request, run:

```bash
npm install
npm run docs:check
npm run docs:build
```

Both commands must exit with status `0`. `docs:check` verifies frontmatter,
relative links, forbidden files and the locale registry.

## Review, sync and deploy

The publishing chain is:

```text
docs PR → docs-check → review → merge to public main
→ sync-docs copies docs/ into the website docs/src/ and opens a website PR
→ review → merge to website main
→ deploy-pages builds, deploys and smoke-tests
→ https://moeicons.com/docs/
```

The website sync PR is a required step before a docs change is live. Never edit
`docs/src/**` in the website directly for Free content; edit the public source
and let sync update it. Roll back a published page by reverting the public
source and re-running the pipeline, not by hand-editing the mirror.

## Navigation and locales

Language content and the `docs/locales.json` registry are synchronized to the
private website repository together and surface as a pull request. The private
VitePress config reads, schema-validates and renders the registry — it never
executes sync code and does not maintain a second locale list. A new language
becomes available once the sync PR is reviewed, merged, and the docs build
passes.

When you add a page, add it to the `sidebar` (and `nav` if top-level) of every
locale in `docs/locales.json` so no language is missing an entry.

## Maintenance triggers

Update the documentation in the same change whenever any of the following
changes:

- **CLI command, option or exit code** → `cli.md` and `cn/cli.md`.
- **Config schema or defaults** → `configuration.md` and `cn/configuration.md`.
- **Component API / props** → `usage.md`, `frameworks/*.md` and translations.
- **Free/Pro entitlements or style groups** → `free-vs-pro.md` and
  `introduction.md`.
- **Price or license wording** → `free-vs-pro.md` only if it still matches the
  pricing page; otherwise link to the page and update the verification date.
- **Website search flow** → `website-search.md` and its translation.

## Remaining limitations (do not overstate)

- Next.js and Nuxt are manual integrations, not certified.
- Windows is not certified for the first CLI release candidate.
- The published `moe-icons` package exposes `moe-icons/react` and
  `moe-icons/vue` only; the `free`/`pro`/`assets` style-group subpaths are not
  published.
- Bitmap style groups are unavailable for the `vanilla` target.
- The website search page has no dedicated "copy ID" control.
