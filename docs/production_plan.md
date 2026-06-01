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

## Next Iteration Candidates

### Scene Composition and Object Polish

Improve mesh-level object polish with smoother fades, stronger silhouettes, and route-specific composition beats.

Reliable assessment:
- Unit-test tag-to-object planning separately from Babylon mesh creation.
- Browser QA: first route choice creates visible, non-overlapping objects near the character.

### Terrain and Off-Map Treatment

Make the terrain edge feel intentional: fog, lighting, and camera behavior should communicate the player leaving the reliable world.

Reliable assessment:
- Add a pure position classifier for grounded versus liminal coordinates.
- Browser QA a late route node and inspect framing/ground contact.
