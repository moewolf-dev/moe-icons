import { test } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { syncReleasePolicy } from './sync-release-policy.mjs';
import { evaluateSyncReadiness } from './sync-release-policy-readiness.mjs';
import { validateFreeReleaseBinding, verifyCommitContract } from './validate-release-event-binding.mjs';

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

test('AUD-BLOCK-08: sync readiness is explicit and fails when required', () => {
  assert.deepEqual(evaluateSyncReadiness({ tokenPresent: true }), {
    ready: true,
    status: 'READY',
    reason: 'RELEASE_POLICY_SYNC_TOKEN is configured; consumer PR sync can run',
  });
  const notReady = evaluateSyncReadiness({ tokenPresent: false });
  assert.equal(notReady.ready, false);
  assert.equal(notReady.status, 'NOT_READY');
  const required = evaluateSyncReadiness({ tokenPresent: false, requireSync: true });
  assert.equal(required.ready, false);
  assert.equal(required.status, 'NOT_READY');
  assert.match(required.reason, /MOEICONS_POLICY_SYNC_REQUIRED/);
});

test('AUD-BLOCK-08: sync workflow exposes a readiness check and warns when inactive', () => {
  const workflow = fs.readFileSync(path.join(root, '.github', 'workflows', 'sync-release-policy.yml'), 'utf8');
  assert.match(workflow, /sync-release-policy-readiness\.mjs/);
  assert.match(workflow, /MOEICONS_POLICY_SYNC_REQUIRED/);
  assert.match(workflow, /GITHUB_STEP_SUMMARY/);
  assert.doesNotMatch(workflow, /::notice::RELEASE_POLICY_SYNC_TOKEN is not configured/);
  assert.match(workflow, /::warning::NOT_READY/);
  assert.ok(fs.existsSync(path.join(root, 'scripts', 'sync-release-policy-readiness.mjs')));
});

test('DEV-20-01: public Free binding must match the checked-out contract and forbid Pro batch', () => {
  const contractBytes = fs.readFileSync(path.join(root, 'contracts', 'release-policy', 'free-style-groups.v1.json'));
  const sha = crypto.createHash('sha256').update(contractBytes).digest('hex');
  const binding = { releasePolicyCommit: 'a'.repeat(40), releasePolicySha256: sha, mediaContractVersion: '2', sourceManifestSchemaVersion: '2', releaseScope: 'free' };
  const result = validateFreeReleaseBinding(binding, contractBytes);
  assert.equal(result.releaseScope, 'free');

  assert.throws(
    () => validateFreeReleaseBinding({ ...binding, releaseScope: 'pro' }, contractBytes),
    /releaseScope must be free/,
  );
  assert.throws(
    () => validateFreeReleaseBinding({ ...binding, bitmapBatch: { styleGroupIds: ['moe-3d-metal'] } }, contractBytes),
    /must not carry a Pro bitmapBatch/,
  );
  assert.throws(
    () => validateFreeReleaseBinding({ ...binding, mediaContractVersion: '1' }, contractBytes),
    /illegal binding version combination/,
  );
  assert.throws(
    () => validateFreeReleaseBinding({ ...binding, extra: true }, contractBytes),
    /unknown field/,
  );
  assert.throws(
    () => validateFreeReleaseBinding({ ...binding, releasePolicySha256: 'b'.repeat(64) }, contractBytes),
    /checked-out contract/,
  );
  assert.throws(() => validateFreeReleaseBinding(null, contractBytes), /missing the binding object/);
});

test('DEV-20-01: free-release workflow validates the nested binding', () => {
  const workflow = fs.readFileSync(path.join(root, '.github', 'workflows', 'free-release.yml'), 'utf8');
  assert.match(workflow, /toJson\(github\.event\.client_payload\.binding\)/);
  assert.match(workflow, /validate-release-event-binding\.mjs/);
  assert.match(workflow, /manual runs must supply binding/);
  assert.match(workflow, /binding:/);
  assert.match(workflow, /github\.event\.client_payload\.artifact\.id/);
});

test('DEV-20-05: public probe takes frozen artifact/run/digest inputs and reports stable statuses', () => {
  const workflow = fs.readFileSync(path.join(root, '.github', 'workflows', 'secrets-permission-probe.yml'), 'utf8');
  for (const input of ['artifact_id', 'expected_sha256', 'expected_head_sha', 'expected_run_id']) {
    assert.match(workflow, new RegExp(`${input}:`), `probe input ${input} required`);
  }
  assert.match(workflow, /PRESENT=/);
  assert.match(workflow, /AUTH_OK=/);
  assert.match(workflow, /SCOPE_OK=/);
  assert.match(workflow, /TARGET_OK=/);
  assert.match(workflow, /expired/);
  assert.doesNotMatch(workflow, /ARTIFACT_ID:\s*"[0-9]+"/, 'no hard-coded artifact id');
  // FIX-22-E: run/head are required and TARGET_OK is set only after the digest check.
  assert.doesNotMatch(workflow, /expected_head_sha:[\s\S]{0,60}required:\s*false/, 'head sha must be required');
  assert.ok(workflow.indexOf('TARGET_OK=OK') > workflow.indexOf('artifact sha256'), 'TARGET_OK must follow the digest check');
});

test('FIX-22-A: public commit must really contain the pinned contract bytes', async () => {
  const contractBytes = fs.readFileSync(path.join(root, 'contracts', 'release-policy', 'free-style-groups.v1.json'));
  const sha = crypto.createHash('sha256').update(contractBytes).digest('hex');
  const toArrayBuffer = (buffer) => buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
  const okFetch = async (url) => {
    assert.match(url, /raw\.githubusercontent\.com\/moewolf-dev\/moe-icons\/[0-9a-f]{40}\//);
    return { ok: true, status: 200, arrayBuffer: async () => toArrayBuffer(contractBytes) };
  };
  const result = await verifyCommitContract({ sourceCommit: 'a'.repeat(40), expectedSha256: sha, fetchImpl: okFetch });
  assert.equal(result.sha256, sha);

  // 40 zeros must fail because the commit does not resolve to contract bytes.
  await assert.rejects(
    () => verifyCommitContract({ sourceCommit: '0'.repeat(40), expectedSha256: sha, fetchImpl: async () => ({ ok: false, status: 404 }) }),
    /HTTP 404/,
  );
  await assert.rejects(
    () => verifyCommitContract({ sourceCommit: 'a'.repeat(40), expectedSha256: 'b'.repeat(64), fetchImpl: okFetch }),
    /!= event/,
  );
  await assert.rejects(
    () => verifyCommitContract({ sourceCommit: 'a'.repeat(40), expectedSha256: sha, fetchImpl: async () => { throw new Error('network down'); } }),
    /fetch failed/,
  );
  await assert.rejects(() => verifyCommitContract({ sourceCommit: 'nope', expectedSha256: sha, fetchImpl: okFetch }), /40-hex/);
});

test('FIX-22-A: free-release workflow verifies the pinned commit, not just the format', () => {
  const workflow = fs.readFileSync(path.join(root, '.github', 'workflows', 'free-release.yml'), 'utf8');
  assert.match(workflow, /validate-release-event-binding\.mjs/);
  assert.doesNotMatch(workflow, /--no-verify-commit/, 'acceptance must verify the pinned commit');
});
