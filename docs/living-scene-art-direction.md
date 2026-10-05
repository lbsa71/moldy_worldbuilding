# Living scene: composition and fidelity brief

5 October 2026. Companion to [the production plan](living-scene-plan.md). The visual authority is [fading-title.png](../public/assets/fading-title.png), 1536 × 1024. This brief describes the source image; it does not certify a model, offline render, or browser implementation. Existing plain-color bedside GLBs are silhouette studies.

## The image to preserve

A small, credible bedside arrangement occupies the right bank of an impossible, enclosed shore. An illuminated fabric shade makes a place for an absent person; a battered chair and cup make that place specific. Water and enormous mist-covered masonry extend into the dark left side. The furniture feels close enough to touch, while the far shore feels unreachable. Render ordinary materials convincingly and let the setting supply the surrealism.

The principal recognition cues, in priority order, are:

1. The large warm flared lampshade, slender brass standard, and narrow broken warm reflection below it.
2. The worn wooden chair immediately to its right, with pale cloth thrown over the chair's right shoulder and a small decorated cup on the left of the seat.
3. A low, irregular wet shore supporting this arrangement; no platform, pedestal, or floating furniture.
4. The cropped bedside rail and hanging curtain at the far right, continuing beyond the frame rather than presenting a complete room.
5. Extensive cool, quiet water to the left; enormous distant cliff/masonry silhouettes and a small arched bridge disappearing into mist.

Do not spend early fidelity work on unseen model backs, decorative particles, or extra props while these cues are missing.

## Desktop camera and landmark contract

Use the full 3:2 source composition as the first comparison viewport. Coordinates below are **approximate hand-read normalized image coordinates**, origin top left; x increases right and y increases down. Bounding boxes use `(left, top)–(right, bottom)`. These are projected targets, not inferred world coordinates. Initial alignment tolerance is about 0.015 of image width/height for the principal lamp, chair, and cup landmarks. Resolve world scale, lens, and camera transform together and record them in the export manifest; do not independently guess a new browser camera after modeling.

| Landmark | Reference target | What matters |
| --- | --- | --- |
| Lampshade silhouette | `(0.665, 0.150)–(0.770, 0.283)` | Narrow rounded top; gently concave outward flare; broad thin lower rim. Shade is not a cone or a sphere. |
| Lamp standard | x ≈ `0.717`, from y ≈ `0.277` to `0.651` | Slender vertical with turned collars; pull chain visible just right of stem near y `0.35`. |
| Lamp base | `(0.682, 0.632)–(0.747, 0.689)` | Low stepped circular foot, fully grounded on stone. |
| Chair, excluding cloth | `(0.740, 0.337)–(0.896, 0.723)` | Broad top rail, several open vertical back slats, thick worn seat and distinct legs. Seat approximately y `0.520–0.542`. |
| Chair top rail | `(0.804, 0.339)–(0.889, 0.389)` | Uneven worn wood catching small amber edges. The chair is angled, not a perfectly frontal icon. |
| Cup body + handle | `(0.756, 0.487)–(0.791, 0.522)` | Cup rests on the left seat area; handle faces right. Small, readable ivory/blue accent. |
| Draped cloth | `(0.868, 0.326)–(0.944, 0.664)` | Falls over chair's right shoulder, outside the seat and down toward shore. Long weighted folds and ragged/fringed lower ends. |
| Curtain support | near x `0.847`, curved top near y `0.030`, exits top/right | Dark tubular frame; curved upper-left corner. |
| Hanging curtain | from x ≈ `0.870`, y ≈ `0.050`, cropped by right edge | Soft pale vertical pleats. It belongs behind the chair, rather than filling the whole backdrop. |
| Partial bed | right edge; rail near y `0.34`, bedding y `0.39–0.51` | Just enough rail and rumpled bedding to imply an occupied place; no person is visible. |
| Foreground shore/water seam | approximately `(0.42,0.69) → (0.51,0.72) → (0.63,0.75) → (0.76,0.77) → (1.00,0.82)` | Irregular rock clusters interrupt this guide; the bank deepens toward the right. Avoid a straight beach edge. |
| Small isolated foreground rocks | x `0.00–0.29`, y `0.80–0.89` | Dark low shapes; they frame the bottom-left water without taking focus. |
| Arched bridge | x `0.405–0.532`, y `0.321–0.420` | Small and mist-obscured, with narrow piers; a distance cue, not a feature attraction. |
| Distant right cliff/masonry silhouette | steps from roughly `(0.49,0.39)` to `(0.70,0.00)` | Monumental vertical enclosure, subdued crenellated/building shapes, softer and cooler than foreground. |
| Lamp reflection | around x `0.71`, y `0.77–1.00` | Narrow broken vertical path; becomes broader in the nearer water. Do not draw a glowing solid stripe. |

The apparent far water line is lost in haze around y `0.55–0.59`. It must not become a crisp ocean horizon. Preserve open water and mist across roughly the left 60% of the image. Keep the greatest texture clarity in the furniture and adjacent stones. The view is low enough to see chair seat, cup opening and lamp foot, but not a top-down diorama. Avoid wide-angle swelling and orthographic toy-like flattening.

## Depth and occlusion

Read the scene in these layers, without visible seams:

1. Clouded blue-grey sky: broad unequal cloud masses, a subdued opening above the bridge, no distinct sun or moon.
2. Distant dark cliffs/masonry and arched bridge: increasingly obscured toward the water; large shapes with atmospheric separation rather than uniform flat silhouettes.
3. Mist and distant water: soft local variations, no opaque fog wall across the furniture.
4. Near shore: dark angular rocks, shallow pooled water, uneven wet sandy/stone patches. This layer receives contact shadows and warm lamp light.
5. Curtain and partial bed behind the chair; then chair, drape, cup, and lamp. Preserve inter-object occlusion. The cup is clearly in front of the chair back.
6. Near water and a few foreground rocks: reflection and occlusion agree with the same camera and shoreline.

A background plate may contain only stable layers. Remove the complete changeable object **and its contribution** from that plate: cast shadows, water reflections, edge occlusion, local glow and bounced light. A plate with a ghost of the cup/chair or a permanently illuminated patch after lamp removal fails parity. Coarse shadow/depth proxies must not double-darken a baked counterpart.

## Material and light treatment

| Surface | Required appearance at the final camera | Common failure |
| --- | --- | --- |
| Shade | Warm ivory aged woven fabric; faint uneven stains and fiber detail; soft transmitted light, structural vertical seams and a defined dark lower rim. Brightest near the lower-middle interior, with readable fabric. | Flat yellow emissive plastic, pure-white clipping, excessive bloom, fully opaque orange cone. |
| Lamp metal | Tarnished brass with restrained bright worn edges; warm fine highlights on turned collars and base; much of the stem remains dark. | Uniform gold paint, mirror chrome, thick cylindrical pole, halo on every edge. |
| Chair | Dark brown weathered wood; exposed lighter grain along worn edges; chipped finish, small scratches and uneven roughness following the grain. Open gaps remain genuinely open. | Smooth orange wood, identical noise on every face, soot-black silhouette with no construction detail. |
| Drape and curtain | Heavy grey/ivory woven cloth with weighted folds and subtle roughness. Cooler than the shade, with only local warmth on nearby folds. Curtain is thinner and softly translucent where lit. | Flat white sheets, rubbery tubes, oversized noisy weave, wind simulation dominating the still image. |
| Cup | Small ivory porcelain cup with restrained blue floral decoration and a fine rim; glossy but not mirror-like; readable opening, handle and seat contact. | Solid blue cup, glowing white blob, scale large enough to compete with the shade. |
| Shore | Dark wet stone with selective sharp highlights; rough broken edges, fine granular ground and shallow puddles. Warm patch under lamp is irregular and grounded. | One smooth brown plane, uniform gloss, repeated boulders, fully black rock mass. |
| Water | Very dark cool blue-grey with low-amplitude varied ripples; muted cloud and cliff reflection; localized broken amber reflection. | Tropical blue, large ocean waves, perfect mirror, persistent scrolling noise, bright outline at shoreline. |

Texture detail must survive the actual projected size. Use authored color, roughness and normal variation together; color noise alone will not create worn wood or fabric. Wear belongs to exposed edges and contact areas rather than random all-over speckle. Avoid baked directional shading in base color that fights dynamic lighting.

There is one warm luminous center. Cool overcast environmental light supplies readable shadow detail and soft fill; the lamp supplies a localized amber pool on the chair edge, cup, base and wet shore. Curtain and cliffs must remain subordinate. A shaded lamp is not an unoccluded point source illuminating all surfaces equally. Gentle bloom can soften the shade edge, but cannot hide its material or turn the scene sepia.

The salience order is **shade → chair/cup/drape → warm wet shore and reflection → bed/curtain → distant architecture → open water/mist**. Check at thumbnail size and in greyscale: the lamp should lead without washing out, and the chair should remain legible against the curtain. Keep left-side contrast low enough for prose without making the entire left half a featureless flat fill. Vignette and fog are finishing tools, not substitutes for lighting or geometry.

## Browser parity requirements

The offline render is a lighting/material reference, not the delivered interactive result. Compare the original, Blender render, and browser capture at the same aspect, crop, object state and output dimensions, with controls hidden. Also keep one screenshot with the actual reading UI visible.

- Document Blender color management and browser exposure/tone mapping. A display-rendered plate must not be tone-mapped again as if it were scene-linear illumination.
- Export supported PBR maps, correct color spaces, UVs and normal conventions. Verify the shade transmission approximation in Babylon explicitly; a working Blender shader is not proof of exported behavior.
- Match environment intensity, roughness response, highlight roll-off, shadow softness and black levels. A brighter browser render can lose the reference even with identical geometry.
- The lamp needs plausible local illumination as well as a luminous shade. Ground all chair legs, lamp foot and cup with appropriate contact shadows; inspect halos and detached screen-space shadows.
- Water must reflect the currently present geometry/state. If the chosen reflection method cannot render the shade well, solve that limited effect deliberately and document it. Never count an unchanging reflection baked into the background as interactive parity.
- Author the clean exposed chair seat before cup removal and the ground visible after chair rotation. Check from the fixed view for holes, missing back faces, hard plate boundaries and incorrect occlusion.

## Portrait composition

Approve portrait separately. A centered crop of the source loses the chair and is unacceptable. For the first mobile proof, keeping the complete 3:2 scene in a dedicated region with reading controls below is an honest baseline and preserves its relationships.

A full-height portrait version needs an explicit art-directed camera/frustum or crop. As a **candidate for review**, a 9:16 window over source x `0.600–0.975` retains lamp, chair, cup and much of the curtain; it sacrifices the broad left water and therefore does not inherit desktop approval. Do not stretch the scene or move individual furniture items just to fit a screen. Keep the lamp shade, chair seat/cup and their contact with the bank inside safe areas; allow bed/curtain edges to remain cropped. Keep enough near water to read the warm reflection. Place prose outside the detailed chair/cloth cluster. Capture at actual phone layout sizes with controls and safe-area padding visible; desktop emulation alone is not a physical-device performance check.

## Motion and expression boundaries

Permitted after still-image approval: very slow small-scale water movement; restrained atmospheric variation; a deliberate chair turn; cup removal/restoration; local cloth-gap adjustment; a brief authored reflected-light response synchronized to the two rail taps. Every transition ends in a stable, convincing still state. Reduced motion gets the same settled composition without decorative motion.

Forbidden as fidelity shortcuts: camera orbit, traversal, arrival zoom, global hue shifts, perpetual pulsing lamp, showy fireflies, full-screen distortion, humanoids, floating hands, extra furniture sets, reward-by-brightness, unexplained missing shadows/reflections, or perpetual cloth billowing. Surrealism must not look like an export error.

## Acceptance record

Record each gate as **pass / needs work / untested**, with dated screenshot paths and explicit limitations. Passing an asset loader, build, or reset test is not a visual gate. Do not label the proof photorealistic merely because it renders.

| Gate | Evidence and pass condition |
| --- | --- |
| Composition | Matching 3:2 captures and optional landmark overlay. Principal silhouettes, scale and shore placement match; left negative space survives. |
| Material credibility | Full-size and thumbnail browser captures. Woven shade, weathered chair, heavy drape, decorated porcelain and wet shore remain materially distinct and convincing without excessive noise. |
| Light hierarchy | Shade texture survives; foreground reads; the rest stays cool; local lamp pool and broken water reflection support the same light position. |
| Offline/browser parity | Side-by-side identical states with documented color pipeline. Record all visible gaps; Blender beauty alone cannot pass this gate. |
| Object grounding | No floating feet/cup, doubled shadows, plate outlines, water seams or mismatched occlusion in opening and changed states. |
| Cup absent/restored | Cup, shadow and reflection disappear/return together; exposed seat is complete. Compare settled screenshots, not just mesh visibility flags. |
| Chair rotated/reset | Cloth/cup attachment behavior is intentional; footprint, contacts, shadow and reflection update; reset restores identical placement and appearance. |
| Rapid changes | Repeated turn/remove/restore/reset settles to a coherent requested state with no stale reflection, ghost prop or interrupted pose. |
| Portrait | Separate capture with visible UI. Lamp, chair, cup, shore contact and reflection remain readable; no accidental center crop or obscured reading area. |
| Render backends | Actual WebGPU and WebGL captures reviewed, with backend/viewport recorded. Do not infer both from one successful capture. |
| Stillness | A settled scene can remain on screen indefinitely without visual pressure to continue. Motion-off state is complete. |

Initial review status: source artwork inspected; reconstruction screenshots have not yet been reviewed. The first browser proof should be judged most strictly on recognizability, ground contact and light hierarchy. Fix large composition and flat-material failures before tuning incidental atmospheric detail.
