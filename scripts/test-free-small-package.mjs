import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import { verifySmallPackPin } from './verify-small-pack-pin.mjs';
const require = createRequire(import.meta.url);
const { publishFreeCandidate, verifyFreePackage } = require('./free-small-package.cjs');
const { canonicalBytes, sha256, buildCandidateSet } = require('./vendor/small-pack/candidate-set.cjs');
function unit({ tier = 'free', group = 'moe-outline', extra = {}, manifestScope = {}, links = false } = {}) {
  const scope = { kind: 'svg', tier, styleGroupId: group };
  const payload = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>');
  const files = { 'sample.svg': payload, ...extra };
  const manifest = canonicalBytes({ schemaVersion: 1, ...scope, ...manifestScope, files: Object.entries(files).map(([path, bytes]) => ({ path, byteSize: bytes.length, sha256: sha256(bytes) })) });
  files['manifest.json'] = manifest;
  const bytes = execFileSync('python3', ['-c', `import sys,json,base64,io,tarfile,gzip
out=io.BytesIO()
with tarfile.open(fileobj=out,mode='w',format=tarfile.USTAR_FORMAT) as tar:
 for name,raw in json.loads(sys.argv[1]).items():
  data=base64.b64decode(raw); info=tarfile.TarInfo(name); info.size=len(data); info.mode=420; tar.addfile(info,io.BytesIO(data))
 if sys.argv[2]=='true':
  info=tarfile.TarInfo('linked.svg'); info.type=tarfile.SYMTYPE; info.linkname='sample.svg'; tar.addfile(info)
sys.stdout.buffer.write(gzip.compress(out.getvalue(),mtime=0))`, JSON.stringify(Object.fromEntries(Object.entries(files).map(([n,b]) => [n,b.toString('base64')]))), String(links)]);
  const row = { ...scope, resourceKey: `svg/${tier}/${group}`, fullVersion: '1.0.0', packageSha256: sha256(bytes), filename: `packages/${sha256(bytes)}.tgz`, compressedBytes: bytes.length, expandedBytes: Object.values(files).reduce((n,b) => n+b.length,0), fileCount: Object.keys(files).length, dependencies: [] };
  return { bytes, row };
}
function websiteUnit({ group = 'moe-solid', extra = {} } = {}) {
  const scope = { kind: 'website', tier: 'free', styleGroupId: group };
  const files = {
    'website/catalog.json': Buffer.from('{"schemaVersion":1}\n'),
    [`website/indexes/${group}/search.json`]: Buffer.from('{"schemaVersion":1}\n'),
    [`website/snippets/${group}/sample.json`]: Buffer.from('{"schemaVersion":1}\n'),
    [`website/assets/${group}/sample.svg`]: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>'),
    ...extra,
  };
  const manifest = canonicalBytes({ schemaVersion: 1, ...scope, files: Object.entries(files).map(([path, bytes]) => ({ path, byteSize: bytes.length, sha256: sha256(bytes) })) });
  files['manifest.json'] = manifest;
  const py = [
    'import sys,json,base64,io,tarfile,gzip',
    'out=io.BytesIO()',
    'with tarfile.open(fileobj=out,mode="w",format=tarfile.USTAR_FORMAT) as tar:',
    ' for name,raw in json.loads(sys.argv[1]).items():',
    '  data=base64.b64decode(raw); info=tarfile.TarInfo(name); info.size=len(data); info.mode=420; tar.addfile(info,io.BytesIO(data))',
    'sys.stdout.buffer.write(gzip.compress(out.getvalue(),mtime=0))',
  ].join('\n');
  const encoded = JSON.stringify(Object.fromEntries(Object.entries(files).map(([name, value]) => [name, value.toString('base64')])));
  const bytes = execFileSync('python3', ['-c', py, encoded]);
  const row = { ...scope, resourceKey: `website/free/${group}`, fullVersion: '1.0.0', packageSha256: sha256(bytes),
    filename: `packages/${sha256(bytes)}.tgz`, compressedBytes: bytes.length,
    expandedBytes: Object.values(files).reduce((sum, value) => sum + value.length, 0), fileCount: Object.keys(files).length, dependencies: [] };
  return { bytes, row };
}
function setup(units) {
  const built = buildCandidateSet({ fullVersion: '1.0.0', tier: units[0].row.tier, sourceCommit: 'a'.repeat(40), generatorCommit: 'b'.repeat(40), packages: units.map(u => u.row) });
  const root = built.candidateSet; const objects = new Map(), reads = [], writes = [], fetched = [];
  const options = { rootBytes: built.rootBytes, binding: root,
    readPage: async ref => built.pageBytesByName.get(ref.filename),
    readPackage: async row => { fetched.push(row.resourceKey); return units.find(u => u.row.packageSha256 === row.packageSha256).bytes; },
    store: { read: async name => { reads.push(name); return objects.get(name) ?? null; }, write: async (name, bytes) => { writes.push(name); assert.ok(!objects.has(name)); objects.set(name, Buffer.from(bytes)); } } };
  return { options, objects, reads, writes, fetched, root };
}
test('Free publication mirrors individual verified packages and JSON root last; rerun reuses payload without private fetch', async () => {
  const f = setup([unit()]); const result = await publishFreeCandidate(f.options);
  assert.equal(result.uploaded, 1); assert.match(f.writes[0], /^packages\/[a-f0-9]{64}\.tgz$/); assert.match(f.writes.at(-2), /candidate-set-free.json$/); assert.match(f.writes.at(-1), /candidate-version-free.json$/);
  assert.ok(f.writes.every(n => !/pro|\.zip|\.bin/.test(n)));
  f.fetched.length = 0; f.writes.length = 0;
  assert.equal((await publishFreeCandidate(f.options)).reused, 1); assert.deepEqual(f.fetched, []); assert.deepEqual(f.writes, []);
});
test('Free publication accepts scoped website packages and rejects group leakage', async () => {
  const website = websiteUnit();
  assert.equal(verifyFreePackage(website.row, website.bytes).fileCount, website.row.fileCount);
  const f = setup([website]);
  assert.equal((await publishFreeCandidate(f.options)).uploaded, 1);
  assert.ok(f.writes.some(name => name.startsWith('packages/')));

  const outside = setup([websiteUnit({ group: 'moe-private' })]);
  await assert.rejects(publishFreeCandidate(outside.options), /candidate includes a group outside Free policy/);
  assert.deepEqual(outside.writes, []);
  assert.deepEqual(outside.fetched, []);

  const foreignMember = websiteUnit({ extra: { 'website/assets/moe-private/foreign.svg': Buffer.from('<svg/>') } });
  assert.throws(() => verifyFreePackage(foreignMember.row, foreignMember.bytes), /outside its declared group/);
});
test('Pro root, non-Free group, binding drift and corrupt metadata reject before any public writes', async () => {
  for (const kind of ['pro', 'group', 'binding', 'page']) {
    const f = setup([unit(kind === 'pro' ? { tier: 'pro' } : kind === 'group' ? { group: 'moe-private' } : {})]);
    if (kind === 'binding') f.options.binding = { ...f.root, sourceCommit: 'c'.repeat(40) };
    if (kind === 'page') f.options.readPage = async () => Buffer.from('{}');
    await assert.rejects(publishFreeCandidate(f.options)); assert.deepEqual(f.writes, []); assert.deepEqual(f.fetched, []);
  }
});
test('package corruption, foreign manifest, traversal, nested aggregate and links do not expose a root', async () => {
  for (const opts of [{ manifestScope: { tier: 'pro' } }, { extra: { '../escape.svg': Buffer.from('x') } }, { extra: { 'nested.tgz': Buffer.from('archive') } }, { links: true }]) {
    const u = unit(opts); assert.throws(() => verifyFreePackage(u.row, u.bytes));
    const f = setup([u]); await assert.rejects(publishFreeCandidate(f.options)); assert.deepEqual(f.writes, []);
  }
  const f = setup([unit()]); f.options.readPackage = async () => Buffer.from('bad');
  await assert.rejects(publishFreeCandidate(f.options)); assert.deepEqual(f.writes, []);
});
test('partial package failure leaves no candidate root; rerun reuses first object and completes', async () => {
  const f = setup([unit(), unit({ group: 'moe-solid' })]); const original = f.options.readPackage;
  f.options.readPackage = async row => { if (row.styleGroupId === 'moe-solid') throw Error('interrupted'); return original(row); };
  await assert.rejects(publishFreeCandidate(f.options), /interrupted/);
  assert.equal(f.objects.size, 1); assert.ok([...f.objects.keys()].every(n => n.startsWith('packages/')));
  f.options.readPackage = original; f.fetched.length = 0;
  const result = await publishFreeCandidate(f.options); assert.equal(result.reused, 1); assert.equal(result.uploaded, 1); assert.deepEqual(f.fetched, ['svg/free/moe-solid']);
});
test('lost upload response recovers by exact readback; conflicting immutable bytes never overwrite', async () => {
  const f = setup([unit()]); const original = f.options.store.write;
  f.options.store.write = async (...args) => { await original(...args); throw Error('lost response'); };
  await publishFreeCandidate(f.options);
  const name = [...f.objects.keys()].find(n => n.startsWith('packages/')); f.objects.set(name, Buffer.from('corrupt'));
  const count = f.writes.length; await assert.rejects(publishFreeCandidate(f.options)); assert.equal(f.writes.length, count);
});
test('vendored parsing modules retain pinned SHA-256 bytes', () => {
  verifySmallPackPin();
  const pin = JSON.parse(fs.readFileSync(new URL('./vendor/small-pack/PIN.json', import.meta.url)));
  assert.match(pin.sourceCommit, /^[a-f0-9]{40}$/, 'vendored modules must pin a full immutable Generator commit');
  for (const [name, digest] of Object.entries(pin.files)) assert.equal(sha256(fs.readFileSync(new URL('./vendor/small-pack/' + name, import.meta.url))), digest);
});

test('actual generator deterministic tar fixture validates through the independent Free consumer', async () => {
  const row = JSON.parse(fs.readFileSync(new URL('./fixtures/free-small-package/row.json', import.meta.url)));
  const bytes = fs.readFileSync(new URL('./fixtures/free-small-package/svg.tgz', import.meta.url));
  assert.equal(verifyFreePackage(row, bytes).fileCount, row.fileCount);
  const f = setup([{ row, bytes }]);
  assert.equal((await publishFreeCandidate(f.options)).uploaded, 1);
});
