import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { findBrokenIconLinks, planMigration } from './migrate-public-icons.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const libraryRoot = path.resolve(root, '..', 'moe-icons-library');
const hasLibrary = fs.existsSync(libraryRoot);

test('B8: public tree contains exactly the four migrated 554-icon groups', () => {
  const expectedGroups = ['moe-outline', 'moe-lite-outline', 'moe-solid', 'moe-colored'];
  const referenceIds = fs.readdirSync(path.join(root, 'icons', expectedGroups[0]))
    .filter((name) => name.endsWith('.svg'))
    .sort();
  assert.equal(referenceIds.length, 554, 'public Free groups must contain the frozen 554-icon set');
  for (const group of expectedGroups) {
    const dir = path.join(root, 'icons', group);
    assert.ok(fs.statSync(dir).isDirectory(), `missing public group ${group}`);
    const ids = fs.readdirSync(dir).filter((name) => name.endsWith('.svg')).sort();
    assert.deepEqual(ids, referenceIds, `${group} icon set must equal ${expectedGroups[0]}`);
  }
  for (const rel of ['icons/Moe', 'icons/MoeAnimate', 'icons/MoeLite']) {
    assert.equal(fs.existsSync(path.join(root, rel)), false, `${rel} must be removed`);
  }
});

test('B8: migration maps the four Free groups to the local source checkout', { skip: !hasLibrary }, () => {
  const plan = planMigration();
  assert.deepEqual(
    plan.add.map((entry) => entry.group),
    ['moe-outline', 'moe-lite-outline', 'moe-solid', 'moe-colored'],
  );
  for (const entry of plan.add) assert.ok(entry.icons > 0, `${entry.group} must have SVG sources`);
  assert.deepEqual(findBrokenIconLinks(), [], 'docs/scripts must not link legacy icon folders');
});
