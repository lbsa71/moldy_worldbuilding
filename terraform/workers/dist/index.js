// src/index.ts
var src_default = {
  async fetch(request, env, ctx) {
    try {
      const url = new URL(request.url);
      if (url.pathname === "/" || url.pathname === "/index.html") {
        const object2 = await env.GAME_ASSETS.get("index.html");
        if (object2 === null) {
          return new Response("Not Found", { status: 404 });
        }
        const headers2 = new Headers();
        object2.writeHttpMetadata(headers2);
        headers2.set("etag", object2.httpEtag);
        headers2.set("Content-Type", "text/html");
        headers2.set("Cache-Control", "no-cache");
        return new Response(object2.body, {
          headers: headers2
        });
      }
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
      const key = url.pathname.slice(1);
      const object = await env.GAME_ASSETS.get(key);
      if (object === null) {
        return new Response("Not Found", { status: 404 });
      }
      const headers = new Headers();
      object.writeHttpMetadata(headers);
      headers.set("etag", object.httpEtag);
      if (key.startsWith("_astro/") || key.startsWith("assets/")) {
        headers.set("Cache-Control", "public, max-age=31536000");
      } else {
        headers.set("Cache-Control", "no-cache");
      }
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
