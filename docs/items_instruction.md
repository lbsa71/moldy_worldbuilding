# Object Implementation Requirements

These objects are the scene vocabulary for the current Ink script. They should remain simple enough to compose quickly, but polished enough that every appearance feels intentional.

Each object class should expose:

```typescript
class ObjectName {
  constructor(scene: Scene, position: Vector3);
  setVisibility(value: number): void;
  dispose(): void;
  updatePosition(position: Vector3): void;
}
```

## Lamp

Role:
- The fixed point of the dream.
- The first evidence that the world can hold still.

Production requirements:
- Warm falloff and visible glow through fog.
- Strong silhouette from a distance.
- Should feel handmade or old, not sterile.

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
