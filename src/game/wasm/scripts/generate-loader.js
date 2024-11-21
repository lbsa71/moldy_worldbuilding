// src/game/wasm/scripts/generate-loader.js
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const loaderContent = `(async function() {
  try {
    const response = await fetch('/wasm/release.wasm');
    if (!response.ok) throw new Error(\`HTTP error! status: \${response.status}\`);
    const bytes = await response.arrayBuffer();
    const wasmModule = await WebAssembly.instantiate(bytes);
    const exports = wasmModule.instance.exports;
    
    // Add exports to window object
    window.add = exports.add;
    window.calculatePhysics = exports.calculatePhysics;
    
    console.log('WASM module loaded successfully');
  } catch (e) {
    console.error('Failed to load WASM:', e);
  }
})();`;

async function generateLoader() {
  // Resolve path relative to this script
  const publicWasmDir = path.resolve(__dirname, "../../../../public/wasm");

  try {
    // Ensure directory exists
    await fs.mkdir(publicWasmDir, { recursive: true });

    // Write the loader file
    await fs.writeFile(
      path.join(publicWasmDir, "release.js"),
      loaderContent,
      "utf8"
    );
    console.log("Generated WASM loader in:", publicWasmDir);
  } catch (error) {
    console.error("Error generating WASM loader:", error);
    process.exit(1);
  }
}

generateLoader();
