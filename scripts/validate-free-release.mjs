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
const descriptorPath = join(directory, "release-descriptor.json");
const descriptorBytes = readFileSync(descriptorPath);
if (sha256(descriptorBytes) !== descriptorSha) throw new Error("release descriptor checksum mismatch");
const descriptor = JSON.parse(descriptorBytes.toString("utf8"));
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

const entries = execFileSync("tar", ["-tzf", archivePath], { encoding: "utf8" })
  .split("\n")
  .filter(Boolean);
const catalogEntry = entries.find((entry) => entry === "catalog.json" || entry === "./catalog.json");
if (!catalogEntry) throw new Error("free archive is missing catalog.json");
const catalogBytes = execFileSync("tar", ["-xOzf", archivePath, catalogEntry]);
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
if (metadataBytes.length !== metadata.size) throw new Error("free metadata archive size mismatch");
const metadataEntries = execFileSync("tar", ["-tzf", metadataPath], { encoding: "utf8" })
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
  const bytes = execFileSync("tar", ["-xOzf", metadataPath, file]);
  const name = file.slice("metadata/".length);
  if (sha256(bytes) !== metadata.files[name].sha256) throw new Error(`metadata ${name} checksum mismatch`);
  if (bytes.length !== metadata.files[name].size) throw new Error(`metadata ${name} size mismatch`);
}

const unexpected = readdirSync(directory).filter(
  (name) => ![expectedName, `${expectedName}.sha256`, metadataName, `${metadataName}.sha256`, "release-descriptor.json"].includes(name),
);
if (unexpected.some((name) => name.includes("pro"))) throw new Error("candidate artifact contains a pro asset");
process.stdout.write(
  `${JSON.stringify({ version, filename: expectedName, sha256: descriptor.free.sha256, metadata: { filename: metadataName, sha256: metadata.sha256 } })}\n`,
);
