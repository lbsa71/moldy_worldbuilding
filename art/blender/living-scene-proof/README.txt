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

Bounded pass02 refinement (reviewed evidence in pass02b/):
- Lower camera at Blender (0,-8.2,1.0), target (0,0,.70), same 55mm/3:2 framing;
  exported camera/manifest are authoritative. Chair restaged to preserve right-side anchors.
- Shorter promontory and uneven foreground surface; water remains below the lamp.
- Dark, rougher stone with mixed rounded slabs; no permanent furniture reflections baked.
- Broad worn chair top rail and vertical slats; grain aligned along each member;
  subtler wood contrast and asymmetrical cloth. Porcelain UV spans its blue floral map.
- Textured warm linen emission and thin metal shade rims. Shade emission approximates
  transmission; full fabric scattering is not claimed. No material extension is required.
- Preview object-space ripple normals produce the broken vertical warm reflection.
  Live Babylon water remains responsible for reflection and dynamic object consistency.
- Small fixed-view bridge proxy, revised layered distant masses and atmospheric lighting.

Pass02b measured: 51,544 triangles, 12 primitives, 8 materials, 22 embedded 1024px
images, 12,573,260 GLB bytes. GLB SHA256:
fd5eb0382f9d29dd9c1ec1c5c6d0b07c04436360e70bf725fec751dd28389cb9
All required hierarchy, camera, cup isolation and preview-exclusion checks pass after
fresh reimport. Decorative/open shoreline surfaces remain explicitly reported warnings.
Estimated full RGBA texture storage with mipmaps: 117.3 MiB, excluding shadow/reflection
buffers. Browser frame time, texture format savings and parity are integration measurements.

Preview now uses the same IBL selected by the integration session:
Overcast Soil (Pure Sky), Poly Haven; Jarod Guest and Sergej Majboroda; CC0.
Asset: https://polyhaven.com/a/overcast_soil_puresky
License verified: https://polyhaven.com/license (5 October 2026).
1k HDR SHA256: 2dbbbbb1323a8e8989db2e8306bd13099b215539e5adba41b85738a250a7904e
The HDR is packed into the editable .blend for portability; it is not embedded in the
GLB, and this branch does not replace the integration session's overcast.hdr or credits.
Pass02 invocation adds --environment /absolute/path/overcast.hdr. Manifest records
offline intensity/tint for calibration; Cycles watts and Babylon intensity are not equal.

Remaining fidelity gates are OPEN: distant silhouettes are coarse depth proxies; hard
horizon and scene-edge blending still need a background pass; shade/cloth are not yet
photoreal scattering studies; foreground shore needs better layered rock/soil detail;
wood wear remains analytical; portrait framing and actual browser photoreal parity
need review. Pass02b is the bounded checkpoint; no further revision or deployment is
part of this delivery. Pass01 remains preserved in Git and this evidence directory.

Pass03 focuses on the reported sand identity and towel penetration defects:
- Sand 03 by Charlotte Baglioni / Poly Haven replaces the rock material on the sand.
  Source diffuse, OpenGL normal and packed AO/roughness/metal maps are acquired at
  1024px, with a physical tile width of 2m. Source files, exact URLs, SHA256, MD5,
  author and CC0 license are recorded in source-assets/sand03/provenance.json.
  Wet sand uses explicit baked linear-light diffuse darkening and reduced roughness.
  These are portable core glTF materials; no Blender-only shader effect is required.
  Asset: https://polyhaven.com/a/sand_03 ; license: https://polyhaven.com/license
- Shallow sand deposition and a gently rounded waterline replace the abrupt shore
  height step. Rocks are sparse. Local flattened contact areas support the lamp
  and chair, including the runtime minus-20-degree turn used for inspection.
- The towel follows a rounded path over the top rail. The front tail ends above
  the seat; the long tail hangs behind the back posts. Weighted folds, a thin
  solidified body, hems and fringe are chair children. Fringe follows actual ends.
- contacts.json audits evaluated bevel/solidify triangles, solid containment,
  front/rear clearance and actual downward footprint raycasts onto the sand.
  validation.json repeats contact checks after GLB export and fresh reimport.
- reference.png preserves the pass02 camera, light setup and distant geometry.
  inspection-front.png, inspection-rear.png and inspection-turned20.png show the
  cloth path and foot contact from closer views. The packed living-scene.blend
  contains the fixed camera and original scene; inspection cameras are temporary.

Measured pass03: 78,988 triangles, 14 primitives, 10 materials, 27 embedded 1024px
images, 25,704,764 GLB bytes. Approximately 144 MiB RGBA8 texture storage including
mipmaps before compression, excluding live reflection/shadow buffers. GLB SHA256:
8754ef4d3c3a37bc7ae890d54d9d8e92da4e3737ed901f7c6f49b08a4d348750
Source and fresh GLB reimport: zero confirmed cloth/wood crossings and zero cloth
vertices contained in wood beyond 0.5mm. Minimum cloth/wood distance is 4.624mm;
front cloth/seat clearance 128.406mm; rear cloth/wood clearance 25.537mm. Chair
underside gaps at 0/-20/+20 degrees are -0.445mm..+1.536mm; lamp contact is within
0.002mm. 88 chair underside samples per pose and 129 lamp samples are checked.
An intentional 45mm cloth displacement was rejected (987 crossing triangle pairs,
800 cloth vertices inside wood), confirming the contact checks detect the defect.
scope-preservation.json verifies original materials/images and lamp/cup/backdrop/
curtain/camera geometry, transforms and projection against the pass02 GLB. Triangle
ordering and unused secondary UV data do not affect that oriented-surface comparison.
Transport and contact checks pass; the decorative lamp and sand open surfaces remain
explicitly reported warnings rather than watertight-solid certifications.

Pass03 is a bounded repair checkpoint. Distant silhouettes/horizon, other analytic
materials, portrait framing and browser photoreal parity remain open review gates.
