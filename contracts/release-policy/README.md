# Release Policy Contracts

Single source of truth for cross-repo release entitlements (`RELEASE-BITMAP-0909`, D-10).

- `free-style-groups.v1.json` — the exact Free style-group set. This file is the
  only authoritative definition. Changes require CODEOWNERS/required review.

The source-manifest v2 JSON Schema is a separate media-format contract; it is
not vendored or versioned as part of this release-policy directory.

Every consumer repository vendors a read-only copy under
`vendor/moe-icons-release-policy/`:

```text
vendor/moe-icons-release-policy/free-style-groups.v1.json
vendor/moe-icons-release-policy/PIN.json
```

`PIN.json` records `sourceRepo`, a full 40-hex `sourceCommit`, `sourcePath`,
the file `sha256` and `schemaVersion`. CI and production builds verify the
vendored bytes, the SHA-256 and the source commit. There is no git submodule and
no npm contract package; a sync workflow opens PRs against each consumer.
