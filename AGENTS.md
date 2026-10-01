# Agent and contributor guidance (public docs repo)

This repository is the single public source for the Moe Icons Free docs under
`docs/`. `docs/` is mirrored to the private website repository and published to
<https://moeicons.com/docs/>.

## Public content rules (mandatory)

Everything committed under `docs/` becomes public. Do not add:

- Internal repository, audit, TODO or evidence file names, or coordination
  workspace paths.
- Credentials, tokens, API keys, private keys, signed URLs, private bucket
  names/URLs, or anything that bypasses entitlement checks.
- Internal operations detail a reader does not need (payment-processor
  internals, webhook/polling mechanics, feature-flag names, revocation/storage
  internals).
- Unverified support claims. Mark Next.js/Nuxt and other targets as
  "unverified / manual example" until a real production build/render passes.

Document only behavior verified against the **published** packages, not the
working tree. Keep security rules ("never publish credentials") separate from
license rules; defer exact terms to the official license text.

`scripts/docs-check.mjs` enforces the machine-checkable parts of this policy
(forbidden content patterns and secret patterns) for every published Markdown
file. When you find a new class of leak, add a pattern there and to the private
`../docs/PUBLIC-CONTENT-POLICY.md`.

## Commands

```bash
npm install
npm run docs:check   # forbidden content, secrets, frontmatter, links, locales
npm run docs:build   # VitePress build (must exit 0)
npm test             # distribution / release-policy / projection tests
```

## Publishing flow

`docs/` PR → `docs-check` → review → merge to `main` → `sync-docs.yml` mirrors
to the website and opens a website PR → website review/merge → `deploy-pages`
builds, deploys and smoke-tests → verify <https://moeicons.com/docs/>.

Do not hand-edit `moe-icons-website/docs/src/**` for Free content; edit here and
let sync update it. Roll back by reverting this source and re-running the chain.
