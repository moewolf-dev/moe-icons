import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const SHA = /^[a-f0-9]{64}$/;

const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");

/**
 * Compare the locally packed candidate against an existing immutable release
 * download for the same version. Returns the set of assets that drifted (empty
 * when identical), comparing the code archive, the metadata archive and the
 * release descriptor SHA-256s explicitly so the failure message names the asset.
 *
 * usage: compareReleaseAssets(localDir, existingDir, version, descriptorSha256)
 */
export function compareReleaseAssets(localDir, existingDir, version, descriptorSha256) {
  if (!/^\d+\.\d+\.\d+(?:-(?:alpha|beta))?$/.test(version ?? "")) throw new Error("invalid version");
  if (!SHA.test(descriptorSha256 ?? "")) throw new Error("invalid descriptor sha256");

  const code = `moe-icons-free-${version}.tgz`;
  const metadata = `moe-icons-free-metadata-${version}.tgz`;
  const assets = `moe-icons-free-assets-${version}.tgz`;
  const names = [code, `${code}.sha256`, assets, `${assets}.sha256`, metadata, `${metadata}.sha256`, "release-descriptor.json"];

  const drifted = [];
  for (const name of names) {
    const local = readFileSync(join(localDir, name));
    const existing = readFileSync(join(existingDir, name));
    if (sha256(local) !== sha256(existing)) drifted.push(name);
  }
  const localDescriptorSha = sha256(readFileSync(join(localDir, "release-descriptor.json")));
  if (localDescriptorSha !== descriptorSha256) drifted.push("release-descriptor.json (against sidecar)");
  return drifted;
}

if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) {
  const [localDir, existingDir, version, descriptorSha256] = process.argv.slice(2);
  const drifted = compareReleaseAssets(localDir, existingDir, version, descriptorSha256);
  if (drifted.length) {
    process.stderr.write(`existing release assets differ: ${drifted.join(", ")}\n`);
    process.exit(1);
  }
  process.stdout.write(`${JSON.stringify({ ok: true, version })}\n`);
}
