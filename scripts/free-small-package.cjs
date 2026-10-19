'use strict';
// Free-only publication engine. Caller authenticates final acceptance before
// invoking it. It does not activate latest or accept legacy aggregate inputs.
const { gunzipSync } = require('node:zlib');
const { canonicalBytes, sha256, parseCandidateSet, parsePackagePage, validatePackagePages, verifyPackagePayload } = require('./vendor/small-pack/candidate-set.cjs');
const { readTarEntries } = require('./vendor/small-pack/tar-read.cjs');
const policy = require('../contracts/release-policy/free-style-groups.v1.json');
const assert = (ok, message) => { if (!ok) throw Error(`free-small-package: ${message}`); };
function safePath(value) {
  assert(typeof value === 'string' && value.length <= 1024 && !/[\\\x00-\x1f\x7f:]/.test(value) && !value.startsWith('/') && value.split('/').every(p => p && p !== '.' && p !== '..'), 'unsafe archive path'); return value;
}
function verifyFreePackage(row, bytes) {
  parsePackagePage(canonicalBytes({ schemaVersion: 1, fullVersion: row.fullVersion, tier: 'free', packages: [row] }), undefined, row.fullVersion, 'free');
  assert(['svg', 'code', 'shared', 'metadata', 'bitmap', 'website'].includes(row.kind), 'unsupported public package kind');
  assert(row.tier === 'free' && (!row.styleGroupId || policy.freeStyleGroups.includes(row.styleGroupId)), 'non-Free package scope');
  verifyPackagePayload(row, bytes);
  // Allow tar headers/padding, but never unbounded decompression. Expanded
  // content and file counts are subsequently checked against the signed row.
  const tarBudget = row.expandedBytes + (row.fileCount * 4 + 4) * 512 + 10240;
  const tar = gunzipSync(bytes, { maxOutputLength: tarBudget });
  const entries = readTarEntries(tar, { maxEntries: row.fileCount * 4 + 4, maxExpandedBytes: row.expandedBytes + 1024 * 1024 });
  const files = new Map(); const paths = new Set();
  for (const entry of entries) {
    let name = entry.path; if (name === '.' && entry.type === 'dir') continue;
    if (name.startsWith('./')) name = name.slice(2);
    safePath(name); assert(!paths.has(name), 'duplicate archive path'); paths.add(name);
    assert(entry.type === 'file' || entry.type === 'dir', 'archive links/special files forbidden');
    if (entry.type === 'file') files.set(name, entry.data);
  }
  assert(files.size === row.fileCount && [...files.values()].reduce((sum, b) => sum + b.length, 0) === row.expandedBytes, 'archive inventory differs from row');
  const manifestBytes = files.get('manifest.json'); assert(manifestBytes && manifestBytes.length <= 8 * 1024 ** 2, 'bounded manifest required');
  const manifest = JSON.parse(manifestBytes); assert(manifestBytes.equals(canonicalBytes(manifest)) && manifest.schemaVersion === 1, 'canonical package manifest required');
  const scopeKeys = ['kind', 'tier', 'styleGroupId', 'target', 'variant'];
  assert(Object.keys(manifest).every(k => ['schemaVersion', 'files', ...scopeKeys].includes(k)), 'unexpected manifest fields');
  for (const key of scopeKeys) assert(canonicalBytes({ value: manifest[key] }).equals(canonicalBytes({ value: row[key] })), 'manifest scope differs from directory');
  assert(Array.isArray(manifest.files) && manifest.files.length === files.size - 1, 'manifest inventory incomplete');
  const seen = new Set(['manifest.json']);
  for (const item of manifest.files) {
    assert(item && Object.keys(item).sort().join(',') === 'byteSize,path,sha256', 'exact file record required');
    safePath(item.path); assert(!seen.has(item.path), 'duplicate manifest file'); seen.add(item.path);
    const payload = files.get(item.path); assert(payload && payload.length === item.byteSize && sha256(payload) === item.sha256, 'manifest file mismatch');
    if (row.kind === 'svg') assert(/^[a-z0-9]+(?:-[a-z0-9]+)*\.svg$/.test(item.path), 'SVG unit contains other resource kinds');
    if (row.kind === 'code' || row.kind === 'shared') assert(/\.(js|cjs|mjs|ts|cts|mts|tsx|jsx|json|map|vue)$/.test(item.path), 'code unit contains non-code payload');
    if (row.kind === 'metadata') assert(['metadata/MANUAL.md', 'metadata/catalog.json', 'metadata/manifest.json'].includes(item.path), 'metadata unit contains unexpected payload');
    if (row.kind === 'bitmap') assert(new RegExp(`^icons/[a-z0-9]+(?:-[a-z0-9]+)*\\.${row.variant.format}$`).test(item.path), 'bitmap crosses tuple scope');
    if (row.kind === 'website') {
      let text;
      try { text = new TextDecoder('utf-8', { fatal: true }).decode(payload); }
      catch { throw new Error('free-small-package: website package contains non-text payload'); }
      assert(item.path === 'website/catalog.json'
        || item.path === `website/indexes/${row.styleGroupId}/search.json`
        || (item.path.startsWith(`website/snippets/${row.styleGroupId}/`) && /^[a-z0-9]+(?:-[a-z0-9]+)*\.json$/.test(item.path.slice(`website/snippets/${row.styleGroupId}/`.length)))
        || (item.path.startsWith(`website/assets/${row.styleGroupId}/`) && /^[a-z0-9]+(?:-[a-z0-9]+)*\.svg$/.test(item.path.slice(`website/assets/${row.styleGroupId}/`.length))),
      'website package contains payload outside its declared group');
      assert(text.length <= 8 * 1024 ** 2, 'website member exceeds its text budget');
    }
  }
  if (row.kind === 'website') assert(files.has('website/catalog.json') && files.has(`website/indexes/${row.styleGroupId}/search.json`),
    'website package requires its scoped catalog and search index');
  return { packageSha256: row.packageSha256, fileCount: files.size, expandedBytes: row.expandedBytes };
}
async function publishFreeCandidate({ rootBytes, readPage, readPackage, store, binding }) {
  const root = parseCandidateSet(rootBytes);
  assert(root.tier === 'free', 'Pro directory must never enter public publication');
  for (const key of ['fullVersion', 'sourceCommit', 'generatorCommit', 'packageSetSha256']) assert(binding && binding[key] === root[key], 'authenticated acceptance binding differs from Free candidate');
  const pages = new Map();
  for (const ref of root.packagePages) pages.set(ref.filename, await readPage(ref));
  const rows = validatePackagePages(root, pages);
  assert(rows.every(row => ['svg', 'code', 'shared', 'metadata', 'bitmap', 'website'].includes(row.kind) && row.tier === 'free' && (!row.styleGroupId || policy.freeStyleGroups.includes(row.styleGroupId))), 'candidate includes a group outside Free policy');
  // Validate every control object before the first public write. Payloads are
  // processed one at a time; partial objects never expose a candidate root.
  let uploaded = 0, reused = 0;
  async function immutable(name, bytes, row) {
    const existing = await store.read(name, bytes.length);
    if (existing !== null) { assert(Buffer.isBuffer(existing) && existing.equals(bytes), 'public immutable object conflict'); return false; }
    try { await store.write(name, bytes, row); }
    catch (error) { const recovered = await store.read(name, bytes.length); if (!recovered || !recovered.equals(bytes)) throw error; }
    const readback = await store.read(name, bytes.length); assert(Buffer.isBuffer(readback) && readback.equals(bytes), 'public object readback mismatch'); return true;
  }
  for (const row of rows) {
    const name = `packages/${row.packageSha256}.tgz`;
    const existing = await store.read(name, row.compressedBytes);
    if (existing !== null) { verifyFreePackage(row, existing); reused++; continue; }
    const bytes = await readPackage(row); verifyFreePackage(row, bytes);
    if (await immutable(name, bytes, row)) uploaded++; else reused++;
  }
  const prefix = `candidate-set-v1-free-${root.packageSetSha256}/`;
  for (const [name, bytes] of pages) await immutable(prefix + name, bytes);
  await immutable(prefix + 'candidate-set-free.json', rootBytes);
  // A caller that knows only a released version needs a stable way to discover
  // the exact set. Publish this pointer only after the full immutable set root
  // and every referenced package have been read back successfully.
  const pointer = canonicalBytes({
    schemaVersion: 1,
    tier: 'free',
    fullVersion: root.fullVersion,
    sourceCommit: root.sourceCommit,
    generatorCommit: root.generatorCommit,
    packageSetSha256: root.packageSetSha256,
    candidateRootSha256: sha256(rootBytes),
    candidateRootBytes: rootBytes.length,
  });
  await immutable(`candidate-version-v1-free-${root.fullVersion}/candidate-version-free.json`, pointer);
  return { schemaVersion: 1, tier: 'free', fullVersion: root.fullVersion, sourceCommit: root.sourceCommit,
    generatorCommit: root.generatorCommit, packageSetSha256: root.packageSetSha256, candidateRootSha256: sha256(rootBytes),
    candidateRootBytes: rootBytes.length, uploaded, reused };
}
module.exports = { verifyFreePackage, publishFreeCandidate };
