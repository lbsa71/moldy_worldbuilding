// src/index.ts
var src_default = {
  async fetch(request, env, ctx) {
    try {
      const url = new URL(request.url);
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
          headers
        });
      }
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
