# Fixed-view scene cue study

5 October 2026. Source: [current chapter](../src/ink/demo.ink) and [accepted production plan](living-scene-plan.md). The initial study proposals below remain a vocabulary for review. The later **Authored game integration** section records the script contract now implemented following the user's authorization; it supersedes earlier proposals where their mappings differ. The chapter retains eleven decisions and three legitimate endings.

## Implemented contract and proof scope

[SceneStudyState.ts](../src/components/scene-study/SceneStudyState.ts) implements only complete apparatus states: `chairTurned`, `cupVisible`, and caller-supplied `reducedMotion`. `getSceneStudyState(id, reducedMotion)` returns a fresh complete arrangement; unknown IDs recover to opening. It reads neither Ink scores, choice history nor time. Reset restores the opening arrangement and retains the supplied motion preference.

| Study ID | Settled chair | Settled cup | Verification purpose |
| --- | --- | --- | --- |
| `opening` | Base orientation | Present | Fixed composition, grounding and material baseline. |
| `invitation` | Turned | Present | Rotation preserves object identity and updates shadow/reflection. |
| `memory` | Base orientation | Absent | Removal exposes the correct surface and removes shadow/reflection. |
| `reset` | Base orientation | Present | Restore all affected properties after any sequence of controls. |

The first three states verify visual apparatus; their names do not establish the final story interpretation. In particular, removing a cup is not yet a response to remembering it. There is no proposed emotional score in this implementation. Rendering quality, animation and actual removal of shadows/reflections require independent browser verification.

## Cue rules for story integration

- One submitted choice causes one dominant event, then a stable reading image. Passage transitions never depend on reading time, inactivity or audio completion. A scene can be held indefinitely without deterioration.
- All final arrangements must be complete, saved and restored deterministically. An interrupted transition settles to the newest requested arrangement; rapid input cannot leave a mixture of earlier states.
- Reduced motion applies the same final arrangement immediately. Muted audio preserves the same arrangement and choice availability. A transient tap or flicker need not be reproduced by a flash in reduced motion.
- Silence is an affirmative authored response. It receives comparable composition and care, never loss of warmth, visibility or companionship as a penalty. `connection`, `inquiry` and `silence_count` are not brightness controls.
- Keep one warm center at the lamp; do not recolor the whole scene to indicate approval. The chair remains unoccupied. Do not introduce a hand, figure, damaged object or horror effect to explain uncertainty.
- Every object change includes its contact shadow, reflection, occlusion and any affected illumination. A remembered trace is separately authored evidence, never an accidental stale reflection.
- Only explicit choices or authored passage-entry cues trigger events. Two taps use verified sound onsets, fire once, and end in stillness; no repeating pulse or guessed timer marks reading progress.

## Eleven decision cues

Each row names the source decision knot and the passage reached by it. The settled image described here is the proposed destination state. Branch alternatives are mutually exclusive; do not stack them as several demonstrations. Stable lamp exposure, camera and material identity persist throughout. Until a full state director exists, these cues are documentation only.

| # / source → destination | Intention and proposed branch event | Settled image and persistence | Audio / reduced motion |
| --- | --- | --- | --- |
| 1 `lamp` → `chair` | Acknowledge arrival, attention or quiet. `arrived`: the local cloth edge releases a little space beside the seat. `looked`: local obscurity clears from the worn seat edge. `quiet`: the same nearby interval opens without an invitation to sit. | Chair is identifiable and empty; lamp remains near it. Preserve a comfortable interval for all three responses. No change to global fog or brightness as reward. | No new response sound proposed. Apply the corresponding final cloth/visibility state immediately with reduced motion. |
| 2 `chair` → `cup` | Permit closeness or retain distance. `sit`: turn the chair a little toward the bedside arrangement. `who`: reveal the cup's chipped rim through local obscurity. `empty`: open the cloth gap beside the still-empty chair. | Cup remains present in all branches. Chair orientation or gap persists until an explicit later cue replaces it; questions do not create another chair or face. | No added cue. Reduced motion directly applies orientation/gap/detail visibility. This is the earliest possible chair-turn narrative mapping, still unapproved. |
| 3 `cup` → `rail` | Retain ordinary care. `cup` and `cup_quiet`: rotate the same cup so the chip faces away from the bedside place. `care`: reveal the existing rail edge locally. | Cup, rail and chair remain coherent parts of one arrangement. The cup detail can be retained through later recollection when the story's `memory_cup` is true; quiet earns the same remembered detail. | The destination prose authors two taps. One rail response uses the actual two sound onsets, then stops. Reduced motion holds the final rail and cup arrangement without impulses. Verify an actual tap source before adding synchronization; a soundtrack tag alone is not onset evidence. |
| 4 `rail` → `hand` | Offer evidence without imposing touch. `hospital`: clarify a small existing curtain gap. `tapped`: one pair of localized rail impulses. `pause`: let the rail reflection settle, leaving the interval beside it open. | Rail remains still, curtain partially unresolved and no hand model appears. `memory_rail` preserves the fact of taps and their pause for tapped/pause branches; it does not schedule another event. | `tapped` requires a single synchronized pair if sound is authored. `pause` adds no sound. Reduced motion applies only the final arrangement; pauses have no countdown. |
| 5 `hand` → `contradiction` | Respect consent while memory changes viewpoint. `offered`: turn the chair slightly toward the rail. `close`: narrow the cloth gap slightly while keeping a visible interval. `listen`: widen that interval. | Shared fixed view contains both chair and rail, with an empty place between them. Consent distinctions remain spatial; no reaching prop or compulsory touch. The later contradiction is carried by writing and a restrained composition, not a second simultaneous splitting event. | Preserve the existing `soundtrack_2.mp3` passage cue when integrated. Reduced motion applies the selected arrangement directly. |
| 6 `contradiction` → `boundary` | Keep reliable fragments without forcing identity. `follow`: clear local obscurity from the cup/rail boundary. `uncertain`: leave that edge unresolved. `stay`: turn the chair slightly toward the open bedside interval. | All fragments remain intact. Unresolved space is breathable and legible, with no broken geometry, disappearance or punishment. Any uncertainty flag records acceptance, not reduced fidelity. | No additional sound proposed. Reduced motion sets the corresponding final local visibility/orientation. |
| 7 `boundary` → `quiet` | Allow the question to remain open. `honest`: ease the cloth away from the seam of the bedside fragment. `known`: reveal worn fabric at that same seam. `unanswered`: open the nearby cloth interval. | Less competing detail and more visible still water; stable warm center remains. Each branch affords a quiet place. No visual bonus for an asserted answer. | No added cue. Reduced motion immediately applies the final cloth/detail state. Existing silence-count prose remains authored text, not a visual timer. |
| 8 `quiet` → `recollection` | Share quiet, reassurance or attention. `shared_quiet`: remove a local veil from the still rail reflection. `here`: turn the chair gently toward the bedside interval. `look_back`: clear local obscurity from the remembered cup/rail details. | Cup and rail stay where they already are. The memory flags select which details the prose recognizes; no objects spawn at new locations. Empty chair is a valid remembered kindness when neither detail was selected. | The prose recalls taps for `shared_quiet`; replay only if separately authored and reviewed, never by default. Reduced motion applies the final state. |
| 9 `recollection` → `preparation` | Choose a keepsake. `cup`: turn the chipped rim away. `taps`: one localized rail pair. `chair`: turn the empty chair toward the bedside interval. | One selected detail becomes legible while all objects retain their identity. Persist `keepsake` as narrative identity; it does not erase other remembered kindnesses. The lamp's passage flicker is a separate proposal requiring review to avoid competing events. | Retain existing `soundtrack_3.mp3`. Synchronize any chosen tap pair to verified onsets. Reduced motion omits impulses/flicker and presents the same selected arrangement. |
| 10 `preparation` → `decision` | Prepare a way to leave. `next`: orient chair toward the lamp. `elsewhere`: turn the selected cup detail toward the open shore (or open the cloth interval for another keepsake). `ready`: settle the cloth beside the empty chair. | Three equally considered preparations around the same lamp. Each preserves a place and the selected memory. No global brightness change predicts an ending or rewards a preferred answer. | No new sound proposed. Reduced motion directly sets the preparation. |
| 11 `decision` → `keep` / `carry` / `rest` | Commit to one of the three legitimate endings; apply the single ending event described below. | Complete ending arrangements replace preparation, with no path traversal or camera drift. Save ending and keepsake explicitly. | Existing `end_credits.mp3` passage cue remains independent of reading. Reduced motion presents the complete ending immediately. |

## Ending contact-sheet proposals

These are distinct complete arrangements, not a scale of success. Review all three side by side at the same exposure, composition and material quality before approving an ending transition. The current two-boolean proof cannot represent them and must not masquerade as an ending director.

| Ending | Dominant event → settled arrangement | Keepsake variation and persistence | Audio / reduced motion |
| --- | --- | --- | --- |
| `keep` | Turn the empty chair toward the lamp → the crooked shade and small warm circle retain a welcoming place. | Cup: a deliberately authored blue ring on the surface where it stood, with the cup absent and its physical shadow/reflection removed. Taps: retain the still rail and its open interval. Chair: show the worn seat within existing lamp light. The chosen trace remains indefinitely. | Credits as authored. A keepsake tap pair is optional and requires actual authored onset alignment; do not stack it with chair motion by default. Reduced motion opens on the complete arrangement. |
| `carry` | Remove the selected physical keepsake from its place, or release its local obscurity → a coherent open interval faces the shore while the lamp remains available behind it in the same frame. | Cup: absence with correct exposed surface. Taps: rail remains still; the actionable memory is in the text. Chair: empty chair remains with room beside it. Do not render a hand or imply that an unchosen object has been taken. This variation needs review because taps and chair are practices rather than portable props. | Credits as authored. Any final taps occur once, with a pause that requires no wait gate. Reduced motion presents the complete arrangement; the prose carries the act. |
| `rest` | Settle the draped cloth around the bedside fragment → a restful empty place with a small pale lamp circle. | Cup: blue detail remains visible at rest; there is no subsequent timed fading. Taps: rail and the space after it hold still. Chair: empty seat stays comfortably visible. A local light adjustment may be authored once for this ending, never keyed to trust or silence totals. | Credits as authored. Reduced motion presents final light/cloth state immediately. Nothing dims further while the reader remains. |

## Open integration decisions

The fixed composition must be approved before selecting angles, curtain gaps or local obscurity values. The blue-glaze prose and blue-decorated porcelain material need one agreed treatment. Walking, emerging duplicate furniture, splitting ground and literal hand prose will need a narrow revision when story integration is authorized; the cues above do not silently resolve those text conflicts. Audio onset evidence and editable complete-state contact sheets remain prerequisites for narrative animation. Story integration must verify each branch and ending from restored progress, muted audio and reduced motion as well as uninterrupted play.

## User-authored motif: books and a place breaking apart

The user identifies the original artwork's books and broken-up black rock tiles/slabs as meaningful: the shore feels as though the place is breaking apart. Preserve this stated meaning and the particular objects, as recorded in the [pass04 art brief](living-scene-pass04-art-brief.md). Pass04 authors static, distinct books and slab pieces with named roots for possible later changes; it introduces no narrative animation or new story text. Deliberately fractured slabs are an authored motif, separate from the accidental geometry damage prohibited above.

The pass05 refinement makes this an explicit spatial gradient: the tiled floor holds together around the furniture, while gaps grow progressively wider toward the sea until squared rocks separate and partly submerge. This user-directed arrangement expresses dissolution through geometry and water-filled absence. It remains a settled composition; passage-driven changes below are still proposals.

The following mappings are **proposals**, not user instructions or implemented cues:

| Motif | Candidate later expression | Settled-state constraint |
| --- | --- | --- |
| Particular books | Reveal, remove or rearrange one existing book when an authored passage attends to a specific memory or trace. Assign its meaning explicitly before integration. | Preserve recognizable identity and its exposed surface/shadow/reflection. Books are not a reward count, collectible obligation or generic proof of successful care. |
| Fractured slabs | A passage about incompatible memories could reveal an existing seam or reposition one peripheral slab once. | Stable support remains beneath the furniture; retain a convincing, habitable shore. No crumbling loop, spreading crack or automatic deterioration while reading. |
| Ending traces | Review book/slab arrangements alongside the existing keep, carry and rest contact sheets. A retained book, an absent book's trace, or a settled gap may express different ways of leaving. | All three endings remain equally legitimate. No ending repairs more ground, saves more books or receives more light as a verdict on the reader. |

Select one dominant book **or** slab event for a given response; do not add it on top of another cue by default. Any audio accompaniment requires an authored onset shared with that event, then stillness. Reduced motion and muted audio yield the same complete settled arrangement. Save object identities and transforms explicitly; interruptible transitions settle to the newest state without consulting elapsed reading time.

Silence, reassurance, inquiry and boundaries must never trigger greater destruction as a penalty. Breaking apart describes the place and its unresolved memory; it does not diagnose inadequate care or require the reader to prevent a collapse. Any chosen reveal/removal/rearrangement remains fixed until another authored passage replaces it.

## Authored game integration

### Editing a passage

Put the direction beside its dialogue in `src/ink/demo.ink`, before the next choice:

```ink
# camera: cup
# transition: ease 1.8
# arrangement: chair=rest,cup=near,lamp=steady,trace=none
# sound: none
# weather: none
A porcelain cup with a blue pattern rests on the chair: a little chip at the rim.
```

| Tag | Accepted values | Meaning |
| --- | --- | --- |
| `camera` | `wide`, `chair`, `cup`, `bedside`, `water`, `shore` | A calibrated composition. The camera holds after the transition. |
| `transition` | `cut 0`, `ease <seconds>`, `dissolve <seconds>` | Immediate change, continuous reframing, or a scene-only fade through dark. Duration is 0–5 seconds; dialogue and choices remain available. |
| `arrangement` | All four fields shown above | `chair=rest/turned`; `cup=near/away/absent`; `lamp=steady/rest`; `trace=none/cup`. A cup trace requires an absent cup. |
| `sound` | `none`, `taps` | One authored tap pair after the new view settles, cancelled if the reader leaves that beat. |
| `weather` | `none`, `rain-memory` | Complete weather state: dry, or remembered drizzle, local ripples, damp edges and quiet ambient rain. Reduced motion keeps dampness and sound. |

Each displayed conditional branch must emit one complete direction, not a patch to the previous arrangement. Invalid, missing-part and duplicate directions fail validation. To change choreography, edit the Ink cue; to tune a named composition, edit `LivingSceneDirector.ts`. Run `npm test` and review the affected passage in the game at both desktop and narrow widths. Test the same passage after reload: restoring an entrance applies its final view immediately and does not replay taps.

Use `ease` for reframing and chair/cup rotations: they share one finite animation clock. Use `dissolve` when a cup disappears, a trace appears or the lamp changes state, so the discrete arrangement change occurs behind the scene veil. This transition is a fade through dark, not an image cross-dissolve. Both leave a stable view once complete.

The remembered-rain edition uses save version 4. Earlier edition keys are retained but are not read against the revised Ink indices. Motion, sound and volume preferences retain their existing key.

The production Ink now emits exactly one complete `camera`, `transition` and `arrangement` trio per displayed beat, including conditional variants. The parser exposes this as `Dialogue.direction`; legacy snippets with no trio retain `null`, partial or duplicate cues reject. Arrangement always names chair, cup, lamp and trace. Legacy travel/fog/object tags are removed from this chapter, with legacy parser support retained. `Dialogue.sound` is `taps`, `none` or `null`; every production beat authors it explicitly. These are implemented script/parser contracts, not a claim of approved browser fidelity or emotional playtest results.

Remembered rain is now an explicit `weather: rain-memory` cue only in the cup passage's remembered sleeve/rain reply (`last_response == "who"`) and the common contradiction passage's rain-running-off-the-sleeve memory. Every other production beat authors `weather: none`, allowing the effect to settle out on entry. Weather is part of each complete `SceneDirection`; a legacy trio without weather defaults to `none`. Unknown/duplicate weather tags reject. It does not follow silence, care scores, time spent reading or any ending choice.

`AudioSystem.setWeather(cue, immediate)` supplies a quiet independent rain loop with 1.5-second fades and gain capped at 16% of master volume. [generate-rain.mjs](../scripts/generate-rain.mjs) authors the local 12-second stereo MP3 from seeded periodic filtered noise using ffmpeg, without external recordings, samples or libraries. Music and the authored one-shot taps remain independent. Muting, pausing and disposal retire rain playback/pending requests; resumption can restore the latest ambient cue but never replays taps. Denied rain playback does not block dialogue. Restore/reduced-motion application may establish or clear the ambient state immediately; no new sound event is inferred from a timer.

Script comments explain the durations: opening uses `cut 0`; gentle reframing uses `ease 1.8`; consent holds the bedside shot with `ease 1.2`; contradiction and endings use `dissolve 1.2` for editorial/complete-arrangement changes. An unchanged shot target remains still. Water gives quiet room, the shore gives carrying negative space, and the cup shot makes its chip legible. No duration estimates reading progress or blocks a choice.

Chair `turned` means −20° from its authored opening. Cup `away` rotates the same cup 180°; `absent` removes it. Trace `cup` means a faint blue-grey ring **on the seat where the cup stood**, with physical cup absent; it is not a ghost cup. The prose now describes one bedside arrangement, porcelain with a blue pattern, and remembered touch without a spawned hand. It retains the emotional replies, story variables, moods and existing score tracks.

Keep leaves a place beside a steady lamp and authors the seat ring only for the cup keepsake. Carry opens the shore view and removes the physical cup only for the cup keepsake. Taps/chair keepsakes retain the cup in both endings. Rest keeps the cup and establishes a complete soft lamp state; it never fades further while reading. All endings remain available after quiet, reassurance or inquiry, without reward brightness or accumulating damage.

Tap sound cues are passage-entry events at the rail, the explicit tap response, taps preparation and taps keepsake endings. The runtime must suppress replay when restoring an already-entered beat while restoring its full direction. Save/restore and all reachable presentation contexts are covered by Ink tests; actual sound onset synchronization remains a runtime verification responsibility. Books and fractured slabs remain static motifs in this integration, with future changes still proposed above.

Continuity correction: cup preparation describes its held far-side chip, because recollection may already establish `cup=away`. Keep with the cup keepsake now uses a single `camera: cup` ending cue so the faint seat ring is legible; other keep variants retain the wide shot. This authored camera change awaits browser framing review. There is no timed return to wide or second cue within the beat: the chosen ending image settles indefinitely.
