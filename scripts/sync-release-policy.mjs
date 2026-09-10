#!/usr/bin/env node
/**
 * RELEASE-BITMAP-0909 D-10: distribute the Free style-group contract from the
 * public `moe-icons` repository to consumer repositories as a read-only
 * vendored copy plus a PIN. The sync bot only creates PRs; it never auto-merges.
 *
 * Usage:
 *   node scripts/sync-release-policy.mjs [--check] [--commit <sha>] [--repo <path> ...]
 *
 * With no --repo, sibling repositories next to this repo are used. `--check`
 * never writes; it exits non-zero when any consumer is out of date (used by CI
 * drift scans and offline tests).
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const SOURCE_PATH = 'contracts/release-policy/free-style-groups.v1.json';
const VENDOR_DIR = 'vendor/moe-icons-release-policy';
const VENDOR_FILE = 'free-style-groups.v1.json';
const PIN_FILE = 'PIN.json';
const SOURCE_REPO = 'moewolf-dev/moe-icons';
const DEFAULT_REPOS = ['moe-icons-library', 'moe-icons-code-library', 'moe-icons-cli', 'moe-icons-web-worker'];

function parseArgs(argv) {
  const options = { check: false, commit: undefined, repos: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--check') options.check = true;
    else if (arg === '--commit') options.commit = argv[++i];
    else if (arg === '--repo') options.repos.push(argv[++i]);
    else throw new Error(`unknown argument: ${arg}`);
  }
  return options;
}

function resolveCommit(explicit, repoRoot) {
  if (explicit) return explicit;
  if (process.env.RELEASE_POLICY_COMMIT) return process.env.RELEASE_POLICY_COMMIT;
  try {
    return execFileSync('git', ['-C', repoRoot, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  } catch {
    return '0'.repeat(40);
  }
}

export function syncReleasePolicy({ repoRoot, consumers, commit, check = false }) {
  const sourceFile = path.join(repoRoot, SOURCE_PATH);
  const bytes = fs.readFileSync(sourceFile);
  const sha256 = crypto.createHash('sha256').update(bytes).digest('hex');
  const sourceCommit = resolveCommit(commit, repoRoot);
  if (!/^[0-9a-f]{40}$/.test(sourceCommit)) {
    throw new Error('release policy sourceCommit must be a full 40-hex commit');
  }
  const pin = {
    sourceRepo: SOURCE_REPO,
    sourceCommit,
    sourcePath: SOURCE_PATH,
    sha256,
    schemaVersion: 1,
  };
  const drifted = [];
  for (const repo of consumers) {
    const vendorDir = path.join(repo, VENDOR_DIR);
    const copyPath = path.join(vendorDir, VENDOR_FILE);
    const pinPath = path.join(vendorDir, PIN_FILE);
    const wantedPin = `${JSON.stringify(pin, null, 2)}\n`;
    const currentCopy = fs.existsSync(copyPath) ? fs.readFileSync(copyPath) : undefined;
    const currentPin = fs.existsSync(pinPath) ? fs.readFileSync(pinPath, 'utf8') : undefined;
    const upToDate = currentCopy !== undefined && currentCopy.equals(bytes) && currentPin === wantedPin;
    if (upToDate) continue;
    drifted.push(repo);
    if (check) continue;
    fs.mkdirSync(vendorDir, { recursive: true });
    fs.writeFileSync(copyPath, bytes);
    fs.writeFileSync(pinPath, wantedPin);
  }
  return { sha256, sourceCommit, drifted };
}

export function defaultConsumers(repoRoot) {
  const parent = path.dirname(repoRoot);
  return DEFAULT_REPOS.map((name) => path.join(parent, name)).filter((repo) => fs.existsSync(repo));
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const consumers = options.repos.length > 0 ? options.repos : defaultConsumers(repoRoot);
  const result = syncReleasePolicy({
    repoRoot,
    consumers,
    commit: options.commit,
    check: options.check,
  });
  if (result.drifted.length > 0) {
    const message = `release policy drift in: ${result.drifted.join(', ')}`;
    if (options.check) {
      process.stderr.write(`${message}\n`);
      process.exitCode = 1;
      return;
    }
    process.stdout.write(`synced release policy ${result.sha256} (${result.drifted.join(', ')})\n`);
  } else {
    process.stdout.write('release policy is up to date\n');
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
