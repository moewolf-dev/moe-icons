# Moe Icons

Moeicons is a standard SVG static and dynamic icon library that can be used in various scenarios.

It includes several features:

- Static icons and dynamic icons are associated with standardized naming and usage, making it easy to get started.
- Precise control of various states of dynamic icons through JS, applied to various interactive states.
- All files are native SVG, controlled directly through JS without using any third-party dynamic JS libraries, keeping it clean and compatible.
- A standard version and a personalized style icon library coexist, allowing for convenient and quick customization of themes.
- A wide variety covering popular programming language UI frameworks.
- Template-based; whether for React or Vue, it can be directly added to projects for easy invocation.
- Specifically designed for the tech community and research field, covering the technology sector comprehensively.

## Repository structure

Official source icons are stored under `icons/<style>/`, one directory per style group:

- `icons/MoeLite/svgs/` — the standard icon set (SVG sources).
- `icons/Moe/` — the standard style group (populated as sources are added).
- `icons/MoeAnimate/` — the animated style group (populated as sources are added).

Public documentation lives in [`docs/`](./docs/README.md).

## Documentation

**Free docs changes must be submitted here**, in the [`docs/`](./docs/README.md)
directory. This repository is the single source of truth for public (Free)
documentation; it is mirrored to the private website repository and published
to <https://moeicons.com/docs/> after human review.

- Default language: English (in `docs/`).
- Chinese translation: `docs/cn/`.
- The `docs/pro/` directory must never exist in this public repository.

Local checks before opening a pull request:

```bash
npm install
npm run docs:check
npm run docs:build
```

See [`docs/README.md`](./docs/README.md) for the full contribution rules.

### Documentation sync

Changes merged to `main` under `docs/**` are automatically mirrored to the
private website repository via the `Sync public docs to private website`
workflow. The sync:

- pushes to the private `docs-sync/public-main` branch (never `main`);
- is driven by the `PRIVATE_WEBSITE_DEPLOY_KEY` Actions secret (Deploy Key);
- triggers a review PR titled `docs: sync public documentation` on the private
  repository;
- can be re-run manually from the Actions tab via `workflow_dispatch`.

The sync script can be verified locally without touching any remote:

```bash
bash scripts/test-sync-docs.sh   # unit tests in a temp directory
bash scripts/test-sync-e2e.sh    # end-to-end sandbox using the real skeletons
```
