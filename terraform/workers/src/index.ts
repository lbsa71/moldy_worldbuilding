// terraform/workers/src/index.ts
interface Env {
  GAME_STATE: KVNamespace;
  GAME_ASSETS: R2Bucket;
  ENVIRONMENT: string;
  SOURCE_VERSION: string;
}

export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext
  ): Promise<Response> {
    try {
      const url = new URL(request.url);

      // Handle root path and direct index.html requests
      if (url.pathname === "/" || url.pathname === "/index.html") {
        const object = await env.GAME_ASSETS.get("index.html");
        if (object === null) {
          return new Response("Not Found", { status: 404 });
        }

        const headers = new Headers();
        object.writeHttpMetadata(headers);
        headers.set("etag", object.httpEtag);
        headers.set("Content-Type", "text/html");
        headers.set("Cache-Control", "no-cache");

        return new Response(object.body, {
          headers,
        });
      }

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

      // For any other path, try to serve it from R2 directly
      // This will handle all Astro-generated assets with their proper paths
      const key = url.pathname.slice(1); // Remove leading slash
      const object = await env.GAME_ASSETS.get(key);
      if (object === null) {
        return new Response("Not Found", { status: 404 });
      }

      const headers = new Headers();
      object.writeHttpMetadata(headers);
      headers.set("etag", object.httpEtag);

      // Set appropriate cache control based on the path
      if (key.startsWith("_astro/") || key.startsWith("assets/")) {
        headers.set("Cache-Control", "public, max-age=31536000"); // Long cache for static assets
      } else {
        headers.set("Cache-Control", "no-cache"); // No cache for other files
      }

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
