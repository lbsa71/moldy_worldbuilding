# Fading: The place beside the light

This playable chapter replaces the four repeated prototype routes with eleven decisions and three distinct resolutions. The earlier script is retained in `src/ink/legacy-demo.ink` for reference; it is not loaded by the game.

The dramatic question is whether an unfinished memory can be cared for without inventing the missing identity. A chipped blue cup, two taps before touching a hand, a rain-darkened sleeve, and an empty chair give the uncertainty concrete anchors. The presence remembers both bringing the tea and lying beside the rail. The chapter leaves that contradiction open without turning it into a diagnosis or a surprise death reveal.

The original prototype treated trust, memory, silence, and uncertainty as directions through a fogged landscape. This chapter keeps that embodied intention within one continuous voyage: an invitation draws out a path, attention gives a memory weight, contradiction splits the ground, and an unanswered question opens room to breathe. Returning toward the lamp lets the player see the distance travelled. The final outward path carries a kindness beyond the remembered room.

## Authoring rules

- Every displayed scene ends at a player choice or a terminal `END`. Automatic diverts must not cross multiple presentation states before the player can see them.
- Actions are plainly described. Permission, investigation, and silence receive an immediate response; later dialogue acknowledges chosen quiet and previously noticed details.
- Silence is selected explicitly. Reading slowly or leaving the browser never counts as a relationship decision.
- There is no moral score. All three endings remain available regardless of earlier choices. Remembered details and silence change the coda, not whether the player qualifies for a better ending.
- The lamp is a persistent landmark at the origin. Position tags are destinations for actual travel through the emotional landscape. Distant passages describe its glow ahead or behind, rather than placing it beside the player.
- Memory clusters belong to their places on the path and remain behind as traces. Later appearances are echoes or a chosen recollection; the entire bedside room does not follow the player. Terrain carries the emotion as well as the objects: a narrow ledge, incompatible edges, an unforced seam, and open ground.
- A restart resets the Ink story state. Resume snapshots must be captured before continuing a passage so the current screen can be reconstructed.

## Ending intentions

| Ending | Player act | What remains |
| --- | --- | --- |
| `keep` | Leave a light with a place beside it. | A space for whoever comes next, without promising the presence will return. |
| `carry` | Take a remembered kindness outward. | Turning a chipped cup, tapping before touching, or offering an undemanding chair. |
| `rest` | Stay while the room settles. | Companionship in an unfinished pause; no demand for another answer. |

## Emotional geography

Coordinates use the runtime's horizontal `(x, z)` plane. Conditional arrivals express how the preceding reply approaches a place; they never change decision count, access to an ending, or the lamp's position. Each displayed passage emits exactly one position tag. All local offsets are within two metres of the station's base.

| Scene | Base destination | Spatial intention and reply-dependent arrival |
| --- | --- | --- |
| `lamp` | `(0, 0)` | A crossroads whose paths disappear in fog; a fixed place to return to. |
| `chair` | `(4, -2)` | Arrival makes room. Looking draws a thin path to `(5, -1)`; quiet opens a verge at `(3, -2.5)`. |
| `cup` | `(9, 3)` | A warmer hollow stretches out of the invitation to sit, at `(9, 3.5)`. Asking about identity follows the bend to `(10, 3)`; leaving the seat empty keeps distance at `(8, 2.5)`. |
| `rail` | `(14, 7)` | The hollow narrows into a ledge. The cup's blue remains behind. Taps establish presence without crossing another person's boundary. |
| `hand` | `(17, 9)` | Identifying a hospital draws a straighter edge at `(18, 9)`. Answering the taps approaches at `(17, 9.5)`; listening leaves room at `(16, 8)`. |
| `contradiction` | `(22, 6)` | Two incompatible memories fold the ground into edges that will not meet. The chair is an echo across the split. |
| `boundary` | `(25, 1)` | Following details takes the firmer edge at `(26, 1)`; accepting ambiguity approaches between the edges at `(24, 0)`; companionship stays beside the voice at `(25, 1.5)`. The route pinches to an unforced seam. |
| `quiet` | `(21, -5)` | Edges withdraw into open stone. Acknowledging care arrives at `(20, -4)`; leaving the question unanswered gives wider room at `(21.5, -6)`. The lamp is a distant point. |
| `recollection` | `(16, -7)` | A broad curve looks back across the places that hold the cup and rail. Remembering does not require completing the space between them. |
| `preparation` | `(8, -3)` | The chosen keepsake travels inward with the player; its original place remains behind. The lamp is ahead. |
| `decision` | `(3, 0)` | Return to the crossroads. Leaving a light approaches at `(2, 0)`; considering an elsewhere keeps a little outward distance at `(4, -1)`; readiness to rest approaches at `(2.5, 0.5)`. All three final acts remain available. |
| `keep` / `rest` | `(0, 0)` | Return to the circle: leave a place for another arrival, or share the pause. |
| `carry` | `(30, -12)` | Take the outward path into open ground. The lamp remains behind; the carried kindness is an act the player can repeat elsewhere. |

The three local approaches are expressions, not a spatial ranking of good and bad answers. Silence can create room; inquiry can clarify an edge; closeness remains consensual. None repairs the unresolved identity or earns a privileged route.

## Runtime contract

`Dialogue` retains `text`, `choices`, `position`, `fog`, `audio`, and `objects`, and adds nullable `scene`, `chapter`, `mood`, and `ending`. Mood is `hushed`, `warm`, `uneasy`, or `resolved`. Terminal codas provide `ending: keep|carry|rest` and no choices. An absent objects tag is `null`; `objects:` explicitly clears transient memories. The runtime preserves the lamp independently.

Known motifs are `lamp`, `hand`, `geometric`, `hospital`, `chair`, `cup`, and `rail`. Hospital fragments require `hospital_clarity`; rails can appear independently as an uncertain memory. Coordinates must be finite and inside ±35 on each axis. Fog is 0–1. Audio filenames are the four existing MP3 files. Duplicate tags of one category in a passage are rejected instead of silently collapsing scenes.

Tracked state is `connection`, `inquiry`, `silence_count`, `memory_cup`, `memory_rail`, `hospital_clarity`, `accepted_uncertainty`, `chosen_ending`, `last_response`, and `keepsake`. Connection and inquiry describe participation for audiovisual response, never ending entitlement.

Focused tests compile the actual chapter, exercise every option at every scene, sample mixed histories across every keepsake and ending, verify silence and memory callbacks, reject malformed tags, and confirm restart and pre-continuation save restoration. These are structural and state checks. Editorial judgement, audience comprehension, and emotional response still require human playtesting.
