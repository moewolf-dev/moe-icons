#!/usr/bin/env node
/**
 * DEV-20-01 / FIX-22-A: validate the nested entitlement `binding` on a public
 * Free release.
 *
 * The public repo is the contract source of truth. The event's
 * releasePolicySha256 must equal the SHA-256 of the checked-out contract AND
 * (for acceptance) the contract bytes that actually exist at the full
 * `releasePolicyCommit`. A 40-hex format alone is not proof: a fake commit (e.g.
 * all zeros) must fail because the pinned raw URL will not resolve to the
 * expected bytes. A Free action must never carry a Pro bitmap batch.
 *
 * Usage:
 *   node scripts/validate-release-event-binding.mjs --binding <json> [--no-verify-commit]
 */

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const CONTRACT = join(ROOT, "contracts", "release-policy", "free-style-groups.v1.json");
const SOURCE_REPO = "moewolf-dev/moe-icons";
const SOURCE_PATH = "contracts/release-policy/free-style-groups.v1.json";
const RAW_BASE = "https://raw.githubusercontent.com";
const COMMIT = /^[0-9a-f]{40}$/;
const SHA256 = /^[a-f0-9]{64}$/;

export function validateFreeReleaseBinding(binding, contractBytes) {
  if (!binding || typeof binding !== "object" || Array.isArray(binding)) {
    throw new Error("free-release event is missing the binding object");
  }
  for (const field of Object.keys(binding)) {
    if (!["releasePolicyCommit", "releasePolicySha256", "manifestSha256", "mediaContractVersion", "sourceManifestSchemaVersion", "releaseScope", "bitmapBatch"].includes(field)) {
      throw new Error(`free-release binding has unknown field "${field}"`);
    }
  }
  if (!COMMIT.test(String(binding.releasePolicyCommit || ""))) {
    throw new Error("invalid binding releasePolicyCommit");
  }
  if (!SHA256.test(String(binding.releasePolicySha256 || ""))) {
    throw new Error("invalid binding releasePolicySha256");
  }
  const manifestSha256 = binding.manifestSha256 === undefined ? undefined : String(binding.manifestSha256).toLowerCase();
  if (manifestSha256 !== undefined && !SHA256.test(manifestSha256)) {
    throw new Error("invalid binding manifestSha256");
  }
  const mediaVersion = Number(binding.mediaContractVersion);
  const schemaVersion = Number(binding.sourceManifestSchemaVersion);
  if (!((mediaVersion === 1 && schemaVersion === 1) || (mediaVersion === 2 && schemaVersion === 2))) {
    throw new Error(`illegal binding version combination mediaContractVersion=${binding.mediaContractVersion} sourceManifestSchemaVersion=${binding.sourceManifestSchemaVersion}`);
  }
  if (binding.releaseScope !== "free") {
    throw new Error(`free-release binding releaseScope must be free (got ${binding.releaseScope})`);
  }
  if (binding.bitmapBatch !== undefined && binding.bitmapBatch !== null) {
    throw new Error("free-release binding must not carry a Pro bitmapBatch");
  }
  const localSha = createHash("sha256").update(contractBytes).digest("hex");
  if (binding.releasePolicySha256 !== localSha) {
    throw new Error(`binding releasePolicySha256 ${binding.releasePolicySha256} != checked-out contract ${localSha}`);
  }
  return {
    releasePolicyCommit: binding.releasePolicyCommit,
    releasePolicySha256: binding.releasePolicySha256,
    ...(manifestSha256 ? { manifestSha256 } : {}),
    releaseScope: "free",
  };
}

/**
 * Prove the contract at `sourceCommit` is the same bytes the event pinned.
 * Fails closed on 404/network errors or a hash mismatch; `fetchImpl` is
 * injectable for offline tests.
 */
export async function verifyCommitContract({ sourceCommit, expectedSha256, fetchImpl = globalThis.fetch }) {
  if (!COMMIT.test(String(sourceCommit || ""))) throw new Error("releasePolicyCommit must be a full 40-hex commit");
  if (!SHA256.test(String(expectedSha256 || ""))) throw new Error("releasePolicySha256 must be 64-hex");
  const url = `${RAW_BASE}/${SOURCE_REPO}/${sourceCommit}/${SOURCE_PATH}`;
  let response;
  try {
    response = await fetchImpl(url, { redirect: "error" });
  } catch (error) {
    throw new Error(`pinned contract fetch failed for ${sourceCommit}: ${error.message}`);
  }
  if (!response || response.ok !== true) {
    throw new Error(`pinned contract not found at ${sourceCommit} (HTTP ${response ? response.status : "none"})`);
  }
  const bytes = Buffer.from(await response.arrayBuffer());
  const sha = createHash("sha256").update(bytes).digest("hex");
  if (sha !== expectedSha256) {
    throw new Error(`pinned contract sha256 ${sha} != event ${expectedSha256}`);
  }
  return { sourceCommit, sha256: sha, url };
}

function arg(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

async function main() {
  const bindingArg = arg("--binding");
  if (!bindingArg) throw new Error("usage: validate-release-event-binding.mjs --binding <json> [--no-verify-commit]");
  let binding;
  try {
    binding = JSON.parse(bindingArg);
  } catch (error) {
    throw new Error(`--binding must be JSON: ${error.message}`);
  }
  const contractBytes = readFileSync(CONTRACT);
  const local = validateFreeReleaseBinding(binding, contractBytes);
  if (!process.argv.includes("--no-verify-commit")) {
    await verifyCommitContract({ sourceCommit: binding.releasePolicyCommit, expectedSha256: binding.releasePolicySha256 });
  }
  process.stdout.write(`${JSON.stringify(local)}\n`);
}

if (process.argv[1] && process.argv[1].endsWith("validate-release-event-binding.mjs")) {
  main().catch((error) => {
    process.stderr.write(`ERROR: ${error instanceof Error ? error.message : String(error)}\n`);
    process.exit(1);
  });
}
