'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { canonicalBytes } = require('./vendor/small-pack/candidate-set.cjs');
const { upstreamTransport, readFreeUpstream } = require('./read-free-upstream.cjs');
const { githubFreeStore } = require('./github-free-package-store.cjs');
const { publishFreeCandidate } = require('./free-small-package.cjs');

const REPOSITORY = 'moewolf-dev/moe-icons';
const SOURCE_ID = /^[a-f0-9]{64}$/;
const COMMIT = /^[a-f0-9]{40}$/;
const HEX = /^[a-f0-9]{64}$/;
const assert = (ok, message) => { if (!ok) throw Error(`publish-free-package-set: ${message}`); };
const exactKeys = (value, keys) => value && typeof value === 'object' && !Array.isArray(value)
  && Object.keys(value).sort().join(',') === [...keys].sort().join(',');
function freePackageSetCorrelation(sourceDispatchId, packageSetSha256) {
  assert(SOURCE_ID.test(sourceDispatchId || '') && HEX.test(packageSetSha256 || ''), 'exact Source and Free set identities required');
  return `free-package-set-${createHash('sha256').update(`moe-icons-free-package-set-v1\n${sourceDispatchId}\n${packageSetSha256}\n`, 'utf8').digest('hex')}`;
}
function validateFreePackageSetEvent(event) {
  assert(event && event.action === 'moe-icons-free-package-set', 'exact package-set repository_dispatch event required');
  const payload = event.client_payload;
  assert(exactKeys(payload, ['schemaVersion', 'correlationId', 'sourceDispatchId', 'binding', 'producer']), 'exact package-set payload required');
  assert(payload.schemaVersion === 1 && SOURCE_ID.test(payload.sourceDispatchId || ''), 'package-set event identity invalid');
  const binding = payload.binding;
  assert(exactKeys(binding, ['tier', 'fullVersion', 'sourceCommit', 'generatorCommit', 'packageSetSha256']), 'exact Free binding required');
  assert(binding.tier === 'free' && /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-(?:alpha|beta)(?:\.(0|[1-9]\d*))?)?$/.test(binding.fullVersion || '')
    && COMMIT.test(binding.sourceCommit || '') && COMMIT.test(binding.generatorCommit || '') && HEX.test(binding.packageSetSha256 || ''), 'Free binding identity invalid');
  assert(payload.correlationId === freePackageSetCorrelation(payload.sourceDispatchId, binding.packageSetSha256), 'Free correlation identity mismatch');
  const producer = payload.producer;
  assert(exactKeys(producer, ['runId', 'runAttempt']) && /^[1-9]\d*$/.test(String(producer.runId))
    && Number.isSafeInteger(producer.runAttempt) && producer.runAttempt > 0, 'exact Generator run and attempt required');
  return payload;
}
async function processFreePackageSetEvent({ event, env = process.env, outputPath, makeTransport = upstreamTransport, makeStore = githubFreeStore,
  readInput = readFreeUpstream, publish = publishFreeCandidate } = {}) {
  assert(env.GITHUB_REPOSITORY === REPOSITORY && env.GITHUB_EVENT_NAME === 'repository_dispatch' && env.GITHUB_REF === 'refs/heads/main', 'trusted Free main dispatch required');
  assert(env.MOEICONS_AUTO_RELEASE_ENABLED === 'true', 'Free package-set writer switch is off');
  assert(COMMIT.test(env.GITHUB_SHA || ''), 'exact public Free main commit required');
  const payload = validateFreePackageSetEvent(event);
  assert(payload.binding.generatorCommit && payload.binding.sourceCommit, 'Free candidate commits required');
  const transport = makeTransport({ token: env.CODE_LIBRARY_ARTIFACT_READ_TOKEN });
  const store = makeStore({ token: env.GITHUB_TOKEN, publicCommit: env.GITHUB_SHA });
  const upstream = await readInput({ binding: payload.binding, producer: payload.producer, sourceDispatchId: payload.sourceDispatchId, transport });
  const publication = await publish({ ...upstream, binding: payload.binding, store });
  const report = { schemaVersion: 1, state: 'free-package-set-published', correlationId: payload.correlationId,
    sourceDispatchId: payload.sourceDispatchId, binding: payload.binding, producer: payload.producer, publication };
  if (outputPath) fs.writeFileSync(path.resolve(outputPath), canonicalBytes(report), { flag: 'wx', mode: 0o600 });
  return report;
}
async function main() {
  assert(process.env.GITHUB_EVENT_PATH, 'GitHub event file required');
  const event = JSON.parse(fs.readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8'));
  await processFreePackageSetEvent({ event, outputPath: path.resolve('free-package-set-report.json') });
}
if (require.main === module) main().catch(error => { process.stderr.write(`${error.message}\n`); process.exitCode = 1; });
module.exports = { freePackageSetCorrelation, validateFreePackageSetEvent, processFreePackageSetEvent };
