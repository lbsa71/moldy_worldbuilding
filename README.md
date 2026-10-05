# Fading

The next visual direction is documented in the [living scene production plan](docs/living-scene-plan.md): reconstruct the opening image as a fixed scene that responds to choices. The existing chapter remains available while the browser proof is developed.

A quiet, choice-driven 3D journey through memory and care. Replies carry you through an emotional landscape: refuge, constriction, room to breathe, and a return or departure. The current chapter has eleven decisions and three resolutions. It runs locally as a static Astro site with Babylon.js and Ink.

## Play locally

Use Node.js 22.12 or later (Node 24 is used in CI).

```sh
npm ci
npm run dev
```

Open the local URL printed by Astro. Choose with the mouse, touch, Tab/Enter, or keys 1–4. The camera follows the story. Settings include sound, volume, reduced motion, larger text and conversation history. Progress and audio/motion preferences are saved in this browser when local storage is available. Begin again resets the story.

The separate `/scene-study/` route previews the new fixed-view renderer. It has chair/cup controls and an opening-image comparison. Asset status explicitly distinguishes the provisional studies from the detailed Blender delivery; loading a model does not mean its visual fidelity has been accepted. Use `/scene-study/?renderer=webgl` to exercise the fallback renderer.

The spatial edition uses a new save slot because its Ink content structure changed. Earlier saves remain stored, but this edition starts a fresh passage. New saves retain the memory landmarks visited along the way.

```sh
npm run validate  # tests, type checking, production build
npm run preview   # serve the production build
```

Astro 7 runs development/preview servers in the background. Use `npm run astro -- dev stop` or `npm run astro -- preview stop` when finished. Add `?debug` to expose renderer and FPS telemetry; `?debug&renderer=webgl` explicitly exercises WebGL. The debug D key toggles fog/prop inspection.

## Project map

- `src/ink/demo.ink`: active chapter. `legacy-demo.ink` preserves the original experiment.
- `src/utils/ink.ts`: validated story-to-world tags.
- `src/components/GameScene.ts`: renderer, world, story, save and lifecycle coordination.
- `src/components/game/`: lighting, terrain, symbolic props, character, camera and music playback.
- `src/game/experience/`: launch, semantic dialogue controls and styles.
- `public/assets/fading-*.mp3`: four original ambient compositions and a two-tap rail cue. Rebuild with `npm run score:render` (ffmpeg required).
- `docs/assessment-and-remedy.md`: baseline critique, SWOT and staged quality plan.
- `docs/implementation-status.md`: delivered scope, verification and remaining production work.
- `docs/narrative-direction.md`: story structure and authoring contract.
- `docs/art-and-audio-production.md`: direction and Blender asset brief.
- `docs/asset-provenance.md`: origin and release status of assets.
- `scripts/blender/README.md`: original bedside asset generator and Blender handoff.
- `docs/blender-coordination.md`: active Blender management chat, job status and ownership.

The old WASM experiment and backup scene remain for reference. WASM is not loaded by the game; `npm run build:wasm` is an explicit legacy build only. No Spotify, account, API key, external font, or live service is needed to play.

## Deployment

Public game address: [Fading](https://moldy-worldbuilding-api.lbsa71.workers.dev/). Check [GitHub Actions](https://github.com/lbsa71/moldy_worldbuilding/actions) for the latest validation and deployment result.

CI installs from the lockfile and validates the actual game. A successful push to `main` uploads the tested static artifact to the existing R2 destination. Configure `CLOUDFLARE_API_TOKEN` as a repository **secret** and `CLOUDFLARE_ACCOUNT_ID` as a repository variable. Pull-request runs do not deploy. Local development does not publish anything. The Cloudflare worker under `terraform/workers` is a separate deployment and still needs its own dependency review.

This is a substantially improved playable chapter, not a claim of AAA production completion. Final asset provenance, human music/story review, target-device performance, accessibility testing and release QA remain production gates.
