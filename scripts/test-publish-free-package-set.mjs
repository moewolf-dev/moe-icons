import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { freePackageSetCorrelation, processFreePackageSetEvent, validateFreePackageSetEvent } = require('./publish-free-package-set.cjs');
const payload = () => {
  const sourceDispatchId = 'a'.repeat(64), binding = { tier: 'free', fullVersion: '1.2.3', sourceCommit: 'b'.repeat(40), generatorCommit: 'c'.repeat(40), packageSetSha256: 'd'.repeat(64) };
  return { action: 'moe-icons-free-package-set', client_payload: { schemaVersion: 1, sourceDispatchId, correlationId: freePackageSetCorrelation(sourceDispatchId, binding.packageSetSha256), binding, producer: { runId: '456', runAttempt: 2 } } };
};
const env = () => ({ GITHUB_REPOSITORY: 'moewolf-dev/moe-icons', GITHUB_EVENT_NAME: 'repository_dispatch', GITHUB_REF: 'refs/heads/main',
  GITHUB_SHA: 'e'.repeat(40), GITHUB_TOKEN: 'public-write-token', CODE_LIBRARY_ARTIFACT_READ_TOKEN: 'private-read-token', MOEICONS_AUTO_RELEASE_ENABLED: 'true' });

test('Free package-set event has exact tier, producer, and stable correlation binding', () => {
  const event = payload(); const parsed = validateFreePackageSetEvent(event);
  assert.equal(parsed.binding.tier, 'free'); assert.equal(parsed.producer.runAttempt, 2);
  for (const mutate of [
    value => { value.action = 'moe-icons-free-release'; },
    value => { value.client_payload.binding.tier = 'pro'; },
    value => { value.client_payload.binding.packageSetSha256 = 'f'.repeat(64); },
    value => { value.client_payload.producer.runAttempt = 0; },
    value => { value.client_payload.extra = true; },
    value => { value.client_payload.correlationId = 'free-package-set-' + 'f'.repeat(64); },
  ]) { const changed = structuredClone(event); mutate(changed); assert.throws(() => validateFreePackageSetEvent(changed)); }
});

test('Free package-set publication uses the existing private reader and public immutable store, then writes an exact receipt', async () => {
  const event = payload(), envValue = env(), temp = mkdtempSync(join(tmpdir(), 'free-package-set-event-'));
  try {
    const outputPath = join(temp, 'receipt.json'), transport = { id: 'reader' }, store = { id: 'writer' }; let readArgs, publishArgs;
    const report = await processFreePackageSetEvent({ event, env: envValue, outputPath,
      makeTransport: options => { assert.equal(options.token, envValue.CODE_LIBRARY_ARTIFACT_READ_TOKEN); return transport; },
      makeStore: options => { assert.equal(options.token, envValue.GITHUB_TOKEN); assert.equal(options.publicCommit, envValue.GITHUB_SHA); return store; },
      readInput: async args => { readArgs = args; return { root: { tier: 'free' }, rootBytes: Buffer.from('{}') }; },
      publish: async args => { publishArgs = args; return { uploaded: 3, reused: 4 }; },
    });
    assert.deepEqual(readArgs, { binding: event.client_payload.binding, producer: event.client_payload.producer, sourceDispatchId: event.client_payload.sourceDispatchId, transport });
    assert.equal(publishArgs.store, store); assert.equal(publishArgs.binding, event.client_payload.binding);
    assert.deepEqual(report.publication, { uploaded: 3, reused: 4 });
    assert.deepEqual(JSON.parse(readFileSync(outputPath)), report);
    await assert.rejects(processFreePackageSetEvent({ event, env: { ...envValue, MOEICONS_AUTO_RELEASE_ENABLED: 'false' } }), /writer switch is off/);
  } finally { rmSync(temp, { recursive: true, force: true }); }
});
