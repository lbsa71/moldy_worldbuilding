// src/index.ts
var src_default = {
  async fetch(request, env, ctx) {
    env.GAME_ANALYTICS.writeDataPoint({
      indexes: ["request"],
      blobs: [request.url, request.method],
      doubles: [Date.now()]
    });
    try {
      if (request.url.endsWith("/health")) {
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
    } catch (error) {
      env.GAME_ANALYTICS.writeDataPoint({
        indexes: ["error"],
        blobs: [error.message],
        doubles: [Date.now()]
      });
      return new Response("Error", { status: 500 });
    }
  }
};
export {
  src_default as default
};
