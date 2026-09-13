#!/usr/bin/env node
/**
 * AUD-BLOCK-08: make the continuous release-policy distribution readiness
 * explicit.
 *
 * The sync workflow degrades to a no-op when RELEASE_POLICY_SYNC_TOKEN is
 * absent, so a green run does not prove the four consumer repos actually
 * receive PRs. This readiness probe reports the real state as a distinct
 * `READY` / `NOT_READY` status (and a step summary in CI). When the repository
 * variable MOEICONS_POLICY_SYNC_REQUIRED is `true`, a missing token fails the
 * job so "not ready" can never be mistaken for "done".
 *
 * Usage:
 *   node scripts/sync-release-policy-readiness.mjs --token-present true --require false
 */

export function evaluateSyncReadiness({ tokenPresent, requireSync = false }) {
  if (tokenPresent) {
    return {
      ready: true,
      status: 'READY',
      reason: 'RELEASE_POLICY_SYNC_TOKEN is configured; consumer PR sync can run',
    };
  }
  if (requireSync) {
    return {
      ready: false,
      status: 'NOT_READY',
      reason: 'MOEICONS_POLICY_SYNC_REQUIRED=true but RELEASE_POLICY_SYNC_TOKEN is missing',
    };
  }
  return {
    ready: false,
    status: 'NOT_READY',
    reason: 'RELEASE_POLICY_SYNC_TOKEN is not configured; continuous distribution is inactive (fixed PIN still valid)',
  };
}

function parseBool(value, fallback) {
  if (value === undefined || value === '') return fallback;
  if (value === true || value === 'true' || value === '1') return true;
  if (value === false || value === 'false' || value === '0') return false;
  throw new Error(`invalid boolean value: ${value}`);
}

function arg(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function main() {
  const tokenPresent = parseBool(process.env.RELEASE_POLICY_SYNC_TOKEN_PRESENT ?? arg('--token-present'), undefined);
  if (tokenPresent === undefined) {
    throw new Error('usage: sync-release-policy-readiness.mjs --token-present true|false [--require true|false]');
  }
  const requireSync = parseBool(process.env.MOEICONS_POLICY_SYNC_REQUIRED ?? arg('--require'), false);
  const result = evaluateSyncReadiness({ tokenPresent, requireSync });
  process.stdout.write(`release-policy-sync readiness: ${result.status} — ${result.reason}\n`);
  process.stdout.write(`${JSON.stringify(result)}\n`);
  if (requireSync && !result.ready) process.exit(1);
}

if (process.argv[1] && process.argv[1].endsWith('sync-release-policy-readiness.mjs')) {
  try {
    main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}
