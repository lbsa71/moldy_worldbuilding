// @ts-check
import { defineConfig } from "astro/config";

const BABYLON_CORE_CHUNKS = [
  {
    chunk: "babylon-engine",
    paths: [
      "/@babylonjs/core/Engines/",
      "/@babylonjs/core/DeviceInput/",
      "/@babylonjs/core/Inputs/",
    ],
  },
  {
    chunk: "babylon-rendering",
    paths: [
      "/@babylonjs/core/Rendering/",
      "/@babylonjs/core/FrameGraph/",
      "/@babylonjs/core/Layers/",
      "/@babylonjs/core/PostProcesses/",
      "/@babylonjs/core/Shaders/",
      "/@babylonjs/core/ShadersWGSL/",
    ],
  },
  {
    chunk: "babylon-scene",
    paths: [
      "/@babylonjs/core/Animations/",
      "/@babylonjs/core/Bones/",
      "/@babylonjs/core/Cameras/",
      "/@babylonjs/core/Lights/",
      "/@babylonjs/core/Loading/",
      "/@babylonjs/core/Particles/",
    ],
  },
  {
    chunk: "babylon-materials",
    paths: [
      "/@babylonjs/core/Materials/",
      "/@babylonjs/core/Buffers/",
    ],
  },
  {
    chunk: "babylon-meshes",
    paths: [
      "/@babylonjs/core/Meshes/",
      "/@babylonjs/core/Collisions/",
      "/@babylonjs/core/Culling/",
    ],
  },
  {
    chunk: "babylon-math",
    paths: [
      "/@babylonjs/core/Maths/",
      "/@babylonjs/core/Misc/",
    ],
  },
];

/**
 * @param {string} id
 * @returns {string | undefined}
 */
export function getManualChunkName(id) {
  const normalizedId = id.replaceAll("\\", "/");

  if (normalizedId.includes("/@babylonjs/gui/")) {
    return "babylon-gui";
  }

  if (normalizedId.includes("/@babylonjs/loaders/")) {
    return "babylon-loaders";
  }

  if (normalizedId.includes("/@babylonjs/havok/")) {
    return "babylon-physics";
  }

  if (normalizedId.includes("/@babylonjs/core/")) {
    const match = BABYLON_CORE_CHUNKS.find(({ paths }) =>
      paths.some((path) => normalizedId.includes(path))
    );

    return match?.chunk ?? "babylon-core";
  }

  return undefined;
}

// https://astro.build/config
export default defineConfig({
  build: {
    inlineStylesheets: "never",
    assets: "assets",
  },
  vite: {
    build: {
      // Keep Vite's warning threshold aligned with scripts/check-bundle-size.mjs.
      chunkSizeWarningLimit: 2000,
      commonjsOptions: {
        include: [/node_modules/, /inkjs/],
        transformMixedEsModules: true,
      },
      rollupOptions: {
        output: {
          manualChunks: getManualChunkName,
        },
      },
    },
    optimizeDeps: {
      exclude: ["@babylonjs/core"],
    },
    server: {
      watch: {
        ignored: ["**/public/wasm/**"],
      },
    },
  },
});
