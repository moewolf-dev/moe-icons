import { test } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { syncWebsiteProjection, DEFAULT_REPOS } from './sync-website-projection.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const REQUIRED = [
  'website-icon-projection-v1.md',
  'website-catalog-v1.schema.json',
  'website-release-v1.schema.json',
  'website-activation-receipt-v1.schema.json',
  'website-api-v1.schema.json',
];

function seedSource(dir) {
  const sourceDir = path.join(dir, 'contracts', 'website-projection');
  fs.mkdirSync(sourceDir, { recursive: true });
  const files = {};
  for (const [index, name] of REQUIRED.entries()) {
    const bytes = Buffer.from(`file-${index}:${name}\n`);
    fs.writeFileSync(path.join(sourceDir, name), bytes);
    files[name] = bytes;
  }
  return files;
}

test('DEV-A01: the published mirror contains exactly the frozen five files', () => {
  const sourceDir = path.join(root, 'contracts', 'website-projection');
  const names = fs.readdirSync(sourceDir).filter((name) => name !== 'README.md').sort();
  assert.deepEqual(names, [...REQUIRED].sort());
  for (const name of REQUIRED) {
    const sha = crypto.createHash('sha256').update(fs.readFileSync(path.join(sourceDir, name))).digest('hex');
    assert.match(sha, /^[a-f0-9]{64}$/);
  }
  // Schemas are valid JSON.
  for (const name of REQUIRED.filter((n) => n.endsWith('.schema.json'))) {
    JSON.parse(fs.readFileSync(path.join(sourceDir, name), 'utf8'));
  }
});

test('DEV-A01: sync vendors all files + per-file PIN and detects drift', () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'website-projection-sync-'));
  try {
    const sourceRepo = path.join(temp, 'moe-icons-mirror');
    const files = seedSource(sourceRepo);
    const consumers = [path.join(temp, 'consumer-a'), path.join(temp, 'consumer-b')];
    for (const repo of consumers) fs.mkdirSync(repo, { recursive: true });

    const first = syncWebsiteProjection({ repoRoot: sourceRepo, consumers, commit: 'a'.repeat(40) });
    assert.deepEqual(first.drifted, consumers);
    const pin = JSON.parse(fs.readFileSync(path.join(consumers[0], 'vendor/moe-icons-website-projection/PIN.json'), 'utf8'));
    assert.equal(pin.sourceCommit, 'a'.repeat(40));
    assert.equal(pin.sourcePath, 'contracts/website-projection');
    for (const name of REQUIRED) {
      assert.equal(pin.files[name], crypto.createHash('sha256').update(files[name]).digest('hex'));
      assert.deepEqual(fs.readFileSync(path.join(consumers[0], 'vendor/moe-icons-website-projection', name)), files[name]);
    }

    assert.deepEqual(syncWebsiteProjection({ repoRoot: sourceRepo, consumers, commit: 'a'.repeat(40), check: true }).drifted, []);
    fs.writeFileSync(path.join(consumers[1], 'vendor/moe-icons-website-projection', REQUIRED[0]), 'tampered\n');
    assert.deepEqual(
      syncWebsiteProjection({ repoRoot: sourceRepo, consumers, commit: 'a'.repeat(40), check: true }).drifted,
      [consumers[1]],
    );
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
});

test('DEV-A01/DEC-78: the sync targets exactly the five vendored consumers', () => {
  assert.deepEqual(DEFAULT_REPOS, [
    'moe-icons-library',
    'moe-icons-code-library',
    'moe-icons-cli',
    'moe-icons-web-worker',
    'moe-icons-website',
  ]);
});

test('GATE-WEBSITE-CONTRACT-BYTES: root/public/five-vendor bytes are identical', () => {
  const workspace = path.resolve(root, '..');
  const rootContracts = path.join(workspace, 'docs', 'contracts');
  if (!fs.existsSync(rootContracts)) return; // standalone CI checkout
  for (const name of REQUIRED) {
    const mirror = fs.readFileSync(path.join(root, 'contracts', 'website-projection', name));
    assert.deepEqual(fs.readFileSync(path.join(rootContracts, name)), mirror, `root docs/contracts/${name} != public mirror`);
  }
  for (const repo of DEFAULT_REPOS) {
    const vendorDir = path.join(workspace, repo, 'vendor', 'moe-icons-website-projection');
    if (!fs.existsSync(vendorDir)) continue;
    for (const name of REQUIRED) {
      const mirror = fs.readFileSync(path.join(root, 'contracts', 'website-projection', name));
      assert.deepEqual(fs.readFileSync(path.join(vendorDir, name)), mirror, `${repo}/${name} != public mirror`);
    }
    const pin = JSON.parse(fs.readFileSync(path.join(vendorDir, 'PIN.json'), 'utf8'));
    assert.deepEqual(Object.keys(pin.files).sort(), [...REQUIRED].sort());
  }
});

test('DEV-A01: sync rejects non-commit refs and unexpected mirror files', () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'website-projection-neg-'));
  try {
    const sourceRepo = path.join(temp, 'moe-icons-mirror');
    seedSource(sourceRepo);
    const consumer = path.join(temp, 'consumer');
    fs.mkdirSync(consumer, { recursive: true });
    assert.throws(() => syncWebsiteProjection({ repoRoot: sourceRepo, consumers: [consumer], commit: 'main' }), /40-hex/);
    fs.writeFileSync(path.join(sourceRepo, 'contracts', 'website-projection', 'extra.json'), '{}\n');
    assert.throws(() => syncWebsiteProjection({ repoRoot: sourceRepo, consumers: [consumer], commit: 'a'.repeat(40) }), /unexpected/);
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
});
