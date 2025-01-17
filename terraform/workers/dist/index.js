// src/index.ts
var MIME_TYPES = {
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
  ".json": "application/json"
};
function getMimeType(path) {
  if (path.includes("/_astro/") && path.endsWith(".js")) {
    return "text/javascript; charset=utf-8";
  }
  const ext = "." + path.split(".").pop()?.toLowerCase() || "";
  return MIME_TYPES[ext] || "application/octet-stream";
}
var src_default = {
  async fetch(request, env, ctx) {
    try {
      const url = new URL(request.url);
      if (url.pathname.startsWith("/api/")) {
        if (url.pathname === "/api/health") {
          return new Response(
            JSON.stringify({
              status: "ok",
              version: env.SOURCE_VERSION,
              environment: env.ENVIRONMENT
            }),
            {
              headers: { "Content-Type": "application/json" }
            }
          );
        }
        const gameState = await env.GAME_STATE.get("someKey");
        return new Response("Game API Running", {
          headers: { "content-type": "text/plain" }
        });
      }
      const key = url.pathname === "/" ? "index.html" : url.pathname.slice(1);
      const object = await env.GAME_ASSETS.get(key);
      if (object === null) {
        return new Response("Not Found", { status: 404 });
      }
      const headers = new Headers();
      object.writeHttpMetadata(headers);
      headers.set("etag", object.httpEtag);
      headers.set("Content-Type", getMimeType(key));
      headers.set("X-Deploy-Version", env.SOURCE_VERSION);
      if (key.includes("/_astro/")) {
        headers.set("Cache-Control", "public, max-age=31536000, immutable");
      } else if (key.match(/\.(js|css|wasm|jpg|png|gif|svg|ico)$/)) {
        headers.set("Cache-Control", "public, max-age=31536000");
        headers.set("ETag", `"${object.httpEtag}-${env.SOURCE_VERSION}"`);
      } else {
        headers.set("Cache-Control", "no-cache, must-revalidate");
      }
      headers.set("Access-Control-Allow-Origin", "*");
      headers.set("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
      headers.set("Access-Control-Allow-Headers", "Content-Type");
      return new Response(object.body, {
        headers
      });
    } catch (error) {
      console.error("Error:", error);
      return new Response("Error", {
        status: 500,
        headers: { "content-type": "text/plain" }
      });
    }
  }
};
export {
  src_default as default
};
