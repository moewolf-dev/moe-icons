import { test } from "node:test";
import assert from "node:assert";
import { createHash } from "node:crypto";
import { gzipSync } from "node:zlib";
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
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

test("S00: legacy full-library release comparison fails closed", async () => {
  const local = mkdtempSync(join(tmpdir(), "rel-local-"));
  const existing = mkdtempSync(join(tmpdir(), "rel-existing-"));
  try {
    buildFixture(local);
    buildFixture(existing);
    await assert.rejects(compareReleaseAssets(local, existing), /legacy full-library release comparison is retired/);
  } finally {
    rmSync(local, { recursive: true, force: true });
    rmSync(existing, { recursive: true, force: true });
  }
});

test("S00: legacy release comparison cannot read or reuse old aggregate assets", async () => {
  const local = mkdtempSync(join(tmpdir(), "rel-local-"));
  const existing = mkdtempSync(join(tmpdir(), "rel-existing-"));
  try {
    buildFixture(local);
    buildFixture(existing);
    await assert.rejects(compareReleaseAssets(local, existing), /legacy full-library release comparison is retired/);
  } finally {
    rmSync(local, { recursive: true, force: true });
    rmSync(existing, { recursive: true, force: true });
  }
});

test("S00: legacy Free archive validator fails closed before reading a candidate", () => {
  const dir = mkdtempSync(join(tmpdir(), "rel-validate-"));
  const valid = mkdtempSync(join(tmpdir(), "rel-validate-valid-"));
  try {
    const { descriptorSha } = buildFixture(dir);
    assert.throws(
      () => execFileSync(process.execPath, [join(ROOT, "scripts", "validate-free-release.mjs"), dir, VERSION, descriptorSha, "a".repeat(40), "b".repeat(40)], { encoding: "utf8" }),
      /legacy full-library Free publisher is retired/,
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
    rmSync(valid, { recursive: true, force: true });
  }
});

test("S00: retired Free validator rejects every legacy candidate before parsing it", () => {
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
      /legacy full-library Free publisher is retired/,
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("S00: legacy Free release job stays disabled until candidate-set publication exists", () => {
  const workflow = readFileSync(join(ROOT, ".github", "workflows", "free-release.yml"), "utf8");
  assert.match(workflow, /publish:\n[\s\S]*?if: false/);
  assert.match(workflow, /small-pack descriptor/i);
  assert.match(workflow, /Block legacy Free release candidates/);
  assert.match(workflow, /moe-icons-free-package-set/);
  assert.doesNotMatch(workflow, /\.bin\b/, "the retired tier-wide Free payload must not remain in a workflow download or upload pattern");
  assert.doesNotMatch(workflow, /moe-icons-free-resource-index-/, "the retired tier-wide Free resource index must not remain in a workflow asset inventory");
  assert.match(workflow, /publish-package-set:[\s\S]*?node scripts\/publish-free-package-set\.cjs/);
  assert.ok(workflow.indexOf('node scripts/verify-small-pack-pin.mjs') < workflow.indexOf('node scripts/publish-free-package-set.cjs'), 'validate vendored parser pins before reading or publishing producer packages');
  assert.match(workflow, /dispatch-worker-package-set\.cjs/);
  assert.match(workflow, /MOEICONS_WORKER_PACKAGE_SET_DISPATCH_TOKEN: \$\{\{ secrets\.MOEICONS_WORKER_PACKAGE_SET_DISPATCH_TOKEN \}\}/);
  assert.match(workflow, /wait for R2\/D1 promotion/);
  assert.match(workflow, /CODE_LIBRARY_ARTIFACT_READ_TOKEN: \$\{\{ secrets\.CODE_LIBRARY_ARTIFACT_READ_TOKEN \}\}/);
  assert.match(readFileSync(join(ROOT, "scripts", "write-latest-descriptor.mjs"), "utf8"), /legacy full-library latest-descriptor writer is retired/);
});

test("R-P0-2: free-release manual runs cannot bypass the kill switch", () => {
  const workflow = readFileSync(join(ROOT, ".github", "workflows", "free-release.yml"), "utf8");
  assert.match(workflow, /break_glass/, "manual write needs an explicit break-glass input");
  assert.match(workflow, /MOEICONS_AUTO_RELEASE_ENABLED/, "write permission must check the kill switch");
  // write_allowed must be produced inside a conditional, never unconditionally.
  assert.doesNotMatch(workflow, /\n\s*echo "write_allowed=1" >> "\$GITHUB_OUTPUT"\n\s*$/);
});

test("S00: retired Free writer and release comparison cannot read legacy assets", async () => {
  const dir = mkdtempSync(join(tmpdir(), "rel-sidecar-"));
  try {
    const { descriptorSha } = buildFixture(dir);
    writeFileSync(join(dir, `moe-icons-free-${VERSION}.tgz.sha256`), `${"0".repeat(64)}  moe-icons-free-${VERSION}.tgz\n`);
    assert.throws(
      () => execFileSync(process.execPath, [join(ROOT, "scripts", "validate-free-release.mjs"), dir, VERSION, descriptorSha, "a".repeat(40), "b".repeat(40)], { encoding: "utf8" }),
      /legacy full-library Free publisher is retired/,
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
    await assert.rejects(compareReleaseAssets(local, existing), /legacy full-library release comparison is retired/);
  } finally {
    rmSync(local, { recursive: true, force: true });
    rmSync(existing, { recursive: true, force: true });
  }
});

test("P1-7: public workflows pin every action to a commit", () => {
  const dir = join(ROOT, ".github", "workflows");
  for (const name of readdirSync(dir).filter((file) => file.endsWith(".yml"))) {
    const text = readFileSync(join(dir, name), "utf8");
    for (const line of text.split("\n")) {
      const match = /uses:\s*([^\s#]+)/.exec(line);
      if (!match || match[1].startsWith("./")) continue;
      assert.match(match[1], /@[0-9a-f]{40}$/, `${name}: ${match[1]}`);
    }
  }
});

function attachSelectedResources(dir,mutate){
 const descriptor=JSON.parse(readFileSync(join(dir,'release-descriptor.json'),'utf8'));descriptor.free.styleGroups=['moe-outline'];
 const raw=Buffer.from('export default {};'),bundle=gzipSync(raw),bundleRef={filename:`moe-icons-free-resources-${VERSION}.bin`,size:bundle.length,sha256:sha(bundle)};
 const index={schemaVersion:1,tier:'free',version:VERSION,artifactSha256:descriptor.free.sha256,bundle:bundleRef,files:{'react/moe-outline/UiSearch.js':{offset:0,compressedSize:bundle.length,size:raw.length,sha256:sha(raw),compressedSha256:sha(bundle),requires:[]}}};mutate?.(index);
 const bytes=gzipSync(Buffer.from(JSON.stringify(index))),indexRef={filename:`moe-icons-free-resource-index-${VERSION}.json.gz`,size:bytes.length,sha256:sha(bytes)};
 descriptor.free.resources={schemaVersion:1,index:indexRef,bundle:bundleRef};
 for(const [ref,content]of [[indexRef,bytes],[bundleRef,bundle]]){writeFileSync(join(dir,ref.filename),content);writeFileSync(join(dir,ref.filename+'.sha256'),`${ref.sha256}  ${ref.filename}\n`);}
 const json=JSON.stringify(descriptor);writeFileSync(join(dir,'release-descriptor.json'),json);return sha(Buffer.from(json));
}
test('S00: Free validation refuses the legacy tier-wide resources bundle',()=>{
 for(const mutate of [undefined,index=>{index.tier='pro';},index=>{index.files['react/moe-outline/UiSearch.js'].offset=1;},index=>{index.files['react/moe-outline/UiSearch.js'].sha256='a'.repeat(64);},index=>{index.files['react/moe-metal/UiSearch.js']=index.files['react/moe-outline/UiSearch.js'];delete index.files['react/moe-outline/UiSearch.js'];}]){
  const dir=mkdtempSync(join(tmpdir(),'free-selected-'));try{buildFixture(dir);const digest=attachSelectedResources(dir,mutate);const validate=()=>execFileSync(process.execPath,[join(ROOT,'scripts/validate-free-release.mjs'),dir,VERSION,digest,'a'.repeat(40),'b'.repeat(40)],{stdio:'pipe'});assert.throws(validate,/legacy full-library Free publisher is retired/);}finally{rmSync(dir,{recursive:true,force:true});}
 }
});
test('S00: Free release comparison refuses the legacy immutable resources contract',async()=>{
 const local=mkdtempSync(join(tmpdir(),'selected-local-')),existing=mkdtempSync(join(tmpdir(),'selected-existing-'));try{buildFixture(local);buildFixture(existing);attachSelectedResources(local);attachSelectedResources(existing);await assert.rejects(compareReleaseAssets(local,existing),/legacy full-library release comparison is retired/);}finally{rmSync(local,{recursive:true,force:true});rmSync(existing,{recursive:true,force:true});}
});
