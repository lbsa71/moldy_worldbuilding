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

## Next Iteration Candidates

### Scene Composition and Object Polish

Improve mesh-level object polish with smoother fades, stronger silhouettes, and route-specific composition beats.

Reliable assessment:
- Unit-test tag-to-object planning separately from Babylon mesh creation.
- Browser QA: first route choice creates visible, non-overlapping objects near the character.

### Dialogue UI and Choice Presentation

The current Babylon GUI reads as debug UI. Replace it with a more cinematic, readable presentation that still lives inside the game surface.

Reliable assessment:
- Browser screenshots at desktop and mobile widths.
- Automated checks for choice button count and visible text after route selection.

### Audio Transitions

Make audio startup and crossfades robust, and expose meaningful track state for tests.

Reliable assessment:
- Unit-test audio transition state without requiring real playback.
- Browser QA confirms no autoplay errors after launch.

### Terrain and Off-Map Treatment

Make the terrain edge feel intentional: fog, lighting, and camera behavior should communicate the player leaving the reliable world.

Reliable assessment:
- Add a pure position classifier for grounded versus liminal coordinates.
- Browser QA a late route node and inspect framing/ground contact.
