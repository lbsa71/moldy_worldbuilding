# Current Production Direction

## Experience Goal

Fading is a short contemplative 3D narrative about staying present with a fading consciousness. The player should feel as if they are moving through memory, not solving a puzzle tree.

The first production bar is not content volume. It is coherence: every line of dialogue, object tag, fog value, and audio transition should feel like part of the same ritual.

## Interaction Rules

- The game starts only after the player chooses to wake into the scene.
- Dialogue choices should read as embodied actions, not menu commands.
- Silence is a first-class response. Silent choices should change tone, trust, or environmental stability.
- Choices accumulate emotional tendency rather than announce explicit stats.
- Repetition is allowed only when it is ritualistic and intentional; copied filler lines are not acceptable.

## Spatial Rules

- The terrain is a grounded 100x100 space centered on the lamp.
- Story positions may intentionally exceed the terrain edge.
- Positions beyond the terrain are the liminal band: the player is leaving reliable ground, which supports the feeling of going off the map.
- Liminal positions must stay inside the authored envelope documented in `src/game/content/worldDesign.ts`.

## Narrative Voice

- Concrete sensory images first: lamp, wrist, rail, breath, monitor, corridor, hand.
- Philosophy should emerge from the situation rather than explain itself.
- The voice is intimate, careful, and unfinished. It should not sound like a quest giver.
- Avoid generic phrases such as "the environment responds" unless the sentence names the specific visible or audible response.

## Technical Quality Gates

- `npm run test` must pass before content lands.
- `npm run validate` must pass before pushing a production iteration.
- Browser QA should include launch, click-through into the scene, and at least one route choice after narrative or scene changes.
