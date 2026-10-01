#!/usr/bin/env node
// Public documentation quality gate.
// Checks every Markdown file under docs/ for common problems. Exits non-zero
// on the first batch of failures.
import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { join, resolve, dirname, relative } from 'node:path'
import matter from 'gray-matter'

const ROOT = process.cwd()
const DOCS = join(ROOT, 'docs')
const errors = []

function walk(dir) {
  let out = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name)
    if (entry.isDirectory()) out = out.concat(walk(p))
    else out.push(p)
  }
  return out
}

function rel(p) {
  return relative(DOCS, p).split('\\').join('/')
}

// 1. docs/pro/ must never exist in the public repository.
if (existsSync(join(DOCS, 'pro'))) {
  errors.push('docs/pro/ must not exist in the public repository')
}

const files = walk(DOCS)

// 2. Forbidden files inside the docs tree.
// `.vitepress/config.ts` is allowed (minimal build config) but VitePress cache
// and build output must never be committed. `.DS_Store` and secret-like files
// are always forbidden.
const cacheOrBuild = /(^|\/)\.vitepress\/(cache|dist)\//
const secretName = /(id_rsa|id_ed25519|\.pem$|\.key$|secret|credential|\.env)/i
for (const f of files) {
  const r = rel(f)
  const base = r.split('/').pop()
  if (base === '.DS_Store') {
    errors.push(`forbidden file in docs tree: ${r}`)
  }
  if (cacheOrBuild.test(r)) {
    errors.push(`forbidden VitePress cache/build output in docs tree: ${r}`)
  }
  if (secretName.test(r)) {
    errors.push(`secret-like file in docs tree: ${r}`)
  }
}

const mdFiles = files.filter((f) => f.endsWith('.md'))

// 3. Public-content policy (see the "Public content rules" section in
// docs/README.md). The public documentation must never expose internal
// sources, audit/planning files, credentials, or operations detail a reader
// does not need. When a new class of leak is found, add it here so it cannot
// reappear. `docs/README.md` is repository-only (excluded from sync and not
// published), so only published Markdown is checked against the content list.
const FORBIDDEN_CONTENT = [
  { re: /moe-?icons-library/i, why: 'private icon source repository name' },
  { re: /\bwebhook\b/i, why: 'payment/operations implementation detail' },
  { re: /\bfeature[ -]?flag/i, why: 'internal feature flag' },
  { re: /\bpresign/i, why: 'private delivery detail' },
  { re: /\bR2\b/, why: 'storage infrastructure detail' },
  { re: /\bbucket\b/i, why: 'storage infrastructure detail' },
  { re: /user[_-]?data|website-delivery/i, why: 'private storage/bucket name' },
  { re: /AUDIT-\d{4}-\d{2}-\d{2}/i, why: 'internal audit file name' },
  { re: /TODO-\d{4}-\d{2}-\d{2}/i, why: 'internal planning file name' },
  { re: /evidence\/docs-/i, why: 'internal evidence path' },
  { re: /coordination workspace/i, why: 'private coordination workspace' },
]
const SECRET_CONTENT = [
  { re: /-----BEGIN [A-Z ]*PRIVATE KEY-----/, why: 'private key material' },
  { re: /AKIA[0-9A-Z]{16}/, why: 'AWS access key id' },
  { re: /gh[pousr]_[A-Za-z0-9]{20,}/, why: 'GitHub token' },
  { re: /sk_live_[A-Za-z0-9]{10,}/, why: 'Stripe live secret' },
  { re: /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/, why: 'JWT' },
]
for (const f of mdFiles) {
  const r = rel(f)
  const raw = readFileSync(f, 'utf8')
  for (const { re, why } of SECRET_CONTENT) {
    if (re.test(raw)) errors.push(`${r}: possible secret (${why})`)
  }
  if (r === 'README.md') continue // repository-only, not published
  for (const { re, why } of FORBIDDEN_CONTENT) {
    if (re.test(raw)) errors.push(`${r}: forbidden public content (${why})`)
  }
}

// 4. Markdown checks: non-empty, parseable frontmatter, resolvable local links.
for (const f of mdFiles) {
  const r = rel(f)
  const raw = readFileSync(f, 'utf8')

  if (raw.trim().length === 0) {
    errors.push(`${r}: markdown file is empty`)
    continue
  }

  let body = raw
  if (raw.startsWith('---')) {
    try {
      body = matter(raw).content
    } catch (e) {
      errors.push(`${r}: frontmatter parse error: ${e.message}`)
      continue
    }
  }

  const linkRe = /!?\[[^\]]*\]\(([^)\s]+)\)/g
  let m
  while ((m = linkRe.exec(body)) !== null) {
    const target = m[1].trim()
    if (
      target.startsWith('http://') ||
      target.startsWith('https://') ||
      target.startsWith('#') ||
      target.startsWith('/')
    ) {
      continue
    }
    const clean = target.split('#')[0]
    if (!clean) continue
    const resolved = resolve(dirname(f), clean)
    if (!existsSync(resolved)) {
      errors.push(`${r}: broken relative link "${target}"`)
    }
  }
}

// 4. Locale registry (DEV-E02/DEC-46): declarative, canonical and bidirectional.
const LOCALES = join(DOCS, 'locales.json')
if (!existsSync(LOCALES)) {
  errors.push('docs/locales.json is required')
} else {
  try {
    const registry = JSON.parse(readFileSync(LOCALES, 'utf8'))
    if (registry.schemaVersion !== 1) errors.push('docs/locales.json schemaVersion must be 1')
    if (!Array.isArray(registry.locales) || registry.locales.length === 0) {
      errors.push('docs/locales.json must declare a non-empty locales array')
    }
    const slugRe = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
    const langRe = /^[a-z]{2,3}(?:-[A-Z][a-z]{3})?(?:-[A-Z]{2}|-[0-9]{3})?$/
    const seen = new Set()
    let hasCn = false
    for (const locale of registry.locales ?? []) {
      const slug = String(locale.slug ?? '')
      if (!slugRe.test(slug) && slug !== 'root') errors.push(`docs/locales.json invalid slug: ${slug}`)
      if (seen.has(slug)) errors.push(`docs/locales.json duplicate slug: ${slug}`)
      seen.add(slug)
      if (!langRe.test(String(locale.lang ?? ''))) errors.push(`docs/locales.json invalid lang: ${locale.lang}`)
      if (typeof locale.link !== 'string' || !locale.link.startsWith('/')) errors.push(`docs/locales.json invalid link: ${locale.link}`)
      if (slug === 'cn') {
        hasCn = true
        if (locale.lang !== 'zh-CN') errors.push('docs/locales.json cn must map to lang zh-CN')
      }
      if (slug !== 'root') {
        const indexPath = join(DOCS, slug, 'index.md')
        if (!existsSync(indexPath)) errors.push(`docs/locales.json locale "${slug}" has no docs/${slug}/index.md`)
      }
    }
    if (!registry.locales.some((locale) => locale.slug === 'root')) errors.push('docs/locales.json must include the root en locale')
    if (hasCn && existsSync(join(DOCS, 'zh-cn'))) errors.push('docs/zh-cn must not exist; cn is the single zh-CN tree')
  } catch (e) {
    errors.push(`docs/locales.json parse error: ${e.message}`)
  }
}

if (errors.length > 0) {
  console.error('docs:check failed:')
  for (const e of errors) console.error(`  - ${e}`)
  process.exit(1)
}

console.log(`docs:check ok (${mdFiles.length} markdown file(s))`)
