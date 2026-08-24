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

const unexpected = readdirSync(directory).filter(
  (name) => ![expectedName, `${expectedName}.sha256`, "release-descriptor.json"].includes(name),
);
if (unexpected.some((name) => name.includes("pro"))) throw new Error("candidate artifact contains a pro asset");
process.stdout.write(`${JSON.stringify({ version, filename: expectedName, sha256: descriptor.free.sha256 })}\n`);
