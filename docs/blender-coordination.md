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

On 5 October, the Blender chat delivered pass01 at `ab523ca70297e13e28e9c0833ca0aa387560f9e9`. The new living-scene scripts, `art/blender/living-scene-proof/` and the exact GLB/manifest were selectively imported; the local HDR/credits and runtime were preserved. GLB SHA-256 `d0e116dc354fbc144c99c1f03919adcd10aa2f9ed272fea4d969bf42d0c605e1` matches the handoff. The independent inspector reports no structural issues: 47,056 triangles, 11 primitives, 8 materials, 21 embedded maps and 16,301,920 bytes. The packed source, offline reference and Blender reimport validation are retained in `pass01/`.

The scene loads in Babylon with the authored camera, but the art review does not accept its visual fidelity. The next revision targets shoreline/depth composition, chair construction, cloth asymmetry, shade luminosity and the warm water reflection. Source and offline-image success are not final scene acceptance.

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
