"""Portable, original material maps for the living bedside production study.

Run inside Blender: create_materials(Path('.../textures')). UV coordinates are
untransformed, and all maps tile in both axes. Geometry supplies larger folds,
chips and silhouette wear; these maps supply restrained surface detail. They are
analytically authored materials, not photographs or scans of physical surfaces.
"""
from pathlib import Path
import json
import struct
import zlib

import bpy
import numpy as np


SIZE = 1024
TEXTURE_PROVENANCE = {
    "creator": "Original analytical material authoring for Fading living scene",
    "source": "Seeded periodic fields, woven height profiles, directional grain and cellular fissures; no acquired imagery",
    "method": "Procedural detail baked to portable PNG maps; not scanned materials",
    "resolution": [SIZE, SIZE],
    "license": "Project-authored original assets; no third-party asset license requirements",
    "color_spaces": {"basecolor": "sRGB", "normal": "linear/non-color", "orm": "linear/non-color"},
    "orm_channels": {"R": "occlusion", "G": "roughness", "B": "metalness"},
    "normal_convention": "Tangent-space OpenGL/glTF +Y; RGB encodes signed XYZ in [0,1]",
    "uv": "Tileable [0,1] UV; no Blender-only texture transforms",
    "materials": {},
}


def _png(path, pixels):
    """Write RGB PNG without Pillow or a separate image dependency."""
    pixels = np.ascontiguousarray(np.clip(pixels * 255.0 + 0.5, 0, 255), dtype=np.uint8)
    height, width, channels = pixels.shape
    if channels != 3:
        raise ValueError('Expected three-channel RGB image')
    raw = np.zeros((height, 1 + width * 3), dtype=np.uint8)
    raw[:, 1:] = pixels.reshape(height, width * 3)
    def chunk(tag, payload):
        return struct.pack('!I', len(payload)) + tag + payload + struct.pack('!I', zlib.crc32(tag + payload) & 0xffffffff)
    header = struct.pack('!2I5B', width, height, 8, 2, 0, 0, 0)
    path.write_bytes(b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', header) + chunk(b'IDAT', zlib.compress(raw.tobytes(), 3)) + chunk(b'IEND', b''))


def _field(rng, grid):
    """Cubic-interpolated periodic lattice; no pixel-scale white noise."""
    lattice = rng.random((grid, grid), dtype=np.float32) * 2 - 1
    p = np.arange(SIZE, dtype=np.float32) * (grid / SIZE)
    idx = p.astype(np.int32)
    blend = p - idx
    blend = blend * blend * (3 - 2 * blend)
    horizontal = lattice[:, idx] * (1 - blend) + lattice[:, (idx + 1) % grid] * blend
    return horizontal[idx, :] * (1 - blend[:, None]) + horizontal[(idx + 1) % grid, :] * blend[:, None]


def _normal(height, strength):
    # PNG rows increase down the image, while Blender UV +V points upward.
    # Thus +dy in the green channel gives the OpenGL/glTF +Y convention.
    dx = (np.roll(height, -1, axis=1) - np.roll(height, 1, axis=1)) * strength
    dy = (np.roll(height, -1, axis=0) - np.roll(height, 1, axis=0)) * strength
    inv = 1 / np.sqrt(1 + dx * dx + dy * dy)
    return np.stack((-dx * inv * .5 + .5, dy * inv * .5 + .5, inv * .5 + .5), axis=-1)


def _rgb(color, variation):
    return np.clip(np.asarray(color, dtype=np.float32)[None, None, :] * variation[:, :, None], .005, .98)


def _fissures(rng, cells=6):
    """Jittered periodic cellular boundaries with soft, localized fissures."""
    jitter = rng.random((cells, cells, 2), dtype=np.float32) * .72 + .14
    pos = np.arange(SIZE, dtype=np.float32) * (cells / SIZE)
    u, v = np.meshgrid(pos, pos)
    ix, iy = u.astype(np.int32), v.astype(np.int32)
    first = np.full((SIZE, SIZE), 100, dtype=np.float32)
    second = first.copy()
    for oy in (-1, 0, 1):
        for ox in (-1, 0, 1):
            offset = jitter[(iy + oy) % cells, (ix + ox) % cells]
            d = (ix + ox + offset[:, :, 0] - u) ** 2 + (iy + oy + offset[:, :, 1] - v) ** 2
            second = np.minimum(second, np.maximum(first, d))
            first = np.minimum(first, d)
    edge = np.sqrt(second) - np.sqrt(first)
    return np.exp(-((edge / .020) ** 2)).astype(np.float32)


def _bake_maps(texture_dir):
    texture_dir.mkdir(parents=True, exist_ok=True)
    rng = np.random.default_rng(41052026)
    broad = _field(rng, 5)
    medium = _field(rng, 19)
    fine = _field(rng, 97)
    u, v = np.meshgrid(np.arange(SIZE, dtype=np.float32) / SIZE, np.arange(SIZE, dtype=np.float32) / SIZE)
    maps = {}

    def bake(name, color, height, rough, metal=0, ao=None, normal_strength=5, description=''):
        normal = _normal(height, normal_strength)
        if ao is None:
            ao = np.ones((SIZE, SIZE), dtype=np.float32)
        orm = np.stack((ao, np.broadcast_to(rough, (SIZE, SIZE)), np.broadcast_to(metal, (SIZE, SIZE))), axis=-1)
        paths = {}
        for suffix, data in (('basecolor', color), ('normal', normal), ('orm', orm)):
            path = texture_dir / f'{name}_{suffix}.png'
            _png(path, data)
            paths[suffix] = path
        maps[name] = paths
        TEXTURE_PROVENANCE['materials'][name] = {'description': description, 'maps': {k: p.name for k, p in paths.items()}}

    patina = np.clip((broad + .19 * medium - .20) * 1.8, 0, .65)
    brass_color = _rgb((.59, .43, .22), 1 + .08 * broad + .025 * medium)
    brass_color = brass_color * (1 - patina[:, :, None]) + np.array([.18, .24, .19], dtype=np.float32) * patina[:, :, None]
    brushing = np.sin(2 * np.pi * (u * 150 + .035 * medium))
    bake('brass', brass_color, .025 * fine + .009 * brushing, np.clip(.32 + .12 * patina + .025 * medium, .24, .49),
         .94 - .58 * patina, normal_strength=4,
         description='Weathered satin brass: subdued green-brown oxidation islands and fine directional brushing')

    warp = .032 * broad + .010 * medium
    grain = np.sin(2 * np.pi * (u * 34 + warp * 13))
    latewood = np.power(.5 + .5 * grain, 10)
    pores = np.power(.5 + .5 * np.sin(2 * np.pi * (u * 165 + warp * 28)), 16)
    wear = np.clip(medium + .20, 0, .75)
    wood_color = _rgb((.205, .125, .070), 1 + .14 * broad + .12 * grain - .17 * latewood + .09 * wear)
    bake('wood', wood_color, .07 * grain - .05 * pores + .035 * medium, .48 + .09 * medium - .045 * wear,
         ao=1 - .05 * pores, normal_strength=7,
         description='Worn dark walnut family: directional grain along V, soft satin wear and recessed pores')

    # Each weave has a restrained crossing highlight and relief, with alternating over/under threads.
    for name, density, tint in (('linen', 126, (.82, .79, .70)), ('cloth', 92, (.70, .715, .70))):
        sx = np.cos(2 * np.pi * u * density)
        sy = np.cos(2 * np.pi * v * density)
        weave = .35 * (sx + sy) + .16 * sx * sy
        relief = .055 * weave + .045 * medium + .012 * fine
        color = _rgb(tint, 1 + .028 * broad + .017 * medium + .018 * weave)
        bake(name, color, relief, .82 + .035 * medium, ao=1 - .035 * np.maximum(-weave, 0), normal_strength=3.5,
             description='Woven ivory flax with soft yarn crossings; broad physical folds supplied by mesh')

    glaze = _rgb((.90, .91, .89), 1 + .007 * broad + .003 * medium)
    # Sparse hand-authored underglaze flower sprigs. Toroidal distances keep
    # every map seamless, while each blossom remains a legible small motif.
    ornament = np.zeros((SIZE, SIZE), dtype=np.float32)
    for cx, cy, angle in ((.24, .48, .2), (.72, .64, -.4), (.62, .25, .6)):
        for petal in range(5):
            theta = angle + petal * 2 * np.pi / 5
            px, py = cx + .023 * np.cos(theta), cy + .023 * np.sin(theta)
            dx, dy = (u - px + .5) % 1 - .5, (v - py + .5) % 1 - .5
            ornament = np.maximum(ornament, np.exp(-((dx / .010) ** 2 + (dy / .014) ** 2) * 2))
        dx, dy = (u - cx + .5) % 1 - .5, (v - cy + .5) % 1 - .5
        ornament = np.maximum(ornament, .8 * np.exp(-((dx / .006) ** 2 + (dy / .006) ** 2)))
        stem = np.exp(-((dx - .010 * np.sin(dy * 40)) / .0016) ** 2)
        stem *= ((dy < -.012) & (dy > -.09)).astype(np.float32)
        ornament = np.maximum(ornament, stem * .5)
    ornament *= .84 + .10 * medium
    glaze = glaze * (1 - ornament[:, :, None]) + np.asarray((.035, .13, .28), dtype=np.float32) * ornament[:, :, None]
    bake('porcelain', glaze, .006 * medium + .002 * fine, .145 + .015 * medium, normal_strength=2,
         description='Warm white glossy porcelain with sparse original cobalt floral sprigs and a separate blue material for rim decoration')
    blue_color = _rgb((.035, .115, .25), 1 + .035 * broad)
    bake('blue', blue_color, .005 * medium, .19 + .012 * medium, normal_strength=2,
         description='Muted cobalt underglaze blue for porcelain decoration')

    cracks = _fissures(rng)
    layers = np.sin(2 * np.pi * (v * 10 + .20 * broad + .035 * medium))
    stone_height = .35 * broad + .16 * medium + .042 * fine + .035 * layers - .25 * cracks
    for name, tint, wet in (('rock', (.115, .140, .160), True), ('cliff', (.185, .205, .220), False)):
        color = _rgb(tint, 1 + .17 * broad + .08 * medium + .022 * layers - .22 * cracks)
        rough = (.30 if wet else .64) + .085 * medium + .055 * cracks
        bake(name, color, stone_height, rough, ao=1 - .15 * cracks, normal_strength=8 if wet else 10,
             description=('Wet dark slate with soft mineral layers, fissures and varied water-polished roughness' if wet else
                          'Cool stratified distant stone, matte mineral layers and subtle cellular fissures'))

    (texture_dir / 'material-provenance.json').write_text(json.dumps(TEXTURE_PROVENANCE, indent=2), encoding='utf-8')
    return maps


def _occlusion_group():
    # This exact group/input convention is recognized by Blender's core glTF exporter.
    group = bpy.data.node_groups.get('glTF Material Output')
    if group is None:
        group = bpy.data.node_groups.new('glTF Material Output', 'ShaderNodeTree')
        group.interface.new_socket(name='Occlusion', in_out='INPUT', socket_type='NodeSocketFloat')
        group.nodes.new('NodeGroupInput')
    return group


def create_materials(texture_dir: Path) -> dict:
    """Bake maps and return brass/linen/wood/cloth/porcelain/blue/rock/cliff.

    Fully supported core glTF metal-rough workflow. Every node graph uses just
    UV images, normal mapping and channel splitting. PNGs remain external
    portable assets; a GLB exporter can embed them. The caller owns UV density.
    """
    texture_dir = Path(texture_dir).resolve()
    maps = _bake_maps(texture_dir)
    result = {}
    hook = _occlusion_group()
    for key, paths in maps.items():
        material = bpy.data.materials.new(key)
        material.use_nodes = True
        material['authored_source'] = TEXTURE_PROVENANCE['method']
        material['surface_description'] = TEXTURE_PROVENANCE['materials'][key]['description']
        nodes, links = material.node_tree.nodes, material.node_tree.links
        nodes.clear()
        output = nodes.new('ShaderNodeOutputMaterial')
        output.location = (620, 80)
        shader = nodes.new('ShaderNodeBsdfPrincipled')
        shader.location = (330, 80)
        if key == 'linen':
            shader.inputs['Emission Color'].default_value = (1.0, .50, .15, 1.0)
            shader.inputs['Emission Strength'].default_value = .30
            material['emission_note'] = 'Warm core glTF emissive factor for illuminated shade; runtime may modulate'
        links.new(shader.outputs['BSDF'], output.inputs['Surface'])
        textures = {}
        for i, (kind, path) in enumerate(paths.items()):
            image = bpy.data.images.load(str(path), check_existing=True)
            image.colorspace_settings.name = 'sRGB' if kind == 'basecolor' else 'Non-Color'
            node = nodes.new('ShaderNodeTexImage')
            node.name = f'{key}_{kind}'
            node.label = kind.upper()
            node.image = image
            node.extension = 'REPEAT'
            node.interpolation = 'Linear'
            node.location = (-500, 260 - i * 270)
            textures[kind] = node
        links.new(textures['basecolor'].outputs['Color'], shader.inputs['Base Color'])
        normal = nodes.new('ShaderNodeNormalMap')
        normal.location = (-40, -80)
        normal.inputs['Strength'].default_value = 1.0
        links.new(textures['normal'].outputs['Color'], normal.inputs['Color'])
        links.new(normal.outputs['Normal'], shader.inputs['Normal'])
        separate = nodes.new('ShaderNodeSeparateColor')
        separate.mode = 'RGB'
        separate.location = (-180, -320)
        links.new(textures['orm'].outputs['Color'], separate.inputs['Color'])
        links.new(separate.outputs['Green'], shader.inputs['Roughness'])
        links.new(separate.outputs['Blue'], shader.inputs['Metallic'])
        occlusion = nodes.new('ShaderNodeGroup')
        occlusion.node_tree = hook
        occlusion.location = (90, -390)
        links.new(separate.outputs['Red'], occlusion.inputs['Occlusion'])
        result[key] = material
    return result
