// terraform/workers/src/index.ts
interface Env {
  GAME_STATE: KVNamespace;
  GAME_ASSETS: R2Bucket;
  ENVIRONMENT: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    return new Response("Game API Running", {
      headers: { "content-type": "text/plain" },
    });
  },
};
