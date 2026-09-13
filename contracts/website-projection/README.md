# Website icon projection contract (`WEBSITE-ICON-PROJECTION-V1`)

Published mirror of the canonical contract authored in the root workspace
`docs/contracts/` (`DEV-A01`, task `BITMAP-WEBSITE-0912`). It is the only
consumer-readable copy; the four consumer repos vendor it under
`vendor/moe-icons-website-projection/` with a `PIN.json`.

## Contents

| File | Purpose |
|---|---|
| `website-icon-projection-v1.md` | Frozen prose contract: ownership, R2 keys, catalogs, receipt, API, caching/CORS, compatibility |
| `website-catalog-v1.schema.json` | Per-tier, activation-neutral catalog |
| `website-release-v1.schema.json` | `<version>/release.json` object manifest |
| `website-activation-receipt-v1.schema.json` | Website activation receipt |
| `website-api-v1.schema.json` | Strict API success/error bodies |

## Distribution

`scripts/sync-website-projection.mjs` copies this directory into each consumer
repo's `vendor/moe-icons-website-projection/` and writes `PIN.json`
(`sourceRepo`, full `sourceCommit`, `sourcePath`, per-file `sha256`). It creates
PRs only; `--check` fails on drift and is used by CI/offline checks. The source
commit must be a full 40-hex commit; branch/tag refs are rejected.

This tree is a mirror. To change the contract, edit the canonical root
`docs/contracts/` files and update this mirror in the same review, then run the
sync.
