import { test } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { syncReleasePolicy } from './sync-release-policy.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('release policy source is the frozen four-group set (D-01)', () => {
  const file = path.join(root, 'contracts', 'release-policy', 'free-style-groups.v1.json');
  const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
  assert.equal(parsed.schemaVersion, 1);
  assert.deepEqual(
    parsed.freeStyleGroups.slice().sort(),
    ['moe-colored', 'moe-lite-outline', 'moe-outline', 'moe-solid'],
  );
  const sha = crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
  assert.match(sha, /^[a-f0-9]{64}$/);
});

test('SEC-A0-03: legacy main.yml is hard-guarded and cannot write R2', () => {
  const workflow = fs.readFileSync(path.join(root, '.github', 'workflows', 'main.yml'), 'utf8');
  assert.match(workflow, /if:\s*\$\{\{\s*false\s*\}\}/, 'main.yml deploy job must carry if: false');
  assert.match(workflow, /SEC-A0-03/, 'main.yml must document the retirement reason');
});

test('sync distributes the contract as vendored bytes + PIN and detects drift', () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'release-policy-sync-'));
  try {
    const sourceRepo = path.join(temp, 'moj-icons-src');
    fs.mkdirSync(path.join(sourceRepo, 'contracts', 'release-policy'), { recursive: true });
    const contract = JSON.stringify({ schemaVersion: 1, freeStyleGroups: ['moe-colored', 'moe-lite-outline', 'moe-outline', 'moe-solid'] }, null, 2) + '\n';
    fs.writeFileSync(path.join(sourceRepo, 'contracts', 'release-policy', 'free-style-groups.v1.json'), contract);
    const consumers = [path.join(temp, 'consumer-a'), path.join(temp, 'consumer-b')];
    for (const repo of consumers) fs.mkdirSync(repo, { recursive: true });

    const first = syncReleasePolicy({ repoRoot: sourceRepo, consumers, commit: 'a'.repeat(40) });
    assert.equal(first.drifted.length, 2);
    const pin = JSON.parse(fs.readFileSync(path.join(consumers[0], 'vendor/moe-icons-release-policy/PIN.json'), 'utf8'));
    assert.equal(pin.sourceCommit, 'a'.repeat(40));
    assert.equal(pin.sha256, first.sha256);
    assert.equal(fs.readFileSync(path.join(consumers[0], 'vendor/moe-icons-release-policy/free-style-groups.v1.json'), 'utf8'), contract);

    assert.deepEqual(syncReleasePolicy({ repoRoot: sourceRepo, consumers, commit: 'a'.repeat(40), check: true }).drifted, []);
    fs.writeFileSync(path.join(consumers[1], 'vendor/moe-icons-release-policy/free-style-groups.v1.json'), '{}\n');
    const drifted = syncReleasePolicy({ repoRoot: sourceRepo, consumers, commit: 'a'.repeat(40), check: true });
    assert.deepEqual(drifted.drifted, [consumers[1]]);
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
});

test('legacy R2 secrets are confined to the retired workflow', () => {
  const workflows = fs.readdirSync(path.join(root, '.github', 'workflows'));
  for (const name of workflows) {
    const text = fs.readFileSync(path.join(root, '.github', 'workflows', name), 'utf8');
    if (text.includes('CLOUDFLARE_R2_ACCESS_KEY')) {
      assert.equal(name, 'main.yml', `legacy R2 secret referenced outside the retired workflow: ${name}`);
    }
  }
});

test('release-policy sync uses the cross-repo token for gh PR operations', () => {
  const workflow = fs.readFileSync(path.join(root, '.github', 'workflows', 'sync-release-policy.yml'), 'utf8');
  const prStep = workflow.slice(workflow.indexOf('- name: Open or update sync PR'));
  assert.match(prStep, /GH_TOKEN:\s*\$\{\{ secrets\.RELEASE_POLICY_SYNC_TOKEN \}\}/);
  assert.match(prStep, /git status --porcelain -- vendor\/moe-icons-release-policy/);
  assert.doesNotMatch(prStep, /git diff --quiet/);
  assert.match(prStep, /gh pr create/);
  // Missing token must degrade to a no-op, not fail the contract push.
  assert.match(workflow, /RELEASE_POLICY_SYNC_TOKEN is not configured/);
  assert.match(workflow, /steps\.token\.outputs\.available == 'true'/);
});

test('release-policy contract has an explicit code owner', () => {
  const codeowners = fs.readFileSync(path.join(root, '.github', 'CODEOWNERS'), 'utf8');
  assert.match(codeowners, /^\/contracts\/release-policy\/\s+@yyh0808$/m);
});

test('release-policy changes have a dedicated read-only CI check', () => {
  const workflow = fs.readFileSync(path.join(root, '.github', 'workflows', 'release-policy-check.yml'), 'utf8');
  assert.match(workflow, /pull_request:/);
  assert.match(workflow, /contracts\/release-policy\/\*\*/);
  assert.match(workflow, /permissions:\s*\n\s*contents: read/);
  assert.match(workflow, /node --test scripts\/test-release-policy\.mjs/);
});
