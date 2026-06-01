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

## Next Iteration Candidates

### Character and Movement Polish

Improve avatar locomotion, route movement pacing, and camera follow smoothing so transitions between story beats feel performed rather than teleported.

Reliable assessment:
- Unit-test pure movement timing/classification helpers.
- Browser QA route transitions for character/camera continuity and no visual snapping.

### Asset and Bundle Polish

Reduce production bundle warnings and replace remaining placeholder materials with authored palettes/textures where they matter most.

Reliable assessment:
- Build-size checks around Babylon chunking.
- Browser QA first route and off-map ending for material readability.
