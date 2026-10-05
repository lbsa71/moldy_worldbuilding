# Fading living scene production plan

Accepted direction, 5 October 2026. Reconstruct the praised opening image as a fixed, high-fidelity scene whose objects and spatial relationships respond to choices. The successful text and sound remain the emotional foundation. After accepting the pass05 shore, the user authorized integration into the actual game with camera and transition hints embedded in the dialogue script. The earlier proof milestones below remain a record of production history.

## Why the direction changed

Playtesting found the sound and writing emotionally effective and meditative, with the caring situation sufficiently clear. Traversal through the crude landscape broke immersion. The previous correction restored literal travel without establishing its expressive purpose. New prose, travel, atmosphere changes and arrival framing ran on competing clocks. Better assets alone would not resolve that conflict.

The new direction preserves emotional geography through proximity, enclosure, openness, visibility and remembered traces within one composition. It replaces routine locomotion with deliberate changes around a stable viewpoint. Photorealistic materials serve a surreal setting: a tender bedside fragment exposed on an impossible shore.

## Reference and visual rules

The visual reference is [the original opening image](../public/assets/fading-title.png). The existing [provenance record](asset-provenance.md) documents its origin. It is concept artwork, not evidence of current runtime fidelity.

- Preserve the right-side lamp, worn chair, draped cloth and partial bedside arrangement. Broad cool water and mist occupy the left side, leaving quiet space for text.
- Keep one warm center: the shade, nearby worn surfaces and the lamp's water reflection. Surrounding water, cliffs and mist remain blue-grey; avoid whole-scene mood recoloring.
- Use a coherent material family: weathered brass, woven ivory cloth, worn dark wood, porcelain with blue decoration, wet dark stone and still water. Resolve the existing blue-glaze wording when integrating the scene.
- Preserve an absent person's place. Do not add a humanoid or a floating wire hand merely to demonstrate technical detail.
- Hold the camera still while reading. The latest user authorization permits explicit script-directed reframing and transitions between passages; no automatic orbit, travel marker, free locomotion or reading-time drift. Review desktop and portrait framing separately.
- Keep object scale and identity consistent. Introductions and transformations change the same arrangement instead of spawning another set of furniture.
- Water, shadows and reflections must agree with object presence except for an explicitly authored, reviewed memory effect. Rendering mistakes must not stand in for ambiguity.
- Every settled state must be a convincing still image and remain comfortable indefinitely.

## Rendering approach

Use Blender for editable modeling, material authoring, reference lighting, camera matching and offline renders. Use Babylon for the interactive foreground, its contact shadows, water reflections and narrative changes. A layered rendered background with coarse depth proxies can supply sky, distant cliffs, bridge and atmospheric depth. Background treatment must remain compatible with the fixed viewpoint and approved responsive framing.

The permanent background must exclude changeable objects and their shadows, reflections, occlusion and bounced light. The existing title image cannot be used unchanged behind removable copies of its objects. Bake stable lighting only where the underlying arrangement is stable. Use dynamic effects or complete authored state renders for interactions that independent baked layers cannot represent.

Export supported physically based surface maps and documented materials. Blender shader graphs, area lights, volumetric effects and display transforms do not automatically become equivalent Babylon effects. Match exposure, environment lighting, roughness, normals, shadow softness and highlight handling in the browser. A display-rendered background must not receive a second incompatible tone transform.

Existing bedside GLBs are starting studies, not final quality assets. They contain useful silhouettes and sockets but lack the texture and lighting treatment required by the reference. Texture and mesh budgets will follow projected size and measured browser cost, not the previous study's arbitrary limits. Prefer licensed scanned surface detail or authored material maps when they improve the actual shot; record provenance for every acquired asset.

## Milestones and acceptance gates

### 1 Camera and composition

Match the reference's 3:2 camera composition in Blender and Babylon. Use lamp, chair, shoreline, curtain and bridge landmarks to compare overlays. Establish portrait framing without simply center-cropping the furniture out of view.

Deliver: explicit camera and scene coordinate contract, composition guide, and matched screenshots. Acceptance concerns silhouette, relative scale, depth and negative space before surface detail.

### 2 Browser proof of fidelity

Build a small foreground with lamp, chair, draped cloth, cup, wet shore and water. Add suitable environment lighting, lamp illumination, contact shadows and responsive reflection. Include controlled chair rotation, cup removal/restoration and reset. The proof is independently accessible at `/scene-study/`; it does not replace the current game yet.

Deliver: editable Blender source, portable models and maps, offline reference render, browser scene, asset manifest and comparison captures. The offline render, browser capture and original artwork must be compared at matching composition. Successful export or tests alone do not establish photorealism.

Acceptance: a convincing image at the target view; objects remain grounded; cup removal also removes its shadow/reflection; chair rotation updates both; reset and rapid repeated changes settle correctly. No full-scene camera movement is required. Any fidelity gaps are recorded candidly before expanding production.

### 3 Coherent environment

Create the clean distant environment, depth/occlusion layers, shoreline continuity and final atmosphere. Match the foreground and background color pipeline. Test edge blending, exposed surfaces, water continuity, light changes and all removable-object combinations needed by authored states.

### 4 Authored emotional states

Create a contact sheet from the same camera for opening, intimacy, uncertainty, boundary, quiet, recollection and keep/carry/rest. Each state preserves the reference's composition and material language. Review images together before animating transitions.

Define a cue sheet per passage: narrative intention, affected object, transformation, settled state, any synchronized audio event, reduced-motion state, and what persists into later passages. Specific effects remain proposals until reviewed against the writing.

### 5 Story integration

One scene director applies complete states and owns transitions. One response causes one dominant visual event; the scene settles for reading. Transitions are interruptible and cannot block choices. Never infer reading progress from elapsed time. Synchronize the two rail taps to the actual sound onsets. Save and restore the settled state deterministically, including with reduced motion or a muted soundtrack.

Retain the eleven decisions and three legitimate endings. Revise walking-specific prose only where necessary to describe the new staging. Silence and reassurance receive different but equally considered responses; avoid a trust-to-brightness reward meter. Ultimately the title and chapter share the reconstructed view, once it meets the opening artwork's quality.

### 6 Verification and playtest

Inspect real WebGPU and WebGL browsers, desktop and portrait layouts, failed/late asset loads, rapid choices, restart, restored progress and reduced motion. Measure texture memory, loading, frame time and reflection/shadow pass costs on available hardware; distinguish desktop viewport checks from physical phone testing.

Compare a short unchanged text/audio sequence with the current scene, the new scene and a text/audio-only control. Ask whether visuals sustain attention, acknowledge care and communicate emotional space. Do not substitute beauty ratings or passing technical tests for emotional success.

## Initial expression vocabulary

| Narrative intention | Candidate scene response | Constraint |
| --- | --- | --- |
| Attend to a memory | Reveal an existing surface detail through light or local obscurity. | Keep the camera still; avoid advertising a model. |
| Permit closeness | Turn the chair toward the partial bedside arrangement. | Shadows and reflection follow; no forced touch. |
| Ask for space | Alter the curtain gap or leave an open interval beside the chair. | Preserve a reassuring place; do not punish the boundary. |
| Tap twice | Two localized metal or reflected-light impulses. | Share the authored sound timing; no repeating pulse. |
| Accept uncertainty | Allow a part of the setting to remain unresolved. | Do not imply damage, failure or horror. |
| Choose quiet | Reveal more still water or reduce competing detail. | Companionship remains; no countdown or deterioration. |
| Keep, carry, rest | Three complete arrangements of presence, trace and space. | No visual ranking by brightness, completeness or spectacle. |

## Work ownership and model selection

The primary agent owns this plan, integration, asset transfer, browser review and the acceptance decision. Existing local changes from the spatial pass must be preserved.

| Work package | Owner and model | Files and boundaries |
| --- | --- | --- |
| Babylon proof renderer | Dedicated subagent, GPT-6.1 Sol at high reasoning | New `src/components/scene-study/` rendering modules; no changes to active story or GameScene. |
| Composition and visual review | Dedicated subagent, GPT-6 Astra at high reasoning | New art-direction specification and read-only review; does not concurrently rewrite renderer code. |
| Expression and state contract | Dedicated subagent, GPT-6.1 Sol at medium reasoning | New cue/state specification and small pure state module with meaningful tests; no edits to current Ink chapter. |
| Blender assets and renders | Existing **Manage Blender work in repo** chat, GPT-6.1 Sol at high reasoning | Separate production branch; new source, textures, GLBs, camera manifest and reference renders only. |
| Review page and integration | Primary agent | New Astro study route and controls, imported delivery verification, documentation and final browser checks. |

The model mix reserves the more costly review capacity for visual reasoning while using Sol for bounded implementation. This follows [OpenAI model-selection guidance](https://developers.openai.com/api/docs/guides/model-selection); performance is judged by the delivered work, not the model label. Escalate only if a concrete unresolved task benefits.

## Progress

- [x] Plan persisted before implementation, 5 October 2026.
- [x] Camera and asset interface agreed across Blender and Babylon; delivered camera hierarchy loads in both browser backends.
- [x] Browser proof framework and review controls implemented and exercised with clearly labelled provisional assets in WebGPU and WebGL.
- [x] First Blender delivery imported and structurally validated (`ab523ca`, pass01); it remains a blockout in visual terms.
- [x] First browser images compared with the reference; remaining fidelity gaps recorded. Fidelity is not accepted.
- [x] Pass02b delivery imported, checksums verified and reviewed in WebGPU/WebGL; still below the fidelity gate.
- [x] Focused pass03 sand and towel corrections imported, contact-validated and reviewed in WebGPU/WebGL.
- [ ] Emotional state contact sheet reviewed.
- [ ] Story integration and comparative playtest complete.

No milestone should be marked complete on the strength of planned work, placeholder assets or an offline render alone. Subsequent implementation evidence belongs here and in [implementation status](implementation-status.md).

Initial work includes the [art-direction specification](living-scene-art-direction.md), [proposed narrative cue sheet](living-scene-cues.md), isolated `/scene-study/` review route and an asset inspector (`node scripts/inspect-scene-study.mjs`). The scene supports complete chair/cup states, reset, reduced motion, dynamic shadow/reflection participation and a verified CC0 overcast HDR for material illumination. The inspector reports structural validity separately from visual acceptance.

Pass01 from Blender commit `ab523ca70297e13e28e9c0833ca0aa387560f9e9` imports successfully in the browser and passes the named-root, camera, socket and cup-parent contracts. It contains 47,056 triangles, 11 mesh primitives, 8 materials and 21 embedded maps. The [offline image](../art/blender/living-scene-proof/pass01/reference.png) and [initial browser capture](evidence/living-scene-pass01-webgpu.png) show a useful blockout, not reference-level fidelity. The independent art review rejects the current composition, material credibility and light hierarchy. Highest-priority revisions are a shorter irregular promontory with water below the lamp, smaller mist-softened distant bridge, reference-shaped chair and cloth, luminous woven shade and warm broken reflection. Runtime lighting parity is being revised separately. Photographic fidelity and emotional acceptance remain pending.

The first integrated checkpoint corrects double conversion of fog color, selects the exported camera through Blender's named transform node, and repairs WebGPU initialization cleanup and WebGL recovery, including canvas replacement after a WebGPU context has been acquired. [Corrected WebGPU composition](evidence/living-scene-pass01-calibrated-webgpu.png) and [chair turned/cup removed in WebGL](evidence/living-scene-pass01-changed-webgl.png) are actual browser captures. That checkpoint passed 173 tests in 18 files, type checking and production build.

### Pass02b integration checkpoint

Asset commit `509bb87cb0630bb869acea1351541481468e6577` is imported with all ten checksums verified. The revised lower camera, vertical chair slats, quieter wood and shorter promontory improve the arrangement. The current asset contains 51,544 triangles, 12 primitives, 8 materials and 22 embedded maps. Source and [offline reference](../art/blender/living-scene-proof/pass02b/reference.png) are retained. Blender work has stopped at this bounded delivery.

Browser comparison exposed an underpowered broad bulb source. Matching its fixture intensity restores a localized warm shore pool and faint amber reflection. Its new 256px cube shadows share the same visible caster list as the downward light; the supported Poisson filter avoids an invalid unfiltered WGSL call in installed Babylon 7.34.4. This adds six shadow faces, so device performance remains an open gate. [Corrected WebGPU view](evidence/living-scene-pass02-lit-webgpu.png), [changed arrangement in WebGL](evidence/living-scene-pass02-changed-webgl.png) and [review page](evidence/living-scene-pass02-review-page.png) show the actual runtime result. Chair/cup changes, reset and reduced motion work in both backends. Final validation passes **174 tests in 18 files**, type checking and build; the renderer chunk advisory remains.

Independent review still rejects photographic fidelity. The runtime reflection is much weaker than offline and water is too smooth; foreground wood, cloth and bank lack convincing tactile detail; distant cliffs and the bridge lack atmospheric depth. The next art pass should resolve the clean layered background, irregular wet shore and specific worn bedside materials before adding emotional states or replacing the current chapter. Portrait composition, physical-device cost and emotional playtest remain unapproved.

### Focused pass03 request: sand and towel contact

User review identifies two specific defects: the beach does not read as sand, and the towel passes through the chair. The current shore uses the rock material and a steep 2.5cm-scale rise. The towel's long front drop crosses both a seat slat and the right stretcher; its fringe also ignores the actual deformed hem. These are asset defects, not effects to hide with camera or lighting changes.

The requested correction uses a dedicated sand surface at physical scale, gradual wet/dry variation and a gentler shoreline while keeping the lamp and chair grounded. The towel must wrap the top rail with a short front end above the seat and a longer rear end clear of the wood, with attached hem/fringe and weighted folds. The camera and composition remain fixed. Acceptance requires evaluated/exported cloth-versus-wood checks, side/back inspection views, sand contact under furniture, and browser checks of the opening and turned-chair poses. Blender management owns the asset changes; integration owns the actual browser review and provenance records.

Pass03 is delivered from `ec162d7c34a28eb8ad452c35496370d25b0adcd4`. Sand uses credited CC0 Sand 03 maps, a shallow shoreline ramp and local support under the furniture. The towel now has a short front end and a longer rear end with geometry-following hems. Evaluated source and fresh GLB reimport both report zero cloth/wood crossings and no embedded cloth vertices; the minimum gap is 4.624mm. Ground checks cover the opening and both ±20° poses, including the runtime's actual −20° turn. Camera and unrelated scene assets are preserved by the delivery's scope comparison.

All ten delivery checksums and the three original sand-map hashes pass locally; the independent GLB inspector and production build pass. Actual [opening WebGPU](evidence/living-scene-pass03-opening-webgpu.png), [turned WebGPU](evidence/living-scene-pass03-turned-webgpu.png) and [turned WebGL](evidence/living-scene-pass03-turned-webgl.png) views confirm that the sand reads as a granular surface and the cloth clears the chair. Cup removal, reduced motion and reset work without captured console warnings/errors. These two defects are accepted as repaired. The front-right waterline still has a dark, thick edge, and the broader photographic-fidelity gate remains open.

### Pass04 request: restore the broken shore and inhabited distance

Further user review corrects the material direction: the shore is too glossy, and the original depicts black rock rather than a beige sandy beach. The retained shoreline structure is useful, but the material choice drifted from the reference. The user also identifies missing mountains/city, a bridge without its surrounding landscape, and the books beside the chair. The fractured black slabs are significant: the place itself appears to be breaking apart. This meaning must survive later scenic and narrative revisions.

The [pass04 art brief](living-scene-pass04-art-brief.md) records the source observations, user-authored meaning and specific reconstruction choices. Restore predominantly rough charcoal stone in distinct chipped slabs, selective wet edges and subordinate sediment; add a restrained worn book stack; create layered inlet terrain and a cliff settlement with a small distant bridge anchored between banks. Preserve the fixed camera, validated cloth, chair/cup behavior and solid furniture supports. Books and meaningful slabs remain separate named geometry, static for now. [Future expression proposals](living-scene-cues.md#user-authored-motif-books-and-a-place-breaking-apart) do not authorize an automatic deterioration timer or a penalty for a caring strategy.

The renderer diagnosis separates asset and runtime causes. Imported ORM channels are correct; pass03 dry sand has roughness around .836 and its authored wet variant around .501. Existing cliff masses project largely outside/above the frame, while the forced .035 fog floor erases most in-frame distant city contrast. The bridge is substantially nearer and disconnected. Pass04 therefore requires corrected projected asset placement plus an explicit Babylon fog coefficient, not a global exposure change. An optional unlit sky mesh supplies broad cloud structure, participates in the live reflection, and is excluded from fog and shadow casting. Blender management owns assets; the renderer agent owns these bounded runtime corrections; independent art review and browser integration remain the acceptance gates.

Pass04 is imported from `5a5706d` with packed editable source and all nineteen checksums verified. Rough charcoal scan maps replace the sand; fourteen separate slabs preserve the user's breakup motif, and three worn books retain independent identities beside the chair. Layered terrain encloses the water, bridge abutments meet real banks, grouped buildings occupy the right cliff and an unlit cloud dome restores sky structure. The camera, furniture and validated towel remain unchanged. Runtime fog `.020` preserves distant contrast; a small live-mirror blur softens reflections.

The [final browser view](evidence/living-scene-pass04-opening-webgpu.png) confirms the dark rough shore and added scene elements in both rendering backends. Chair/cup changes, reset and reduced motion pass without captured console warnings/errors. The suite passed **176 tests in 18 files**, followed by six focused surface tests after mirror blur; final type checking reports **0 errors/0 warnings** and the production build passes. Source/contact validation preserves the **4.624mm** cloth gap and grounded books. Full [delivery evidence](blender-coordination.md) records asset sizes and provenance.

This completes the bounded asset delivery, not the photographic-fidelity gate. Cliffs remain too regular, the settlement merges into the ridge at this scale, the bridge reflection is too clean, and the books are still visually subordinate. The [art review](living-scene-pass04-art-brief.md) records what needs refinement before narrative integration or replacing the current chapter. Books and slab changes remain future authored cues, not automatic deterioration.

### Pass05 request: substantial squared shore rocks

The user welcomes pass04 and asks for “those cubic rocks instead of the beach.” This is a bounded foreground geometry correction. Replace the broad shallow shore and thin slab appearance with substantial, roughly squared fractured charcoal blocks, while preserving the praised composition, background, camera, materials, lighting, furniture and books.

Use varied rectangular mineral faces, broken corners and modest irregular bevels. Most exposed pieces should be roughly one quarter to three quarters of a chair-seat width, with depth around one third to three quarters of their width; these are modeling guides rather than uniform dimensions. Concentrate stepped faces, protruding corners, recessed seams and partial submersion at the water edge. Keep the overall promontory footprint and broad open water. Conceal or remove the continuous beach-like shell where blocks replace it. Preserve stable visible support patches at the existing chair, lamp and book heights, including the actual chair-turn sweep. Contact validation must use the rendered rock surfaces, not an obsolete hidden terrain proxy.

The user's subsequent direction makes the spatial progression explicit: “The gaps should be more and more pronounced as the tiled floor dissolves into the sea.” Keep a close-fitting, coherent tiled surface beneath the furniture, then increase crack width, water-filled voids and missing-piece frequency toward the sea. The outer edge becomes separated squared blocks and finally sparse partly submerged fragments, with restrained tilt and height changes. Preserve the open water and avoid an even scattering of rubble. This is a static expression of the place dissolving, not a newly authorized decay animation.

Blender management owns pass05 modeling/export and the editable source; integration owns actual WebGPU/WebGL review, contact/hash verification and delivery. Acceptance is an immediate chunky, squared-rock reading at the existing browser size, with visible vertical faces, natural variation and real gaps. Separate block identities preserve the breakup motif for future authored changes. This pass does not reopen the background or add story transitions.

The integrated [pass05 browser view](evidence/living-scene-pass05-opening-webgpu.png) passes independent review for both requests: substantial squared rock replaces the beach silhouette, and closely fitted support tiles dissolve into progressively wider water-filled breaks and isolated outer fragments. No scoped visual defect remains. The contact checks now use explicit visible block geometry and sample the chair throughout its turn. The camera, books, furniture and distant scenery remain preserved. Functional checks pass in WebGPU and WebGL, as does the production build. Separate block identity raises the scene to 236 base-pass primitives; device performance and broader photographic fidelity remain separate gates. See [implementation status](implementation-status.md) and [delivery record](blender-coordination.md).

### Authorized chapter integration and script direction

The user now asks to incorporate the scene into the actual game and makes camera/transition authorship a priority. This authorizes story integration despite the previously recorded broader photographic-fidelity limitations. Keep pass05 geometry and the successful text/audio, replacing the traversal renderer with the shared living-scene renderer. Preserve eleven decisions, memory callbacks and three legitimate endings; revise only prose that conflicts with the new staging or porcelain material.

Each displayed Ink passage must define a complete camera, transition and arrangement. The shared contract is `src/game/presentation/SceneDirection.ts`. Camera presets are `wide`, `chair`, `cup`, `bedside`, `water` and `shore`; transitions are `cut`, `ease` and `dissolve`, with bounded explicit durations. Arrangement fields identify chair orientation, cup near/away/absent, steady/resting lamp and an optional cup-ring trace. One director owns transitions and complete settled states. Dissolves affect the rendered scene while text/choices remain available. Reduced motion and restored progress apply complete states immediately; newer choices supersede unfinished transitions.

The cup view must reveal its actual 5.45mm exported rim notch. Return to wider context deliberately rather than traveling through the landscape. The warm lamp remains the anchor; dialogue scores never drive brightness. Explicit `sound` tags trigger authored tap pairs once and suppress replay on saved resume. Save version3 retains earlier editions under their old keys because Ink content indices change. Main-game loading requires the accepted production scene; the separate study keeps its diagnostic fallback.

Ownership: narrative agent owns Ink/tag validation/path tests and cue documentation; renderer agent owns the director, shared scene integration and transition tests; runtime agent owns chapter/save/audio integration and lifecycle tests; root owns framing/interface adjustments, integration review, browser playthroughs, full validation and delivery. Verification covers every ending, conditional camera/staging paths, interrupted transitions, restore/restart, reduced motion, muted sound, loading failure, WebGPU/WebGL and narrow layouts. No Blender asset revision is required for this integration.

### Integration delivered

The actual chapter at `/` now runs the pass05 living scene. Six script-directed compositions, synchronized finite chair/cup rotations, scene-only fades, explicit sound cues, complete ending arrangements and immediate restore/reduced-motion behavior are implemented. The keep-cup trace is flat, clipped to actual seat wood and visible in its detail shot. The cup chip, rail and shore each receive a composition that supports their dialogue. The separate study remains available for asset work.

Final validation passes **222 tests**, type checking and the production build. Browser checks cover all three endings, save/restart, interruption, sound/motion controls, WebGPU/WebGL and narrow layouts. See the [implementation record and captures](implementation-status.md#living-scene-in-the-playable-chapter--5-october-2026) and [script authoring guide](living-scene-cues.md#editing-a-passage). The next useful review is a human playthrough of the complete choreography: judge the emotional pacing of attention and silence together with the existing text and score.
