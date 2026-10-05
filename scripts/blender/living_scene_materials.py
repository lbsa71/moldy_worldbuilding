"""Portable material maps for the living bedside production study.

Run inside Blender: create_materials(Path('.../textures')). UV coordinates are
untransformed, and all maps tile in both axes. Geometry supplies larger folds,
chips and silhouette wear; these maps supply restrained surface detail. They are
analytically authored materials, except sand/wet_sand and the shore rock family
sourced from documented CC0 Poly Haven scans. No source scan is claimed as
project-authored. Large rock fractures are geometry, not painted lighting.
"""
from pathlib import Path
import json
import hashlib
import shutil
import struct
import zlib

import bpy
import numpy as np


SIZE = 1024
TEXTURE_PROVENANCE = {
    "creator": "Fading project analytical materials; Sand 03 by Charlotte Baglioni and Seaside Rock by Dimitrios Savva / Poly Haven",
    "source": "Original periodic fields, weave and grain; sand and shore rock families use documented acquired CC0 scans",
    "method": "Original detail baked to portable PNG maps; acquired scans retain grain with documented charcoal and wet adaptations",
    "resolution": [SIZE, SIZE],
    "license": "Original assets are project-authored; acquired sand/rock sources and derivative maps are CC0 1.0",
    "color_spaces": {"basecolor": "sRGB", "emission": "sRGB", "normal": "linear/non-color", "orm": "linear/non-color"},
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

    def bake(name, color, height, rough, metal=0, ao=None, normal_strength=5, description='', emission=None):
        normal = _normal(height, normal_strength)
        if ao is None:
            ao = np.ones((SIZE, SIZE), dtype=np.float32)
        orm = np.stack((ao, np.broadcast_to(rough, (SIZE, SIZE)), np.broadcast_to(metal, (SIZE, SIZE))), axis=-1)
        paths = {}
        images = [('basecolor', color), ('normal', normal), ('orm', orm)]
        if emission is not None:
            images.append(('emission', emission))
        for suffix, data in images:
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
    wood_color = _rgb((.175, .108, .062), 1 + .07 * broad + .014 * grain - .022 * latewood + .028 * wear)
    bake('wood', wood_color, .009 * grain - .012 * pores + .015 * medium, .62 + .04 * medium - .022 * wear,
         ao=1 - .025 * pores, normal_strength=3.5,
         description='Worn dark walnut family: subdued directional grain along V, broad satin variation and shallow pores; edge wear is localized geometry')

    # Each weave has a restrained crossing highlight and relief, with alternating over/under threads.
    for name, density, tint in (('linen', 126, (.85, .78, .65)), ('cloth', 92, (.70, .715, .70))):
        sx = np.cos(2 * np.pi * u * density)
        sy = np.cos(2 * np.pi * v * density)
        weave = .35 * (sx + sy) + .16 * sx * sy
        relief = .055 * weave + .045 * medium + .012 * fine
        color = _rgb(tint, 1 + .045 * broad + .022 * medium + .018 * weave)
        emission = None
        if name == 'linen':
            # Thin warm fabric retains yarn/slub variation in its emitted light.
            # A grayscale sRGB image multiplies the core glTF emissive factor.
            glow = np.clip(.94 + .043 * broad + .027 * medium + .026 * weave, .82, .995)
            emission = np.repeat(glow[:, :, None], 3, axis=-1)
        bake(name, color, relief, .82 + .035 * medium, ao=1 - .035 * np.maximum(-weave, 0), normal_strength=3.5,
             description=('Thin illuminated warm flax with soft yarn/slub variation baked into emissive texture' if name == 'linen' else
                          'Neutral cool-grey woven flax with soft yarn crossings; broad physical folds supplied by mesh'), emission=emission)

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
    stone_height = .10 * broad + .045 * medium + .013 * fine + .010 * layers - .038 * cracks
    for name, tint, wet in (('rock', (.064, .071, .077), True), ('cliff', (.12, .13, .14), False)):
        color = _rgb(tint, 1 + .09 * broad + .04 * medium + .012 * layers - .10 * cracks)
        rough = (.52 if wet else .74) + .035 * medium + .018 * fine + .025 * cracks
        bake(name, color, stone_height, rough, ao=1 - .07 * cracks, normal_strength=3 if wet else 4,
             description=('Dark desaturated wet slate with shallow fissures and restrained rough specular variation' if wet else
                          'Cool stratified distant stone, matte mineral layers and subtle cellular fissures'))

    (texture_dir / 'material-provenance.json').write_text(json.dumps(TEXTURE_PROVENANCE, indent=2), encoding='utf-8')
    return maps


def _read_map_rgb(path):
    """Read image bytes without colour conversion, in PNG top-row-first order."""
    image = bpy.data.images.load(str(path), check_existing=False)
    try:
        image.colorspace_settings.name = 'Non-Color'
        width, height = image.size[:]
        if (width, height) != (SIZE, SIZE):
            raise ValueError(f'Source resolution differs from 1024px: {path}')
        pixels = np.empty(width * height * 4, dtype=np.float32)
        image.pixels.foreach_get(pixels)
        return pixels.reshape(height, width, 4)[::-1, :, :3].copy()
    finally:
        bpy.data.images.remove(image)


def _scanned_sand_maps(texture_dir):
    """Copy checked source scan, bake the wet variant, and retain attribution."""
    source_dir = Path(__file__).resolve().parents[2] / 'art/blender/living-scene-proof/source-assets/sand03'
    provenance = json.loads((source_dir / 'provenance.json').read_text(encoding='utf-8-sig'))
    source_maps = {}
    for entry in provenance['files']:
        source = source_dir / entry['name']
        data = source.read_bytes()
        if hashlib.sha256(data).hexdigest() != entry['sha256'] or hashlib.md5(data).hexdigest() != entry['md5']:
            raise ValueError(f'Sand 03 source checksum mismatch: {source}')
        source_maps[entry['role']] = source
    dry = {}
    for role, source in source_maps.items():
        destination = texture_dir / f'sand_{role}{source.suffix}'
        if source != destination:
            shutil.copy2(source, destination)
        dry[role] = destination

    # Wet grains darken in linear light; preserve the captured color detail.
    # Explicit sRGB conversion avoids baking a display-space multiplier.
    encoded = _read_map_rgb(source_maps['basecolor'])
    linear = np.where(encoded <= .04045, encoded / 12.92, ((encoded + .055) / 1.055) ** 2.4)
    linear *= .55
    wet_color = np.where(linear <= .0031308, linear * 12.92, 1.055 * linear ** (1 / 2.4) - .055)
    wet_orm = _read_map_rgb(source_maps['orm'])
    wet_orm[:, :, 1] = np.clip(wet_orm[:, :, 1] * .60, .22, .55)
    wet = {'basecolor': texture_dir / 'wet_sand_basecolor.png', 'normal': dry['normal'], 'orm': texture_dir / 'wet_sand_orm.png'}
    _png(wet['basecolor'], wet_color)
    _png(wet['orm'], wet_orm)
    for name, paths in (('sand', dry), ('wet_sand', wet)):
        TEXTURE_PROVENANCE['materials'][name] = {
            'description': ('Dry scanned granular shore sand' if name == 'sand' else 'Darkened wet shore sand with reduced roughness'),
            'maps': {kind: path.name for kind, path in paths.items()},
            'method': ('Unmodified acquired scanned PBR maps' if name == 'sand' else 'Scanned PBR source with authored wet diffuse/roughness adaptation'),
            'source_asset': provenance,
            'tile_width_m': 2,
            'normal_strength': 1.0,
            'adaptation': (None if name == 'sand' else {'diffuse_linear_multiplier': .55, 'roughness_multiplier': .60, 'roughness_clamp': [.22, .55], 'normal_and_ao': 'Unchanged source detail'}),
        }
    return {'sand': dry, 'wet_sand': wet}


def _scanned_shore_rock_maps(texture_dir):
    """CC0 coastal scan adapted to rough charcoal flats and selected wet edges.

    The captured normal and occlusion remain source detail; fracture silhouettes
    and sparse grit placement belong to geometry. Assign wet material only to
    selected edge faces. Dry rock remains the dominant surface.
    """
    source_dir = Path(__file__).resolve().parents[2] / 'art/blender/living-scene-proof/source-assets/rock04'
    provenance = json.loads((source_dir / 'provenance.json').read_text(encoding='utf-8-sig'))
    source_maps = {}
    for entry in provenance['files']:
        source = source_dir / entry['name']
        data = source.read_bytes()
        if hashlib.sha256(data).hexdigest() != entry['sha256'] or hashlib.md5(data).hexdigest() != entry['md5']:
            raise ValueError(f'Seaside Rock source checksum mismatch: {source}')
        source_maps[entry['role']] = source
    normal_path = texture_dir / 'shore_rock_normal.png'
    shutil.copy2(source_maps['normal'], normal_path)
    encoded = _read_map_rgb(source_maps['basecolor'])
    linear = np.where(encoded <= .04045, encoded / 12.92, ((encoded + .055) / 1.055) ** 2.4)
    luminance = np.sum(linear * np.asarray((.2126, .7152, .0722), dtype=np.float32), axis=-1, keepdims=True)
    # Normalize captured mineral grain to a measured charcoal albedo. The scan's
    # warm chroma is removed; its detailed value structure remains, with bounded
    # contrast so pale mineral flecks cannot turn the whole shore beige.
    grain = luminance / max(float(luminance.mean()), 1e-6)
    grain = np.clip(1 + .72 * (grain - 1), .45, 1.9)
    grain /= float(grain.mean())
    charcoal = grain * np.asarray((.009, .011, .014), dtype=np.float32)
    source_orm = _read_map_rgb(source_maps['orm'])
    result = {}
    for name, darkening, low, high in (('shore_rock', 1.0, .78, .96), ('shore_wet_rock', .83, .48, .72)):
        diffuse = charcoal * darkening
        diffuse = np.where(diffuse <= .0031308, diffuse * 12.92, 1.055 * diffuse ** (1 / 2.4) - .055)
        orm = source_orm.copy()
        orm[:, :, 1] = low + (high - low) * np.clip(source_orm[:, :, 1], 0, 1)
        orm[:, :, 2] = 0.0
        paths = {'basecolor': texture_dir / f'{name}_basecolor.png', 'normal': normal_path, 'orm': texture_dir / f'{name}_orm.png'}
        _png(paths['basecolor'], diffuse)
        _png(paths['orm'], orm)
        result[name] = paths
        TEXTURE_PROVENANCE['materials'][name] = {
            'description': ('Rough charcoal coastal rock flats with captured pitted mineral grain' if name == 'shore_rock' else
                            'Restrained wet charcoal coastal rock for selected shoreline edges'),
            'maps': {kind: path.name for kind, path in paths.items()},
            'method': 'Acquired Seaside Rock scan with documented linear charcoal color and roughness adaptation',
            'source_asset': provenance,
            'tile_width_m': 2,
            'tile_height_m': 2,
            'normal_strength': .72,
            'adaptation': {'diffuse_linear_mean_target': [.009 * darkening, .011 * darkening, .014 * darkening],
                           'source_luminance_normalization': 'Normalized mean captured luminance; retained scan grain',
                           'grain_contrast': .72, 'grain_relative_clip': [.45, 1.9],
                           'wet_linear_multiplier': darkening, 'color_saturation': 0,
                           'roughness_remap_range': [low, high],
                           'metalness': 0, 'normal_and_ao': 'Preserved source scan detail',
                           'placement': 'Dominant rough flats' if name == 'shore_rock' else 'Selected wet edge faces only'},
        }
    # Existing scattered-rock callers now receive the same dry charcoal scan.
    # Reuse the identical maps rather than embedding an extra texture family.
    result['rock'] = result['shore_rock']
    TEXTURE_PROVENANCE['materials']['rock'] = dict(TEXTURE_PROVENANCE['materials']['shore_rock'])
    TEXTURE_PROVENANCE['materials']['rock']['description'] = 'Scattered rough charcoal rocks sharing the acquired shoreline scan family'
    return result


def _occlusion_group():
    # This exact group/input convention is recognized by Blender's core glTF exporter.
    group = bpy.data.node_groups.get('glTF Material Output')
    if group is None:
        group = bpy.data.node_groups.new('glTF Material Output', 'ShaderNodeTree')
        group.interface.new_socket(name='Occlusion', in_out='INPUT', socket_type='NodeSocketFloat')
        group.nodes.new('NodeGroupInput')
    return group


def create_materials(texture_dir: Path) -> dict:
    """Return existing keys plus shore_rock and shore_wet_rock scanned materials.

    Fully supported core glTF metal-rough workflow. Every node graph uses just
    UV images, normal mapping and channel splitting. PNGs remain external
    portable assets; a GLB exporter can embed them. The caller owns UV density.
    """
    texture_dir = Path(texture_dir).resolve()
    maps = _bake_maps(texture_dir)
    maps.update(_scanned_sand_maps(texture_dir))
    maps.update(_scanned_shore_rock_maps(texture_dir))
    (texture_dir / 'material-provenance.json').write_text(json.dumps(TEXTURE_PROVENANCE, indent=2), encoding='utf-8')
    result = {}
    hook = _occlusion_group()
    for key, paths in maps.items():
        material = bpy.data.materials.new({'sand': 'Sand', 'wet_sand': 'WetSand', 'shore_rock': 'ShoreRock', 'shore_wet_rock': 'ShoreWetRock'}.get(key, key))
        material.use_nodes = True
        material['authored_source'] = TEXTURE_PROVENANCE['materials'][key].get('method', 'Original analytical detail baked to maps; not a scanned surface')
        material['surface_description'] = TEXTURE_PROVENANCE['materials'][key]['description']
        nodes, links = material.node_tree.nodes, material.node_tree.links
        nodes.clear()
        output = nodes.new('ShaderNodeOutputMaterial')
        output.location = (620, 80)
        shader = nodes.new('ShaderNodeBsdfPrincipled')
        shader.location = (330, 80)
        if key == 'linen':
            shader.inputs['Emission Color'].default_value = (.85, .40, .10, 1.0)
            shader.inputs['Emission Strength'].default_value = 1.0
            material['emission_note'] = 'Core glTF emissiveFactor [.85,.40,.10] times baked yarn/slub emission texture; runtime may modulate'
        links.new(shader.outputs['BSDF'], output.inputs['Surface'])
        textures = {}
        for i, (kind, path) in enumerate(paths.items()):
            image = bpy.data.images.load(str(path), check_existing=True)
            image.colorspace_settings.name = 'sRGB' if kind in ('basecolor', 'emission') else 'Non-Color'
            node = nodes.new('ShaderNodeTexImage')
            node.name = f'{key}_{kind}'
            node.label = kind.upper()
            node.image = image
            node.extension = 'REPEAT'
            node.interpolation = 'Linear'
            node.location = (-500, 260 - i * 270)
            textures[kind] = node
        links.new(textures['basecolor'].outputs['Color'], shader.inputs['Base Color'])
        if 'emission' in textures:
            # Recognized by Blender's exporter as texture * constant factor;
            # it becomes standard emissiveTexture + emissiveFactor in glTF.
            emission_tint = nodes.new('ShaderNodeMix')
            emission_tint.data_type = 'RGBA'
            emission_tint.blend_type = 'MULTIPLY'
            emission_tint.inputs[0].default_value = 1.0
            emission_tint.inputs[7].default_value = (.85, .40, .10, 1.0)
            emission_tint.location = (0, 330)
            links.new(textures['emission'].outputs['Color'], emission_tint.inputs[6])
            links.new(emission_tint.outputs[2], shader.inputs['Emission Color'])
        normal = nodes.new('ShaderNodeNormalMap')
        normal.location = (-40, -80)
        normal.inputs['Strength'].default_value = TEXTURE_PROVENANCE['materials'][key].get('normal_strength', 1.0)
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
