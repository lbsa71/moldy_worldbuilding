# Fading art and audio production handoff

This is a production brief for the next asset pass, dated 3 October 2026. The current game uses original Blender bedside assets with procedural fallbacks and a prototype procedural score. The user has authorized coordination with the Windows chat **Manage Blender work in repo**, where Blender 5.2.2 LTS is verified. The exact generator was executed, repaired and validated there, and the reviewed exports are now integrated locally. [Coordination status and ownership](blender-coordination.md) track revisions, checksums and the subsequent primitive consolidation. These are original asset studies; final artist review remains.

## Reference and intended result

Use [the generated title reference](../public/assets/fading-title.png) for the relationship between warm lamplight, cool mist, worn furniture, care and empty space. It is filmic reference artwork, not a screenshot of the real-time world. Its water reflections, fabric detail, weathered surfaces, distant architecture and cinematic atmosphere are not implemented effects. Do not treat the image as evidence of performance or asset quality. The distant buildings are optional atmosphere in the illustration; this chapter does not require a castle or a larger world.

The real-time scene should read as a small bedside arrangement dissolved into a landscape. One warm lamp remains in place. A chair offers a place without demanding an occupant. A chipped blue cup and partial bed rail carry concrete memories. The surrounding room never becomes a complete hospital. Keep the lamp, chair and cup readable at thumbnail size before adding surface detail.

The original procedural scene used a roughly three-unit lamp. The integrated Blender study now uses native meter scale, one shared restrained glow, simple slate ground and no physical water or cloth simulation. The camera and bedside anchors were brought closer together, with a specific cup detail view. Procedural fallbacks are scaled consistently; the retired character model's 0.1 import scale is not reused.

## Shared scene and material language

| Role | Color | Treatment |
| --- | --- | --- |
| Ground and distant silhouettes | Charcoal stone `#303D40` | Matte, broad quiet value changes; no green gloss. |
| Mist and cool shadow | Slate `#546468` | Atmosphere owns the color; do not bake fog into prop textures. |
| Rail and incomplete memories | Bone `#CFD7CC` | Restrained contrast and partial forms, not glowing white plastic. |
| Lamp metal | Brass `#C99550` | Worn satin metal; brighter wear only where hands touch. |
| Shade and hand contour | Ivory `#ECE6CD` | Linen translucency suggested by color/emission, with a clear warm focal point. |
| Cup and clinical fragments | Memory blue `#719297` | Blue cup glaze with a small visible rim chip; limited cool highlights. |

Use one consistent material vocabulary across the asset set: satin brass, matte painted rail, worn dark wood, ivory cloth and glazed ceramic. Palette values are starting base colors, not required final pixel colors under lighting. Keep scratches and grain subtle enough that the small objects survive fog and downsampling. Avoid photorealistic noisy textures on one prop beside featureless primitives on another.

A Principled BSDF metal/rough workflow is the interchange baseline. Use roughness around 0.55–0.8 for cloth/wood, 0.35–0.6 for worn brass and 0.25–0.45 for cup glaze as initial art choices. Brass is metallic; cloth, wood and ceramic are not. Bake procedural textures and lighting-independent surface detail to supported maps. The exporter translates supported material nodes rather than transporting an arbitrary Blender shader graph. See the [Blender glTF manual](https://docs.blender.org/manual/en/3.2/addons/import_export/scene_gltf2.html#materials).

## Blender asset specifications

All numbers below are proposed budgets for this small chapter, not universal limits or demonstrated device performance. Validate the exported triangle count and material primitive count, then profile the browser. Normal/UV seams can increase exported vertex counts beyond Blender's visible vertex count.

| Asset | Target dimensions in meters | LOD0 / LOD1 / LOD2 triangles | Maximum material slots | Important silhouette and story detail |
| --- | --- | --- | --- | --- |
| Floor lamp | Height 1.65; shade width 0.48; foot width 0.34 | 6,000 / 2,500 / 800 | 3 | Slightly crooked linen shade, slim brass stem, weighted foot; separate small emissive bulb. |
| Chair | Seat height 0.45; width 0.46; total height 0.9 | 4,000 / 1,500 / 500 | 2 | Four stable legs, open back, worn seat edge; asymmetry from use rather than ornate carving. |
| Cup | Height 0.09; body width 0.085; handle adds 0.035 | 2,000 / 700 / 250 | 2 | Open interior, readable handle, small rim chip; blue glaze with ivory ceramic exposed at chip. |
| Partial bedside set | Rail width 1.8; height 0.85; curtain frame height 2.1 | 10,000 / 4,000 / 1,200 | 3 | Incomplete rail, two wheel hints if needed, frame and partial curtain; no building facade or medical logo. |

The simultaneous hero set should remain below approximately 25,000 LOD0 triangles and ten material primitives before optional hand/doorway geometry. Prefer shared materials and texture sets. Proposed texture budget: one 1024px furniture/brass atlas and one 1024px memory/cloth atlas, plus 512px cup maps only if its story detail needs them. Start with base color plus packed occlusion/roughness/metallic maps; add normal maps only where they improve the actual camera view. Aim for under 8 MiB of decoded texture memory for the hero set, counting maps and mipmaps, and under 4 MiB of combined downloadable GLBs before compression. Those targets require measurement; a small JPEG does not imply small GPU memory.

LOD1 should preserve the shade profile, chair back opening, cup handle and bed-rail spacing. LOD2 may simplify small bevels and remove cup-chip microgeometry, but must preserve each object's identity. Deliver separate LOD files initially; automatic runtime LOD selection is future integration work, not an existing feature. Proposed switch distances are 12 and 24 meters, to be revised by projected size and narrow-screen testing. Avoid an expensive nearly invisible LOD0 object merely because it is geographically close.

### Coordinates, names and sockets

Use metric units with one Blender unit equal to one meter. Each asset has a root empty at its placement origin and applied rotation/scale on exported mesh objects. Lamp and chair origins lie at the center of the ground footprint. Cup origin lies at the bottom center so it can be placed on a chair/table/socket without sinking. Bedside set origin lies on the floor under the midpoint of the rail. Ground-facing contact points must be consistent across LODs.

Use stable root names `Fading_Lamp`, `Fading_Chair`, `Fading_Cup` and `Fading_Bedside`. Use mesh suffixes `_LOD0`, `_LOD1` and `_LOD2` where helpful. Keep these semantic child names consistent:

- `lampFilament`: bulb mesh selected for the shared glow pass.
- `lampWarmthSocket`: empty at the bulb center; the runtime owns the point light.
- `lampShadePivot`: empty at the shade joint, allowing the crooked angle to be authored.
- `chairSeatSocket`: empty on the seat surface; `chairFacingSocket` marks the intended front.
- `cupHandle`, `cupRimChip`: distinct geometry or documented regions for story direction.
- `bedRail`, `curtainFrame`, `partialCurtain`: separately controllable memory fragments.

Orient the front consistently and include a small front marker in the source file only. Blender's glTF exporter performs the up-axis conversion; enable its +Y Up export convention and verify orientation in the actual browser rather than adding a second corrective rotation by habit. Exporter axis/modifier behavior is documented in the [Blender export options](https://docs.blender.org/manual/en/3.2/addons/import_export/scene_gltf2.html#export).

### Export and integration rules

Deliver the editable `.blend`, packed source textures, a preview render and `.glb` exports for each asset/LOD. Export only the asset collection. Apply evaluated modifiers, export normals and UVs, and export tangents when normal maps need them. Convert curves to mesh before delivery. Remove unused objects, materials, cameras, lights and animation tracks. Avoid negative scale, unapplied mirrored transforms and accidental duplicated interior surfaces. Use ordinary metal/rough materials first; advanced transmission or cloth shader extensions require a separate compatibility decision.

No rigid-body physics, collision meshes or navigation blockers are required for these props. The current player travels along authored story positions and uses terrain height queries. Imported props should be non-pickable so they cannot intercept those terrain raycasts. Keep terrain pickable. Do not export lights: the browser's centralized lighting and shared glow provide continuity and control across platforms.

The importer should load a reusable asset container/template, instantiate it by symbol identity, and expose the same `setVisibility`, `updatePosition`, `setReducedMotion` and `dispose` contract as the procedural fallback. Maintain one lamp across story beats. Do not dispose shared template materials when a single instance fades out; template lifetime belongs to the scene. Imported PBR materials need their own fade handling rather than assuming every material is a StandardMaterial. Keep the procedural fallback until load failure and complete disposal are tested.

First integration review: measure each GLB's bounding box, inspect the named sockets, confirm a ground contact at the origin, verify bulb/light coincidence at a nonzero world position, test every fade and restart, and inspect desktop plus narrow screens. Confirm the shade is readable through the opening fog and the cup chip can be seen when the story mentions it. Physical plausibility and emotional readability should agree.

## Composition pass before asset replacement

The initial replacement pass staged props near each passage coordinate while the lamp remained at the origin. Source review identified a separation of more than twenty units and a narrow-screen composition risk. The subsequent composition pass keeps symbol identities and bedside anchors fixed, and reduces fog density so the small cluster reads from the camera. Browser screenshots remain the acceptance evidence for legibility.

The current fixed cluster uses these anchors in world coordinates: chair `(2.2, 0, 0.7)`, cup/table `(1.4, 0, 1.2)`, rail `(-2, 0, 3)`, hand beside the rail, and incomplete doorway `(-6, 0, 6)`. Replace each y coordinate with the terrain contact height. Let the listener's path approach and circle that arrangement, and express a contradiction by changing orientation and visibility rather than respawning the furniture farther away. Aim to keep the lamp and the currently named memory in the open part of the viewport together. These were the procedural-pass anchors. The imported pass uses chair `(1.2,0,0.4)`, cup/table `(0.7,0,0.9)`, rail and hospital `(−1.1,0,1.7)`, all grounded on terrain. The camera and staging are reviewed together.

The final procedural pass now includes a crooked emissive shade, a blue hollow cup with a lowered chipped rim, scene-driven chair turns and independent keep/carry/rest lamp levels. Lamp surface emission and shared glow track its light level, so the resting coda visibly dims. A worn side of the chair seat and richer material detail remain part of the hero asset pass. The terrain uses a small deterministic procedural slate-strata RGBA texture (RGB was rejected by the actual WebGPU browser and corrected during smoke testing); sky clear color matches fog color to avoid a hard viewport boundary.

## Original sound and music production

The working score is procedural and uses mood changes. A release score should build on one memorable small motif rather than substitute unrelated full tracks. Commission or author compatible stems with shared tempo/key or an explicitly designed nonmetrical transition system: room tone/lamp hum, low harmonic bed, restrained melody, distant clinical texture and a sparse human/breath-like layer. Keep dialogue reading comfortable; no essential narrative evidence should require hearing.

Deliver editable sessions and lossless 48 kHz masters/stems, with browser-ready compressed exports selected after listening tests. Document seamless loop start/end points, cue entrances, tails and allowed overlaps. Provide distinct hushed, warm, uneasy and resolved mixes derived from the same material. Provide a reduced-intensity mix if the normal clinical texture is intrusive. Do not use abrupt loud medical alarms to manufacture tension.

The two rail taps and lamp hum deserve authored cues because the story names them. Match the taps to the relevant beat, including its pause; do not loop them indiscriminately. The final keep/carry/rest codas should have a different final gesture while sharing the motif. Human listening review should cover headphones, quiet speakers and a phone, checking onset, transitions, clipping, long sessions, mute, resume and rapidly selected choices. Current procedural audio is a composition prototype, not a mastered commissioned score.

## Licensed asset acquisition

No downloaded asset is claimed in this handoff; the remote production job is tracked in the coordination record. Freely available does not establish permission to ship. Before adopting an external chair, lamp, texture, sound or model, record its exact source page, author, asset/version, download date, license text/link, attribution and redistribution conditions, plus a checksum of the acquired file. Store required notices beside the project credits and track any modifications. Verify the actual selected asset's license rather than relying on a site's general reputation or a search-result label. Prefer an explicitly compatible permissive license when it fits the art direction; retain the evidence even when attribution is not required.

Review downloaded archives before import, keep source files outside the active runtime directory until the asset passes inspection, and add only the reviewed export to `public/models` or `public/assets`. Do not ship someone else's demo scene, character animations or textures accidentally bundled with a prop.

## Babylon bundle reduction investigation

The installed Babylon 7.34.4 core package has `sideEffects: true`. Its root index re-exports rendering, physics, particles, debug, flow graphs and many other systems. The initial implementation imported this barrel in nearly every visual file; the subsequent art-system cleanup replaces those imports with direct modules. The installed `Meshes/meshBuilder.js` additionally imports every mesh builder, including text, geodesic and polygon builders that the scene does not use. This is a concrete reason to investigate dependency breadth; exact savings need a production-build comparison.

Active art and runtime files now use direct component imports and specific builder functions. Measure the production output and retain browser smoke tests when adding future rendering features. Example paths verified in the installed package:

| Runtime symbol | Direct module |
| --- | --- |
| Scene | `@babylonjs/core/scene` |
| Engine | `@babylonjs/core/Engines/engine` |
| WebGPUEngine | `@babylonjs/core/Engines/webgpuEngine` |
| Vector3 / Matrix | `@babylonjs/core/Maths/math.vector` |
| Color3 / Color4 | `@babylonjs/core/Maths/math.color` |
| Mesh / AbstractMesh / TransformNode | `@babylonjs/core/Meshes/mesh`, `abstractMesh`, `transformNode` |
| StandardMaterial | `@babylonjs/core/Materials/standardMaterial` |
| PointLight / HemisphericLight | `@babylonjs/core/Lights/pointLight`, `hemisphericLight` |
| GlowLayer | `@babylonjs/core/Layers/glowLayer` |
| ArcRotateCamera | `@babylonjs/core/Cameras/arcRotateCamera` |
| Ray with scene picking registration | `@babylonjs/core/Culling/ray` |
| SceneLoader | `@babylonjs/core/Loading/sceneLoader` |
| Observer type | `@babylonjs/core/Misc/observable` via type-only import |

Replace `MeshBuilder.CreateBox` and similar calls with direct `CreateBox`, `CreateSphere`, `CreateCylinder`, `CreateTorus`, `CreateTube`, `CreatePlane`, `CreateGround`, `CreatePolyhedron` and `CreateCapsule` imports from their corresponding `Meshes/Builders/*Builder` modules. Those functions exist in the installed version. Remove runtime imports of types such as Scene in AudioSystem and Observer/AbstractMesh where only annotations use them.

Retain required registration side effects. The installed glow module imports its effect-layer scene component itself; the installed Ray wrapper supplies picking support. The active scene uses a procedural listener marker and never imports the legacy character GLB. HeroAssetLibrary now registers the core glTF 2 loader lazily for the reviewed hero assets; no extension registration is needed by these exports. The former `@babylonjs/loaders/glTF` entry imported both glTF 1 and glTF 2 plus extensions. The glTF 2-only path and PBR support have been checked against the actual files in WebGPU and WebGL. Retain that registration when changing imports. Removing duplicate identical loader imports alone generally does not produce meaningful byte savings because the bundler deduplicates modules.

Dynamic import of WebGPUEngine can reduce the initial game chunk on WebGL-only devices while preserving the fallback path. It may redistribute bytes rather than reduce the total download for WebGPU users. Consider precompiling Ink separately so the compiler does not enter the player runtime, but keep the story tests against the source script. The listener marker is an intentional representation of attention; preserve the shared lamp glow when optimizing further.

Use a before/after production build and actual browser smoke test: WebGPU initialization, forced WebGL fallback, standard materials, the listener marker (and future imported assets when introduced), fog, shared glow, terrain picking, all memory props, restart and disposal. Record total emitted bytes plus gzip bytes and lazy chunks, not just a smaller filename. Babylon's [framework guidance](https://doc.babylonjs.com/setup/frameworkPackages/frameworkVers/) supports ES modules and tree shaking; registration requirements depend on the installed release.
