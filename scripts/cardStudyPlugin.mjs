/** The fit study is a Vite development endpoint, never an exported game route. */
export function cardStudyPlugin() {
  return {
    name: 'fading-card-fit-study',
    apply: /** @type {const} */ ('serve'),
    configureServer(server) {
      server.middlewares.use(async (request, response, next) => {
        if (!/^\/__card-study\/?(?:\?|$)/.test(request.url ?? '')) return next();
        try {
          const html = await server.transformIndexHtml('/__card-study/', `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Fading — development card fit study</title></head>
<body><div id="game-container" class="game-container"><div id="experience-ui"></div></div>
<details id="card-study-tools" open><summary>Card fit study <span id="card-study-status">Loading…</span></summary>
<div><label>Audit text scale <select id="card-study-scale"><option value="1">Standard · 1</option><option value="1.2">Large · 1.2</option><option value="1.4">Extra large · 1.4</option></select></label>
<button id="card-study-run" type="button" disabled>Run card fit audit</button><button id="card-study-preview" type="button" disabled>Preview worst witness</button>
<p>Uses the production dialogue component and CSS. No scene renderer or game saves. Set the browser viewport, choose a text scale, then run.</p>
<pre id="card-study-report" aria-live="polite"></pre></div></details>
<script type="module" src="/src/dev/cardStudy.ts"></script></body></html>`);
          response.statusCode = 200;
          response.setHeader('Content-Type', 'text/html; charset=utf-8');
          response.setHeader('Cache-Control', 'no-store');
          response.end(html);
        } catch (error) { next(error); }
      });
    },
  };
}
