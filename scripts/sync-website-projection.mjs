#!/usr/bin/env node
/**
 * DEV-A01: distribute the website icon projection contract from the public
 * `moe-icons` repository to consumer repositories as read-only vendored copies
 * plus a PIN. The sync bot only creates PRs; it never auto-merges.
 *
 * Usage:
 *   node scripts/sync-website-projection.mjs [--check] [--commit <sha>] [--repo <path> ...]
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

const SOURCE_PATH = 'contracts/website-projection';
const VENDOR_DIR = 'vendor/moe-icons-website-projection';
const PIN_FILE = 'PIN.json';
const SOURCE_REPO = 'moewolf-dev/moe-icons';
export const DEFAULT_REPOS = ['moe-icons-library', 'moe-icons-code-library', 'moe-icons-cli', 'moe-icons-web-worker', 'moe-icons-website'];
const REQUIRED_FILES = [
  'website-icon-projection-v1.md',
  'website-catalog-v1.schema.json',
  'website-release-v1.schema.json',
  'website-activation-receipt-v1.schema.json',
  'website-api-v1.schema.json',
];

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
  if (process.env.WEBSITE_PROJECTION_COMMIT) return process.env.WEBSITE_PROJECTION_COMMIT;
  try {
    return execFileSync('git', ['-C', repoRoot, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  } catch {
    return '0'.repeat(40);
  }
}

function readSource(repoRoot) {
  const sourceDir = path.join(repoRoot, SOURCE_PATH);
  const files = {};
  for (const name of REQUIRED_FILES) {
    const full = path.join(sourceDir, name);
    if (!fs.existsSync(full)) throw new Error(`missing website projection contract file: ${SOURCE_PATH}/${name}`);
    files[name] = fs.readFileSync(full);
  }
  // Reject unexpected files so the mirror cannot silently grow.
  for (const name of fs.readdirSync(sourceDir).sort()) {
    if (name === 'README.md') continue;
    if (!REQUIRED_FILES.includes(name)) throw new Error(`unexpected website projection contract file: ${SOURCE_PATH}/${name}`);
  }
  return files;
}

export function syncWebsiteProjection({ repoRoot, consumers, commit, check = false }) {
  const files = readSource(repoRoot);
  const fileSha = Object.fromEntries(
    Object.entries(files).map(([name, bytes]) => [name, crypto.createHash('sha256').update(bytes).digest('hex')]),
  );
  const sourceCommit = resolveCommit(commit, repoRoot);
  if (!/^[0-9a-f]{40}$/.test(sourceCommit)) {
    throw new Error('website projection sourceCommit must be a full 40-hex commit');
  }
  const pin = {
    sourceRepo: SOURCE_REPO,
    sourceCommit,
    sourcePath: SOURCE_PATH,
    schemaVersion: 1,
    files: fileSha,
  };
  const drifted = [];
  for (const repo of consumers) {
    const vendorDir = path.join(repo, VENDOR_DIR);
    const wantedPin = `${JSON.stringify(pin, null, 2)}\n`;
    let upToDate = true;
    for (const [name, bytes] of Object.entries(files)) {
      const copyPath = path.join(vendorDir, name);
      const current = fs.existsSync(copyPath) ? fs.readFileSync(copyPath) : undefined;
      if (current === undefined || !current.equals(bytes)) { upToDate = false; break; }
    }
    const pinPath = path.join(vendorDir, PIN_FILE);
    const currentPin = fs.existsSync(pinPath) ? fs.readFileSync(pinPath, 'utf8') : undefined;
    if (upToDate && currentPin === wantedPin) continue;
    drifted.push(repo);
    if (check) continue;
    fs.mkdirSync(vendorDir, { recursive: true });
    for (const [name, bytes] of Object.entries(files)) fs.writeFileSync(path.join(vendorDir, name), bytes);
    fs.writeFileSync(pinPath, wantedPin);
  }
  return { files: fileSha, sourceCommit, drifted };
}

export function defaultConsumers(repoRoot) {
  const parent = path.dirname(repoRoot);
  return DEFAULT_REPOS.map((name) => path.join(parent, name)).filter((repo) => fs.existsSync(repo));
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const consumers = options.repos.length > 0 ? options.repos : defaultConsumers(repoRoot);
  const result = syncWebsiteProjection({
    repoRoot,
    consumers,
    commit: options.commit,
    check: options.check,
  });
  if (result.drifted.length > 0) {
    const message = `website projection drift in: ${result.drifted.join(', ')}`;
    if (options.check) {
      process.stderr.write(`${message}\n`);
      process.exitCode = 1;
      return;
    }
    process.stdout.write(`synced website projection ${result.sourceCommit} (${result.drifted.join(', ')})\n`);
  } else {
    process.stdout.write('website projection is up to date\n');
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
