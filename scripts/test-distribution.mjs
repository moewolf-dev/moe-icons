import { test } from "node:test";
import assert from "node:assert";
import { createHash } from "node:crypto";
import { gzipSync } from "node:zlib";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { execFileSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, resolve } from "node:path";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const VERSION = "1.2.3";
const sha = (bytes) => createHash("sha256").update(bytes).digest("hex");

// Minimal deterministic tar.gz writer (mirrors the CLI's tar-gz.ts).
const BLOCK = 512;
function writeOctal(buf, offset, length, value) {
  const text = `${value.toString(8).padStart(length - 1, "0")}\0`;
  buf.write(text.slice(0, length), offset, length, "utf8");
}
function checksum(header) {
  let sum = 0;
  for (let i = 0; i < BLOCK; i += 1) sum += header[i] ?? 0;
  return sum;
}
function createTarGz(files) {
  const parts = [];
  for (const name of Object.keys(files).sort((a, b) => a.localeCompare(b))) {
    const body = Buffer.from(files[name], "utf8");
    const header = Buffer.alloc(BLOCK, 0);
    Buffer.from(name).copy(header, 0, 0, Math.min(name.length, 100));
    writeOctal(header, 100, 8, 0o644);
    writeOctal(header, 108, 8, 0);
    writeOctal(header, 116, 8, 0);
    writeOctal(header, 124, 12, body.byteLength);
    writeOctal(header, 136, 12, 0);
    header.write("        ", 148, 8, "utf8");
    header[156] = 0x30;
    header.write("ustar", 257, 5, "utf8");
    header[262] = 0;
    header.write("00", 263, 2, "utf8");
    const sum = checksum(header);
    header.write(`${sum.toString(8).padStart(6, "0")}\0 `, 148, 8, "utf8");
    parts.push(header, body);
    const pad = (BLOCK - (body.byteLength % BLOCK)) % BLOCK;
    if (pad > 0) parts.push(Buffer.alloc(pad, 0));
  }
  parts.push(Buffer.alloc(2 * BLOCK, 0));
  return gzipSync(Buffer.concat(parts), { level: 9 });
}

/** Build a fully valid Free release directory (code + metadata archives + descriptor). */
function buildFixture(dir) {
  const catalogJson = '{"schemaVersion":1,"icons":[]}\n';
  const manualMd = "# Manual\n";
  const manifestJson = `${JSON.stringify(
    {
      schemaVersion: 1, tier: "free", libraryVersion: VERSION, manualVersion: VERSION, catalogVersion: VERSION,
      cliVersion: "0.1.0", generatedAt: { sourceCommit: "a".repeat(40), generatorCommit: "b".repeat(40) },
      targets: ["react", "vue", "vanilla", "assets"],
      dependencies: {},
      files: {
        "MANUAL.md": { size: Buffer.byteLength(manualMd), sha256: sha(Buffer.from(manualMd)) },
        "catalog.json": { size: Buffer.byteLength(catalogJson), sha256: sha(Buffer.from(catalogJson)) },
      },
    },
    null,
    2,
  )}\n`;

  const code = createTarGz({ "catalog.json": catalogJson });
  const metadata = createTarGz({
    "metadata/MANUAL.md": manualMd,
    "metadata/catalog.json": catalogJson,
    "metadata/manifest.json": manifestJson,
  });
  const assetsTgz = createTarGz({
    "assets/moe-outline/ui-search.svg": '<svg viewBox="0 0 24 24"/>',
    "assets/manifest.json": '{"schemaVersion":1,"assets":[]}\n',
  });
  const descriptor = {
    fullVersion: VERSION,
    sourceCommit: "a".repeat(40),
    generatorCommit: "b".repeat(40),
    free: {
      filename: `moe-icons-free-${VERSION}.tgz`,
      sha256: sha(code),
      metadata: {
        filename: `moe-icons-free-metadata-${VERSION}.tgz`,
        sha256: sha(metadata),
        size: metadata.byteLength,
        files: {
          "MANUAL.md": { size: Buffer.byteLength(manualMd), sha256: sha(Buffer.from(manualMd)) },
          "catalog.json": { size: Buffer.byteLength(catalogJson), sha256: sha(Buffer.from(catalogJson)) },
          "manifest.json": { size: Buffer.byteLength(manifestJson), sha256: sha(Buffer.from(manifestJson)) },
        },
      },
      assets: {
        filename: `moe-icons-free-assets-${VERSION}.tgz`,
        sha256: sha(assetsTgz),
        size: assetsTgz.byteLength,
      },
    },
    catalog: { filename: "catalog.json", sha256: sha(Buffer.from(catalogJson)), schemaVersion: 1 },
  };
  const descriptorJson = `${JSON.stringify(descriptor, null, 2)}\n`;
  const files = {
    [`moe-icons-free-${VERSION}.tgz`]: code,
    [`moe-icons-free-${VERSION}.tgz.sha256`]: Buffer.from(`${sha(code)}  moe-icons-free-${VERSION}.tgz\n`),
    [`moe-icons-free-assets-${VERSION}.tgz`]: assetsTgz,
    [`moe-icons-free-assets-${VERSION}.tgz.sha256`]: Buffer.from(`${sha(assetsTgz)}  moe-icons-free-assets-${VERSION}.tgz\n`),
    [`moe-icons-free-metadata-${VERSION}.tgz`]: metadata,
    [`moe-icons-free-metadata-${VERSION}.tgz.sha256`]: Buffer.from(`${sha(metadata)}  moe-icons-free-metadata-${VERSION}.tgz\n`),
    "release-descriptor.json": Buffer.from(descriptorJson),
  };
  for (const [name, bytes] of Object.entries(files)) writeFileSync(join(dir, name), bytes);
  return { descriptorSha: sha(Buffer.from(descriptorJson)), code, metadata, assets: assetsTgz };
}

async function compareReleaseAssets(localDir, existingDir) {
  const { compareReleaseAssets } = await import(pathToFileURL(join(ROOT, "scripts", "compare-release.mjs")).href);
  // A published Release has eight assets; the fixture "existing" dir needs the
  // latest descriptor that the draft step attaches after upload.
  const latestPath = join(existingDir, "release-latest.json");
  if (!existsSync(latestPath)) {
    writeFileSync(
      latestPath,
      `${JSON.stringify(
        {
          schemaVersion: 1,
          tier: "free",
          fullVersion: VERSION,
          descriptorSha256: sha(readFileSync(join(existingDir, "release-descriptor.json"))),
          assets: {},
        },
        null,
        2,
      )}\n`,
    );
  }
  return compareReleaseAssets(localDir, existingDir, VERSION, sha(readFileSync(join(localDir, "release-descriptor.json"))));
}

test("R8: idempotency compare reports no drift for identical candidates", async () => {
  const local = mkdtempSync(join(tmpdir(), "rel-local-"));
  const existing = mkdtempSync(join(tmpdir(), "rel-existing-"));
  try {
    buildFixture(local);
    buildFixture(existing);
    assert.deepStrictEqual(await compareReleaseAssets(local, existing), []);
  } finally {
    rmSync(local, { recursive: true, force: true });
    rmSync(existing, { recursive: true, force: true });
  }
});

test("R8: idempotency compare names the drifted asset (code/metadata/descriptor)", async () => {
  const local = mkdtempSync(join(tmpdir(), "rel-local-"));
  const existing = mkdtempSync(join(tmpdir(), "rel-existing-"));
  try {
    buildFixture(local);
    buildFixture(existing);
    const metaPath = join(existing, `moe-icons-free-metadata-${VERSION}.tgz`);
    writeFileSync(metaPath, createTarGz({ "metadata/MANUAL.md": "tampered\n", "metadata/catalog.json": "x", "metadata/manifest.json": "y" }));
    assert.deepStrictEqual(await compareReleaseAssets(local, existing), [`moe-icons-free-metadata-${VERSION}.tgz`]);

    buildFixture(existing);
    const descriptorPath = join(existing, "release-descriptor.json");
    writeFileSync(descriptorPath, readFileSync(descriptorPath).toString().replace(VERSION, "9.9.9"));
    assert.ok((await compareReleaseAssets(local, existing)).includes("release-descriptor.json"));
  } finally {
    rmSync(local, { recursive: true, force: true });
    rmSync(existing, { recursive: true, force: true });
  }
});

test("R8: validate-free-release accepts a valid candidate and rejects a tampered metadata archive", () => {
  const dir = mkdtempSync(join(tmpdir(), "rel-validate-"));
  const valid = mkdtempSync(join(tmpdir(), "rel-validate-valid-"));
  try {
    const { descriptorSha } = buildFixture(dir);
    const ok = execFileSync(process.execPath, [join(ROOT, "scripts", "validate-free-release.mjs"), dir, VERSION, descriptorSha, "a".repeat(40), "b".repeat(40)], { encoding: "utf8" });
    assert.match(ok, /"metadata"/);
    assert.match(ok, /"assets"/);

    buildFixture(valid);
    const metaPath = join(valid, `moe-icons-free-metadata-${VERSION}.tgz`);
    writeFileSync(metaPath, gzipSync(Buffer.from("not-a-real-metadata-archive")));
    assert.throws(() =>
      execFileSync(process.execPath, [join(ROOT, "scripts", "validate-free-release.mjs"), valid, VERSION, descriptorSha, "a".repeat(40), "b".repeat(40)], { encoding: "utf8" }),
      /checksum|frozen files|archive/,
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
    rmSync(valid, { recursive: true, force: true });
  }
});

test("R8: validate-free-release rejects a candidate with a pro node in the public descriptor", () => {
  const dir = mkdtempSync(join(tmpdir(), "rel-pro-"));
  try {
    const { descriptorSha } = buildFixture(dir);
    const descriptorPath = join(dir, "release-descriptor.json");
    const descriptor = JSON.parse(readFileSync(descriptorPath, "utf8"));
    descriptor.pro = { filename: `moe-icons-pro-${VERSION}.tgz`, sha256: "0".repeat(64) };
    const dirtyJson = `${JSON.stringify(descriptor, null, 2)}\n`;
    writeFileSync(descriptorPath, dirtyJson);
    assert.throws(
      () => execFileSync(process.execPath, [join(ROOT, "scripts", "validate-free-release.mjs"), dir, VERSION, sha(Buffer.from(dirtyJson)), "a".repeat(40), "b".repeat(40)], { encoding: "utf8" }),
      /pro\/ent/,
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("P0-8: free-release.yml is draft-first and publishes only after eight assets", () => {
  const workflow = readFileSync(join(ROOT, ".github", "workflows", "free-release.yml"), "utf8");
  const draftAt = workflow.indexOf('gh release create "$tag" --draft');
  const latestAt = workflow.indexOf("write-latest-descriptor.mjs");
  const countAt = workflow.indexOf('test "$count" = "8"');
  const publishAt = workflow.indexOf('gh release edit "$tag" --draft=false');
  assert.ok(draftAt >= 0, "must create a draft release");
  assert.ok(latestAt > draftAt, "release-latest.json must be written after the draft exists");
  assert.ok(countAt > latestAt, "must verify eight assets after attaching latest");
  assert.ok(publishAt > countAt, "must publish only after the full readback");
  assert.ok(!/gh release create "v\$\{VERSION\}"/.test(workflow), "must not create a published release directly");
});

test("R-P0-2: free-release manual runs cannot bypass the kill switch", () => {
  const workflow = readFileSync(join(ROOT, ".github", "workflows", "free-release.yml"), "utf8");
  assert.match(workflow, /break_glass/, "manual write needs an explicit break-glass input");
  assert.match(workflow, /MOEICONS_AUTO_RELEASE_ENABLED/, "write permission must check the kill switch");
  // write_allowed must be produced inside a conditional, never unconditionally.
  assert.doesNotMatch(workflow, /\n\s*echo "write_allowed=1" >> "\$GITHUB_OUTPUT"\n\s*$/);
});

test("R-P0-10: wrong sidecar and extra asset are rejected", async () => {
  const dir = mkdtempSync(join(tmpdir(), "rel-sidecar-"));
  try {
    const { descriptorSha } = buildFixture(dir);
    writeFileSync(join(dir, `moe-icons-free-${VERSION}.tgz.sha256`), `${"0".repeat(64)}  moe-icons-free-${VERSION}.tgz\n`);
    assert.throws(
      () => execFileSync(process.execPath, [join(ROOT, "scripts", "validate-free-release.mjs"), dir, VERSION, descriptorSha, "a".repeat(40), "b".repeat(40)], { encoding: "utf8" }),
      /sidecar digest mismatch/,
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }

  const local = mkdtempSync(join(tmpdir(), "rel-extra-local-"));
  const existing = mkdtempSync(join(tmpdir(), "rel-extra-existing-"));
  try {
    buildFixture(local);
    buildFixture(existing);
    writeFileSync(
      join(existing, "release-latest.json"),
      JSON.stringify({ schemaVersion: 1, tier: "free", fullVersion: VERSION, descriptorSha256: sha(readFileSync(join(existing, "release-descriptor.json"))), assets: {} }),
    );
    writeFileSync(join(existing, "extra.tgz"), "extra");
    await assert.rejects(compareReleaseAssets(local, existing), /exactly eight files/);
  } finally {
    rmSync(local, { recursive: true, force: true });
    rmSync(existing, { recursive: true, force: true });
  }
});
