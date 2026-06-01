# Fading - Core Design Elements

## Universal Motifs

- Lamp: a fixed point that makes return possible.
- Hand: care, interruption, touch, and the fear of being handled.
- Hospital geometry: rails, monitors, door frames, ceiling panels, empty chairs.
- Fog: uncertainty made visible.
- Off-map movement: the player crossing from grounded terrain into liminal memory.

## Route Identities

### Trust Route

Light is warm and relational. Hands become less threatening as the player treats them with care.

Primary question: can attention hold something without claiming ownership of it?

Scene vocabulary:
- Lamp remains visible longest.
- Hands orbit, open, and fade.
- Fog gradually thins toward a witnessed release.

### Memory Route

Light is clinical at first, then breathable. Hospital fragments become less hostile as the player allows partial memory to matter.

Primary question: can incomplete memory still carry truth?

Scene vocabulary:
- Geometric frames and bedrail shapes.
- Monitor-like pulse in the music.
- Corridor and ward imagery near the endings.

### Silence Route

Light is low and rhythmic. Silence changes from absence into shared presence.

Primary question: can quiet be company instead of abandonment?

Scene vocabulary:
- Few objects early.
- Single hand and monitor-light rather than dense object clusters.
- Slow fog rhythm and basin imagery.

### Uncertainty Route

Light is unstable but not hostile. Conflicting symbols coexist instead of resolving into one answer.

Primary question: can care survive uncertainty?

Scene vocabulary:
- Overlapping hand and hospital tags.
- Tilted frames, open doors, and unresolved dark rooms.
- Fog remains thicker than in the other routes.

## Implementation Guidance

- Use `# objects` tags as scene direction, not decoration.
- Use `# fog` as emotional clarity: lower values should feel earned.
- Use `# audio` for acts of the story: opening ambience, mid-route emergence, ending release, credits.
- Keep object names aligned with `NARRATIVE_OBJECT_TYPES` in `src/game/content/worldDesign.ts`.
- Preserve off-map positions near route culminations; they are part of the game's concept.
