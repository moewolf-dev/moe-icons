import { createHash } from "node:crypto";
import { readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const REPO = "moewolf-dev/moe-icons";
const SHA = /^[a-f0-9]{64}$/;

/**
 * Generate the `latest` release descriptor. Only runs after the code and
 * metadata archives have been uploaded to a release and their bytes re-read and
 * verified. Refuses to point the latest pointer at any asset that is missing,
 * has the wrong size, or the wrong checksum.
 *
 * usage: node scripts/write-latest-descriptor.mjs <dir> <version> <descriptorSha256>
 */
const [directory, version, descriptorSha] = process.argv.slice(2);
if (!directory || !/^\d+\.\d+\.\d+(?:-(?:alpha|beta))?$/.test(version ?? "")) {
  throw new Error("usage: write-latest-descriptor <dir> <version> <descriptor-sha256>");
}
if (!SHA.test(descriptorSha ?? "")) throw new Error("invalid descriptor sha256");

const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const descriptorBytes = readFileSync(join(directory, "release-descriptor.json"));
if (sha256(descriptorBytes) !== descriptorSha) throw new Error("release descriptor checksum mismatch");
const descriptor = JSON.parse(descriptorBytes.toString("utf8"));
if (descriptor.fullVersion !== version) throw new Error("release descriptor version mismatch");

const downloadUrl = (filename) =>
  `https://github.com/${REPO}/releases/download/v${encodeURIComponent(version)}/${encodeURIComponent(filename)}`;

const asset = (ref, kind) => {
  const filename = ref.filename;
  const full = join(directory, filename);
  const bytes = readFileSync(full);
  if (sha256(bytes) !== ref.sha256) throw new Error(`${kind} archive checksum mismatch after upload`);
  const size = statSync(full).size;
  if (size !== bytes.length) throw new Error(`${kind} archive size mismatch after upload`);
  return { filename, url: downloadUrl(filename), size, sha256: ref.sha256 };
};

const latest = {
  schemaVersion: 1,
  tier: "free",
  fullVersion: version,
  descriptorSha256: descriptorSha,
  assets: {
    code: asset(descriptor.free, "code"),
    metadata: asset(descriptor.free.metadata, "metadata"),
  },
};

writeFileSync(join(directory, "release-latest.json"), `${JSON.stringify(latest, null, 2)}\n`);
process.stdout.write(`${JSON.stringify({ ok: true, version, sha256: sha256(JSON.stringify(latest, null, 2) + "\n") })}\n`);
