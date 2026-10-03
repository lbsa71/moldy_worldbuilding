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
8e0bfe4db4c443e3c4eb1f4bd5f814d89ac79037d1cdc5f65912199b34444add

Source corrections (exact replacement and unified diff included):
- Merge coincident revolution poles and remove collapsed faces before normal repair.
- Close the shade's lower wall rim while preserving its hollow interior.
- Close cyclic tube loops, cap tube ends, and repair their mesh normals.
- Use 48 radial cup segments instead of 64; retain its 8 mm chip and hollow body.
- Place lamp foot's underside at Z=0 without moving semantic sockets.
- Ivory curtain palette; retain original geometry and silhouettes.
- Core glTF emission of 1 for filament; remove the emissive-strength extension.
- Write manifest in UTF-8 explicitly.

Final evaluated triangle counts (independently match GLB index counts and reimport):
lamp: 5244 / 6000; 183260 bytes; 3 materials
chair: 1404 / 4000; 101316 bytes; 2 materials
cup: 1676 / 2000; 40756 bytes; 2 materials
bedside: 1240 / 10000; 34124 bytes; 2 materials
Combined: 9564 / 25000 triangles; 359456 bytes / 4194304 bytes.

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
