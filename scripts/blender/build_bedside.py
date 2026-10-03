"""Original Fading prop study. Run with Blender, not system Python.

blender --background --factory-startup --python scripts/blender/build_bedside.py -- --render
The generator resets its Blender scene. Outputs are review assets, not game replacements.
"""
import argparse
import hashlib
import json
import math
from pathlib import Path
import sys

import bpy
import bmesh
from mathutils import Vector

PROJECT = Path(__file__).resolve().parents[2]


def arguments():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path, default=PROJECT / 'output' / 'blender')
    parser.add_argument('--render', action='store_true', help='Render a CPU Cycles reference PNG')
    parser.add_argument('--force', action='store_true', help='Replace prior generated files in the output directory')
    parser.add_argument('--no-consolidate', action='store_true', help='Keep construction meshes for comparison renders')
    args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else [])
    args.output = args.output.expanduser().resolve()
    for protected in [PROJECT / 'public', PROJECT / 'src']:
        if args.output == protected or protected in args.output.parents:
            parser.error('Output must stay outside active public/ and src/ directories.')
    return args


def surface(name, hex_color, roughness=0.65, metallic=0, emission=0):
    rgb = [int(hex_color[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    # Hex palette is sRGB; node material colors are linear.
    linear = [v / 12.92 if v <= 0.04045 else ((v + 0.055) / 1.055) ** 2.4 for v in rgb]
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*linear, 1)
    mat.use_nodes = True
    shader = mat.node_tree.nodes.get('Principled BSDF')
    shader.inputs['Base Color'].default_value = (*linear, 1)
    shader.inputs['Roughness'].default_value = roughness
    shader.inputs['Metallic'].default_value = metallic
    if emission:
        socket = shader.inputs.get('Emission Color') or shader.inputs.get('Emission')
        if socket is not None:
            socket.default_value = (*linear, 1)
        strength = shader.inputs.get('Emission Strength')
        if strength is not None:
            strength.default_value = emission
    return mat


def attach(obj, name, parent, mat=None):
    obj.name = name
    obj.parent = parent
    if mat:
        obj.data.materials.append(mat)
    return obj


def empty(name, parent=None, location=(0, 0, 0)):
    obj = bpy.data.objects.new(name, None)
    bpy.context.scene.collection.objects.link(obj)
    obj.parent = parent
    obj.location = location
    obj.empty_display_size = 0.06
    return obj


def bevel(obj, amount=0.003, segments=2):
    modifier = obj.modifiers.new('softenedEdges', 'BEVEL')
    modifier.width = amount
    modifier.segments = segments
    modifier.use_clamp_overlap = True
    return obj


def cube(name, dimensions, location, parent, mat, soften=0.003):
    bpy.ops.mesh.primitive_cube_add(size=1, location=location)
    obj = attach(bpy.context.object, name, parent, mat)
    obj.dimensions = dimensions
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    return bevel(obj, soften) if soften else obj


def cylinder(name, radius, depth, location, parent, mat, vertices=32):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth, location=location)
    obj = attach(bpy.context.object, name, parent, mat)
    bevel(obj, min(radius * 0.12, 0.003))
    for polygon in obj.data.polygons:
        polygon.use_smooth = len(polygon.vertices) == 4
    return obj


def tube(name, points, radius, parent, mat, sides=6):
    curve = bpy.data.curves.new(name, 'CURVE')
    curve.dimensions = '3D'
    curve.resolution_u = 1
    curve.bevel_depth = radius
    curve.bevel_resolution = max(0, sides // 2 - 1)
    curve.use_fill_caps = True
    closed = (Vector(points[0]) - Vector(points[-1])).length < 1e-7
    if closed:
        points = points[:-1]
    spline = curve.splines.new('POLY')
    spline.use_cyclic_u = closed
    spline.points.add(len(points) - 1)
    for point, xyz in zip(spline.points, points):
        point.co = (*xyz, 1)
    obj = bpy.data.objects.new(name, curve)
    bpy.context.scene.collection.objects.link(obj)
    obj.parent = parent
    obj.data.materials.append(mat)
    bpy.ops.object.select_all(action='DESELECT')
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.convert(target='MESH')
    obj = bpy.context.object
    bm = bmesh.new()
    bm.from_mesh(obj.data)
    bmesh.ops.remove_doubles(bm, verts=list(bm.verts), dist=1e-7)
    bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
    bm.to_mesh(obj.data)
    bm.free()
    for polygon in obj.data.polygons:
        polygon.use_smooth = len(polygon.vertices) == 4
    return obj


def mesh(name, vertices, faces, parent, mat):
    data = bpy.data.meshes.new(name)
    data.from_pydata(vertices, [], faces)
    data.update()
    bm = bmesh.new()
    bm.from_mesh(data)
    # Merge shared poles before normal calculation; collapsed quads become fans.
    bmesh.ops.remove_doubles(bm, verts=list(bm.verts), dist=1e-7)
    bmesh.ops.dissolve_degenerate(bm, edges=list(bm.edges), dist=1e-7)
    bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
    bm.to_mesh(data)
    bm.free()
    obj = bpy.data.objects.new(name, data)
    bpy.context.scene.collection.objects.link(obj)
    attach(obj, name, parent, mat)
    for polygon in data.polygons:
        polygon.use_smooth = True
    return obj


def revolve(name, profile, parent, mat, segments=48, chip=False):
    vertices = []
    for i in range(segments):
        angle = i / segments * math.tau
        delta = math.atan2(math.sin(angle - math.pi / 2), math.cos(angle - math.pi / 2))
        damage = max(0, 1 - abs(delta) / 0.20) * 0.008 if chip else 0
        for radius, z in profile:
            vertices.append((radius * math.cos(angle), radius * math.sin(angle), z - (damage if z > 0.08 else 0)))
    count = len(profile)
    faces = []
    for i in range(segments):
        for j in range(count - 1):
            a = i * count + j
            b = ((i + 1) % segments) * count + j
            faces.append((a, b, b + 1, a + 1))
    return mesh(name, vertices, faces, parent, mat)


def build_lamp(m):
    root = empty('Fading_Lamp')
    root['asset_role'] = 'persistent_lamp'
    root['units'] = 'meters'
    revolve('lampFoot_LOD0', [(0, 0), (0.14, 0), (0.17, 0.016), (0.17, 0.027), (0.13, 0.044), (0.075, 0.065), (0, 0.065)], root, m['brass'])
    cylinder('lampStem_LOD0', 0.014, 1.31, (0, 0, 0.72), root, m['brass'])
    for z, radius in [(0.09, 0.031), (0.26, 0.026), (1.27, 0.027), (1.33, 0.033)]:
        cylinder('lampCollar', radius, 0.035, (0, 0, z), root, m['brass'])
    pivot = empty('lampShadePivot', root, (0, 0, 1.35))
    pivot.rotation_euler = (0.035, -0.07, 0)
    # Inner wall returns beneath the rim: hollow, opaque linen shade.
    revolve('lampShade_LOD0', [(0.24, 0), (0.20, 0.17), (0.125, 0.35), (0.121, 0.35), (0.196, 0.17), (0.236, 0), (0.24, 0)], pivot, m['linen'])
    for z, radius in [(0.002, 0.238), (0.347, 0.123)]:
        points = [(radius * math.cos(i / 48 * math.tau), radius * math.sin(i / 48 * math.tau), z) for i in range(49)]
        tube('shadeHem', points, 0.0025, pivot, m['linen'])
    for i in range(12):
        angle = i / 12 * math.tau
        points = [(radius * math.cos(angle), radius * math.sin(angle), z) for radius, z in [(0.24, 0), (0.20, 0.17), (0.125, 0.35)]]
        tube('shadeSeam', points, 0.0012, pivot, m['linen'])
    bpy.ops.mesh.primitive_uv_sphere_add(segments=16, ring_count=8, radius=0.027, location=(0, 0, 1.42))
    attach(bpy.context.object, 'lampFilament', root, m['filament'])
    empty('lampWarmthSocket', root, (0, 0, 1.42))
    return root


def build_chair(m):
    root = empty('Fading_Chair')
    root['asset_role'] = 'empty_place'
    for x in [-0.19, 0.19]:
        for y in [-0.18, 0.18]:
            cube('chairLeg_LOD0', (0.035, 0.035, 0.43), (x, y, 0.215), root, m['wood'])
    for i in range(4):
        cube('chairSeat' if i == 0 else 'chairSeatSlat', (0.105, 0.43, 0.035), (-0.162 + i * 0.108, 0, 0.45), root, m['wood'])
    for x in [-0.19, 0.19]:
        cube('chairBackPost', (0.035, 0.035, 0.48), (x, 0.18, 0.66), root, m['wood'])
    for z in [0.66, 0.86]:
        cube('chairBackRail', (0.41, 0.035, 0.052), (0, 0.18, z), root, m['wood'])
    # One gently worn seat edge carries the story detail; no external texture needed.
    cube('chairSeatWear', (0.30, 0.012, 0.003), (0, -0.208, 0.469), root, m['wood_wear'], soften=0.001)
    empty('chairSeatSocket', root, (0, 0, 0.47))
    empty('chairFacingSocket', root, (0, -0.35, 0.47))
    return root


def build_cup(m):
    root = empty('Fading_Cup')
    root['asset_role'] = 'chipped_cup'
    profile = [(0, 0), (0.032, 0), (0.036, 0.006), (0.043, 0.086), (0.041, 0.09), (0.037, 0.09), (0.033, 0.012), (0, 0.012)]
    revolve('cupBody_LOD0', profile, root, m['glaze'], segments=48, chip=True)
    points = []
    for i in range(49):
        angle = i / 48 * math.tau
        delta = math.atan2(math.sin(angle - math.pi / 2), math.cos(angle - math.pi / 2))
        damage = max(0, 1 - abs(delta) / 0.20) * 0.008
        points.append((0.039 * math.cos(angle), 0.039 * math.sin(angle), 0.09 - damage))
    tube('cupRimChip', points, 0.0011, root, m['ceramic'])
    handle = [(0.038 + 0.028 * math.sin(i / 20 * math.pi), 0, 0.022 + i / 20 * 0.045) for i in range(21)]
    tube('cupHandle', handle, 0.004, root, m['glaze'])
    empty('cupRimSocket', root, (0, 0, 0.09))
    return root


def build_bedside(m):
    root = empty('Fading_Bedside')
    root['asset_role'] = 'partial_memory'
    tube('bedRail', [(-0.9, 0, 0.08), (-0.9, 0, 0.85), (0.9, 0, 0.85), (0.9, 0, 0.08)], 0.013, root, m['rail'])
    tube('bedRailLower', [(-0.9, 0, 0.35), (0.9, 0, 0.35)], 0.012, root, m['rail'])
    for x in [-0.6, -0.2, 0.2, 0.6]:
        tube('railUpright', [(x, 0, 0.35), (x, 0, 0.85)], 0.009, root, m['rail'])
    tube('curtainFrame', [(-1, 0.24, 0), (-1, 0.24, 2.1), (0.75, 0.24, 2.1)], 0.012, root, m['rail'])
    vertices, faces = [], []
    for row in range(10):
        z = 0.42 + row / 9 * 1.63
        for column in range(25):
            x = -0.96 + column / 24 * 0.84
            y = 0.24 + 0.025 * math.sin(column / 24 * math.tau * 5)
            vertices.append((x, y, z))
    for row in range(9):
        for column in range(24):
            a = row * 25 + column
            faces.append((a, a + 1, a + 26, a + 25))
    curtain = mesh('partialCurtain', vertices, faces, root, m['cloth'])
    solidify = curtain.modifiers.new('thinCloth', 'SOLIDIFY')
    solidify.thickness = 0.001
    empty('railTapSocket', root, (0.25, 0, 0.85))
    return root


def merge_role(target, sources, semantic_markers=()):
    """Bake modifiers and join one material/visibility role without moving its frame.

    Corner normals, face smoothing and disconnected component topology are retained.
    Region ranges refer to the merged Blender mesh, before glTF vertex splitting.
    """
    bpy.context.view_layer.update()
    depsgraph = bpy.context.evaluated_depsgraph_get()
    target_inverse = target.matrix_world.inverted()
    vertices, faces, smooth, corner_normals, regions = [], [], [], [], []
    material = target.data.materials[0]
    for obj in sources:
        if len(obj.data.materials) != 1 or obj.data.materials[0] != material:
            raise ValueError('Role merge must have one shared material: ' + obj.name)
        evaluated = obj.evaluated_get(depsgraph)
        data = evaluated.to_mesh()
        transform = target_inverse @ obj.matrix_world
        normal_transform = transform.to_3x3().inverted().transposed()
        first_vertex, first_polygon = len(vertices), len(faces)
        local_vertices = [transform @ v.co for v in data.vertices]
        vertices.extend(tuple(v) for v in local_vertices)
        for polygon in data.polygons:
            faces.append(tuple(first_vertex + i for i in polygon.vertices))
            smooth.append(polygon.use_smooth)
        corner_normals.extend(tuple((normal_transform @ n.vector).normalized()) for n in data.corner_normals)
        region = {'source': obj.name, 'vertex_start': first_vertex, 'vertex_count': len(data.vertices),
                  'polygon_start': first_polygon, 'polygon_count': len(data.polygons),
                  'bounds_min': [min(v[i] for v in local_vertices) for i in range(3)],
                  'bounds_max': [max(v[i] for v in local_vertices) for i in range(3)]}
        regions.append(region)
        evaluated.to_mesh_clear()
    merged = bpy.data.meshes.new(target.name + '_consolidated')
    merged.from_pydata(vertices, [], faces)
    merged.materials.append(material)
    for polygon, use_smooth in zip(merged.polygons, smooth):
        polygon.use_smooth = use_smooth
    merged.normals_split_custom_set(corner_normals)
    merged.update()
    target.modifiers.clear()
    target.data = merged
    target['geometry_regions'] = json.dumps(regions, separators=(',', ':'))
    for obj, region in zip(sources, regions):
        if obj == target:
            continue
        if obj.name in semantic_markers:
            name, parent, local_matrix = obj.name, obj.parent, obj.matrix_local.copy()
            bpy.data.objects.remove(obj, do_unlink=True)
            marker = empty(name, parent)
            marker.matrix_local = local_matrix
            marker['mergedInto'] = target.name
            marker['geometryRegion'] = json.dumps(region, separators=(',', ':'))
        else:
            bpy.data.objects.remove(obj, do_unlink=True)


def consolidate(roots):
    lamp, chair, cup, bedside = roots
    brass = [o for o in lamp.children_recursive if o.type == 'MESH' and o.data.materials[0].name == 'Fading_SatinBrass']
    merge_role(bpy.data.objects['lampFoot_LOD0'], brass)
    pivot = bpy.data.objects['lampShadePivot']
    merge_role(bpy.data.objects['lampShade_LOD0'], [o for o in pivot.children_recursive if o.type == 'MESH'])
    wood = [o for o in chair.children_recursive if o.type == 'MESH' and o.data.materials[0].name == 'Fading_WornWood']
    merge_role(bpy.data.objects['chairSeat'], wood)
    merge_role(bpy.data.objects['cupBody_LOD0'], [bpy.data.objects['cupBody_LOD0'], bpy.data.objects['cupHandle']], semantic_markers=('cupHandle',))
    rails = [o for o in bedside.children_recursive if o.type == 'MESH' and o.name not in ('curtainFrame', 'partialCurtain')]
    merge_role(bpy.data.objects['bedRail'], rails)


def export_asset(root, filename):
    bpy.ops.object.select_all(action='DESELECT')
    root.select_set(True)
    for obj in root.children_recursive:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = root
    bpy.ops.export_scene.gltf(filepath=str(filename), export_format='GLB', use_selection=True,
                              export_yup=True, export_apply=True, export_extras=True,
                              export_materials='EXPORT', export_animations=False,
                              export_cameras=False, export_lights=False)
    depsgraph = bpy.context.evaluated_depsgraph_get()
    triangles, material_names = 0, set()
    for obj in root.children_recursive:
        if obj.type != 'MESH':
            continue
        evaluated = obj.evaluated_get(depsgraph)
        data = evaluated.to_mesh()
        data.calc_loop_triangles()
        triangles += len(data.loop_triangles)
        material_names.update(slot.material.name for slot in obj.material_slots if slot.material)
        evaluated.to_mesh_clear()
    raw = filename.read_bytes()
    import struct
    json_length = struct.unpack_from('<I', raw, 12)[0]
    transport = json.loads(raw[20:20 + json_length])
    # Count mesh instances as draws, not merely unique material names.
    primitive_count = sum(len(transport['meshes'][node['mesh']]['primitives'])
                          for node in transport['nodes'] if 'mesh' in node)
    return {'file': filename.name, 'bytes': len(raw), 'sha256': hashlib.sha256(raw).hexdigest(),
            'evaluated_triangles': triangles, 'mesh_primitives': primitive_count,
            'materials': sorted(material_names)}


def point_at(obj, target):
    obj.rotation_euler = (Vector(target) - obj.location).to_track_quat('-Z', 'Y').to_euler()


def preview_setup(roots, m):
    lamp, chair, cup, bedside = roots
    chair.location = (0.62, 0.02, 0)
    chair.rotation_euler.z = -0.18
    cup.location = (0.64, -0.04, 0.47)
    bedside.location = (-0.70, 0.80, 0)
    ground = cube('PreviewGround', (7, 7, 0.025), (0, 0, -0.02), None, m['slate'], soften=0)
    bpy.ops.object.camera_add(location=(3.2, -5.4, 2.7))
    camera = bpy.context.object
    camera.name = 'PreviewCamera'
    camera.data.lens = 55
    point_at(camera, (0, 0.15, 0.85))
    bpy.context.scene.camera = camera
    for name, kind, location, energy, color in [
        ('PreviewLamp', 'POINT', (0, -0.03, 1.40), 26, (1, 0.72, 0.40)),
        ('PreviewCoolFill', 'AREA', (1.5, -2, 4), 100, (0.5, 0.67, 0.8)),
        ('PreviewRim', 'AREA', (-2, 2, 3), 80, (0.62, 0.75, 0.86)),
    ]:
        data = bpy.data.lights.new(name, kind)
        data.energy = energy
        data.color = color
        if kind == 'AREA':
            data.size = 3
        obj = bpy.data.objects.new(name, data)
        bpy.context.scene.collection.objects.link(obj)
        obj.location = location
        point_at(obj, (0, 0, 0.7))
    scene = bpy.context.scene
    scene.world = bpy.data.worlds.new('PreviewWorld')
    scene.world.use_nodes = True
    scene.world.node_tree.nodes['Background'].inputs['Color'].default_value = (0.027, 0.04, 0.052, 1)
    scene.world.node_tree.nodes['Background'].inputs['Strength'].default_value = 0.25
    scene.render.engine = 'CYCLES'
    scene.cycles.device = 'CPU'
    scene.cycles.samples = 32
    scene.render.resolution_x = 1200
    scene.render.resolution_y = 900
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = 'PNG'


def main():
    args = arguments()
    generated = ['fading_bedside.blend', 'lamp_lod0.glb', 'chair_lod0.glb', 'cup_lod0.glb', 'bedside_lod0.glb', 'manifest.json']
    if args.render:
        generated.append('bedside_reference.png')
    existing = [name for name in generated if (args.output / name).exists()]
    if existing and not args.force:
        raise RuntimeError('Generated files already exist; choose a new output or pass --force: ' + ', '.join(existing))
    args.output.mkdir(parents=True, exist_ok=True)
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.context.scene.unit_settings.system = 'METRIC'
    bpy.context.scene.unit_settings.scale_length = 1.0
    m = {
        'brass': surface('Fading_SatinBrass', 'C99550', 0.48, 1),
        'linen': surface('Fading_IvoryLinen', 'ECE6CD', 0.83, emission=0.04),
        'filament': surface('Fading_WarmFilament', 'FFE4A0', 0.35, emission=1),
        'wood': surface('Fading_WornWood', '55463A', 0.76),
        'wood_wear': surface('Fading_WoodWear', '897359', 0.67),
        'glaze': surface('Fading_BlueGlaze', '719297', 0.30),
        'ceramic': surface('Fading_ExposedCeramic', 'CFD7CC', 0.68),
        'rail': surface('Fading_PaintedRail', 'CFD7CC', 0.57),
        'cloth': surface('Fading_MemoryCloth', 'DAD7C5', 0.90),
        'slate': surface('Fading_PreviewSlate', '303D40', 0.83),
    }
    roots = [build_lamp(m), build_chair(m), build_cup(m), build_bedside(m)]
    if not args.no_consolidate:
        consolidate(roots)
    manifest = {'generator': 'scripts/blender/build_bedside.py', 'blender': bpy.app.version_string,
                'generator_sha256': hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
                'units': 'meters', 'original_geometry': True, 'lods': [0],
                'consolidated_by_material_and_visibility_role': not args.no_consolidate,
                'status': 'generated study; requires art and browser review', 'assets': []}
    for root, filename in zip(roots, ['lamp_lod0.glb', 'chair_lod0.glb', 'cup_lod0.glb', 'bedside_lod0.glb']):
        manifest['assets'].append(export_asset(root, args.output / filename))
    manifest['combined_triangles'] = sum(a['evaluated_triangles'] for a in manifest['assets'])
    manifest['combined_glb_bytes'] = sum(a['bytes'] for a in manifest['assets'])
    manifest['combined_mesh_primitives'] = sum(a['mesh_primitives'] for a in manifest['assets'])
    preview_setup(roots, m)
    bpy.ops.wm.save_as_mainfile(filepath=str(args.output / 'fading_bedside.blend'))
    (args.output / 'manifest.json').write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf-8')
    if args.render:
        bpy.context.scene.render.filepath = str(args.output / 'bedside_reference.png')
        bpy.ops.render.render(write_still=True)
    print('Fading study generated for review: ' + str(args.output))


if __name__ == '__main__':
    main()
