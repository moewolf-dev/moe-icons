import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const workflow = readFileSync(new URL('../.github/workflows/free-release.yml', import.meta.url), 'utf8');
test('retired Free publisher is disabled independently of policy result and writer switches', () => {
  const job = workflow.match(/^  publish:\n([\s\S]*?)(?=^  [\w-]+:|$(?![\s\S]))/m)?.[1];
  assert.ok(job, 'publish job required');
  assert.match(job, /^    if: false$/m);
  assert.match(job, /^    needs: \[small-pack-policy\]$/m);
  assert.equal((job.match(/^    if:/gm) || []).length, 1);
});
test('policy job rejects before checkout, secret use or asset transfer', () => {
  const job = workflow.match(/^  small-pack-policy:\n([\s\S]*?)(?=^  [\w-]+:)/m)?.[1];
  assert.ok(job); assert.match(job, /^    permissions: \{\}$/m);
  assert.doesNotMatch(job, /uses:|secrets\.|curl|wget|gh api|download-artifact|upload-artifact/);
  const script = job.match(/        run: \|\n([\s\S]*)/)?.[1].split('\n').map(line => line.replace(/^          /, '')).join('\n');
  const temp = mkdtempSync(join(tmpdir(), 'free-release-guard-'));
  try {
    const result = spawnSync('bash', ['-euo', 'pipefail', '-c', script], { cwd: temp, encoding: 'utf8', env: { PATH: process.env.PATH, MOEICONS_AUTO_RELEASE_ENABLED: 'true' } });
    assert.equal(result.status, 78); assert.match(result.stdout, /::error::/);
    assert.deepEqual(readdirSync(temp), []);
  } finally { rmSync(temp, { recursive: true, force: true }); }
});
