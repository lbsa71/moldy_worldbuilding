Fading living scene — production proof, 5 October 2026

First production pass implements the accepted docs/living-scene-plan.md camera/asset
contract. It is a reviewable detailed material/camera proof, not accepted photoreal art.
The runtime asset is public/scene-study/living-scene.glb, with embedded portable maps.
Runtime camera/light/environment suggestions are in public/scene-study/manifest.json.
pass01/ contains offline reference, packed editable .blend, manifest and GLB reimport
validation evidence. All authored surface maps are original procedural material images;
the first pass uses no acquired textures or HDR environment. No prior bedside assets,
active runtime, story, CI or deployment configuration is changed by this asset branch.

Coordinates: Blender Z-up -> glTF Y-up (x,z,-y); Babylon uses right-handed coordinates.
Fading_StudyCamera is exported, perspective, 3:2, fixed viewpoint. Chair has a ground
footprint pivot. Fading_StudyCup is a separate child root of Fading_StudyChair and owns
its geometry, allowing independent removal and chair-relative rotation/reset.
Fading_StudyLampLight is an empty at the bulb, not an exported light.
Fading_StudyShore is real wet foreground geometry. Optional backdrop/curtain roots
are static depth geometry. Preview water, lighting and volume are NEVER exported.
Babylon must supply live water at y=0 and update reflection/shadow memberships.

Run from repository root in a fresh Blender process, using a NEW output directory:
blender --background --factory-startup --python-exit-code 1 --python scripts/blender/living_scene_build.py -- --render --output /absolute/path/pass
blender --background --factory-startup --python-exit-code 1 --python scripts/blender/living_scene_validate.py -- /absolute/path/pass/living-scene.glb /absolute/path/pass/validation.json /absolute/path/pass/manifest.json

Blender 5.2.2 LTS, RTX 4090 Laptop OptiX; first 1536x1024 48-sample Cycles render
completed successfully. Tone transform AgX and volumetric atmosphere are offline
references; browser parity requires deliberate light/exposure/environment calibration.
Material authoring emits base color, tangent normal and packed R=AO/G=roughness/B=metal
PNG maps. The packed .blend and GLB preserve maps; the helper can regenerate them.

First-pass measured export: 47,056 triangles, 11 primitives, 8 materials, 21 embedded
1024px images, 16,301,920 bytes. This is about 112 MiB RGBA texture storage including
mipmaps before browser compression/format optimization, excluding reflection buffers.
Reimport validates required hierarchy, camera, cup isolation, no exported lights/water,
texture data and outward winding/degenerates. Open decorative collar/shore surfaces
are reported as warnings, not collision meshes or watertight solid claims.

Known first-pass visual gaps: ground reads too flat and clean; rocks need less uniform
angularity; shade transmission is approximated with emission; warm vertical reflection
is weak; distant atmosphere/architecture is provisional; wood wear is procedural rather
than scanned; portrait camera is not approved. These are art-review tasks, not test failures.
