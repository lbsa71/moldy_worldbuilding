import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

// These checks inspect the actual shipping binaries, independently of Blender's validation claims.
type Primitive = { mode?: number; indices?: number; attributes: Record<string, number>; material?: number };
type Gltf = {
  asset: { version: string };
  scene?: number;
  scenes: { nodes: number[] }[];
  nodes: { name?: string; mesh?: number; camera?: number; children?: number[]; translation?: number[]; rotation?: number[]; scale?: number[]; extras?: Record<string, unknown> }[];
  meshes: { name?: string; primitives: Primitive[] }[];
  accessors: { count: number; type: string; componentType: number; min?: number[]; max?: number[] }[];
  materials: { name?: string; extensions?: Record<string, unknown> }[];
  buffers?: { uri?: string; byteLength: number }[];
  images?: { uri?: string }[];
  cameras?: unknown[];
  animations?: unknown[];
  skins?: unknown[];
  extensionsUsed?: string[];
  extensionsRequired?: string[];
};
type AssetRecord = { file: string; bytes: number; sha256: string; evaluated_triangles: number; triangle_budget: number };
const manifest = JSON.parse(readFileSync(new URL('../../../art/blender/bedside-study-lod0/manifest.json', import.meta.url), 'utf8')) as {
  assets: AssetRecord[]; combined_triangles: number; combined_glb_bytes: number;
};
const expected = [
  { file: 'lamp_lod0.glb', root: 'Fading_Lamp', names: ['lampFilament', 'lampShade_LOD0', 'lampShadePivot', 'lampWarmthSocket'] },
  { file: 'chair_lod0.glb', root: 'Fading_Chair', names: ['chairSeatSocket', 'chairFacingSocket'] },
  { file: 'cup_lod0.glb', root: 'Fading_Cup', names: ['cupBody_LOD0', 'cupHandle', 'cupRimChip', 'cupRimSocket'] },
  { file: 'bedside_lod0.glb', root: 'Fading_Bedside', names: ['bedRail', 'curtainFrame', 'partialCurtain', 'railTapSocket'] },
];

function readGlb(file: string) {
  const bytes = readFileSync(new URL(`../../../public/models/fading/${file}`, import.meta.url));
  expect(bytes.readUInt32LE(0), `${file}: GLB magic`).toBe(0x46546c67);
  expect(bytes.readUInt32LE(4), `${file}: GLB version`).toBe(2);
  expect(bytes.readUInt32LE(8), `${file}: declared file length`).toBe(bytes.length);
  let offset = 12;
  const chunks: { type: number; data: Buffer }[] = [];
  while (offset < bytes.length) {
    const length = bytes.readUInt32LE(offset);
    expect(length % 4, `${file}: aligned chunk`).toBe(0);
    expect(offset + 8 + length, `${file}: bounded chunk`).toBeLessThanOrEqual(bytes.length);
    chunks.push({ type: bytes.readUInt32LE(offset + 4), data: bytes.subarray(offset + 8, offset + 8 + length) });
    offset += 8 + length;
  }
  expect(offset).toBe(bytes.length);
  expect(chunks.map(chunk => chunk.type), `${file}: JSON then embedded binary`).toEqual([0x4e4f534a, 0x004e4942]);
  const json = JSON.parse(chunks[0].data.toString('utf8')) as Gltf;
  expect(json.asset.version).toBe('2.0');
  return { bytes, json };
}

function triangleCount(gltf: Gltf): number {
  return gltf.nodes.reduce((total, node) => {
    if (node.mesh === undefined) return total;
    return total + gltf.meshes[node.mesh].primitives.reduce((count, primitive) => {
      expect(primitive.mode ?? 4).toBe(4);
      const accessor = gltf.accessors[primitive.indices ?? primitive.attributes.POSITION];
      expect(accessor.count % 3).toBe(0);
      return count + accessor.count / 3;
    }, 0);
  }, 0);
}

function requiredNode(gltf: Gltf, name: string) {
  const matches = gltf.nodes.filter(node => node.name === name);
  expect(matches, `unique semantic node: ${name}`).toHaveLength(1);
  return matches[0];
}

function requiredMeshNode(gltf: Gltf, name: string) {
  const node = requiredNode(gltf, name);
  expect(node.mesh, `${name} must own independently controllable geometry`).toBeTypeOf('number');
  expect(gltf.meshes[node.mesh!].primitives.length).toBeGreaterThan(0);
  return node;
}

describe.each(expected)('shipping hero asset $file', asset => {
  it('is a valid self-contained GLB2 whose bytes and digest match the manifest', () => {
    const { bytes, json } = readGlb(asset.file);
    const records = manifest.assets.filter(record => record.file === asset.file);
    expect(records).toHaveLength(1);
    expect(bytes.length).toBe(records[0].bytes);
    expect(createHash('sha256').update(bytes).digest('hex')).toBe(records[0].sha256);
    expect((json.buffers ?? []).every(buffer => buffer.uri === undefined)).toBe(true);
    expect((json.images ?? []).every(image => image.uri === undefined)).toBe(true);
  });

  it('preserves the named identity root and required semantic nodes', () => {
    const { json } = readGlb(asset.file);
    const root = requiredNode(json, asset.root);
    const rootIndex = json.nodes.indexOf(root);
    expect(json.scenes[json.scene ?? 0].nodes).toEqual([rootIndex]);
    expect(root.translation ?? [0, 0, 0]).toEqual([0, 0, 0]);
    expect(root.rotation ?? [0, 0, 0, 1]).toEqual([0, 0, 0, 1]);
    expect(root.scale ?? [1, 1, 1]).toEqual([1, 1, 1]);
    for (const name of asset.names) requiredNode(json, name);
    for (const node of json.nodes) {
      expect((node.scale ?? [1, 1, 1]).every(value => Number.isFinite(value) && value > 0)).toBe(true);
    }
  });

  it('needs no unsupported extension, camera, exported light, skin, or animation', () => {
    const { json } = readGlb(asset.file);
    expect(json.extensionsRequired ?? []).toEqual([]);
    expect(json.extensionsUsed ?? []).toEqual([]);
    expect(json.cameras ?? []).toEqual([]);
    expect(json.animations ?? []).toEqual([]);
    expect(json.skins ?? []).toEqual([]);
    expect(json.nodes.every(node => node.camera === undefined)).toBe(true);
    expect(JSON.stringify(json)).not.toContain('KHR_lights_punctual');
    expect(json.materials.every(material => !material.extensions || Object.keys(material.extensions).length === 0)).toBe(true);
  });

  it('matches actual triangle counts and stays within its individual budget', () => {
    const { json } = readGlb(asset.file);
    const triangles = triangleCount(json);
    const record = manifest.assets.find(record => record.file === asset.file)!;
    expect(triangles).toBe(record.evaluated_triangles);
    expect(triangles).toBeLessThanOrEqual(record.triangle_budget);
    for (const accessor of json.accessors) {
      expect([...(accessor.min ?? []), ...(accessor.max ?? [])].every(Number.isFinite)).toBe(true);
    }
  });
});

describe('hero set integration and draw budget', () => {
  it('keeps the lamp filament and shade as separately controlled emissive surfaces', () => {
    const { json } = readGlb('lamp_lod0.glb');
    const filament = requiredMeshNode(json, 'lampFilament');
    const shade = requiredMeshNode(json, 'lampShade_LOD0');
    expect(filament.mesh).not.toBe(shade.mesh);
    expect(json.nodes[json.nodes.indexOf(requiredNode(json, 'lampShadePivot'))].children).toContain(json.nodes.indexOf(shade));
    const materialNames = (node: typeof shade) => json.meshes[node.mesh!].primitives.map(primitive => json.materials[primitive.material!].name);
    expect(materialNames(filament)).toContain('Fading_WarmFilament');
    expect(materialNames(shade)).toContain('Fading_IvoryLinen');
  });

  it('keeps rail, curtain frame, and cloth independently selectable', () => {
    const { json } = readGlb('bedside_lod0.glb');
    const nodes = ['bedRail', 'curtainFrame', 'partialCurtain'].map(name => requiredMeshNode(json, name));
    expect(new Set(nodes.map(node => node.mesh)).size).toBe(3);
  });

  it('preserves cup handle and chip semantics even when the handle geometry is consolidated', () => {
    const { json } = readGlb('cup_lod0.glb');
    requiredMeshNode(json, 'cupBody_LOD0');
    requiredNode(json, 'cupHandle'); // A semantic empty marker is valid after material-based consolidation.
    requiredNode(json, 'cupRimChip');
    const names = json.materials.map(material => material.name);
    expect(names).toContain('Fading_BlueGlaze');
    expect(names).toContain('Fading_ExposedCeramic');
  });

  it('stays under ten actual mesh primitives and matches combined manifest totals', () => {
    let bytes = 0, triangles = 0, drawPrimitives = 0;
    expect(manifest.assets.map(asset => asset.file).sort()).toEqual(expected.map(asset => asset.file).sort());
    for (const asset of expected) {
      const loaded = readGlb(asset.file);
      bytes += loaded.bytes.length;
      triangles += triangleCount(loaded.json);
      // Count per mesh-bearing node: sharing a mesh does not eliminate a second scene draw.
      drawPrimitives += loaded.json.nodes.reduce((count, node) => count + (node.mesh === undefined ? 0 : loaded.json.meshes[node.mesh].primitives.length), 0);
    }
    expect(bytes).toBe(manifest.combined_glb_bytes);
    expect(triangles).toBe(manifest.combined_triangles);
    expect(bytes).toBeLessThanOrEqual(4 * 1024 * 1024);
    expect(triangles).toBeLessThanOrEqual(25_000);
    expect(drawPrimitives).toBeLessThanOrEqual(10);
  });
});
