# Moe Icons public documentation

This directory is the single source of truth for the public (Free) Moe Icons
documentation. Free docs changes must be submitted here. Changes are mirrored
to the private website repository and published to
<https://moeicons.com/docs/> after human review.

> This `README.md` is a repository-only contribution guide. It is not synced to
> the website, so it will not appear as a published page.

## Directory layout

- `docs/` (this directory) — English documentation, the default language.
- `docs/cn/` — Chinese documentation.
- Other language directories may be added later and follow the same convention.

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

## Navigation

New pages do not appear in the website navigation automatically. Submit the
content change here, then update the sidebar/navigation separately in the
private website repository.
