// terraform/workers/src/index.ts
interface Env {
  GAME_STATE: KVNamespace;
  GAME_ASSETS: R2Bucket;
  ENVIRONMENT: string;
  SOURCE_VERSION: string;
}

// MIME type mapping
const MIME_TYPES: Record<string, string> = {
  ".html": "text/html",
  ".js": "application/javascript",
  ".mjs": "application/javascript",
  ".css": "text/css",
  ".wasm": "application/wasm",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".json": "application/json",
};

function getMimeType(path: string): string {
  // Handle JavaScript modules specifically
  if (path.includes("/_astro/") && path.endsWith(".js")) {
    return "text/javascript; charset=utf-8";
  }

  const ext = "." + path.split(".").pop()?.toLowerCase() || "";
  return MIME_TYPES[ext] || "application/octet-stream";
}

export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext
  ): Promise<Response> {
    try {
      const url = new URL(request.url);

      // Handle API endpoints
      if (url.pathname.startsWith("/api/")) {
        // Basic health check
        if (url.pathname === "/api/health") {
          return new Response(
            JSON.stringify({
              status: "ok",
              version: env.SOURCE_VERSION,
              environment: env.ENVIRONMENT,
            }),
            {
              headers: { "Content-Type": "application/json" },
            }
          );
        }

        // Example game state handling
        const gameState = await env.GAME_STATE.get("someKey");

        return new Response("Game API Running", {
          headers: { "content-type": "text/plain" },
        });
      }

      // For any other path, serve from R2
      const key = url.pathname === "/" ? "index.html" : url.pathname.slice(1);
      const object = await env.GAME_ASSETS.get(key);

      if (object === null) {
        return new Response("Not Found", { status: 404 });
      }

      const headers = new Headers();
      object.writeHttpMetadata(headers);
      headers.set("etag", object.httpEtag);

      // Set correct content type
      headers.set("Content-Type", getMimeType(key));

      // Add version header for debugging
      headers.set("X-Deploy-Version", env.SOURCE_VERSION);

      // Set cache control based on the file type and path
      if (key.includes("/_astro/")) {
        // Astro's hashed assets can be cached forever
        headers.set("Cache-Control", "public, max-age=31536000, immutable");
      } else if (key.match(/\.(js|css|wasm|jpg|png|gif|svg|ico)$/)) {
        // Add version to cache key for other static assets
        headers.set("Cache-Control", "public, max-age=31536000");
        headers.set("ETag", `"${object.httpEtag}-${env.SOURCE_VERSION}"`);
      } else {
        // No cache for HTML and other files
        headers.set("Cache-Control", "no-cache, must-revalidate");
      }

      // Add CORS headers
      headers.set("Access-Control-Allow-Origin", "*");
      headers.set("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
      headers.set("Access-Control-Allow-Headers", "Content-Type");

      return new Response(object.body, {
        headers,
      });
    } catch (error) {
      console.error("Error:", error);
      return new Response("Error", {
        status: 500,
        headers: { "content-type": "text/plain" },
      });
    }
  },
};
