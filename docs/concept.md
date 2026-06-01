# Fading

## Core Concept

Fading is an intimate narrative game about accompanying a consciousness that may be dying, dreaming, remembering, or becoming something else. The player does not solve the voice. The player stays with it.

The game should feel like a walk through a dream installation: a lamp in fog, hands in the dark, medical shapes half-remembered, and paths that eventually leave the map.

## Pillars

### Presence Over Solution

The player's role is witness, companion, and gentle pressure. Choices should never imply that the voice can be fixed. They should ask how the player chooses to be present.

### Concrete Images, Quiet Philosophy

Use physical images before abstractions:

- lamp before hope
- wrist before care
- rail before hospital
- silence before acceptance
- open door before uncertainty

Philosophy should arrive as an implication of what happened, not as a lecture.

### The Off-Map Feeling

The terrain is deliberately finite. Late-route positions move beyond it, creating the sensation that the player is leaving reliable ground and entering a liminal band of memory.

This is not a bug. It is a core spatial metaphor.

### Movement Is Performance

Traversal should feel like the avatar is choosing how to approach each memory, not like a marker sliding between coordinates. Grounded passages can be steady and readable. Off-map passages should slow slightly, hold their turns, and let the camera drift with more patience so the player feels the loss of reliable ground.

Tiny retargets near the same story beat should become stillness rather than visible shuffling.

### Materials Carry Meaning

Scene objects should be readable before they are literal. The lamp is warm amber and hand-made. Hands lean toward green-blue memory light and become clearer with trust. Hospital forms begin clinical and alarmed, then soften toward breathable ward colors when clarity arrives. Geometric shapes use a bounded spectral palette so uncertainty feels designed, not random.

Off-map beats should add haze, glow, and translucency across object materials without turning the scene into a saturated rainbow.

### Silhouettes Are Scene Direction

Every repeated object should have a recognizable stage role. The lamp is a beacon with a shade and base, not just a light source. The hand is a reach held inside a memory halo. Hospital imagery should read as a ward fragment through rails, monitor light, IV shapes, and small furniture, not as a toy building. Geometric props are threshold frames: strange enough to be dreamlike, stable enough to orient the player.

Echo objects can be lighter and more spatially spread, but they should still belong to the same silhouette family as the primary motif.

### Silence Is Play

Silent choices are valid actions. They should create environmental and narrative consequences: steadier fog, altered trust, softened memory, or a route into quiet companionship.

### Endings Are Thresholds

Route endings should feel like a held threshold between returning to the dream and waking out of it. The Dream On / Wake Up moment should be visually warmer, more centered, and less menu-like than ordinary branches. Credits are not a reward screen; they are the last quiet room before the player leaves.

## Current Route Structure

### Trust

The player steps into the lamp's circle and makes touch feel less threatening. The route culminates in witnessed release.

### Memory

The player follows medical fragments and helps incomplete memory become bearable. The route culminates in a corridor or ward that feels less hostile.

### Silence

The player treats quiet as a shared room. The route culminates in breath, basin, and rest.

### Uncertainty

The player accepts conflicting symbols without forcing certainty. The route culminates in an open door and unresolved compassion.

## Audio Direction

- `soundtrack_1.mp3`: threshold, lamp, first contact.
- `soundtrack_2.mp3`: route emergence, medical fragments, stronger emotional movement.
- `soundtrack_3.mp3`: release, reflection, ending space.
- `end_credits.mp3`: wake-up and afterimage.

Future audio work should move toward layered stems, but the current tags should already describe a clean dramatic arc.

## Production Priorities

1. Keep the story tree coherent and tested.
2. Make scene objects visually distinct and tied to route identity.
3. Smooth environmental transitions for fog, visibility, and audio.
4. Improve dialogue UI readability without making it feel like a conventional menu.
5. Keep complete-route playability under test so every route can still reach credits after production changes.

## QA Direction

Route-level checks should protect the emotional shape of the game, not just syntax. A passing route should prove that a player can enter from the crossroads, make coherent choices, leave reliable ground, hear the release cue, and wake into the credits without warnings, runtime errors, or broken presentation.

## Technical Direction

The game can be visually strange, but it should not feel technically careless. Production builds should keep runtime JavaScript split into reviewable chunks, treat bundle size as a budgeted quality gate, and preserve the player-gesture launch flow so the heavy 3D runtime loads only when the player chooses to enter the dream.
