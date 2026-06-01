import { readdir, stat } from "node:fs/promises";
import { join } from "node:path";

const ASSET_DIR = join(process.cwd(), "dist", "assets");
const DEFAULT_MAX_JS_BYTES = 2_000_000;
const maxJsBytes = Number(
  process.env.MAX_JS_CHUNK_BYTES ?? DEFAULT_MAX_JS_BYTES
);

const entries = await readdir(ASSET_DIR, { withFileTypes: true });
const jsAssets = entries
  .filter((entry) => entry.isFile() && entry.name.endsWith(".js"))
  .map((entry) => entry.name);

const sizedAssets = await Promise.all(
  jsAssets.map(async (name) => {
    const size = await stat(join(ASSET_DIR, name));
    return {
      bytes: size.size,
      name,
    };
  })
);

const oversizedAssets = sizedAssets.filter(
  (asset) => asset.bytes > maxJsBytes
);

if (oversizedAssets.length > 0) {
  const details = oversizedAssets
    .map((asset) => `${asset.name}: ${formatBytes(asset.bytes)}`)
    .join("\n");

  throw new Error(
    `JS chunks exceed ${formatBytes(maxJsBytes)} budget:\n${details}`
  );
}

console.log(
  `JS bundle budget passed: ${sizedAssets.length} chunks <= ${formatBytes(
    maxJsBytes
  )}`
);

function formatBytes(bytes) {
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}
