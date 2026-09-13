# Moe Icons public documentation

This directory is the single source of truth for the public (Free) Moe Icons
documentation. Free docs changes must be submitted here. Changes are mirrored
to the private website repository and published to
<https://moeicons.com/docs/> after human review.

> This `README.md` is a repository-only contribution guide. It is not synced to
> the website, so it will not appear as a published page.

## Directory layout

- `docs/` (this directory) — English documentation, the default language.
- `docs/cn/` — Chinese documentation (`lang: zh-CN` compatibility alias; do
  not create a second `docs/zh-cn/` tree).
- `docs/locales.json` — the declarative locale registry (DEV-E02). Add a new
  language by adding its directory **and** one registry entry; the private
  website VitePress config reads and validates this file, so no second manual
  registration is required.
- Other language directories follow the same convention (lowercase,
  hyphenated slugs; canonical BCP-47 `lang`).

## Rules for contributors

- Write public documentation in English by default; keep translations under
  their own language directory (for example `docs/cn/`).
- Never add `docs/pro/`. The `pro/` directory is reserved for the private
  website and must not exist in this public repository.
- Do not commit `.DS_Store`, VitePress caches, environment files, or any file
  that looks like a secret.
- Keep in-page links in VitePress route form (for example `/markdown-examples`,
  `/cn/markdown-examples`), not private repository paths.
- Only the documentation source lives here. VitePress theme, navigation, and
  build configuration are owned by the private website repository.

## Local checks

Before opening a pull request, run:

```bash
npm install
npm run docs:check
npm run docs:build
```

Both commands must exit with status `0`.

## Navigation and locales

Language content and the `docs/locales.json` registry are synchronized to the
private website repository together and surface as a pull request. The private
VitePress config only reads, schema-validates and renders the registry — it
never executes sync code and does not maintain a second locale list. A new
language becomes available once the sync PR is reviewed, merged, and the docs
build passes.
