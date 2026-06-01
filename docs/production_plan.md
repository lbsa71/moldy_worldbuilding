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

## Next Iteration Candidates

### Scene Composition and Object Polish

Improve mesh-level object polish with smoother fades, stronger silhouettes, and route-specific composition beats.

Reliable assessment:
- Unit-test tag-to-object planning separately from Babylon mesh creation.
- Browser QA: first route choice creates visible, non-overlapping objects near the character.

### Route-Specific Object Polish

Improve silhouettes, fades, and object staging for the route props now that object placement is deterministic.

Reliable assessment:
- Unit-test route-to-object emphasis rules.
- Browser QA each route's second beat for readable prop placement and no visual overlap.
