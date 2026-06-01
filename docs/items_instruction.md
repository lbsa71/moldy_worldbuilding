# Object Implementation Requirements

These objects are the scene vocabulary for the current Ink script. They should remain simple enough to compose quickly, but polished enough that every appearance feels intentional.

Each object class should expose:

```typescript
class ObjectName {
  constructor(scene: Scene, position: Vector3);
  applyPresentation(presentation: SceneObjectPresentation): void;
  setVisibility(value: number): void;
  dispose(): void;
  updatePosition(position: Vector3): void;
}
```

Material colors should come from the scene-object planner's presentation profile. Component-local defaults are acceptable as fallbacks, but production route colors should remain authored in `src/game/content/sceneObjectMaterial.ts` so they can be tested.

Silhouette choices should come from `src/game/content/sceneObjectComposition.ts`. Mesh classes can add concrete shapes, but the reason for those shapes should stay visible in the composition profile.

## Lamp

Role:
- The fixed point of the dream.
- The first evidence that the world can hold still.

Production requirements:
- Warm falloff and visible glow through fog.
- Strong silhouette from a distance.
- Should feel handmade or old, not sterile.
- Bulb, pole, glow layer, and light color should all use the warm lamp material family.
- Shade and base should make it readable as a beacon even when seen through fog.

Narrative usage:
- Appears at the crossroads and trust beats.
- Should remain emotionally present even when not physically visible.

## Hand Motif

Role:
- Care, touch, interruption, reaching, and release.

Production requirements:
- Fade and hover smoothly.
- Multiple instances should feel like an orbit or memory trace rather than clutter.
- Alpha and light intensity should be controllable per beat.
- Tint and emissive strength should improve with trust rather than staying as a flat white texture.
- A halo or trace shape should help the motif read as memory, not a flat decal.

Narrative usage:
- Trust route: hands become safe.
- Memory route: handprints and care gestures.
- Silence route: a single dimming/resting hand.
- Uncertainty route: conflicting guide/warning hands.

## Geometric Shape

Role:
- Unstable architecture of memory: frames, corridors, rails, ceiling panels.

Production requirements:
- Slow rotation and hover.
- Semi-transparent material with clear silhouettes.
- Variants should avoid looking like placeholder primitives.
- Primary and secondary pieces should use related but distinct material slots so the object reads as composed.
- Add a threshold frame or orbit element so the primitive center feels like part of an installation.

Narrative usage:
- Memory route: clinical geometry and corridors.
- Uncertainty route: ambiguous frames and doorways.

## Hospital Element

Role:
- The medical memory made visible without literalizing the whole scene.

Production requirements:
- Suggest IV stands, monitors, bed rails, and chairs.
- Ethereal material treatment; never bright white plastic.
- Visibility should respond to `hospital_clarity`.
- Cross, windows, roof, and building should soften from alarmed clinical color into calmer ward color as clarity increases.
- Ward details should become clearer with `hospital_clarity` without turning into literal set dressing.

Narrative usage:
- Reflective endings should make hospital forms feel like evidence of care.
- Uncertainty route can overlap hospital and hand imagery.

## Environmental Light Element

Role:
- Mood transition and route identity.

Production requirements:
- Warm soft light for trust.
- Sparse pulse or monitor-light for memory and silence.
- Unstable low light for uncertainty.
- Must interact believably with fog and avoid washing out dialogue.

## Spatial Note

Objects can appear near positions beyond the 100x100 terrain. That liminal band is intentional: route endings should feel like the player has crossed past ordinary ground.
