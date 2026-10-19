import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { canonicalBytes } from './vendor/small-pack/candidate-set.cjs';

const require = createRequire(import.meta.url);
const { dispatchWorkerPackageSet, workerCorrelationId, readPublicationReport } = require('./dispatch-worker-package-set.cjs');

function setup({ conclusion = 'success', lostPost = false } = {}) {
  const sourceDispatchId = 'a'.repeat(64), packageSetSha256 = 'b'.repeat(64);
  const correlationId = workerCorrelationId(sourceDispatchId, packageSetSha256);
  const publicationReport = {
    schemaVersion: 1, state: 'free-package-set-published', correlationId, sourceDispatchId,
    binding: { tier: 'free', fullVersion: '1.2.3', sourceCommit: 'c'.repeat(40), generatorCommit: 'd'.repeat(40), packageSetSha256 },
    producer: { runId: '456', runAttempt: 2 },
    publication: { schemaVersion: 1, tier: 'free', fullVersion: '1.2.3', sourceCommit: 'c'.repeat(40), generatorCommit: 'd'.repeat(40),
      packageSetSha256, candidateRootSha256: 'e'.repeat(64), candidateRootBytes: 321, uploaded: 3, reused: 4 },
  };
  const dir = mkdtempSync(join(tmpdir(), 'free-worker-dispatch-'));
  const reportPath = join(dir, 'free-package-set-report.json');
  writeFileSync(reportPath, canonicalBytes(publicationReport));
  const runs = new Map(), calls = [];
  const target = { async api(route, body) {
    calls.push({ route, body });
    if (route === '') return { full_name: 'moewolf-dev/moe-icons-web-worker', default_branch: 'main' };
    if (route === 'actions/workflows/free-package-set.yml') return { path: '.github/workflows/free-package-set.yml', state: 'active' };
    if (route === 'moewolf-dev/moe-icons-web-worker/dispatches') {
      assert.equal(body.event_type, 'moe-icons-free-package-set');
      assert.deepEqual(body.client_payload.binding, { tier: 'free', fullVersion: '1.2.3', sourceCommit: 'c'.repeat(40), generatorCommit: 'd'.repeat(40),
        packageSetSha256, candidateRootSha256: 'e'.repeat(64), candidateRootBytes: 321 });
      const run = { id: 789, run_attempt: 1, display_title: `worker package-set ${correlationId}`, event: 'repository_dispatch', head_branch: 'main',
        head_sha: 'f'.repeat(40), path: '.github/workflows/free-package-set.yml', status: 'completed', conclusion,
        repository: { full_name: 'moewolf-dev/moe-icons-web-worker' }, head_repository: { full_name: 'moewolf-dev/moe-icons-web-worker' } };
      runs.set(String(run.id), run);
      if (lostPost) throw Error('response lost after dispatch');
      return null;
    }
    const listed = route.match(/^actions\/workflows\/free-package-set\.yml\/runs\?event=repository_dispatch&branch=main&per_page=100&page=(\d)$/);
    if (listed) return { workflow_runs: Number(listed[1]) === 1 ? [...runs.values()] : [] };
    const detail = route.match(/^actions\/runs\/(\d+)$/);
    if (detail) return runs.get(detail[1]);
    throw Error(`unexpected route ${route}`);
  } };
  const env = { GITHUB_REPOSITORY: 'moewolf-dev/moe-icons', GITHUB_REF: 'refs/heads/main', GITHUB_EVENT_NAME: 'repository_dispatch',
    GITHUB_EVENT_ACTION: 'moe-icons-free-package-set' };
  return { dir, reportPath, publicationReport, sourceDispatchId, packageSetSha256, correlationId, runs, calls, target, env };
}

test('Free publisher receipt binds exact Free root bytes and Source/Generator provenance', async () => {
  const f = setup();
  try {
    const report = await readPublicationReport(f.reportPath);
    assert.equal(report.binding.packageSetSha256, f.packageSetSha256);
    assert.equal(report.publication.candidateRootSha256, 'e'.repeat(64));
    const receipt = await dispatchWorkerPackageSet({ reportPath: f.reportPath, runId: '777', runAttempt: 3, freeCommit: '9'.repeat(40),
      token: 'worker-dispatch-token', env: f.env, target: f.target, observation: { create: { attempts: 2, delayMs: 0 }, completion: { attempts: 2, delayMs: 0 } } });
    assert.equal(receipt.state, 'worker-package-set-run-completed');
    assert.equal(receipt.downstreamRun.conclusion, 'success');
    const dispatch = f.calls.find(call => call.route === 'moewolf-dev/moe-icons-web-worker/dispatches');
    assert.ok(dispatch);
    assert.deepEqual(dispatch.body.client_payload.freeProducer, { runId: '777', runAttempt: 3, headSha: '9'.repeat(40) });
  } finally { rmSync(f.dir, { recursive: true, force: true }); }
});

test('lost Worker dispatch response is reconciled by the exact stable correlation run', async () => {
  const f = setup({ lostPost: true });
  try {
    const receipt = await dispatchWorkerPackageSet({ reportPath: f.reportPath, runId: '777', runAttempt: 3, freeCommit: '9'.repeat(40),
      token: 'worker-dispatch-token', env: f.env, target: f.target, observation: { create: { attempts: 2, delayMs: 0 }, completion: { attempts: 2, delayMs: 0 } } });
    assert.equal(receipt.reused, false);
    assert.equal(f.calls.filter(call => call.route === 'moewolf-dev/moe-icons-web-worker/dispatches').length, 1);
    assert.equal(receipt.downstreamRun.id, '789');
  } finally { rmSync(f.dir, { recursive: true, force: true }); }
});

test('Free dispatch refuses a failed Worker result and untrusted or malformed source reports', async () => {
  const failed = setup({ conclusion: 'failure' });
  try {
    const receipt = await dispatchWorkerPackageSet({ reportPath: failed.reportPath, runId: '777', runAttempt: 3, freeCommit: '9'.repeat(40),
      token: 'worker-dispatch-token', env: failed.env, target: failed.target, observation: { create: { attempts: 2, delayMs: 0 }, completion: { attempts: 2, delayMs: 0 } } });
    assert.equal(receipt.downstreamRun.conclusion, 'failure');
    const changed = { ...failed.publicationReport, correlationId: 'free-package-set-' + 'f'.repeat(64) };
    const path = join(failed.dir, 'bad.json'); writeFileSync(path, canonicalBytes(changed));
    await assert.rejects(readPublicationReport(path), /correlation identity/);
    await assert.rejects(dispatchWorkerPackageSet({ reportPath: failed.reportPath, runId: '777', runAttempt: 3, freeCommit: '9'.repeat(40),
      token: 'worker-dispatch-token', env: { ...failed.env, GITHUB_REF: 'refs/heads/feature' }, target: failed.target }), /trusted Free package-set/);
  } finally { rmSync(failed.dir, { recursive: true, force: true }); }
});
