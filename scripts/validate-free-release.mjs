import { gunzipSync } from "node:zlib";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const [directory, version, descriptorSha, sourceCommit, generatorCommit] = process.argv.slice(2);
if (!directory || !/^\d+\.\d+\.\d+(?:-(?:alpha|beta))?$/.test(version ?? "")) {
  throw new Error("usage: validate-free-release <dir> <version> <descriptor-sha> <source-commit> <generator-commit>");
}
for (const [name, value, pattern] of [
  ["descriptor SHA", descriptorSha, /^[a-f0-9]{64}$/],
  ["source commit", sourceCommit, /^[a-f0-9]{40}$/],
  ["generator commit", generatorCommit, /^[a-f0-9]{40}$/],
]) {
  if (!pattern.test(value ?? "")) throw new Error(`invalid ${name}`);
}

const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
// The combined free archive lists >1M characters of entries; the default 1 MiB
// execFileSync buffer overflows (ENOBUFS). Use a bounded, generous buffer so the
// listing can never be truncated by an unbounded stdout capture.
const TAR_MAX_BUFFER = 256 * 1024 * 1024;
const tarList = (path) => execFileSync("tar", ["-tzf", path], { encoding: "utf8", maxBuffer: TAR_MAX_BUFFER });
const tarRead = (path, entry) => execFileSync("tar", ["-xOzf", path, entry], { maxBuffer: TAR_MAX_BUFFER });
/** R-P0-10: every archive must ship a matching .sha256 sidecar. */
const assertSidecar = (filename, expectedSha) => {
  const sidecar = readFileSync(join(directory, `${filename}.sha256`), "utf8").trim();
  const [digest, name] = sidecar.split(/\s+/);
  if (digest !== expectedSha) throw new Error(`${filename} sidecar digest mismatch`);
  if (name && name !== filename && name !== `./${filename}`) {
    throw new Error(`${filename} sidecar filename mismatch: ${name}`);
  }
};
const descriptorPath = join(directory, "release-descriptor.json");
const descriptorBytes = readFileSync(descriptorPath);
if (sha256(descriptorBytes) !== descriptorSha) throw new Error("release descriptor checksum mismatch");
const descriptor = JSON.parse(descriptorBytes.toString("utf8"));
// Public descriptor is the free-only cropped descriptor; pro/ent nodes or any
// pro style-group must never appear in it.
const descriptorJson = descriptorBytes.toString("utf8");
if (/"pro"|"ent"/.test(descriptorJson)) throw new Error("public descriptor must not contain pro/ent nodes");
if (
  descriptor.fullVersion !== version ||
  descriptor.sourceCommit !== sourceCommit ||
  descriptor.generatorCommit !== generatorCommit
) {
  throw new Error("release descriptor identity mismatch");
}

const expectedName = `moe-icons-free-${version}.tgz`;
if (descriptor.free?.filename !== expectedName || !/^[a-f0-9]{64}$/.test(descriptor.free?.sha256 ?? "")) {
  throw new Error("invalid free artifact descriptor");
}
if (!descriptor.catalog || descriptor.catalog.filename !== "catalog.json" || !/^[a-f0-9]{64}$/.test(descriptor.catalog.sha256 ?? "")) {
  throw new Error("invalid catalog descriptor");
}
const archivePath = join(directory, expectedName);
const archiveBytes = readFileSync(archivePath);
if (sha256(archiveBytes) !== descriptor.free.sha256) throw new Error("free archive checksum mismatch");
assertSidecar(expectedName, descriptor.free.sha256);

const entries = tarList(archivePath)
  .split("\n")
  .filter(Boolean);
const catalogEntry = entries.find((entry) => entry === "catalog.json" || entry === "./catalog.json");
if (!catalogEntry) throw new Error("free archive is missing catalog.json");
const catalogBytes = tarRead(archivePath, catalogEntry);
if (sha256(catalogBytes) !== descriptor.catalog.sha256) throw new Error("catalog checksum mismatch");

// Validate the metadata archive: must exist, verify checksum/size, and contain
// exactly the frozen metadata files under metadata/.
const metadata = descriptor.free?.metadata;
const metadataName = `moe-icons-free-metadata-${version}.tgz`;
if (!metadata || metadata.filename !== metadataName) throw new Error("invalid free metadata descriptor");
for (const key of ["MANUAL.md", "catalog.json", "manifest.json"]) {
  const ref = metadata.files?.[key];
  if (!ref || !/^[a-f0-9]{64}$/.test(ref.sha256 ?? "") || !Number.isSafeInteger(ref.size) || ref.size < 1) {
    throw new Error(`invalid free metadata file ref: ${key}`);
  }
}
if (metadata.files["catalog.json"].sha256 !== descriptor.catalog.sha256) {
  throw new Error("metadata catalog.json does not match the free archive catalog");
}
const metadataPath = join(directory, metadataName);
const metadataBytes = readFileSync(metadataPath);
if (sha256(metadataBytes) !== metadata.sha256) throw new Error("free metadata archive checksum mismatch");
assertSidecar(metadataName, metadata.sha256);
if (metadataBytes.length !== metadata.size) throw new Error("free metadata archive size mismatch");
const metadataEntries = tarList(metadataPath)
  .split("\n")
  .filter(Boolean)
  .sort();
const expectedMetadataEntries = [
  "metadata/MANUAL.md",
  "metadata/catalog.json",
  "metadata/manifest.json",
];
if (JSON.stringify(metadataEntries) !== JSON.stringify(expectedMetadataEntries)) {
  throw new Error("free metadata archive must contain exactly the frozen metadata files");
}
for (const file of expectedMetadataEntries) {
  const bytes = tarRead(metadataPath, file);
  const name = file.slice("metadata/".length);
  if (sha256(bytes) !== metadata.files[name].sha256) throw new Error(`metadata ${name} checksum mismatch`);
  if (bytes.length !== metadata.files[name].size) throw new Error(`metadata ${name} size mismatch`);
}

// Validate the assets-only archive (free icons raw bytes; distinct content from
// the combined code archive). F4A: it must exist, verify checksum/size, and
// contain only assets/** paths.
const assetsRef = descriptor.free?.assets;
const assetsName = `moe-icons-free-assets-${version}.tgz`;
if (!assetsRef || assetsRef.filename !== assetsName) throw new Error("invalid free assets descriptor");
if (!/^[a-f0-9]{64}$/.test(assetsRef.sha256 ?? "")) throw new Error("invalid free assets sha256");
const assetsPath = join(directory, assetsName);
const assetsBytes = readFileSync(assetsPath);
if (sha256(assetsBytes) !== assetsRef.sha256) throw new Error("free assets archive checksum mismatch");
assertSidecar(assetsName, assetsRef.sha256);
if (assetsBytes.length !== assetsRef.size) throw new Error("free assets archive size mismatch");
const assetsEntries = tarList(assetsPath)
  .split("\n")
  .filter(Boolean)
  .sort();
if (assetsEntries.length === 0 || assetsEntries.some((line) => !line.startsWith("assets/"))) {
  throw new Error("free assets archive must contain only assets/** paths");
}

const resourceAssets = [];
if (descriptor.free.resources) {
  const resources = descriptor.free.resources;
  if (resources.schemaVersion !== 1) throw new Error("invalid free resources schema");
  for (const kind of ["index", "bundle"]) {
    const ref = resources[kind];
    const expected = kind === "index" ? `moe-icons-free-resource-index-${version}.json.gz` : `moe-icons-free-resources-${version}.bin`;
    if (!ref || ref.filename !== expected || !/^[a-f0-9]{64}$/.test(ref.sha256) || !Number.isSafeInteger(ref.size) || ref.size < 1) throw new Error(`invalid free resource ${kind} identity`);
    const bytes = readFileSync(join(directory, expected));
    if (bytes.length !== ref.size || sha256(bytes) !== ref.sha256) throw new Error(`free resource ${kind} checksum/length mismatch`);
    assertSidecar(expected, ref.sha256);
    resourceAssets.push(expected, `${expected}.sha256`);
  }
  if(resources.index.size>8*1024*1024)throw new Error("free resource index exceeds 8 MiB");
  const index=JSON.parse(gunzipSync(readFileSync(join(directory,resources.index.filename)),{maxOutputLength:64*1024*1024}).toString());
  if(index.schemaVersion!==1||index.tier!=="free"||index.version!==version||index.artifactSha256!==descriptor.free.sha256||index.bundle?.sha256!==resources.bundle.sha256||index.bundle?.size!==resources.bundle.size||index.bundle?.filename!==resources.bundle.filename||!index.files||typeof index.files!=="object"||Array.isArray(index.files))throw new Error("free resource index identity mismatch");
  const bundle=readFileSync(join(directory,resources.bundle.filename)),names=Object.keys(index.files),folded=new Set(),intervals=[];
  if(!names.length||names.length>250000)throw new Error("invalid free indexed resource count");
  for(const name of names){
    const entry=index.files[name],parts=name.split("/");
    if(!/^(react|vue|vanilla|assets)\/[A-Za-z0-9_./-]+$/.test(name)||parts.some(part=>!part||part==="."||part==="..")||folded.has(name.toLowerCase())||!entry||typeof entry!=="object"||Array.isArray(entry))throw new Error("unsafe free resource path");
    folded.add(name.toLowerCase());
    if(name!=="assets/manifest.json"&&!/^(react|vue|vanilla)\/(?:types\.d\.ts|(?:index|runtime)\.(?:js|cjs|d\.ts))$/.test(name)&&!descriptor.free.styleGroups.includes(parts[1]))throw new Error("free resource contains unauthorized style group");
    if(![entry.offset,entry.compressedSize,entry.size].every(Number.isSafeInteger)||entry.offset<0||entry.compressedSize<1||entry.size<0||entry.size>32*1024*1024||!Array.isArray(entry.requires)||entry.requires.some(dep=>typeof dep!=="string"||!Object.hasOwn(index.files,dep)||dep.split("/")[0]!==parts[0]))throw new Error("invalid free resource entry");
    const end=entry.offset+entry.compressedSize;if(!Number.isSafeInteger(end)||end>bundle.length)throw new Error("free resource range escapes bundle");intervals.push([entry.offset,end]);
    const compressed=bundle.subarray(entry.offset,end);if(sha256(compressed)!==entry.compressedSha256)throw new Error("free compressed resource digest mismatch");
    const bytes=gunzipSync(compressed,{maxOutputLength:Math.max(1,entry.size)});if(bytes.length!==entry.size||sha256(bytes)!==entry.sha256)throw new Error("free resource digest/size mismatch");
  }
  for(const name of folded){const parts=name.split("/");for(let i=1;i<parts.length;i++)if(folded.has(parts.slice(0,i).join("/")))throw new Error("free resource file/directory collision");}
  intervals.sort((a,b)=>a[0]-b[0]);if(intervals[0][0]!==0||intervals.at(-1)[1]!==bundle.length||intervals.some((range,i)=>i>0&&range[0]!==intervals[i-1][1]))throw new Error("free resource ranges overlap or leave unindexed bytes");
}
const unexpected = readdirSync(directory).filter(
  (name) => ![expectedName, `${expectedName}.sha256`, metadataName, `${metadataName}.sha256`, assetsName, `${assetsName}.sha256`, "release-descriptor.json", ...resourceAssets].includes(name),
);
if (unexpected.some((name) => name.includes("pro"))) throw new Error("candidate artifact contains a pro asset");
process.stdout.write(
  `${JSON.stringify({ version, filename: expectedName, sha256: descriptor.free.sha256, metadata: { filename: metadataName, sha256: metadata.sha256 }, assets: { filename: assetsName, sha256: assetsRef.sha256 } })}\n`,
);
