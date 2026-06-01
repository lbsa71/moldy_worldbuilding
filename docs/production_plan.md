# Production Iteration Plan

## Iteration 1 - Launch Experience

Status: PR opened.

Outcome:
- Player gesture gates startup.
- Launch screen has a production visual direction.
- Test and validation scripts exist.

## Iteration 2 - Narrative Content Pass

Status: PR opened.

Highest-value improvement:
- Replace repeated POC prose with a coherent authored route pass.
- Add automated content checks so future writing does not regress.
- Document the intended voice, route identities, spatial metaphor, and object vocabulary.

Quality checks:
- Ink compiles.
- No mojibake.
- No duplicate long authored prose lines.
- Object tags reference implemented scene objects.
- Audio tags reference existing assets.
- Spatial tags remain inside the intended liminal envelope while preserving off-map endings.

## Iteration 3 - Deterministic Scene Direction

Status: PR opened.

Highest-value improvement:
- Make story object tags resolve to deterministic scene placement instead of random rotations and ad hoc clustering.
- Preserve the intentional off-map `+92` route language while constraining renderable objects to the liminal envelope.
- Let story state drive object visibility so trust and hospital clarity have readable visual consequences.

Quality checks:
- Object planning is pure and repeatable for the same story tags and route state.
- Unknown object tags are ignored instead of creating silent runtime drift.
- Generated positions stay inside the liminal envelope.
- Visibility rules are tested separately from Babylon mesh creation.
- Browser QA confirms the launch-to-first-route flow still renders without console errors.

## Iteration 4 - Cinematic Dialogue UI

Status: PR opened.

Highest-value improvement:
- Replace the debug-like text and choice stack with a bounded, responsive dialogue panel that leaves the scene readable.
- Move dialogue layout decisions into a pure presentation helper so sizing can be tested without Babylon.
- Keep choices stable across desktop and narrow screens with wrapped text, consistent hit areas, and restrained visual styling.

Quality checks:
- Desktop layout leaves more than 45% of the viewport available for the scene.
- Compact layout centers the panel and keeps it within mobile margins.
- Choice-stack height is calculated from the number of choices so buttons do not overlap.
- Authored text normalization trims accidental whitespace while preserving paragraph breaks.
- Browser QA covers launch, first choice, console logs, and mobile framing.

## Iteration 5 - Audio Transition System

Status: PR opened.

Highest-value improvement:
- Replace one-off `HTMLAudioElement` handling with a stateful transition system that can start, keep, and crossfade authored music cues.
- Make unsafe or repeated audio tags harmless instead of reloading assets or leaking playback promises.
- Expose current track, transition state, and playback errors for testable runtime diagnostics.

Quality checks:
- Pure transition tests cover asset normalization, unsafe paths, duplicate requests, starts, crossfades, and fade curves.
- Runtime audio tests cover duplicate suppression, crossfade disposal, and autoplay failure handling without requiring real playback.
- Browser QA confirms launch and the first route choice run without audio-related console warnings or errors.

## Iteration 6 - Off-Map Atmosphere

Status: PR opened.

Highest-value improvement:
- Make the intentional off-map coordinates, including `+92`, drive atmosphere and camera treatment instead of merely passing content validation.
- Restore authored `# fog` tags as the fog input and layer world-zone intensity on top.
- Move the mist field with the current story position so liminal/off-map route beats remain enveloped by fog.

Quality checks:
- World-zone tests distinguish grounded terrain, intentional off-map space, and positions outside the liminal envelope.
- Off-map treatment tests prove `+92` increases fog density, atmospheric mist, camera radius, and camera height.
- Browser QA covers a route progression with clean console logs and visible scene continuity.

## Iteration 7 - Route-Specific Object Polish

Status: PR opened.

Highest-value improvement:
- Turn object tags into authored presentation cues: primary versus echo roles, stable variants, scale, vertical offsets, and light emphasis.
- Make repeated route motifs stage as readable clusters instead of overlapping copies.
- Remove random geometric prop selection so the same story beat renders consistently across runs.

Quality checks:
- Planner tests prove repeated tags produce primary/echo staging and vertical separation.
- Off-map object tests prove liminal beats amplify scale and light intensity.
- Stable-variant tests ensure deterministic visual selection for implemented object tags.
- Browser QA covers a route beat with repeated hand props and clean console logs.

## Iteration 8 - Character Motion Polish

Status: PR opened.

Highest-value improvement:
- Replace fixed-frame avatar stepping with a pure, tested motion model that uses elapsed time, route distance, and off-map intensity.
- Make off-map passages more deliberate while preventing tiny retargets from causing visible shuffles.
- Remove debug movement logs and fallback-character debug geometry from the production runtime.

Quality checks:
- Motion tests prove angle wrapping chooses the short rotation path.
- Journey tests prove off-map passages are paced more slowly than grounded passages of the same distance.
- Step tests prove movement is elapsed-time based and clamps arrival without overshoot.
- Browser QA covers launch and route progression for character/camera continuity and clean console logs.

## Iteration 9 - Route-Level Playthrough QA

Status: PR opened.

Highest-value improvement:
- Add deterministic playthrough coverage for every authored first-screen route through end credits.
- Make route QA inspect the actual Ink dialogue helper so content tags, choice text, audio cues, and final credits are tested together.
- Remove noisy dialogue debug logging and split tag parsing into a reusable helper for future content/runtime checks.

Quality checks:
- `npm run test:routes` verifies trust, memory, silence, and uncertainty can all reach credits.
- Each route playthrough asserts its expected choice path, minimum visible beat count, off-map travel, soundtrack release cue, and credits audio.
- Browser QA still covers one complete route path in the rendered game with screenshot checkpoints and clean console logs.

## Iteration 10 - Asset and Bundle Polish

Status: PR opened.

Highest-value improvement:
- Replace the single oversized Babylon runtime chunk with purpose-built engine, rendering, scene, material, mesh, math, GUI, and loader chunks.
- Add a build artifact budget check so future production builds fail if a JS chunk grows past the 2 MB warning threshold.
- Wire the bundle budget into `npm run validate`, making runtime payload size part of the ordinary production gate.

Quality checks:
- `npm run check:bundle` fails against an oversized built JS chunk and passes after the Babylon split.
- `npm run build` completes without the previous oversized chunk warning.
- Browser QA covers launch and a route beat from a fresh server to prove the chunk split still loads the Babylon runtime correctly.

## Next Iteration Candidates

### Ending Presentation Polish

Make route endings feel intentionally authored in the UI and world state instead of landing on ordinary choice presentation.

Reliable assessment:
- Route playthrough tests assert ending-specific copy, audio, and available choices.
- Browser QA captures warm and reflective endings for visual distinction.

### Material Readability Polish

Replace remaining placeholder-like material treatments with a tighter route palette and clearer object silhouettes.

Reliable assessment:
- Planner or presentation tests assert route object color/intensity families.
- Browser QA captures first-route, memory-route, and off-map ending material readability.
