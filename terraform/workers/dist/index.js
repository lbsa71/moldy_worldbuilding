// src/index.ts
var src_default = {
  async fetch(request, env, ctx) {
    try {
      const url = new URL(request.url);
      if (url.pathname === "/health") {
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
