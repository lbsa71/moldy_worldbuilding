# Fading: The place beside the light

This playable chapter replaces the four repeated prototype routes with eleven decisions and three distinct resolutions. The earlier script is retained in `src/ink/legacy-demo.ink` for reference; it is not loaded by the game.

The dramatic question is whether an unfinished memory can be cared for without inventing the missing identity. A chipped blue cup, two taps before touching a hand, a rain-darkened sleeve, and an empty chair give the uncertainty concrete anchors. The presence remembers both bringing the tea and lying beside the rail. The chapter leaves that contradiction open without turning it into a diagnosis or a surprise death reveal.

## Authoring rules

- Every displayed scene ends at a player choice or a terminal `END`. Automatic diverts must not cross multiple presentation states before the player can see them.
- Actions are plainly described. Permission, investigation, and silence receive an immediate response; later dialogue acknowledges chosen quiet and previously noticed details.
- Silence is selected explicitly. Reading slowly or leaving the browser never counts as a relationship decision.
- There is no moral score. All three endings remain available regardless of earlier choices. Remembered details and silence change the coda, not whether the player qualifies for a better ending.
- The lamp is a persistent landmark at the origin. Positions identify authored viewpoints, not a respawning lamp.
- A restart resets the Ink story state. Resume snapshots must be captured before continuing a passage so the current screen can be reconstructed.

## Ending intentions

| Ending | Player act | What remains |
| --- | --- | --- |
| `keep` | Leave a light with a place beside it. | A space for whoever comes next, without promising the presence will return. |
| `carry` | Take a remembered kindness outward. | Turning a chipped cup, tapping before touching, or offering an undemanding chair. |
| `rest` | Stay while the room settles. | Companionship in an unfinished pause; no demand for another answer. |

## Runtime contract

`Dialogue` retains `text`, `choices`, `position`, `fog`, `audio`, and `objects`, and adds nullable `scene`, `chapter`, `mood`, and `ending`. Mood is `hushed`, `warm`, `uneasy`, or `resolved`. Terminal codas provide `ending: keep|carry|rest` and no choices. An absent objects tag is `null`; `objects:` explicitly clears transient memories. The runtime preserves the lamp independently.

Known motifs are `lamp`, `hand`, `geometric`, `hospital`, `chair`, `cup`, and `rail`. Hospital fragments require `hospital_clarity`; rails can appear independently as an uncertain memory. Coordinates must be finite and inside ±35 on each axis. Fog is 0–1. Audio filenames are the four existing MP3 files. Duplicate tags of one category in a passage are rejected instead of silently collapsing scenes.

Tracked state is `connection`, `inquiry`, `silence_count`, `memory_cup`, `memory_rail`, `hospital_clarity`, `accepted_uncertainty`, `chosen_ending`, `last_response`, and `keepsake`. Connection and inquiry describe participation for audiovisual response, never ending entitlement.

Focused tests compile the actual chapter, exercise every option at every scene, sample mixed histories across every keepsake and ending, verify silence and memory callbacks, reject malformed tags, and confirm restart and pre-continuation save restoration. These are structural and state checks. Editorial judgement, audience comprehension, and emotional response still require human playtesting.
