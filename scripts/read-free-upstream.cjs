'use strict';
// Read-only private Free candidate input. No Pro tier, Actions ZIP, Release
// history scan or mutable latest fallback is reachable from this adapter.
const { canonicalBytes, sha256, parseCandidateSet, validatePackagePages, MAX_ROOT_BYTES } = require('./vendor/small-pack/candidate-set.cjs');
const { boundedBody } = require('./github-free-package-store.cjs');
const { verifyFreePackage } = require('./free-small-package.cjs');
const policy = require('../contracts/release-policy/free-style-groups.v1.json');
const REPOSITORY = 'moewolf-dev/moe-icons-code-library';
const WORKFLOW = '.github/workflows/small-pack-candidate.yml';
const MAX_GENERATOR_JOBS = 300;
const MAX_GENERATOR_JOB_PAGES = 3;
const assert = (ok, message) => { if (!ok) throw Error(`free-upstream: ${message}`); };
function upstreamTransport({ token, fetchImpl = globalThis.fetch }) {
  assert(typeof token === 'string' && token.length > 0 && !/[\r\n]/.test(token), 'existing private artifact-read token required');
  const base = `https://api.github.com/repos/${REPOSITORY}`;
  const headers = { Authorization: `Bearer ${token}`, 'X-GitHub-Api-Version': '2022-11-28', 'User-Agent': 'moe-icons-free-small-input' };
  async function request(url, requestHeaders, maximum, redirect = false) {
    let response;
    try { response = await fetchImpl(url, { headers: requestHeaders, redirect: 'manual', signal: AbortSignal.timeout(120000) }); } catch { throw Error('free-upstream: request failed'); }
    if (redirect && [301, 302, 303, 307, 308].includes(response.status)) {
      const target = response.headers.get('location'); await response.body?.cancel(); let location;
      try { location = new URL(target); } catch { throw Error('free-upstream: invalid asset redirect'); }
      assert(location.protocol === 'https:' && !location.username && !location.password && !location.port && (location.hostname === 'githubusercontent.com' || location.hostname.endsWith('.githubusercontent.com')), 'untrusted asset redirect');
      return request(location.href, { Accept: 'application/octet-stream' }, maximum, false);
    }
    if (!response.ok) { await response.body?.cancel(); throw Object.assign(Error(`free-upstream: HTTP ${response.status}`), { status: response.status }); }
    return boundedBody(response, maximum);
  }
  return {
    async api(route) {
      assert(route === '' || /^(releases\/tags\/(candidate-set-v1-free-[a-f0-9]{64}|candidate-source-v2-[a-f0-9]{40}|packages-v1-free-[a-f0-9]{2})|releases\/[1-9]\d*\/assets\?per_page=100&page=(?:[1-9]|10|11)|actions\/runs\/[1-9]\d*\/attempts\/[1-9]\d*(?:\/jobs\?per_page=100&page=[1-3])?)$/.test(route), 'unsupported read-only private route');
      return JSON.parse(await request(base + (route ? '/' + route : ''), { ...headers, Accept: 'application/vnd.github+json' }, 1024 ** 2));
    },
    async download(asset, maximum) {
      assert(Number.isSafeInteger(asset.id) && asset.id > 0 && Number.isSafeInteger(maximum) && maximum > 0 && maximum <= 128 * 1024 ** 2, 'bounded asset identity required');
      return request(`${base}/releases/assets/${asset.id}`, { ...headers, Accept: 'application/octet-stream' }, maximum, true);
    },
  };
}
async function listAssets(transport, release) {
  assert(Number.isSafeInteger(release.id) && release.id > 0, 'exact release id required'); const assets = [];
  for (let page = 1; page <= 11; page++) {
    const batch = await transport.api(`releases/${release.id}/assets?per_page=100&page=${page}`);
    assert(Array.isArray(batch) && batch.length <= 100, 'invalid asset page'); assets.push(...batch); assert(assets.length <= 1000, 'asset listing exceeds bounded bucket');
    if (batch.length < 100) return assets;
  }
  throw Error('free-upstream: asset listing exceeds bounded bucket');
}
async function releaseAssets(transport, tag) {
  const release = await transport.api(`releases/tags/${tag}`);
  assert(release.tag_name === tag && release.draft === false && release.prerelease === true, 'immutable private release scope/state mismatch');
  return listAssets(transport, release);
}
function oneAsset(assets, name, size, digest, maximum) {
  const matches = assets.filter(a => a.name === name); assert(matches.length === 1, 'missing/ambiguous exact Free asset'); const asset = matches[0];
  assert(Number.isSafeInteger(asset.id) && asset.id > 0 && asset.state === 'uploaded' && Number.isSafeInteger(asset.size) && asset.size > 0 && asset.size <= maximum && /^sha256:[a-f0-9]{64}$/.test(asset.digest || ''), 'Free asset identity/budget invalid');
  assert((size === undefined || asset.size === size) && (!digest || asset.digest === `sha256:${digest}`), 'Free asset differs from frozen reference'); return asset;
}
async function readAsset(transport, asset) {
  const bytes = await transport.download(asset, asset.size);
  assert(Buffer.isBuffer(bytes) && bytes.length === asset.size && `sha256:${sha256(bytes)}` === asset.digest, 'private asset readback mismatch'); return bytes;
}
const exactKeys = (value, keys) => value && typeof value === 'object' && !Array.isArray(value)
  && Object.keys(value).sort().join(',') === [...keys].sort().join(',');
async function verifyReusedRoot({ transport, binding, producer, sourceDispatchId, run, rootBytes }) {
  const assets = await releaseAssets(transport, `candidate-source-v2-${binding.sourceCommit}`);
  const registryBytes = await readAsset(transport, oneAsset(assets, 'source-candidate.json', undefined, undefined, MAX_ROOT_BYTES));
  const record = JSON.parse(registryBytes);
  assert(registryBytes.equals(canonicalBytes(record)) && exactKeys(record, ['schemaVersion', 'sourceCommit', 'sourceVersion', 'sourceContentHash', 'sourceIndexSha256', 'sourceProducer', 'sourceReleaseAttempt', 'generatorCommit', 'producer', 'candidateSets', 'recordSha256']), 'exact Source registry required');
  const { recordSha256, ...projection } = record;
  assert(/^[a-f0-9]{64}$/.test(recordSha256 || '') && sha256(canonicalBytes(projection)) === recordSha256
    && record.schemaVersion === 2 && record.sourceCommit === binding.sourceCommit && record.sourceVersion === binding.fullVersion
    && record.generatorCommit === binding.generatorCommit && exactKeys(record.candidateSets, ['free', 'pro'])
    && record.candidateSets.free === binding.packageSetSha256 && /^[a-f0-9]{64}$/.test(record.candidateSets.pro || ''), 'Source registry does not bind Free candidate');
  const filename = `execution-${producer.runId}-${producer.runAttempt}.json`;
  const bytes = await readAsset(transport, oneAsset(assets, filename, undefined, undefined, MAX_ROOT_BYTES));
  const witness = JSON.parse(bytes);
  assert(bytes.equals(canonicalBytes(witness)) && exactKeys(witness, ['schemaVersion', 'sourceCommit', 'sourceDispatchId', 'registrySha256', 'producer', 'candidates'])
    && witness.schemaVersion === 1 && witness.sourceCommit === binding.sourceCommit && witness.sourceDispatchId === sourceDispatchId
    && witness.registrySha256 === recordSha256 && exactKeys(witness.producer, ['runId', 'runAttempt', 'headSha'])
    && String(witness.producer.runId) === String(producer.runId) && witness.producer.runAttempt === producer.runAttempt
    && witness.producer.headSha === run.head_sha && exactKeys(witness.candidates, ['free', 'pro']), 'execution witness identity mismatch');
  for (const tier of ['free', 'pro']) {
    const candidate = witness.candidates[tier];
    assert(exactKeys(candidate, ['packageSetSha256', 'candidateRootSha256', 'candidateRootBytes'])
      && candidate.packageSetSha256 === record.candidateSets[tier] && /^[a-f0-9]{64}$/.test(candidate.candidateRootSha256 || '')
      && Number.isSafeInteger(candidate.candidateRootBytes) && candidate.candidateRootBytes > 0 && candidate.candidateRootBytes <= MAX_ROOT_BYTES, 'execution witness candidate invalid');
  }
  assert(witness.candidates.free.candidateRootSha256 === sha256(rootBytes)
    && witness.candidates.free.candidateRootBytes === rootBytes.length, 'execution witness Free root mismatch');
}
async function readFreeUpstream({ binding, producer, sourceDispatchId, transport }) {
  assert(binding && /^[a-f0-9]{64}$/.test(binding.packageSetSha256 || '') && /^[a-f0-9]{40}$/.test(binding.sourceCommit || '') && /^[a-f0-9]{40}$/.test(binding.generatorCommit || ''), 'exact Free acceptance binding required');
  assert(producer && /^[1-9]\d*$/.test(String(producer.runId)) && Number.isSafeInteger(producer.runAttempt) && producer.runAttempt > 0, 'exact original producer required');
  const repo = await transport.api(''); assert(repo.full_name === REPOSITORY && repo.private === true && repo.default_branch === 'main', 'private upstream authority mismatch');
  const route = `actions/runs/${producer.runId}/attempts/${producer.runAttempt}`;
  const run = await transport.api(route);
  assert(String(run.id) === String(producer.runId) && run.run_attempt === producer.runAttempt && /^[a-f0-9]{40}$/.test(run.head_sha || '') && run.head_branch === 'main' && ['push', 'workflow_dispatch', 'repository_dispatch'].includes(run.event) && [WORKFLOW, WORKFLOW + '@refs/heads/main'].includes(run.path) && run.repository?.full_name === REPOSITORY && run.head_repository?.full_name === REPOSITORY, 'untrusted original generator producer');
  assert(/^[a-f0-9]{64}$/.test(sourceDispatchId || '')
    && run.display_title === `Source package-set ${binding.sourceCommit} ${sourceDispatchId}`,
  'Generator run title differs from Source commit/dispatch identity');
  const jobs = [];
  let totalCount;
  for (let page = 1; page <= MAX_GENERATOR_JOB_PAGES; page += 1) {
    const result = await transport.api(`${route}/jobs?per_page=100&page=${page}`);
    assert(result && Number.isSafeInteger(result.total_count) && result.total_count >= 0
      && result.total_count <= MAX_GENERATOR_JOBS && Array.isArray(result.jobs) && result.jobs.length <= 100,
    'invalid or over-budget producer jobs listing');
    if (totalCount === undefined) totalCount = result.total_count;
    assert(result.total_count === totalCount, 'producer job count changed between pages');
    jobs.push(...result.jobs);
    if (jobs.length >= totalCount) break;
    assert(page < MAX_GENERATOR_JOB_PAGES, 'producer job listing exceeds page budget');
  }
  assert(jobs.length === totalCount, 'producer jobs listing is incomplete');
  for (const name of ['assemble', 'durable']) { const matches = jobs.filter(job => job.name === name); assert(matches.length === 1 && matches[0].conclusion === 'success', 'unique successful assemble/durable stages required'); }
  const assets = await releaseAssets(transport, `candidate-set-v1-free-${binding.packageSetSha256}`);
  const rootBytes = await readAsset(transport, oneAsset(assets, 'candidate-set.json', undefined, undefined, MAX_ROOT_BYTES));
  const root = parseCandidateSet(rootBytes); assert(root.tier === 'free', 'Pro root rejected');
  for (const key of ['fullVersion', 'sourceCommit', 'generatorCommit', 'packageSetSha256']) assert(root[key] === binding[key], 'Free root differs from acceptance binding');
  if (run.head_sha !== binding.generatorCommit) await verifyReusedRoot({ transport, binding, producer, sourceDispatchId, run, rootBytes });
  assert(root.packagePages.reduce((sum, ref) => sum + ref.sizeBytes, 0) <= 16 * 1024 ** 2, 'Free metadata exceeds coordinator budget');
  const allowedNames = new Set(['candidate-set.json', ...root.packagePages.map(ref => ref.filename)]);
  assert(assets.every(a => allowedNames.has(a.name) || /^verified-[1-9]\d*-[a-f0-9]{64}\.json$/.test(a.name)), 'foreign payload in Free metadata release');
  const pages = new Map();
  for (const ref of root.packagePages) pages.set(ref.filename, await readAsset(transport, oneAsset(assets, ref.filename, ref.sizeBytes, ref.sha256, 8 * 1024 ** 2)));
  const rows = validatePackagePages(root, pages); assert(rows.every(row => !row.styleGroupId || policy.freeStyleGroups.includes(row.styleGroupId)), 'upstream includes non-Free group');
  const known = new Map(rows.map(row => [row.resourceKey, canonicalBytes(row)])); const buckets = new Map();
  async function readPackage(row) {
    const expected = known.get(row?.resourceKey); assert(expected && expected.equals(canonicalBytes(row)), 'package selection differs from verified Free directory');
    row = JSON.parse(expected);
    const tag = `packages-v1-free-${row.packageSha256.slice(0, 2)}`;
    if (!buckets.has(tag)) { if (buckets.size === 2) buckets.delete(buckets.keys().next().value); buckets.set(tag, await releaseAssets(transport, tag)); }
    const bytes = await readAsset(transport, oneAsset(buckets.get(tag), `${row.packageSha256}.tgz`, row.compressedBytes, row.packageSha256, 128 * 1024 ** 2)); verifyFreePackage(row, bytes); return bytes;
  }
  return { root, rootBytes, pages, rows, readPage: async ref => { const expected = root.packagePages.find(r => r.filename === ref?.filename); assert(expected && canonicalBytes(expected).equals(canonicalBytes(ref)), 'unbound metadata page selection'); return pages.get(ref.filename); }, readPackage };
}
module.exports = { readFreeUpstream, upstreamTransport };
