// @ts-check
import { defineConfig } from "astro/config";
import { cardStudyPlugin } from "./scripts/cardStudyPlugin.mjs";

// https://astro.build/config
export default defineConfig({
  build: {
    inlineStylesheets: "never",
    assets: "assets",
  },
  vite: {
    plugins: [cardStudyPlugin()],
    build: {
      // Increase chunk size limit
      chunkSizeWarningLimit: 2000,
      commonjsOptions: {
        include: [/node_modules/, /inkjs/],
        transformMixedEsModules: true,
      },
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
