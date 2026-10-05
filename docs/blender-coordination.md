# Blender coordination

The user authorized synchronization with **Manage Blender work in repo** on 3 October 2026. This file records the boundary between asset production and game integration so the two chats can work without overwriting each other.

| Role | Chat / location |
| --- | --- |
| Game integration | **Assess and elevate game quality**, `01a10293-95ca-7c30-ab2d-57176b0a72c6`, local Mac workspace `/Users/stefan/Documents/Source/lbsa71/moldy_worldbuilding` |
| Blender management | **Manage Blender work in repo**, `01a102af-0a91-76e2-bca4-b248f181980c`, host `remote-control:env_e_6aa2371515a883238146296222579293` |
| Verified Blender installation | Windows, `C:\Program Files\Blender Foundation\Blender 5.2\blender.exe`, Blender 5.2.2 LTS |

## Active handoff

The current production job is the [living scene proof](living-scene-plan.md), authorized on 5 October 2026. The plan is committed at `3aec137` on `codex/fixed-scene-proof`. Blender management has created `codex/living-scene-assets-20261005` from that commit and is producing new assets without changing the prior bedside set or active chapter. The earlier job below remains historical evidence for the integrated study.

New outputs belong in `scripts/blender/living_scene*`, `art/blender/living-scene-proof/` and `public/scene-study/`. The runtime expects `/scene-study/living-scene.glb` plus `/scene-study/manifest.json`. Required scene names are `Fading_StudyCamera`, `Fading_StudyLamp`, `Fading_StudyChair`, `Fading_StudyCup`, `Fading_StudyShore` and `Fading_StudyLampLight`; optional scene roots include `Fading_StudyBackdrop` and `Fading_StudyCurtain`. The cup remains independently removable under the chair so rotation retains its support. The chair pivot is at its ground footprint. The camera and transforms use canonical glTF Y-up with a right-handed Babylon scene.

Water is live in Babylon at y=0. Offline reference water, atmosphere and lights are excluded from the GLB. The manifest provides camera position/target/vertical FOV in runtime coordinates and lamp light position/intensity suggestions. No permanent background may contain removable furniture or its light/shadow/reflection contribution. The first local review route is `/scene-study/`; production fidelity is evaluated against the opening artwork in the browser, not inferred from a successful Blender render.

The study's turned-chair pose adds **−20°** about local glTF Y to the authored opening rotation (`SceneStudyObjects.setChairTurned`). Under the coordinate conversion above, this is **−20° about Blender Z**, not +20°. Ground support validation must cover the opening, the actual negative turn, and the intervening sweep; the cloth and cup remain children of the same chair root.

### Pass05 contract and delivery — 5 October 2026

After welcoming the integrated pass04 result, the user requests cubic rocks in place of the beach. Blender management delivered a bounded pass05 from `5a5706d`; root integration baseline is `8fc588f`. The contract replaces the low foreground shore/thin paving reading with irregular, substantial squared rock blocks and a stepped submerged edge. Retain approved charcoal maps, all non-shore assets, their materials/transforms, the fixed camera and existing support heights. See the [pass05 direction](living-scene-plan.md#pass05-request-substantial-squared-shore-rocks).

Additional user steering: gaps become more pronounced as the tiled floor dissolves into the sea. Author a static transition from tightly fitting support tiles through widening water-filled cracks and missing pieces to sparse detached submerged fragments. Gap width and fragmentation must increase seaward; no exposed continuous beach shell may fill those gaps.

Deliver a new `pass05/` source/render/report directory and updated runtime GLB/manifest on the same asset branch. Source/reimport validation must test actual rendered support surfaces beneath chair, lamp and books, including the runtime chair sweep; a hidden old beach mesh is not a valid support substitute. Scope comparison must cover background, sky, books and furniture against pass04. Preserve distinct named block geometry and record exact source/module/output hashes. Runtime behavior is expected to remain unchanged.

Final delivery `a172173b533726a86c8be8809e78ac3fe83817ba` is imported, following browser checkpoint `4dadf53`. All **22 checksum entries** pass locally; the final GLB and manifest are unchanged from the reviewed checkpoint. The packed `.blend`, 64-sample opening/turned/inspection renders, source modules, scope/lighting comparisons and a contact negative control are retained in `pass05/`. The runtime GLB SHA-256 is `1549f8a5960618973f8dbd7a68f49d96704e8831abd3ecdcc878bba247e989c3`: **31,446,016 bytes, 125,828 triangles, 236 primitives, 14 materials, 25 embedded images**. There are 210 individually named squared rock blocks. Texture memory estimate remains 170.67 MiB for decoded RGBA8 plus mipmaps, before runtime render targets.

Independent local comparison verifies all **47 non-shore nodes** and **12 used materials/images**, including camera, furniture, books, backdrop and sky. Four tiny rounding differences occur only in unused lamp-foot UV1 values; all material-used UV0 data and rendered geometry are exact. Source lighting/world/water/fog/display settings are also preserved by the delivery report.

The validator passes **82 checks**. Source and fresh reimport each test 1,185 chair/lamp support samples, including a chair sweep at 2° steps from 0 to −20° and the retained +20° pose, plus 44 book samples. Independent rays against delivered GLB triangles verify all **2,458 samples** with no missing hits, wrong support meshes or tolerance failures. Chair gaps are **−0.446..+1.536mm**; books are within **−0.0014..+0.268mm**. Support hits name actual visible slabs 001–005; books rest on slab004. The replacement `StudyWetShore` is a closed foundation entirely beneath water at **−0.92..−0.30m**, excluded from contact support. Hiding the five support blocks correctly makes furniture/book validation fail despite that foundation remaining. Cloth clearance remains valid.

Actual WebGPU/WebGL review accepts the squared-rock form and progressively widening water-filled gaps. Chair turn, cup removal, reset and reduced motion pass with no captured console warnings/errors; independent GLB inspection and production build pass. Evidence: [opening](evidence/living-scene-pass05-opening-webgpu.png), [changed WebGPU](evidence/living-scene-pass05-changed-webgpu.png), [changed WebGL](evidence/living-scene-pass05-changed-webgl.png), [review page](evidence/living-scene-pass05-review-page.png). Individual block identity increases primitive count from 42 to 236; frame rate and target-device cost are unmeasured. This bounded delivery is complete and Blender production is stopped. Existing broader photographic-fidelity limitations remain.

### Pass04 contract and delivery — 5 October 2026

The next synchronized asset pass responds to the user's correction toward fractured black stone, worn books, layered mountains and cliff settlement, and a bridge belonging to that landscape. See the [art brief](living-scene-pass04-art-brief.md). It starts from the validated pass03 assets and retains camera, furniture and cloth. Static books and meaningful slabs must retain separate named geometry/pivots for later authored changes. No story integration or automatic destruction animation is part of this pass.

Use `manifest.environment.fog_density` for the explicit finite, nonnegative Babylon EXP2 coefficient in scene meters; it is independent of Blender volume `fog_density_suggestion`. The browser honors this coefficient without the prior .035 floor. `fog_color` remains a display/sRGB triplet. An optional `Fading_StudySky` root uses a dedicated core `KHR_materials_unlit` material and sky-only raw albedo texture. The renderer excludes that sky from fog and shadows, includes it in the live mirror, and preserves ordinary visibility/reflection for books and fractured slabs. Sky geometry must cover the visible background and reflected view, inside the camera's 200m far plane. Initial fog tuning is a suggestion pending actual browser images.

Final asset commit `5a5706dc2e182db780415a712eb6e3275b98d56b` is imported from the existing Blender management branch. The early `eaa6cb6` checkpoint is retained as review evidence. This delivery adds fourteen individually named fractured slabs, three individually named books, layered inlet terrain, connected bridge banks, grouped cliff buildings and a separate unlit cloud dome. Source, renders, validation and contact reports are preserved under `art/blender/living-scene-proof/pass04/`. Original CC0 Seaside Rock and Kloofendal Overcast source files, hashes and credits accompany their derived runtime maps. The packed editable `.blend` and matching generator modules are included.

All **19 delivery checksums**, the generator/module hashes and the source-map hashes pass locally; public and pass04 manifests are byte-identical. `SHA256SUMS.txt` names `living-scene.glb`, whose tracked copy is `public/scene-study/living-scene.glb`. The GLB SHA-256 is `39fb89379cd0b38d1ae5b89d70522e92e4019fcc8e54dba0d8a1e7d1dc870106`: **31,827,168 bytes, 155,600 triangles, 42 primitives, 15 materials and 25 embedded images**. The decoded RGBA8 plus mip estimate is **170.67 MiB**, before render targets; it is not a device-memory measurement. The independent inspector reports zero issues. Blender validation records 72 passing checks and three expected decorative/open-surface warnings.

Scope comparison preserves camera, lamp, chair, cup and curtain geometry/transforms and original furniture material/image bytes exactly against pass03. Cloth retains zero crossings/embedded vertices and **4.624mm** minimum clearance. Chair support samples across opening and ±20° remain within **−0.445..+1.536mm**; 44 book underside samples are within **−0.0014..+0.268mm**. Both bridge abutments overlap actual terrain. Runtime fog is finalized at **.020**, and the live 1024px mirror uses a six-pixel blur kernel. The sky is fog/shadow exempt and remains visible in the mirror.

Actual final WebGPU and WebGL checks cover chair turn, cup removal, reset and reduced motion without captured warning/error messages. Evidence: [opening](evidence/living-scene-pass04-opening-webgpu.png), [changed WebGPU](evidence/living-scene-pass04-changed-webgpu.png), [changed WebGL](evidence/living-scene-pass04-changed-webgl.png) and [review page](evidence/living-scene-pass04-review-page.png). Type checking and production build pass. Asset delivery is complete; browser review accepts the material correction and added scene elements, while cliff/settlement naturalism, atmospheric depth and the clean bridge reflection remain unfinished. See the [art review](living-scene-pass04-art-brief.md). No new Blender iteration is running for this delivery.

### Focused pass03 delivery — 5 October 2026

User feedback requested a sandy beach and a towel that clears the chair. Blender management delivered `ec162d7c34a28eb8ad452c35496370d25b0adcd4` on `codex/living-scene-assets-20261005`. The integration selectively imports the build/material/validation scripts, editable pass03 source and reports, original CC0 sand maps, and public GLB/manifest. It preserves the runtime, HDR and existing scene composition. `scope-preservation.json` verifies unchanged camera, lamp, cup, backdrop and curtain geometry/transforms, projection and original material/image data.

The exact public GLB has SHA-256 `8754ef4d3c3a37bc7ae890d54d9d8e92da4e3737ed901f7c6f49b08a4d348750`, 25,704,764 bytes, 78,988 triangles, 14 primitives, 10 materials and 27 embedded 1024px images. All ten delivered checksum entries pass locally; `pass03/SHA256SUMS.txt` names `living-scene.glb`, whose tracked copy is `public/scene-study/living-scene.glb`. The three sand-source files also match their recorded source hashes. The decoded RGBA8 plus mipmap estimate is 144 MiB, before render targets; this is not measured device memory.

Evaluated source and fresh GLB reimport checks report zero cloth/wood triangle crossings or embedded cloth vertices, a 4.624mm minimum cloth/wood gap, 128.406mm front hem/seat clearance and 25.537mm rear cloth/wood clearance. Ground rays cover 88 chair underside samples per pose at opening and ±20°; gaps range from −0.445 to +1.536mm. The lamp's 129 ground samples are within 0.002mm. An intentionally intersecting cloth negative control correctly fails the validator. Front, rear, turned and reference renders are retained under `pass03/`.

Local integration passes the independent GLB inspector and production build. Actual WebGPU/WebGL review confirms sandy surface detail and towel clearance through the runtime turn, with cup removal, reduced motion and reset still working and no captured console warnings/errors. See [opening](evidence/living-scene-pass03-opening-webgpu.png), [turned WebGPU](evidence/living-scene-pass03-turned-webgpu.png) and [turned WebGL](evidence/living-scene-pass03-turned-webgl.png). This bounded repair is accepted; broader fidelity and the remaining front-right shoreline edge are separate work. Blender production is stopped at this delivery.

### Earlier deliveries

On 5 October, the Blender chat delivered pass01 at `ab523ca70297e13e28e9c0833ca0aa387560f9e9`. The new living-scene scripts, `art/blender/living-scene-proof/` and the exact GLB/manifest were selectively imported; the local HDR/credits and runtime were preserved. GLB SHA-256 `d0e116dc354fbc144c99c1f03919adcd10aa2f9ed272fea4d969bf42d0c605e1` matches the handoff. The independent inspector reports no structural issues: 47,056 triangles, 11 primitives, 8 materials, 21 embedded maps and 16,301,920 bytes. The packed source, offline reference and Blender reimport validation are retained in `pass01/`.

The scene loads in Babylon with the authored camera, but the art review does not accept its visual fidelity. The next revision targets shoreline/depth composition, chair construction, cloth asymmetry, shade luminosity and the warm water reflection. Source and offline-image success are not final scene acceptance.

The bounded pass02b revision is imported from `509bb87cb0630bb869acea1351541481468e6577` on the same asset branch. All ten delivered SHA-256 entries pass locally, and the independent GLB inspector reports no structural issues. Current GLB: SHA-256 `fd5eb0382f9d29dd9c1ec1c5c6d0b07c04436360e70bf725fec751dd28389cb9`, 12,573,260 bytes, 51,544 triangles, 12 primitives, 8 materials and 22 embedded 1024px maps. The lower camera is at Y-up `[0, 1, 8.2]`, target `[0, .7, 0]`, vertical FOV `.429630816`; the cup remains a separate child of the restaged chair. Packed editable source, reference render, manifest, validation and checksums are preserved under `pass02b/`. The packed source also contains the verified CC0 overcast HDR; local distributed HDR and credits were preserved during import.

The revised chair, shorter promontory and quieter wood improve the composition. Offline lighting now creates a broken amber water reflection, but initial Babylon review loses much of that warmth. Both versions still need foreground material detail, background depth and shoreline blending; portrait framing is unapproved. The 22 maps imply roughly 117.3 MiB if decoded as RGBA with full mipmaps, before render targets and format optimization; this is an estimate, not a device-memory measurement. Decorative open surfaces are not collision solids. Blender production has stopped at this reviewed delivery, without merging or deploying.

### Previous bedside study

Job **fading-bedside-20261003-01** was dispatched through the Blender chat with the complete generator source and creative/export contract. Initial source SHA-256:

```text
065680aae7e8af70d1f8f3561a4eca0c3e0da355de050c71f3e8ce9ca3e93da3
```

The current game changes are uncommitted in the Mac workspace. A remote clone of `lbsa71/moldy_worldbuilding` alone therefore does not contain this generator or the improved runtime. The Blender chat received the exact source directly and was asked to verify its checksum before running it in a dedicated job directory. The initial source handoff used direct chat transfer. The user later authorized the Blender session to push and synchronize a dedicated asset branch. No main-branch merge or deployment was performed.

Requested work: execute in a fresh background Blender process, repair API incompatibilities if needed, render the grouped asset study, inspect the cup cavity/chip and other silhouettes, reimport all four GLBs, and report dimensions, origins, orientation, sockets, materials, triangle counts, file sizes and checksums. The deliverables are the editable `.blend`, four LOD0 GLBs, preview image, manifest and any generator correction as a diff or replacement file.

The first completed handoff was pushed on `blender/fading-bedside-20261003`, commit `879247fdb8ddb4272ed6227ba486beb1cc0c1d90`, based on `326cb74`. It was fetched and imported selectively into this working copy: `art/blender/bedside-study-lod0`, `public/models/fading` and three Blender scripts. Local runtime/story/CI edits and `scripts/blender/README.md` were preserved. All fourteen entries in the delivered SHA-256 manifest passed locally. The corrected generator hash is `8e0bfe4db4c443e3c4eb1f4bd5f814d89ac79037d1cdc5f65912199b34444add`.

The editable source, preview renders and validation report are under `art/blender/bedside-study-lod0`. Runtime models are under `public/models/fading`. The initial set totals 9,564 triangles and 359,456 GLB bytes, with nine materials but 46 separate primitives. A follow-up export consolidation job was requested on the same branch because primitive count exceeds the proposed budget; it must preserve lamp shade articulation and independent rail/curtain visibility.

The consolidation follow-up is now imported from `c9da4aee5728ae81c1c5c0e7d02f09f23fae4f4a` on the same branch. All sixteen delivered checksum entries pass. Current generator SHA-256: `3eafc114ea7b6d6169c5fe2ba6443c0d524896da9653e3aa2c18674a0909686e`. The source `.blend`, corrected generator, reimport validator and independent comparison script are preserved alongside the exports. `comparison.json` records equivalent geometry and required transforms, plus the preview-image comparison.

Final imported asset totals:

| Asset | Triangles | Base-pass primitives | GLB bytes |
| --- | ---: | ---: | ---: |
| Lamp | 5,244 | 3 | 154,296 |
| Chair | 1,404 | 2 | 83,348 |
| Cup | 1,676 | 2 | 38,724 |
| Bedside | 1,240 | 3 | 30,352 |
| **Total** | **9,564** | **10** | **306,720** |

The primitive count excludes procedural scenery/supports and additional rendering passes; it is not a whole-scene draw-call measurement.

Runtime integration is complete for this study. A scene-owned lazy glTF2 library retains procedural fallbacks, preserves imported coordinate conversion, clones mutable materials, and disposes late results. The lamp keeps its logical identity while adopting the imported light socket and PBR emission. A memory adapter preserves fade/rotation state, keeps rail and curtain groups independent, and puts the cup on an original support table. Native-scale staging and an authored cup close-up replace the previous oversized composition.

Verification: **133 tests across 11 files pass**, type checking reports **0 errors/0 warnings/25 hints**, production build passes (with a renderer chunk-size advisory), and `git diff --check` passes. The final consolidated exports were rendered in actual WebGPU and WebGL browsers; phone-width layout and cup detail were inspected. Intentional network blocking demonstrated usable procedural fallbacks and story choices, then was removed. The Rest coda and restart were exercised during the integration pass. Final normal-loading runs had no new warnings/errors.

Evidence: [desktop scene](evidence/blender-desktop-overview.jpg), [desktop cup detail](evidence/blender-desktop-cup.jpg), [phone cup detail](evidence/blender-mobile-cup.jpg), [WebGL bedside](evidence/blender-webgl-bedside.jpg). Physical-device performance, final art direction, LODs and human creative review remain production work. The main-branch release includes the runtime, story, CI and selectively imported Blender handoff together; the original Blender asset branch preserves its production history.

## Ownership and integration rules

- Blender management owns generator compatibility fixes, modeling, renders, export validation and artifact manifests. Keep job outputs separate from unrelated projects and preserve previous attempts.
- Game integration owns active story, Babylon code, camera/staging, asset loading, procedural fallbacks, lifecycle, tests and browser verification. Blender management should not independently change these files.
- Return exact paths and hashes with every delivery. Transfer source corrections with the artifacts so future exports can be reproduced. Keep the original source and generated output distinguishable.
- Use an existing authenticated transfer or shared storage route when available. Do not open inbound services, change firewall settings or publish artifacts merely to move files.
- Final asset adoption requires a local GLB inspection and actual WebGPU/WebGL browser review. Rendering successfully in Blender alone does not establish runtime compatibility or production quality.

The [generator instructions](../scripts/blender/README.md) define expected files and sockets. The [art/audio brief](art-and-audio-production.md) defines the palette and budgets. The source chat reads Blender progress with `wait_threads`/`read_thread`; reporting in the Blender chat is sufficient and does not depend on unsolicited messages back.

## Integration review before adoption

The scene agent completed a read-only review while Blender work began. The implementation now uses a scene-owned `AssetContainer` cache and a stable imported-symbol wrapper, with the procedural symbol visible until a validated import is ready. After asynchronous loading, apply the latest story visibility, chair orientation, reduced-motion and ending state; dispose late results when the scene has closed.

The integration review identified and addressed these hazards:

- Glow originally expected `StandardMaterial` and exact procedural mesh names; it now accepts imported PBR emission through semantic bindings. The bindings include ending dimming, cloned mutable lamp materials and preserved template ownership.
- The original camera and spacing suited a roughly 3m lamp and oversized cup. The new human-scale cup is 0.09m tall. Review framing, cluster spacing and story-detail visibility together.
- The existing cup symbol includes a table; the cup GLB does not. Keep the support or place through an explicit surface/socket.
- `rail` and clarity-gated `hospital` are separate story symbols, while the bedside GLB combines rail and curtain. Expose independent child groups so visibility preserves the story contract.
- Retain the imported coordinate-conversion hierarchy, verify the chair-facing socket before applying authored turns, and mark all prop descendants non-pickable.
- Validate rejected/late loads, rapid changes, restarts, resource disposal, all three ending light states, and desktop/narrow WebGPU and WebGL. Re-measure the bundle after adding glTF/PBR loader support.
