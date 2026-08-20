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

// 3. Markdown checks: non-empty, parseable frontmatter, resolvable local links.
const mdFiles = files.filter((f) => f.endsWith('.md'))
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

if (errors.length > 0) {
  console.error('docs:check failed:')
  for (const e of errors) console.error(`  - ${e}`)
  process.exit(1)
}

console.log(`docs:check ok (${mdFiles.length} markdown file(s))`)
