'use strict';
// Public immutable Free objects only. No private repository routes, Actions
// artifacts, mutable latest pointer, or archive aggregation are supported.
const { canonicalBytes, sha256, parseCandidateSet, parsePackagePage, MAX_ROOT_BYTES, MAX_PAGE_BYTES, MAX_PACKAGE_BYTES } = require('./vendor/small-pack/candidate-set.cjs');
const { verifyFreePackage } = require('./free-small-package.cjs');
const policy = require('../contracts/release-policy/free-style-groups.v1.json');
const REPOSITORY = 'moewolf-dev/moe-icons';
const assert = (ok, message) => { if (!ok) throw Error(`github-free-store: ${message}`); };
const HEX = '[a-f0-9]{64}';
const VERSION = '(?:0|[1-9][0-9]*)\\.(?:0|[1-9][0-9]*)\\.(?:0|[1-9][0-9]*)(?:-(?:alpha|beta)(?:\\.(?:0|[1-9][0-9]*))?)?';
const MAX_POINTER_BYTES = 16 * 1024;
function parseVersionPointer(bytes, expectedVersion) {
  let value;
  try { value = JSON.parse(bytes); } catch { assert(false, 'version pointer JSON invalid'); }
  const keys = ['schemaVersion', 'tier', 'fullVersion', 'sourceCommit', 'generatorCommit', 'packageSetSha256', 'candidateRootSha256', 'candidateRootBytes'];
  assert(Buffer.from(bytes).equals(canonicalBytes(value)) && Object.keys(value).sort().join(',') === keys.slice().sort().join(','), 'canonical version pointer required');
  assert(value.schemaVersion === 1 && value.tier === 'free' && value.fullVersion === expectedVersion && new RegExp(`^${VERSION}$`).test(value.fullVersion), 'version pointer identity mismatch');
  assert(/^[a-f0-9]{40}$/.test(value.sourceCommit) && /^[a-f0-9]{40}$/.test(value.generatorCommit) && new RegExp(`^${HEX}$`).test(value.packageSetSha256) && new RegExp(`^${HEX}$`).test(value.candidateRootSha256), 'version pointer digest/commit invalid');
  assert(Number.isSafeInteger(value.candidateRootBytes) && value.candidateRootBytes > 0 && value.candidateRootBytes <= MAX_ROOT_BYTES, 'version pointer root size invalid');
  return value;
}
function locate(name) {
  let match = name.match(new RegExp(`^packages/(${HEX})\\.tgz$`));
  if (match) return { tag: `free-package-v1-${match[1]}`, file: `${match[1]}.tgz`, digest: match[1], maximum: MAX_PACKAGE_BYTES, package: true };
  match = name.match(new RegExp(`^(candidate-set-v1-free-(${HEX}))/(candidate-set-free\\.json|package-page-free-(\\d{4})\\.json)$`));
  if (match) {
    assert(!match[4] || Number(match[4]) >= 1 && Number(match[4]) <= 128, 'unsupported Free page number');
    return { tag: match[1], setSha256: match[2], file: match[3], maximum: match[3] === 'candidate-set-free.json' ? MAX_ROOT_BYTES : MAX_PAGE_BYTES, package: false, pointer: false };
  }
  match = name.match(new RegExp(`^(candidate-version-v1-free-(${VERSION}))/candidate-version-free\\.json$`));
  assert(match, 'unsupported Free object key');
  return { tag: match[1], fullVersion: match[2], file: 'candidate-version-free.json', maximum: MAX_POINTER_BYTES, package: false, pointer: true };
}
async function boundedBody(response, maximum) {
  try {
    const length = response.headers.get('content-length');
    assert(length === null || /^\d+$/.test(length) && Number(length) <= maximum, 'response length exceeds budget');
    let count = 0; const chunks = [];
    for await (const chunk of response.body || []) { count += chunk.length; assert(count <= maximum, 'response exceeds byte budget'); chunks.push(Buffer.from(chunk)); }
    assert(length === null || count === Number(length), 'truncated response'); return Buffer.concat(chunks, count);
  } catch (error) { try { await response.body?.cancel(); } catch {} throw error; }
}

function githubFreeStore({ token, publicCommit, fetchImpl = globalThis.fetch }) {
  assert(typeof token === 'string' && token.length > 0 && !/[\r\n]/.test(token), 'public release token required');
  assert(/^[a-f0-9]{40}$/.test(publicCommit || ''), 'exact public repository commit required');
  const base = `https://api.github.com/repos/${REPOSITORY}`;
  const headers = { Authorization: `Bearer ${token}`, 'X-GitHub-Api-Version': '2022-11-28', 'User-Agent': 'moe-icons-free-small-packages' };
  async function request(url, options, maximum) {
    let response;
    try { response = await fetchImpl(url, { ...options, redirect: 'manual', signal: AbortSignal.timeout(120000) }); }
    catch { throw Error('github-free-store: request failed'); }
    if (!response.ok) { await response.body?.cancel(); throw Object.assign(Error(`github-free-store: HTTP ${response.status}`), { status: response.status }); }
    try { return await boundedBody(response, maximum); }
    catch (error) { try { await response.body?.cancel(); } catch {} throw error; }
  }
  async function api(route, method = 'GET', body) {
    const bytes = await request(base + (route ? '/' + route : ''), { method, headers: { ...headers, Accept: 'application/vnd.github+json', 'Content-Type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}) }, 1024 ** 2);
    return JSON.parse(bytes);
  }
  let authority;
  async function authorize() {
    if (!authority) authority = (async () => {
      const repo = await api(''); assert(repo.full_name === REPOSITORY && repo.private === false && repo.default_branch === 'main', 'public repository authority mismatch');
      const commit = await api(`commits/${publicCommit}`); assert(commit.sha === publicCommit, 'public target commit missing');
    })().catch(error => { authority = undefined; throw error; });
    await authority;
  }
  async function release(location, create) {
    let value;
    try { value = await api(`releases/tags/${location.tag}`); }
    catch (error) {
      if (error.status !== 404 || !create) { if (error.status === 404) error.freeObjectReleaseMissing = true; throw error; }
      try { value = await api('releases', 'POST', { tag_name: location.tag, target_commitish: publicCommit, name: location.tag, draft: false, prerelease: true, make_latest: 'false' }); }
      catch (failure) {
        // A concurrent creator or a lost POST response may already have created
        // this exact tag. Read it back, never issue another creation request.
        try { value = await api(`releases/tags/${location.tag}`); } catch { throw failure; }
      }
    }
    assert(value.tag_name === location.tag && value.draft === false && value.prerelease === true && Number.isSafeInteger(value.id) && value.id > 0, 'immutable release identity/state mismatch');
    const assets = [];
    for (let page = 1; page <= 2; page++) {
      const batch = await api(`releases/${value.id}/assets?per_page=100&page=${page}`); assert(Array.isArray(batch) && batch.length <= 100, 'invalid asset page'); assets.push(...batch);
      if (batch.length < 100) break; assert(page < 2, 'asset listing exceeds budget');
    }
    const allowed = name => location.package || location.pointer ? name === location.file : name === 'candidate-set-free.json' || /^package-page-free-\d{4}\.json$/.test(name) && Number(name.slice(18, 22)) >= 1 && Number(name.slice(18, 22)) <= 128;
    assert(assets.length <= (location.package || location.pointer ? 1 : 129) && assets.every(a => allowed(a.name)) && new Set(assets.map(a => a.name)).size === assets.length, 'foreign or duplicate public assets');
    return { value, assets };
  }
  async function read(name, expectedSize) {
    const location = locate(name); assert(Number.isSafeInteger(expectedSize) && expectedSize > 0 && expectedSize <= location.maximum, 'exact bounded object size required'); await authorize();
    let current; try { current = await release(location, false); } catch (error) { if (error.freeObjectReleaseMissing) return null; throw error; }
    const asset = current.assets.find(a => a.name === location.file); if (!asset) return null;
    assert(Number.isSafeInteger(asset.id) && asset.id > 0 && asset.state === 'uploaded' && asset.size === expectedSize && /^sha256:[a-f0-9]{64}$/.test(asset.digest || ''), 'public asset identity/size mismatch');
    let response;
    try { response = await fetchImpl(`${base}/releases/assets/${asset.id}`, { headers: { ...headers, Accept: 'application/octet-stream' }, redirect: 'manual', signal: AbortSignal.timeout(120000) }); } catch { throw Error('github-free-store: download failed'); }
    let bytes;
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const locationHeader = response.headers.get('location'); await response.body?.cancel();
      let url; try { url = new URL(locationHeader); } catch { throw Error('github-free-store: invalid asset redirect'); }
      assert(url.protocol === 'https:' && !url.username && !url.password && !url.port && (url.hostname === 'githubusercontent.com' || url.hostname.endsWith('.githubusercontent.com')), 'untrusted asset redirect');
      bytes = await request(url.href, { headers: { Accept: 'application/octet-stream' } }, expectedSize);
    } else {
      if (!response.ok) { await response.body?.cancel(); throw Object.assign(Error(`github-free-store: HTTP ${response.status}`), { status: response.status }); }
      bytes = await boundedBody(response, expectedSize);
    }
    assert(bytes.length === expectedSize && `sha256:${sha256(bytes)}` === asset.digest && (!location.package || sha256(bytes) === location.digest), 'public payload digest mismatch');
    if (location.pointer) {
      const pointer = parseVersionPointer(bytes, location.fullVersion);
      const rootName = `candidate-set-v1-free-${pointer.packageSetSha256}/candidate-set-free.json`;
      const rootBytes = await read(rootName, pointer.candidateRootBytes);
      assert(rootBytes && sha256(rootBytes) === pointer.candidateRootSha256, 'version pointer candidate root is missing or changed');
      const root = parseCandidateSet(rootBytes);
      for (const key of ['fullVersion', 'sourceCommit', 'generatorCommit', 'packageSetSha256']) assert(pointer[key] === root[key], 'version pointer differs from candidate root');
    }
    return bytes;
  }
  async function write(name, bytes, row) {
    const location = locate(name); assert(Buffer.isBuffer(bytes) && bytes.length > 0 && bytes.length <= location.maximum, 'bounded payload required');
    if (location.package) {
      assert(sha256(bytes) === location.digest, 'package key differs from bytes');
      assert(row && row.filename === name, 'exact Free package row required'); verifyFreePackage(row, bytes);
    }
    else if (location.pointer) {
      const pointer = parseVersionPointer(bytes, location.fullVersion);
      const rootName = `candidate-set-v1-free-${pointer.packageSetSha256}/candidate-set-free.json`;
      const rootBytes = await read(rootName, pointer.candidateRootBytes);
      assert(rootBytes && sha256(rootBytes) === pointer.candidateRootSha256, 'version pointer candidate root is missing or changed');
      const root = parseCandidateSet(rootBytes);
      for (const key of ['fullVersion', 'sourceCommit', 'generatorCommit', 'packageSetSha256']) assert(pointer[key] === root[key], 'version pointer differs from candidate root');
    }
    else if (location.file === 'candidate-set-free.json') { const root = parseCandidateSet(bytes); assert(root.tier === 'free' && root.packageSetSha256 === location.setSha256, 'root differs from public key'); }
    else { const raw = JSON.parse(bytes); const page = parsePackagePage(bytes, undefined, raw.fullVersion, 'free'); assert(page.packages.every(row => !row.styleGroupId || policy.freeStyleGroups.includes(row.styleGroupId)), 'non-Free page payload'); }
    await authorize();
    const existing = await read(name, bytes.length); if (existing !== null) { assert(existing.equals(bytes), 'immutable public object conflict'); return; }
    const current = await release(location, true);
    try { await request(`https://uploads.github.com/repos/${REPOSITORY}/releases/${current.value.id}/assets?name=${encodeURIComponent(location.file)}`, { method: 'POST', headers: { ...headers, Accept: 'application/vnd.github+json', 'Content-Type': location.package ? 'application/gzip' : 'application/json' }, body: bytes }, 1024 ** 2); }
    catch (error) { const recovered = await read(name, bytes.length); if (!recovered || !recovered.equals(bytes)) throw error; return; }
    const saved = await read(name, bytes.length); assert(saved && saved.equals(bytes), 'immutable upload readback failed');
  }
  return { read, write };
}
module.exports = { githubFreeStore, locate, boundedBody, parseVersionPointer, REPOSITORY };
