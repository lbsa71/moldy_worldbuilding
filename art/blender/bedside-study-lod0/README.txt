Job fading-bedside-20261003-01: completed asset study and export validation.

Reviewed runtime GLBs are in public/models/fading/ from repo root. Editable scene, previews and validation evidence are beside this file. Scripts are at scripts/blender/.
No runtime/story/CI source was edited. This asset handoff is committed separately; no deployment was performed.
All GLB geometry is original and procedural. This is a review study, not final AAA art.

Blender: 5.2.2 LTS, build d13f752e3b9c (2026-09-15).
Executable: C:\Program Files\Blender Foundation\Blender 5.2\blender.exe
Executed from C:\Users\lbsa7\Documents\Codex\2026-10-03\he:
"C:\Program Files\Blender Foundation\Blender 5.2\blender.exe" --background --factory-startup --python-exit-code 1 --python "work\fading-bedside-20261003\scripts\blender\build_bedside.py" -- --render --output "outputs\fading-bedside-20261003\attempt02"

The original generator SHA-256 matches the supplied value:
065680aae7e8af70d1f8f3561a4eca0c3e0da355de050c71f3e8ce9ca3e93da3
Corrected generator SHA-256:
3eafc114ea7b6d6169c5fe2ba6443c0d524896da9653e3aa2c18674a0909686e

Source corrections (exact replacement included; Git records changes):
- Merge coincident revolution poles and remove collapsed faces before normal repair.
- Close the shade's lower wall rim while preserving its hollow interior.
- Close cyclic tube loops, cap tube ends, and repair their mesh normals.
- Use 48 radial cup segments instead of 64; retain its 8 mm chip and hollow body.
- Place lamp foot's underside at Z=0 without moving semantic sockets.
- Ivory curtain palette; retain original geometry and silhouettes.
- Core glTF emission of 1 for filament; remove the emissive-strength extension.
- Write manifest in UTF-8 explicitly.

Final evaluated triangle counts (independently match GLB index counts and reimport):
lamp: 5244 / 6000; 154296 bytes; 3 materials; 3 mesh primitives
chair: 1404 / 4000; 83348 bytes; 2 materials; 2 mesh primitives
cup: 1676 / 2000; 38724 bytes; 2 materials; 2 mesh primitives
bedside: 1240 / 10000; 30352 bytes; 2 materials; 3 mesh primitives
Combined: 9564 / 25000 triangles; 306720 bytes / 4194304 bytes; 10 mesh primitives.

Validation:
- Fresh Blender scene for each GLB reimport.
- One identity-transform semantic root per asset; all required semantic names retained.
- Contact plane Z=0; unit scale is meters; export +Y Up applied once.
- Dimensions and raw glTF socket translations checked against expected orientation.
- All welded meshes are closed with consistent face winding and positive signed volume.
- No degenerate exported triangles, cameras, lights, animations, skins, rigid bodies,
  textures, images, or glTF extensions; all materials use core metal/rough PBR.
- Cup exterior normals face outward, interior normals inward into its cavity,
  underside faces down, interior floor faces up. Rim chip is 8 mm deep.
- Scene reference and reimported cup close-up were visually inspected.

Dimensions (Blender X/Y/Z, meters; glTF X/Y/Z is X/Z/-Y):
lamp approximately 0.4812 x 0.4820 x 1.7092
chair 0.4290 x 0.4300 x 0.9000
cup 0.1130 x 0.0860 x 0.0911 (including handle and rim detail)
bedside 1.9250 x 0.2780 x 2.1120

The full manifest includes checksums and audit-derived metadata appended during
packaging. The generator emits its original-format counts/material manifest.
Detailed per-mesh/transport evidence is in validation.json beside this file.
First attempt outputs remain untouched under work/fading-bedside-20261003/output/blender
on the Windows host. Original cup exceeded budget (2240 triangles); repaired cup does not.

Creative limitations: sparse procedural furniture, subtle wear represented by a small
seat-edge strip, no authored texture detail or fog. Runtime lighting/fog/glow and game
scale/camera integration remain the source project's responsibility. LOD1/2 not supplied.

Existing transfer route: authenticated SSH alias assets (stefan@84.234.29.124), tested.
No inbound service or firewall change was needed. See chat result for staged ZIP path.

Draw consolidation follow-up:
Previous export 879247f used 46 mesh primitives: lamp 22, chair 13, cup 3, bedside 8.
Current export uses 10: lamp 3, chair 2, cup 2, bedside 3. These are mesh/material
draw primitives in the GLBs, not a measurement of total runtime passes or frame time.
Modifiers are baked once, retaining surface positions, face smoothing and corner normals.
Material identities and values, triangle counts, dimensions and semantic frames are unchanged.
Lamp brass is one mesh; shade/hems/seams share lampShade_LOD0 under lampShadePivot;
lampFilament remains an actual mesh. Chair wood is chairSeat; wear is chairSeatWear.
Cup handle geometry shares cupBody_LOD0. cupHandle is now an EMPTY at its original
transform, with mergedInto and geometryRegion extras. cupRimChip remains a mesh.
bedRail merges only rail geometry. curtainFrame and partialCurtain remain independent
meshes so runtime can gate the rail and hospital/frame/cloth independently.

Merged meshes have geometry_regions JSON extras describing each original part's
vertex/polygon ranges and bounding box in the merged Blender mesh's local coordinates.
Those source ranges are PRE-glTF; exported accessors are split/reindexed and must not
be indexed using the Blender ranges. cupHandle's geometryRegion refers to that same
source region; the .blend retains exact ranges, and the generated GLB retains bounds.
Construction component meshes are intentionally consolidated; required semantic meshes,
roots and sockets remain. --no-consolidate allows a construction-mesh comparison run.

Independent comparison against 879247f:
All original/exported material surface corners match both ways within 1e-6 meters,
with matching corner normal dot >=0.999999. Triangle counts/material groups and all
required world transforms are unchanged. See comparison.json for per-material results.
Scene PNG normalized RGB mean absolute difference: 0.00002578; RMS: 0.00112791;
0.02546% of pixels differ by >0.02 in any channel. Cup PNG mean difference:
0.000000255; RMS: 0.00003202; no pixels differ by >0.02. Both were visually inspected.
These small differences include render sampling/traversal; no visible silhouette change.
No browser performance claim is made here; source session owns runtime draw profiling.

Reproduce using a NEW output directory:
blender --background --factory-startup --python scripts/blender/build_bedside.py -- --render --output /absolute/path/new-output
blender --background --factory-startup --python scripts/blender/validate_bedside.py -- /absolute/path/new-output
blender --background --factory-startup --python scripts/blender/preview_cup.py -- /absolute/path/new-output
blender --background --factory-startup --python scripts/blender/compare_bedside.py -- /absolute/path/previous-output /absolute/path/new-output
