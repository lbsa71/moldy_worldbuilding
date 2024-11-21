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

      // Handle R2 asset requests
      if (url.pathname.startsWith("/assets/")) {
        const key = url.pathname.replace("/assets/", "");
        const object = await env.GAME_ASSETS.get(key);

        if (object === null) {
          return new Response("Not Found", { status: 404 });
        }

        const headers = new Headers();
        object.writeHttpMetadata(headers);
        headers.set("etag", object.httpEtag);
        headers.set("Cache-Control", "public, max-age=31536000");

        return new Response(object.body, {
          headers,
        });
      }

      // Basic health check
      if (url.pathname === "/health") {
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
    } catch (error) {
      console.error("Error:", error);
      return new Response("Error", {
        status: 500,
        headers: { "content-type": "text/plain" },
      });
    }
  },
};
