# Pass04: black-rock shore and inhabited mountainous inlet

5 October 2026. Bounded scenery correction following the user's review of pass03. Visual sources inspected: [original title image](../public/assets/fading-title.png) and [pass03 opening in WebGPU](evidence/living-scene-pass03-opening-webgpu.png).

Preserve the existing camera, chair placement, corrected towel clearance, lamp, cup, and interaction behavior. Preserve the useful shore footprint and furniture support heights. This pass concerns the shore material/form, the books beside the chair, and the missing landscape, settlement, bridge context, clouds and mist. It does not approve or reopen the remaining furniture and lighting work.

## Source observations and interpretation

**Directly visible in the original:** the near shore is predominantly dark broken rock, with rough flatter slab-like patches beneath the furniture, irregular seams and selective wet highlights. Worn books sit at the lower right beside the chair. A local amber pool reveals warm ground beneath the lamp; this does not make the entire shore beige. Low dark land silhouettes enclose the left distance. On the right, a much taller cliff-like mass rises out of haze and supports dense, irregular architectural silhouettes. A small multi-arched bridge occupies a gap in this landscape. Its ends and lower supports are partly obscured. Broad cloud masses fill the sky, and mist obscures the distant water boundary. The left water remains relatively quiet and open.

**User-authored meaning:** the broken-up black rock tiles make the place feel as though it is breaking apart; the books are a significant, welcome detail. Preserve that structure deliberately. This meaning is the user's stated direction, not an inferred property of a particular geology. Slabs and books stay static in this pass, with distinct geometry prepared for possible future authored changes.

**Requested interpretation:** reconstruct this as a mountainous inlet with a settlement climbing the right cliff. The exact geology, city plan, bridge engineering, hidden banks and building styles cannot be recovered from the image. Terrain behind obscured bridge ends, coarse building blocks and atmospheric layers are reconstruction choices. They should support the visible arrangement without inventing a prominent castle, cathedral, new landmark, snowy peaks, or a bright city skyline. Do not turn the large upper-left cloud mass into a solid mountain.

## Priority 1 — dark fractured shore, selective wetness

The pass03 browser shore reads as light beige terrain and its smooth highlights suggest a coated surface. Replace that material family with charcoal/dark grey stone. Retain the useful irregular footprint and the support surfaces under chair legs and lamp base; add small-scale breakup without moving the furniture or restoring towel intersections.

- Use distinct fractured black paving/slabs with broad rough mineral faces, chipped corners, gaps and irregular offset edges. The divisions must read as separate pieces of a place beginning to break apart, not only noise drawn on one unbroken mesh. Concentrate legible gaps and changes in level at exposed edges; retain stable support surfaces beneath the furniture.
- Vary slab size, outline, orientation and modest height offsets; avoid a regular tile grid, repeated Voronoi pattern, explosive rubble, or floating pieces. Keep granular pockets and a few angular protruding waterline rocks subordinate to this fractured ground structure. Do not make every seam a deep black trench.
- Break the continuous beveled front lip into uneven slopes, protrusions and shallow inlets. The bank should meet the water, with no continuous black undercut or floating shelf visible from the fixed camera.
- Keep most surface response rough. As a starting point for tuning, rough mineral patches may use roughness around 0.7–0.95 and limited wet patches around 0.3–0.5; these are proposed ranges, not measurements from the artwork. Judge the rendered result rather than preserving these numbers.
- Concentrate damp sheen on exposed edges, depressions and the actual waterline. Wetness should vary through roughness and normal response as well as darker color. No uniform clearcoat, metallic rock or glossy varnish across the beach.
- Preserve readable stone structure in shadow. Do not achieve black rock by crushing every surface to featureless black. Nearby warm highlights should remain local to the lamp, while unlit rock reads cool charcoal.
- Extend the same stone family to the isolated bottom-left rocks. These remain dark, low-salience framing elements.

### Books and future-ready geometry

Restore a small, low stack/cluster of worn books beside the chair at the lower right, approximately x `0.90–1.00`, y `0.66–0.74` in the original frame. Let the right edge crop the arrangement naturally rather than moving it inward to showcase every book. Use dark neutral brown/charcoal covers, uneven exposed page edges and modest corner wear. No invented readable titles, lettering, ornate decoration or bright cover colors. Give the books credible ground contact and restrained nearby lamp illumination; they remain subordinate to the chair and cup.

Author individual books and meaningful slab pieces as separate named geometry with documented transforms and pivots. Do not weld them into a monolithic shore or bake their complete identity into a background plate. This is preparation for future narrative changes, not a request to implement animation, disappearance or extra controls now. Avoid unnecessary tiny movable fragments; a manageable set of visually meaningful pieces is sufficient.

## Priority 2 — an inlet with layered distance

At this fixed view, establish at least three distinguishable terrain depths: low far-left terrain, distant bridge banks and settlement cliff, and a lower nearer outcrop beneath/right of the bridge. Use overlapping silhouettes and atmospheric separation; a single opaque wall behind the furniture will not supply distance.

Normalized image coordinates below use the 3:2 frame, origin top left. They are approximate visual guides, not a request to change the camera.

| Element | Target composition | Treatment |
| --- | --- | --- |
| Far-left land | Low irregular contours around x `0.00–0.40`, y `0.36–0.56` | Soft and mist-obscured, with unequal ridges. Keep substantial cloud above and open water below. |
| Bridge landscape gap | Around x `0.40–0.54`, y `0.32–0.44` | Narrow distant opening between banks. Both banks must exist, even where partially veiled. |
| Main right cliff | Climbs roughly from `(0.50,0.39)` through `(0.62,0.17)` toward `(0.70,0.00)` | Irregular massive vertical faces, broken shelves and layered silhouette. Avoid a clean sawtooth polygon ridge or flat untextured black plane. |
| Right cliff settlement | Built forms follow the upper cliff profile and continue out of frame | Unequal roof heights, restrained vertical facade/rubble bands and small gaps. The city should read at thumbnail size as inhabited stone mass, not individual high-contrast buildings. |
| Nearer middle-distance outcrop | Roughly x `0.50–0.72`, y `0.43–0.63` | Separates the distant cliff from the furniture shore. Softer and less detailed than foreground rock. |
| Distant water boundary | Dissolves around y `0.55–0.59` | No continuous hard horizontal ocean horizon. Mist and low rock silhouettes interrupt it. |

The scene is enclosed but not crowded: maintain the broad left-side negative space and keep the foreground lamp as the strongest subject. Avoid bringing a high mountain ridge across the entire left half. The right settlement should be visible through silhouette, structure and atmospheric depth rather than a grid of glowing windows. A few dim warm pinpoints are visible in the source; additional lights are optional and must not form a second warm center.

## Priority 3 — bridge belonging to the landscape

The pass03 bridge reads as an isolated freestanding gate near the bank: its supports descend toward the near shore, and no terrain explains its deck. Keep its arched character, but place and scale the whole structure to read as distant infrastructure.

- Target an overall visible bridge region near x `0.41–0.53`, y `0.32–0.42`. Its deck belongs around the upper part of that region. Do not enlarge its arch openings to create a focal attraction.
- Anchor both deck ends into unequal terrain masses, with small areas of real overlap. The original obscures the exact joins; reconstruct plausible abutments without exposing elaborate new engineering.
- Let piers descend into the ravine/mist and disappear before they visually meet the foreground shore. Terrain, fog and occlusion should explain the missing lower structure.
- Make its contrast and detail comparable to adjacent distant land. Foreground-sharp rail lines and perfectly black arches against an empty blue field fail the distance cue.

## Priority 4 — cloud sky and depth-specific mist

Use unequal blue-grey cloud masses, a subdued lighter opening near the upper center-left, and darker surrounding clouds. Avoid a flat blue backdrop, evenly distributed noise, a bright sun disc, or dramatic rays competing with the lamp. Cloud volume should remain readable at the browser's actual display size.

Mist should gather at the distant water, interrupt cliff bases and partially veil the bridge. Increase atmospheric softness and blue-grey veiling with distance. Keep enough separation to see land/cloud/water as distinct layers; uniform fog over everything erases the work. Preserve crisp foreground edges and localized texture clarity on the shore. Mist must not hide furniture contacts or substitute for filling missing background geometry.

Whether the distant result uses supported geometry, a clean background plate, or a combination is an implementation choice. A plate must exclude foreground furniture and their shadows/reflections. Match its exposure and color handling to the browser; do not apply a second tone transform to display-rendered imagery. The fixed camera makes a layered backdrop viable, but changes in crop still require review.

## Acceptance for this scenery pass

Review the original, pass04 offline image and actual browser image at matching 3:2 framing. Gate this pass only on the requested scenery corrections; retain separate records for other known fidelity limitations.

1. **Stone identity and fracture:** the bank reads immediately as dark fractured mineral slabs, with texture in rough regions, real gaps and irregular offset edges. The furniture no longer sits on an evenly beige or uniformly shiny beach. Lamp warmth remains local. The ground's breakup is structural and legible without appearing to collapse beneath the chair.
2. **Shore contact:** irregular edge meets water without a long hard slab lip, empty underside, or floating shelf. Chair and lamp keep their existing support contacts.
3. **Landscape enclosure:** left-low and right-tall terrain with intermediate layers establishes a mountainous inlet. The open left water survives; the background is neither empty blue nor one black wall.
4. **Settlement recognition:** a restrained irregular cliff settlement is discernible behind the lamp without taking focus or introducing a new dominant landmark.
5. **Bridge context:** deck ends visually enter terrain; supports recede into mist; scale and contrast read as distant. It no longer resembles a freestanding gate beside the chair.
6. **Atmospheric continuity:** clouded sky, mist, terrain and water join without a hard horizon or obvious layer seam. Distant objects are softer than the foreground, not simply invisible.
7. **Runtime survival:** the above improvements remain visible in an actual browser capture. An offline-only dark-rock material, mist effect or settlement does not pass. Inspect both the full frame and a shore crop for oversized glints and lost roughness.
8. **Retained fixes:** front/rear/turned inspection or existing clearance checks still show the towel outside the chair; camera and chair arrangement match the accepted pass03 baseline. Scenery changes do not invalidate the interaction state.
9. **Books and object structure:** the subordinate worn books are visible at lower right with credible contact, neutral covers and no invented readable titles. Books and meaningful slabs exist as separate named geometry for future changes, while remaining static in this delivery.

Current status: brief based on direct source/pass03 comparison; pass04 assets and browser output have not yet been reviewed.
