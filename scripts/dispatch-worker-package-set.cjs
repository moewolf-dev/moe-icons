'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { canonicalBytes } = require('./vendor/small-pack/candidate-set.cjs');

const TARGET = 'moewolf-dev/moe-icons-web-worker';
const WORKFLOW = 'free-package-set.yml';
const EVENT_TYPE = 'moe-icons-free-package-set';
const COMPLETE_ATTEMPTS = 135;
const COMPLETE_DELAY_MS = 60_000;
const SHA = /^[a-f0-9]{64}$/;
const COMMIT = /^[a-f0-9]{40}$/;
const assert = (ok, message) => { if (!ok) throw Error(`dispatch-worker-package-set: ${message}`); };
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

function workerCorrelationId(sourceDispatchId, packageSetSha256) {
  assert(SHA.test(sourceDispatchId || '') && SHA.test(packageSetSha256 || ''), 'exact Source and Free set identities required');
  const digest = createHash('sha256').update(`moe-icons-free-package-set-v1\n${sourceDispatchId}\n${packageSetSha256}\n`, 'utf8').digest('hex');
  return `free-package-set-${digest}`;
}

function workerTransport(token, fetchImpl = globalThis.fetch) {
  assert(typeof token === 'string' && token.length > 0 && !/[\r\n]/.test(token), 'Worker repository dispatch token required');
  const base = `https://api.github.com/repos/${TARGET}`;
  const runsRoute = new RegExp(`^actions/workflows/${WORKFLOW}/runs\\?event=repository_dispatch&branch=main&per_page=100&page=[1-5]$`);
  async function api(route, body) {
    assert(route === '' || route === `actions/workflows/${WORKFLOW}` || route === `${TARGET}/dispatches`
      || runsRoute.test(route) || /^actions\/runs\/[1-9]\d*$/.test(route), 'unsupported Worker API route');
    const url = route === `${TARGET}/dispatches` ? `https://api.github.com/repos/${route}` : `${base}${route ? `/${route}` : ''}`;
    let response;
    try {
      response = await fetchImpl(url, { method: body ? 'POST' : 'GET', redirect: 'error', signal: AbortSignal.timeout(body ? 120000 : 20000),
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', 'User-Agent': 'moe-icons-free-package-set' },
        ...(body ? { body: JSON.stringify(body), headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', 'User-Agent': 'moe-icons-free-package-set', 'Content-Type': 'application/json' } } : {}) });
    } catch { throw Error('Worker GitHub request failed'); }
    if (!response.ok) { const status = response.status; await response.body?.cancel(); throw Object.assign(Error(`Worker GitHub HTTP ${status}`), { status }); }
    if (response.status === 204) { await response.body?.cancel(); return null; }
    const bytes = Buffer.from(await response.arrayBuffer());
    assert(bytes.length <= 1024 ** 2, 'Worker API response exceeds one MiB');
    try { return JSON.parse(bytes); } catch { throw Error('Worker API returned invalid JSON'); }
  }
  return { api };
}

function validateRun(run, correlationId) {
  assert(run && run.display_title === `worker package-set ${correlationId}` && run.event === 'repository_dispatch'
    && run.head_branch === 'main' && [`.github/workflows/${WORKFLOW}`, `.github/workflows/${WORKFLOW}@refs/heads/main`].includes(run.path),
  'Worker run correlation/workflow identity mismatch');
  assert(String(run.id).match(/^[1-9]\d*$/) && Number.isSafeInteger(run.run_attempt) && run.run_attempt > 0
    && COMMIT.test(run.head_sha || '') && run.repository?.full_name === TARGET && run.head_repository?.full_name === TARGET,
  'Worker run producer identity invalid');
  assert(['queued', 'in_progress', 'completed', 'waiting', 'requested', 'pending'].includes(run.status)
    && (run.status !== 'completed' || typeof run.conclusion === 'string'), 'Worker run status invalid');
  return { id: String(run.id), attempt: run.run_attempt, headSha: run.head_sha, status: run.status, conclusion: run.conclusion || null };
}

async function findRun(target, correlationId) {
  for (let page = 1; page <= 5; page += 1) {
    const result = await target.api(`actions/workflows/${WORKFLOW}/runs?event=repository_dispatch&branch=main&per_page=100&page=${page}`);
    assert(result && Array.isArray(result.workflow_runs), 'invalid Worker workflow run listing');
    const matches = result.workflow_runs.filter(run => run.display_title === `worker package-set ${correlationId}`);
    assert(matches.length <= 1, 'duplicate Worker runs share the package-set identity');
    if (matches.length) {
      const listed = validateRun(matches[0], correlationId), detail = validateRun(await target.api(`actions/runs/${listed.id}`), correlationId);
      assert(detail.id === listed.id && detail.headSha === listed.headSha, 'Worker run detail differs from listing');
      return detail;
    }
    if (result.workflow_runs.length < 100) return null;
  }
  throw Error('dispatch-worker-package-set: Worker history exceeds bounded correlation search');
}

async function readPublicationReport(file) {
  const stat = await fs.lstat(file);
  assert(stat.isFile() && !stat.isSymbolicLink() && stat.size > 0 && stat.size <= 1024 ** 2, 'bounded Free publication receipt required');
  const bytes = await fs.readFile(file);
  assert(bytes.length === stat.size && bytes.length <= 1024 ** 2, 'Free publication receipt changed while reading');
  let report;
  try { report = JSON.parse(bytes); } catch { assert(false, 'Free publication receipt is invalid JSON'); }
  assert(bytes.equals(canonicalBytes(report)) && report.schemaVersion === 1 && report.state === 'free-package-set-published', 'canonical successful Free publication receipt required');
  const { binding, sourceDispatchId, producer, publication, correlationId } = report;
  assert(binding?.tier === 'free' && SHA.test(sourceDispatchId || '') && COMMIT.test(binding.sourceCommit || '')
    && COMMIT.test(binding.generatorCommit || '') && SHA.test(binding.packageSetSha256 || '')
    && publication?.tier === 'free' && publication.fullVersion === binding.fullVersion
    && publication.sourceCommit === binding.sourceCommit && publication.generatorCommit === binding.generatorCommit
    && publication.packageSetSha256 === binding.packageSetSha256 && SHA.test(publication.candidateRootSha256 || '')
    && Number.isSafeInteger(publication.candidateRootBytes) && publication.candidateRootBytes > 0,
  'Free publication root/set identity is invalid');
  assert(correlationId === workerCorrelationId(sourceDispatchId, binding.packageSetSha256), 'Free publication correlation identity mismatch');
  assert(producer && /^[1-9]\d*$/.test(String(producer.runId)) && Number.isSafeInteger(producer.runAttempt) && producer.runAttempt > 0,
    'exact Generator producer identity missing from Free receipt');
  return report;
}

async function dispatchWorkerPackageSet({ reportPath = process.env.FREE_PACKAGE_SET_REPORT, runId = process.env.GITHUB_RUN_ID,
  runAttempt = Number(process.env.GITHUB_RUN_ATTEMPT), freeCommit = process.env.GITHUB_SHA,
  token = process.env.MOEICONS_WORKER_PACKAGE_SET_DISPATCH_TOKEN, env = process.env, target, observation = {} } = {}) {
  assert(env.GITHUB_REPOSITORY === 'moewolf-dev/moe-icons' && env.GITHUB_REF === 'refs/heads/main'
    && env.GITHUB_EVENT_NAME === 'repository_dispatch' && env.GITHUB_EVENT_ACTION === EVENT_TYPE,
  'trusted Free package-set main run required');
  assert(/^[1-9]\d*$/.test(String(runId)) && Number.isSafeInteger(runAttempt) && runAttempt > 0 && COMMIT.test(freeCommit || ''), 'Free publisher run identity invalid');
  const report = await readPublicationReport(path.resolve(reportPath));
  const id = report.correlationId;
  const binding = { tier: 'free', fullVersion: report.binding.fullVersion, sourceCommit: report.binding.sourceCommit,
    generatorCommit: report.binding.generatorCommit, packageSetSha256: report.binding.packageSetSha256,
    candidateRootSha256: report.publication.candidateRootSha256, candidateRootBytes: report.publication.candidateRootBytes };
  const payload = { schemaVersion: 1, correlationId: id, sourceDispatchId: report.sourceDispatchId, binding,
    freeProducer: { runId: String(runId), runAttempt, headSha: freeCommit } };
  target ||= workerTransport(token);
  const repo = await target.api('');
  assert(repo.full_name === TARGET && repo.default_branch === 'main', 'Worker target repository authority mismatch');
  const existing = await findRun(target, id);
  let run = existing, reused = Boolean(existing), postError = false;
  if (!run) {
    const workflow = await target.api(`actions/workflows/${WORKFLOW}`);
    assert(workflow.path === `.github/workflows/${WORKFLOW}` && workflow.state === 'active', 'Worker package-set workflow is not active');
    try { await target.api(`${TARGET}/dispatches`, { event_type: EVENT_TYPE, client_payload: payload }); }
    catch { postError = true; }
    const attempts = observation.create?.attempts ?? 13, delayMs = observation.create?.delayMs ?? 5000, pause = observation.create?.sleep ?? sleep;
    for (let i = 0; i < attempts && !run; i += 1) {
      run = await findRun(target, id);
      if (!run && i + 1 < attempts) await pause(delayMs);
    }
    assert(run, postError ? 'dispatch response was lost and no Worker run appeared; rerun Free to reconcile' : 'no correlated Worker run appeared; rerun Free to reconcile');
  }
  const attempts = observation.completion?.attempts ?? COMPLETE_ATTEMPTS, delayMs = observation.completion?.delayMs ?? COMPLETE_DELAY_MS;
  const pause = observation.completion?.sleep ?? sleep;
  for (let i = 0; i < attempts && run.status !== 'completed'; i += 1) {
    if (i > 0) run = validateRun(await target.api(`actions/runs/${run.id}`), id);
    if (run.status !== 'completed' && i + 1 < attempts) await pause(delayMs);
  }
  assert(run.status === 'completed', `Worker package-set run did not finish within the bounded wait (${id}); rerun Free to reconcile`);
  return { schemaVersion: 1, state: 'worker-package-set-run-completed', reused, correlationId: id,
    sourceDispatchId: report.sourceDispatchId, binding, producer: payload.freeProducer, downstreamRun: run };
}

async function main() {
  const receipt = await dispatchWorkerPackageSet();
  await fs.writeFile(path.resolve('worker-package-set-dispatch.json'), canonicalBytes(receipt), { flag: 'wx', mode: 0o600 });
  assert(receipt.downstreamRun.conclusion === 'success', `Worker package-set run ${receipt.downstreamRun.id} completed with ${receipt.downstreamRun.conclusion}`);
}

if (require.main === module) main().catch(error => { process.stderr.write(`${error.message}\n`); process.exitCode = 1; });
module.exports = { workerCorrelationId, workerTransport, validateRun, findRun, readPublicationReport, dispatchWorkerPackageSet, TARGET, WORKFLOW, EVENT_TYPE };
