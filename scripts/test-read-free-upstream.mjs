import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { readFreeUpstream, upstreamTransport } = require('./read-free-upstream.cjs');
const { publishFreeCandidate } = require('./free-small-package.cjs');
const { buildCandidateSet, sha256 } = require('./vendor/small-pack/candidate-set.cjs');
const row = JSON.parse(fs.readFileSync(new URL('./fixtures/free-small-package/row.json', import.meta.url)));
const payload = fs.readFileSync(new URL('./fixtures/free-small-package/svg.tgz', import.meta.url));
const repository = 'moewolf-dev/moe-icons-code-library';
function fixture() {
  const built = buildCandidateSet({ fullVersion: '1.0.0', tier: 'free', sourceCommit: 'a'.repeat(40), generatorCommit: 'b'.repeat(40), packages: [row] });
  const sourceDispatchId = 'a'.repeat(64);
  let id = 1; const downloads = [], routes = [], flags = {};
  const asset = (name, bytes) => ({ id: id++, name, size: bytes.length, state: 'uploaded', digest: 'sha256:' + sha256(bytes), bytes });
  const controls = [asset('candidate-set.json', built.rootBytes), ...[...built.pageBytesByName].map(([name, bytes]) => asset(name, bytes))];
  const packages = [asset(`${row.packageSha256}.tgz`, payload)];
  const transport = { async api(route) {
    routes.push(route);
    if (!route) return { full_name: repository, private: !flags.public, default_branch: 'main' };
    if (route.includes('/jobs?')) return { jobs: flags.jobs || [{ name: 'assemble', conclusion: 'success' }, { name: 'durable', conclusion: 'success' }] };
    if (route.startsWith('actions/')) return { id: 123, run_attempt: flags.wrongAttempt ? 2 : 1, head_sha: built.candidateSet.generatorCommit, head_branch: 'main', event: 'workflow_dispatch', path: '.github/workflows/small-pack-candidate.yml', display_title: flags.displayTitle || `Source package-set ${built.candidateSet.sourceCommit} ${sourceDispatchId}`, repository: { full_name: repository }, head_repository: { full_name: flags.fork ? 'fork/other' : repository }, status: 'completed', conclusion: 'failure' };
    if (route.startsWith('releases/tags/')) {
      const tag = route.slice('releases/tags/'.length); assert.match(tag, /^(candidate-set-v1-free-[a-f0-9]{64}|packages-v1-free-[a-f0-9]{2})$/);
      return { id: tag.startsWith('candidate-') ? 1 : 2, tag_name: tag, draft: false, prerelease: true };
    }
    if (route.startsWith('releases/1/assets')) return controls;
    if (route.startsWith('releases/2/assets')) return packages;
    throw Error('unexpected route');
  }, async download(a, maximum) { downloads.push(a.name); assert.equal(maximum, a.size); return flags.corrupt === a.name ? Buffer.alloc(a.size) : a.bytes; } };
  return { binding: built.candidateSet, sourceDispatchId, producer: { runId: '123', runAttempt: 1 }, transport, downloads, routes, controls, packages, flags };
}
test('metadata-only read binds original successful producer stages and streams only selected Free package into public engine', async () => {
  const f = fixture(); const upstream = await readFreeUpstream(f);
  assert.ok(f.downloads.every(name => name.endsWith('.json')));
  const objects = new Map(); const store = { read: async name => objects.get(name) ?? null, write: async (name, bytes) => objects.set(name, bytes) };
  assert.equal((await publishFreeCandidate({ ...upstream, store, binding: f.binding })).uploaded, 1);
  assert.equal(f.downloads.filter(n => n.endsWith('.tgz')).length, 1);
  f.downloads.length = 0; assert.equal((await publishFreeCandidate({ ...upstream, store, binding: f.binding })).reused, 1); assert.deepEqual(f.downloads, []);
});
test('fork, public upstream, wrong attempt and nonunique/failed producer stages reject before asset downloads', async () => {
  for (const flags of [{ fork: true }, { public: true }, { wrongAttempt: true }, { jobs: [{ name: 'assemble', conclusion: 'success' }, { name: 'durable', conclusion: 'failure' }] }, { jobs: [{ name: 'assemble', conclusion: 'success' }, { name: 'assemble', conclusion: 'failure' }, { name: 'durable', conclusion: 'success' }] }]) {
    const f = fixture(); Object.assign(f.flags, flags); await assert.rejects(readFreeUpstream(f)); assert.deepEqual(f.downloads, []);
  }
});
test('Free package-set receipt binds the Generator run title to the Source commit and dispatch identity', async () => {
  const f = fixture(), { sourceDispatchId } = f;
  f.flags.displayTitle = `Source package-set ${f.binding.sourceCommit} ${sourceDispatchId}`;
  await readFreeUpstream({ ...f, sourceDispatchId });
  for (const title of [
    `Source package-set ${'c'.repeat(40)} ${sourceDispatchId}`,
    `Source package-set ${f.binding.sourceCommit} ${'b'.repeat(64)}`,
  ]) {
    f.flags.displayTitle = title;
    await assert.rejects(readFreeUpstream({ ...f, sourceDispatchId }), /Generator run title/);
  }
});
test('binding drift, corrupt or ambiguous metadata and foreign payload reject without package download', async () => {
  for (const kind of ['binding', 'corrupt', 'duplicate', 'foreign']) {
    const f = fixture();
    if (kind === 'binding') f.binding = { ...f.binding, sourceCommit: 'c'.repeat(40) };
    if (kind === 'corrupt') f.flags.corrupt = 'candidate-set.json';
    if (kind === 'duplicate') f.controls.push(f.controls[0]);
    if (kind === 'foreign') f.controls.push({ name: 'pro-resources.bin' });
    await assert.rejects(readFreeUpstream(f)); assert.ok(f.downloads.every(n => n.endsWith('.json')));
  }
});
test('selector cannot swap rows/tier; missing or corrupted package has no fallback', async () => {
  const f = fixture(); const upstream = await readFreeUpstream(f); const start = f.routes.length;
  await assert.rejects(upstream.readPackage({ ...row, tier: 'pro' }), /selection/); assert.equal(f.routes.length, start);
  upstream.rows[0].packageSha256 = 'e'.repeat(64); await assert.rejects(upstream.readPackage(upstream.rows[0]), /selection/);
  f.flags.corrupt = f.packages[0].name; await assert.rejects(upstream.readPackage(row), /readback/);
  assert.ok(!f.routes.some(r => /zip|pro-|latest|actions\/artifacts/.test(r)));
  const missing = fixture(); const selected = await readFreeUpstream(missing); missing.packages.length = 0; await assert.rejects(selected.readPackage(row), /missing/);
});
test('HTTP transport fixes private Free routes, strips redirect authorization and blocks aggregate/Pro routes', async () => {
  const calls = []; const transport = upstreamTransport({ token: 'private-test-token', fetchImpl: async (url, options) => {
    calls.push({ url, options });
    if (url.startsWith('https://release-assets.githubusercontent.com/')) return new Response(payload);
    if (url.endsWith('/releases/assets/7')) return new Response(null, { status: 302, headers: { location: 'https://release-assets.githubusercontent.com/file' } });
    return new Response('{}');
  } });
  await transport.api(''); await transport.download({ id: 7 }, payload.length);
  assert.equal(calls[0].options.headers.Authorization, 'Bearer private-test-token'); assert.equal(calls.at(-1).options.headers.Authorization, undefined);
  for (const route of ['actions/artifacts/1/zip', 'releases/tags/latest', 'releases/tags/candidate-set-v1-pro-' + 'a'.repeat(64), '../other']) await assert.rejects(transport.api(route), /unsupported/);
  assert.equal(calls.length, 3);
  const spoof = upstreamTransport({ token: 'private-test-token', fetchImpl: async () => new Response(null, { status: 302, headers: { location: 'https://githubusercontent.com.attacker.test/file' } }) });
  await assert.rejects(spoof.download({ id: 7 }, 10), /untrusted/);
});
