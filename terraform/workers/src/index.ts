// terraform/workers/src/index.ts
interface Env {
  GAME_STATE: KVNamespace;
  GAME_ASSETS: R2Bucket;
  GAME_ANALYTICS: AnalyticsEngineDataset;
  ENVIRONMENT: string;
  SOURCE_VERSION: string;
}

export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext
  ): Promise<Response> {
    // Log request for analytics
    env.GAME_ANALYTICS.writeDataPoint({
      indexes: ["request"],
      blobs: [request.url, request.method],
      doubles: [Date.now()],
    });

    try {
      // Basic health check
      if (request.url.endsWith("/health")) {
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
      // Log error
      env.GAME_ANALYTICS.writeDataPoint({
        indexes: ["error"],
        blobs: [error.message],
        doubles: [Date.now()],
      });

      return new Response("Error", { status: 500 });
    }
  },
};
