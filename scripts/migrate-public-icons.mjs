#!/usr/bin/env node
/**
 * RELEASE-BITMAP-0909 B8: migrate the public `icons/` tree from the legacy
 * `Moe` / `MoeAnimate` / `MoeLite` folders to the four current Free style-group
 * names. Dry-run by default; `--apply` performs the copy and the removal.
 *
 * The deletion is intended to be its own commit, after the exact path list and
 * mapping below have been reviewed. Docs/link verification runs on every mode.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const libraryRoot = process.env.MOE_ICONS_LIBRARY_DIR || path.resolve(root, '..', 'moe-icons-library');

const REMOVE = ['icons/Moe', 'icons/MoeAnimate', 'icons/MoeLite'];
const GROUPS = ['moe-outline', 'moe-lite-outline', 'moe-solid', 'moe-colored'];

function svgCount(dir) {
  if (!fs.existsSync(dir)) return 0;
  return fs.readdirSync(dir).filter((name) => name.endsWith('.svg')).length;
}

export function planMigration() {
  const plan = { source: libraryRoot, add: [], remove: [] };
  for (const group of GROUPS) {
    const from = path.join(libraryRoot, group);
    if (!fs.existsSync(from)) throw new Error(`missing library group: ${from}`);
    plan.add.push({ group, from, to: `icons/${group}`, icons: svgCount(from) });
  }
  for (const rel of REMOVE) {
    if (fs.existsSync(path.join(root, rel))) plan.remove.push(rel);
  }
  return plan;
}

export function applyMigration(plan) {
  for (const entry of plan.add) {
    const target = path.join(root, entry.to);
    fs.rmSync(target, { recursive: true, force: true });
    fs.cpSync(entry.from, target, { recursive: true });
  }
  for (const rel of plan.remove) {
    fs.rmSync(path.join(root, rel), { recursive: true, force: true });
  }
}

/** Every relative link under docs/ that points at the legacy icon folders. */
export function findBrokenIconLinks() {
  const broken = [];
  const walk = (dir) => {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/\.(md|mjs|js|json|yml|yaml|vue|ts)$/.test(entry.name)) {
        if (entry.name === 'migrate-public-icons.mjs' || entry.name === 'test-migrate-public-icons.mjs') continue;
        const text = fs.readFileSync(full, 'utf8');
        if (/icons\/(?:Moe|MoeAnimate|MoeLite)\b/.test(text)) broken.push(path.relative(root, full));
      }
    }
  };
  walk(path.join(root, 'docs'));
  walk(path.join(root, 'scripts'));
  if (fs.existsSync(path.join(root, 'README.md'))) {
    const text = fs.readFileSync(path.join(root, 'README.md'), 'utf8');
    if (/icons\/(?:Moe|MoeAnimate|MoeLite)\b/.test(text)) broken.push('README.md');
  }
  return broken;
}

function main() {
  const apply = process.argv.includes('--apply');
  const plan = planMigration();
  process.stdout.write(`source: ${plan.source}\n`);
  for (const entry of plan.add) {
    process.stdout.write(`ADD   ${entry.to}/ <- ${entry.from} (${entry.icons} svg)\n`);
  }
  for (const rel of plan.remove) {
    process.stdout.write(`REMOVE ${rel}/\n`);
  }
  const broken = findBrokenIconLinks();
  if (broken.length > 0) {
    process.stderr.write(`broken legacy icon links: ${broken.join(', ')}\n`);
    process.exitCode = 1;
    return;
  }
  if (!apply) {
    process.stdout.write('dry-run only; pass --apply to migrate\n');
    return;
  }
  applyMigration(plan);
  process.stdout.write('migration applied\n');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
