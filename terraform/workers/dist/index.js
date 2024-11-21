// src/index.ts
var src_default = {
  async fetch(request, env) {
    return new Response("Game API Running", {
      headers: { "content-type": "text/plain" }
    });
  }
};
export {
  src_default as default
};
