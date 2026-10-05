Fading living scene pass04 - final bounded asset delivery, 5 October 2026

Runtime asset: public/scene-study/living-scene.glb and manifest.json.
Packed editable source and final offline evidence are in this directory.
The local proof GLB has the same bytes as the committed public asset; Git keeps
only the public copy. review-* files preserve the earlier browser checkpoint.

Scope: dark fractured shore with scanned rock maps; separate static paving and
three worn books; five layered terrain masses; connected masonry inlet bridge;
quiet cliff settlement; photographic cloud sky. The original reference is
public/assets/fading-title.png and the bounded brief is
docs/living-scene-pass04-art-brief.md on the main integration branch.

Since the early eaa6cb6 checkpoint, the repetitive roofline is replaced by 20
broader houses in five uneven groups with exposed cliff gaps and varied roofs.
The books have brighter muted page blocks, cover overhang, separation and small
rotations. The main browser review accepted the charcoal shore; its material
has not been changed again. Final city/books browser review is still pending.

Camera, lamp, chair (including towel), cup and curtain geometry/transforms,
used UVs, original materials and embedded image bytes exactly match pass03.
scope-preservation.json compares oriented triangle sets independent of ordering.
No runtime, story, CI, original reference or illumination HDR is replaced here.

Independent semantic roots: Fading_StudyBooks with StudyBook_1/2/3;
Fading_StudyPaving under Fading_StudyShore, with 14 distinct slab meshes.
Their ground pivots, static status and hierarchy survive GLB reimport. They are
prepared for later authored changes; this delivery has no animation or lights.
Runtime water remains live at Y=0. The existing cup is a separate chair child.

Sky contract: separate Fading_StudySky, inward 155m dome, within camera far=200m.
KHR_materials_unlit + embedded raw sRGB baseColorTexture. Runtime must honor
fog=false, castShadows=false, receiveShadows=false and mirror membership once.
Visible sky is separate from the existing Overcast Soil illumination. Cloud
color derives from scene-linear source luminance and an explicitly encoded
sRGB palette, without a display transform or furniture/background image bake.
Runtime Babylon EXP2 fog coefficient is exactly .020 per scene meter, with
fog color [.24,.34,.44]. Offline low-altitude volume density .010 is separate.

Acquired source attribution, original files and checksums:
- Seaside Rock: Dimitrios Savva / Poly Haven, CC0, 1k diffuse/OpenGL normal/ARM,
  2m tile; ../source-assets/rock04/provenance.json.
  https://polyhaven.com/a/seaside_rock ; https://polyhaven.com/license
  Charcoal diffuse adaptation retains captured grain; dry roughness .78-.96,
  wet .48-.72; normal strength .72. Wet coverage is confined to the water edge.
- Kloofendal Overcast (Pure Sky): Greg Zaal / Poly Haven, CC0, 4k original HDR,
  source-assets/sky/provenance.json; adapted sky-clouds.png 4096x2048.
  https://polyhaven.com/a/kloofendal_overcast_puresky
- Existing lighting: Overcast Soil (Pure Sky), Jarod Guest and Sergej Majboroda /
  Poly Haven, CC0. Packed in the blend; not embedded in the GLB.
  https://polyhaven.com/a/overcast_soil_puresky

Measured final export: 31,827,168 bytes, 155,600 triangles,
42 primitives, 15 materials, 25 embedded images
(24 at 1024x1024, one 4096x2048 sky). Approximately 170.7 MiB RGBA8 texture
storage including mipmaps, excluding live shadow/reflection buffers. This is an
uncompressed estimate; frame time and browser texture formats need measurement.
GLB SHA256: 39fb89379cd0b38d1ae5b89d70522e92e4019fcc8e54dba0d8a1e7d1dc870106

Source and fresh GLB reimport checks pass: no degenerate triangles, consistent
closed-body winding, camera/projection/hierarchy/textures preserved, sky unlit
and exemptions present, real terrain/bridge connections checked. Both bridge
abutments overlap actual terrain by about 20mm. Decorative lamp foot, shore
and sky are open surfaces; watertight-volume certification does not apply.

Towel: zero confirmed wood crossings or contained vertices beyond 0.5mm.
Minimum cloth/wood clearance 4.624mm, front seat 128.406mm, rear wood 25.537mm.
Chair contact: 88 underside samples at 0/-20/+20 degrees; gaps -0.445..1.536mm.
Lamp: 129 underside samples, within 0.003mm. Book stack: 44 evaluated bottom
cover/spine samples, gaps -0.0014..0.2677mm. These checks certify geometry and
transport, not photoreal appearance. Reports retain their original generation
paths; their recorded GLB hashes identify the copied final asset.

reference.png: unchanged 3:2 camera, original chair pose, 1536x1024/64 samples.
turned-reference.png: same camera, chair -20 degrees Blender Z. The three
inspection PNGs provide closer front/rear/turned contact views. The packed blend
opens with the fixed camera and original chair pose; inspection cameras were
temporary. Offline tone/light/water appearance requires browser calibration.

Reproduce from repository root in a fresh Blender 5.2.2 LTS process, choosing
a NEW output directory and the original Overcast Soil HDR recorded in manifest:
blender --background --factory-startup --python-exit-code 1 --python scripts/blender/living_scene_build.py -- --render --samples 64 --environment /absolute/path/overcast.hdr --output /absolute/path/new-pass04
blender --background --factory-startup --python-exit-code 1 --python scripts/blender/living_scene_validate.py -- /absolute/path/new-pass04/living-scene.glb /absolute/path/new-pass04/validation.json /absolute/path/new-pass04/manifest.json

This is the final bounded offline delivery. Main owns browser review, live
mirror refinement and integration. Full photoreal acceptance and portrait
framing remain open. No deployment or final art approval is claimed.
