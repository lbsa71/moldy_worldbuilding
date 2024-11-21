// @ts-check
import { defineConfig } from "astro/config";

// https://astro.build/config
export default defineConfig({
  build: {
    inlineStylesheets: "never",
    assets: "assets",
  },
  vite: {
    build: {
      // Increase chunk size limit
      chunkSizeWarningLimit: 2000,
      rollupOptions: {
        output: {
          manualChunks(id) {
            // Split babylon.js into a separate chunk
            if (id.includes("@babylonjs")) {
              return "babylon";
            }
          },
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
