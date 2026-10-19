import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import fs from 'node:fs';
const require = createRequire(import.meta.url);
const { githubFreeStore, locate, boundedBody } = require('./github-free-package-store.cjs');
const { publishFreeCandidate } = require('./free-small-package.cjs');
const { buildCandidateSet, sha256 } = require('./vendor/small-pack/candidate-set.cjs');
const publicCommit = 'c'.repeat(40), base = 'https://api.github.com/repos/moewolf-dev/moe-icons';
const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json' } });
function fixture() {
  let id = 1; const releases = new Map(), calls = []; const flags = {};
  const fetchImpl = async (url, options = {}) => {
    calls.push({ url, options });
    if (url.startsWith('https://release-assets.githubusercontent.com/')) { assert.equal(options.headers.Authorization, undefined); const asset = [...releases.values()].flatMap(r => r.assets).find(a => url.endsWith('/' + a.id)); return new Response(asset.bytes); }
    assert.equal(options.headers.Authorization, 'Bearer fake-public-token'); assert.equal(options.redirect, 'manual');
    if (url === base) return json({ full_name: flags.foreign ? 'foreign/repo' : 'moewolf-dev/moe-icons', private: flags.private || false, default_branch: 'main' });
    if (url === `${base}/commits/${publicCommit}`) return json({ sha: publicCommit });
    if (url.startsWith(`${base}/releases/tags/`)) { const release = releases.get(url.split('/').at(-1)); return release ? json(release) : json({}, flags.forbidden ? 403 : 404); }
    if (url === `${base}/releases` && options.method === 'POST') {
      const body = JSON.parse(options.body); assert.equal(body.target_commitish, publicCommit); assert.equal(body.make_latest, 'false');
      const release = { id: id++, tag_name: body.tag_name, draft: body.draft, prerelease: body.prerelease, assets: [] }; releases.set(release.tag_name, release);
      if (flags.loseCreation) { flags.loseCreation = false; throw Error('lost response'); } return json(release, 201);
    }
    const list = url.match(/\/releases\/(\d+)\/assets\?per_page=100&page=(\d+)$/);
    if (list) { if (flags.missingListing) return json({}, 404); const r = [...releases.values()].find(r => r.id === Number(list[1])); return json(r.assets.slice((Number(list[2])-1)*100, Number(list[2])*100)); }
    const download = url.match(/\/releases\/assets\/(\d+)$/);
    if (download) { const asset = [...releases.values()].flatMap(r => r.assets).find(a => a.id === Number(download[1])); if (flags.redirect) return new Response(null, { status: 302, headers: { location: flags.redirect === true ? `https://release-assets.githubusercontent.com/fake/${asset.id}` : flags.redirect } }); return new Response(flags.corrupt ? Buffer.alloc(asset.size) : asset.bytes); }
    const upload = url.match(/^https:\/\/uploads.github.com\/repos\/moewolf-dev\/moe-icons\/releases\/(\d+)\/assets\?name=(.+)$/);
    if (upload) { const r = [...releases.values()].find(r => r.id === Number(upload[1])); const bytes = Buffer.from(options.body), name = decodeURIComponent(upload[2]); if (r.assets.some(a => a.name === name)) return json({}, 422); r.assets.push({ id: id++, name, state: 'uploaded', size: bytes.length, digest: 'sha256:' + sha256(bytes), bytes }); if (flags.loseUpload) { flags.loseUpload = false; throw Error('lost response'); } return json({}, 201); }
    throw Error('unexpected route: ' + url);
  };
  const store = githubFreeStore({ token: 'fake-public-token', publicCommit, fetchImpl });
  return { store, releases, calls, flags };
}
const row = JSON.parse(fs.readFileSync(new URL('./fixtures/free-small-package/row.json', import.meta.url)));
const bytes = fs.readFileSync(new URL('./fixtures/free-small-package/svg.tgz', import.meta.url));
const key = `packages/${row.packageSha256}.tgz`;
test('engine publishes generator fixture through HTTP adapter as independent public assets; second run is read-only', async () => {
  const f = fixture(); const set = buildCandidateSet({ fullVersion: '1.0.0', tier: 'free', sourceCommit: 'a'.repeat(40), generatorCommit: 'b'.repeat(40), packages: [row] });
  let payloadReads = 0;
  const options = { rootBytes: set.rootBytes, binding: set.candidateSet, readPage: async ref => set.pageBytesByName.get(ref.filename), readPackage: async () => { payloadReads++; return bytes; }, store: f.store };
  assert.equal((await publishFreeCandidate(options)).uploaded, 1); assert.equal(f.releases.size, 3);
  const writes = f.calls.filter(c => c.options.method === 'POST'); assert.equal(writes.length, 7);
  assert.match(writes.at(-3).url, /name=candidate-set-free.json$/);
  assert.match(writes.at(-1).url, /name=candidate-version-free.json$/);
  assert.ok(writes.every(c => !c.url.includes('pro-') && !c.url.includes('code-library')));
  const count = f.calls.length; assert.equal((await publishFreeCandidate(options)).reused, 1); assert.equal(payloadReads, 1); assert.ok(f.calls.slice(count).every(c => !c.options.method || c.options.method === 'GET'));
});
test('lost release creation and upload responses recover exact objects without another POST', async () => {
  const f = fixture(); f.flags.loseCreation = true; f.flags.loseUpload = true;
  await f.store.write(key, bytes, row); assert.deepEqual(await f.store.read(key, bytes.length), bytes);
  assert.equal(f.calls.filter(c => c.url === `${base}/releases` && c.options.method === 'POST').length, 1);
  assert.equal(f.calls.filter(c => c.url.startsWith('https://uploads.') && c.options.method === 'POST').length, 1);
});
test('foreign/private repository, permissions, duplicate/foreign assets and payload drift never overwrite public data', async () => {
  for (const kind of ['foreign', 'private', 'forbidden']) {
    const f = fixture(); f.flags[kind] = true; await assert.rejects(f.store.write(key, bytes, row)); assert.equal(f.calls.filter(c => c.options.method === 'POST').length, 0);
  }
  for (const kind of ['foreignAsset', 'duplicate', 'corrupt', 'missingListing']) {
    const f = fixture(); await f.store.write(key, bytes, row); const r = [...f.releases.values()][0];
    if (kind === 'foreignAsset') r.assets.push({ name: 'pro-secret.json' });
    if (kind === 'duplicate') r.assets.push({ ...r.assets[0] });
    if (kind === 'corrupt') f.flags.corrupt = true;
    if (kind === 'missingListing') f.flags.missingListing = true;
    const start = f.calls.length; await assert.rejects(f.store.write(key, bytes, row)); assert.equal(f.calls.slice(start).filter(c => c.options.method === 'POST').length, 0);
  }
});
test('signed asset redirects strip authorization and spoofed hosts are rejected before contact', async () => {
  const f = fixture(); await f.store.write(key, bytes, row); f.flags.redirect = true; assert.deepEqual(await f.store.read(key, bytes.length), bytes);
  for (const location of ['https://githubusercontent.com.attacker.test/file', 'http://release-assets.githubusercontent.com/file', 'https://user@release-assets.githubusercontent.com/file']) {
    f.flags.redirect = location; const start = f.calls.length; await assert.rejects(f.store.read(key, bytes.length), /untrusted/); assert.ok(f.calls.slice(start).every(c => c.url.startsWith(base)));
  }
});
test('keys and streaming budgets reject aggregate/Pro inputs, oversized bodies and truncation', async () => {
  for (const name of ['latest.json', 'production.zip', '../escape', 'candidate-set-v1-pro-' + 'a'.repeat(64) + '/candidate-set-pro.json', 'candidate-set-v1-free-' + 'a'.repeat(64) + '/package-page-free-0129.json', 'candidate-version-v1-free-latest/candidate-version-free.json']) assert.throws(() => locate(name));
  assert.equal(locate('candidate-version-v1-free-1.2.3/candidate-version-free.json').pointer, true);
  await assert.rejects(boundedBody(new Response('oversize'), 2), /budget/);
  await assert.rejects(boundedBody(new Response('x', { headers: { 'content-length': '3' } }), 3), /truncated/);
  const pro = fixture(); await assert.rejects(pro.store.write(key, bytes, { ...row, tier: 'pro', resourceKey: 'svg/pro/moe-outline' })); assert.equal(pro.calls.length, 0);
  const missing = fixture(); await assert.rejects(missing.store.write(key, bytes), /row required/); assert.equal(missing.calls.length, 0);
  const f = fixture(); await assert.rejects(f.store.write('packages/' + 'a'.repeat(64) + '.tgz', bytes), /differs/); assert.equal(f.calls.length, 0);
});
