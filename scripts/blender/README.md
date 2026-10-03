# Original bedside asset study

`build_bedside.py` prepares the next art pass as original editable geometry. It creates a brass and linen floor lamp, worn wood chair, hollow chipped blue cup, and partial bedside rail/curtain. It uses Blender primitives, generated meshes and plain metal/rough materials; no downloaded assets, external textures or model services are involved.

**Execution status: generated and validated on Windows Blender 5.2.2 LTS.** The reviewed and consolidated handoff is imported locally under `art/blender/bedside-study-lod0` and `public/models/fading`; all delivered checksums passed. See [coordination status](../../docs/blender-coordination.md) for the Git revision, subsequent export consolidation and browser integration. This is a reviewed asset study, not a claim of final production art or AAA quality.

## Run on the Blender machine

Use a fresh background Blender process. The script starts an empty scene; do not execute it in a Blender session containing unsaved work. Intended baseline is Blender 4.x or later with the bundled glTF exporter and Cycles available. It uses CPU rendering so a configured GPU is not required.

From the repository directory:

```sh
blender --background --factory-startup --python scripts/blender/build_bedside.py -- --render
```

To export without rendering:

```sh
blender --background --factory-startup --python scripts/blender/build_bedside.py
```

To select a separate output directory:

```sh
blender --background --factory-startup --python scripts/blender/build_bedside.py -- --output /absolute/path/fading-study --render
```

If the executable is not on PATH, substitute its full path. The default destination is `output/blender/`, outside the runtime assets. Existing generated files are protected; explicitly pass `--force` to replace them. The script refuses destinations under this repository's `public/` or `src/`. It never installs packages or modifies the active game.

## Expected outputs after a successful run

| File | Contents |
| --- | --- |
| `fading_bedside.blend` | Editable original geometry/materials, assembled preview arrangement, camera and preview lights. |
| `lamp_lod0.glb` | Lamp at local root origin, tilted hollow linen shade, seams/hems, separate filament and light socket. |
| `chair_lod0.glb` | Beveled wood frame, slatted seat, worn front edge and seat/facing sockets. |
| `cup_lod0.glb` | Blue glazed vessel with inner wall, lowered chip in rim, exposed ceramic lip and handle. |
| `bedside_lod0.glb` | Partial rail/frame, shallow folded curtain and rail-tap socket. |
| `manifest.json` | Blender version, output bytes, evaluated triangle counts and material names for each asset. |
| `bedside_reference.png` | Optional 1200×900 CPU Cycles preview, 32 samples. |

Reviewed outputs from the remote run are now stored under `art/blender/bedside-study-lod0` and `public/models/fading`. A new local generation still writes to the separate output directory. The manifest reports actual evaluated geometry, including modifiers. Only LOD0 is generated; LOD1/2 remain an artist/integration task. The script does not automatically certify the budgets in the production brief.

## Scene and export contract

One unit equals one meter. Asset roots are `Fading_Lamp`, `Fading_Chair`, `Fading_Cup` and `Fading_Bedside`. Individual GLBs are exported before the preview arrangement moves those roots, so each export starts at its placement origin. The saved `.blend` shows the grouped composition; reset a selected root's placement transform before manually re-exporting a revised standalone asset.

Root origins lie on each object's contact plane. Mesh dimensions are generated at their intended size. Shade tilt is an authored child transform, not an accidental root rotation. The cup sits on the chair only in the preview arrangement; its individual GLB remains bottom-centered at zero.

Semantic child names include `lampFilament`, `lampWarmthSocket`, `lampShadePivot`, `chairSeatSocket`, `chairFacingSocket`, `cupHandle`, `cupRimChip`, `cupRimSocket`, `bedRail`, `curtainFrame`, `partialCurtain` and `railTapSocket`. Repeated construction pieces receive Blender's numeric suffixes; semantic sockets remain unique within each asset. Blender uses Z up; exports enable glTF +Y Up once. The chair faces negative Blender Y, marked by its facing socket.

GLBs include selected hierarchy, evaluated modifiers, normals, materials and semantic extras. They exclude preview cameras/lights, animation and collisions. Geometry is consolidated by material and independent visibility role into ten base-pass primitives. The lamp shade remains under its pivot; rail, curtain frame and cloth remain separate. `cupHandle` becomes a semantic empty with `mergedInto` and `geometryRegion` extras; its geometry shares the cup-body mesh. Region ranges describe pre-export Blender geometry and must not be used as indices into reordered glTF accessors. `--no-consolidate` reproduces the construction form for comparison. No compression extension is enabled. Material values use linear color converted from the project's sRGB palette. Cloth is opaque and geometrically thin; its dreamlike fade belongs to the runtime. No unsupported procedural shader graph is assumed to survive export.

The [official glTF operator reference](https://docs.blender.org/api/main/bpy.ops.export_scene.html#bpy.ops.export_scene.gltf) documents the selected export controls. The [production handoff](../../docs/art-and-audio-production.md) covers proposed budgets, art direction, LODs, licenses and browser integration. [The generated title image](../../public/assets/fading-title.png) is mood reference artwork; the optional Cycles preview is a rendered asset study. Neither is a screenshot of the playable real-time scene.

## Review before runtime adoption

1. Confirm the script completes and all four GLBs plus the manifest exist. Inspect triangle/material counts against the proposed budgets.
2. Open the `.blend`; inspect the lamp seam/hem detail, shade tilt, chair proportions, cup cavity/chip and partial curtain. Check the cup close up rather than judging it only in the group render.
3. Reimport the GLBs into a clean scene or browser viewer. Verify root origin, scale, named sockets, outward normals and the hollow surfaces. Check that no preview lights or camera were exported.
4. Make an art decision against the current game camera. The new lamp is roughly 1.7m high; the current procedural lamp is approximately three world units. Coordinate scale, staging and camera deliberately instead of shrinking an asset with a inherited 0.1 character scale.
5. Integrate through a reusable asset container with procedural fallbacks. Keep the lamp persistent, props non-pickable, shared glow tied to the filament/shade, and fades/reduced motion/disposal intact. The current game integrates these reviewed files through a cached scene-owned loader, with procedural fallbacks and independent story visibility groups.
6. Run the real browser on WebGPU and WebGL, including narrow screens, all ending light levels, rapid story transitions and restart. NullEngine tests cannot establish render or WebGPU-format compatibility.

The remote Blender manager owns generation/export work, and this chat owns game integration. The current study has passed reimport, checksum, binary-contract and WebGPU/WebGL checks. Final artist review and target-device performance remain separate production gates; see the coordination record for exact evidence.
