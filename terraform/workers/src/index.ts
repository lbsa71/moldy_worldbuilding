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
