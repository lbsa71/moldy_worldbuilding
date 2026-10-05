#!/usr/bin/env node
// Inspect delivered bytes and semantic structure; this is not visual acceptance.
import { readFileSync, statSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const productionGLB = fileURLToPath(new URL('../public/scene-study/living-scene.glb', import.meta.url));
const file = resolve(process.argv[2] ?? productionGLB);
const issues = [];
const requireCondition = (condition, message) => { if (!condition) issues.push(message); };
const integer = value => Number.isInteger(value) && value >= 0;
const report = { file, status: 'inspected', issues };
function resource(uri) {
  if (uri.startsWith('data:')) {
    const comma = uri.indexOf(',');
    if (comma < 0) throw new Error('Invalid data URI');
    const content = uri.slice(comma + 1);
    const bytes = uri.slice(0, comma).endsWith(';base64')
      ? Buffer.from(content, 'base64') : Buffer.from(decodeURIComponent(content));
    return { kind: 'data-uri', url: `${uri.slice(0, comma)},[embedded]`, bytes: bytes.length };
  }
  if (/^[a-z][a-z\d+.-]*:/i.test(uri) || uri.startsWith('//')) {
    return { kind: 'external-url', url: uri, bytes: null, note: 'Not downloaded; byte length unverified.' };
  }
  const path = uri.startsWith('/')
    ? resolve(dirname(productionGLB), '..', `.${decodeURIComponent(uri)}`)
    : resolve(dirname(file), decodeURIComponent(uri));
  try { return { kind: 'external-file', url: uri, path, bytes: statSync(path).size }; }
  catch { issues.push(`Missing external resource: ${uri}`); return { kind: 'external-file', url: uri, path, bytes: null }; }
}
const identity = () => [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
function multiply(a, b) {
  return Array.from({ length: 16 }, (_, i) => {
    const row = i % 4, column = Math.floor(i / 4);
    return [0, 1, 2, 3].reduce((sum, k) => sum + a[k * 4 + row] * b[column * 4 + k], 0);
  });
}
function localMatrix(node) {
  if (node.matrix) return node.matrix;
  const [x, y, z, w] = node.rotation ?? [0, 0, 0, 1];
  const [sx, sy, sz] = node.scale ?? [1, 1, 1];
  const [tx, ty, tz] = node.translation ?? [0, 0, 0];
  return [(1-2*y*y-2*z*z)*sx, (2*x*y+2*z*w)*sx, (2*x*z-2*y*w)*sx, 0,
    (2*x*y-2*z*w)*sy, (1-2*x*x-2*z*z)*sy, (2*y*z+2*x*w)*sy, 0,
    (2*x*z+2*y*w)*sz, (2*y*z-2*x*w)*sz, (1-2*x*x-2*y*y)*sz, 0, tx, ty, tz, 1];
}
function inspect(bytes) {
  if (bytes.length < 20 || bytes.readUInt32LE(0) !== 0x46546c67 || bytes.readUInt32LE(4) !== 2)
    throw new Error('Expected a GLB version 2 header');
  requireCondition(bytes.readUInt32LE(8) === bytes.length, 'Declared GLB length differs from file bytes');
  const chunks = [];
  for (let offset = 12; offset < bytes.length;) {
    if (offset + 8 > bytes.length) throw new Error('Truncated chunk header');
    const length = bytes.readUInt32LE(offset), type = bytes.readUInt32LE(offset + 4);
    if (length % 4 || offset + 8 + length > bytes.length) throw new Error('Unaligned or truncated GLB chunk');
    chunks.push({ type, data: bytes.subarray(offset + 8, offset + 8 + length) });
    offset += 8 + length;
  }
  if (chunks[0]?.type !== 0x4e4f534a) throw new Error('First chunk must be JSON');
  const gltf = JSON.parse(chunks[0].data.toString('utf8'));
  requireCondition(gltf.asset?.version === '2.0', 'glTF asset.version must be 2.0');
  requireCondition(chunks.filter(chunk => chunk.type === 0x4e4f534a).length === 1, 'Duplicate JSON chunks');
  const binaries = chunks.filter(chunk => chunk.type === 0x004e4942);
  requireCondition(binaries.length <= 1, 'Duplicate BIN chunks');
  requireCondition(!binaries.length || chunks[1] === binaries[0], 'BIN must be the second GLB chunk');
  report.bytes = bytes.length;
  report.buffers = (gltf.buffers ?? []).map((buffer, index) => {
    const actual = buffer.uri ? resource(buffer.uri) : { kind: 'GLB-BIN', bytes: binaries[0]?.data.length ?? 0 };
    requireCondition(integer(buffer.byteLength), `Buffer ${index} has invalid byteLength`);
    requireCondition(buffer.uri || index === 0, `Only buffer 0 may refer to GLB BIN`);
    requireCondition(actual.bytes !== null, `Buffer ${index} actual byte length could not be verified`);
    if (actual.bytes !== null) requireCondition(buffer.uri ? actual.bytes === buffer.byteLength :
      actual.bytes >= buffer.byteLength && actual.bytes - buffer.byteLength <= 3, `Buffer ${index} byteLength differs from actual bytes`);
    return { index, declaredBytes: buffer.byteLength, ...actual };
  });
  const views = gltf.bufferViews ?? [], accessors = gltf.accessors ?? [];
  views.forEach((view, index) => requireCondition(integer(view.byteLength) && integer(view.byteOffset ?? 0) &&
    (view.byteOffset ?? 0) + view.byteLength <= (gltf.buffers?.[view.buffer]?.byteLength ?? -1), `Buffer view ${index} is out of bounds`));
  const sizes = { 5120: 1, 5121: 1, 5122: 2, 5123: 2, 5125: 4, 5126: 4 };
  const counts = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT2: 4, MAT3: 9, MAT4: 16 };
  accessors.forEach((accessor, index) => {
    const component = sizes[accessor.componentType], elements = counts[accessor.type];
    requireCondition(integer(accessor.count) && component && elements, `Accessor ${index} has invalid count/type`);
    if (accessor.bufferView === undefined) return;
    const view = views[accessor.bufferView];
    // Matrix columns of 8/16-bit components are aligned to four bytes in glTF.
    const dimension = accessor.type.startsWith('MAT') ? Number(accessor.type.slice(3)) : 0;
    const elementBytes = dimension ? Math.ceil(dimension * component / 4) * 4 * dimension : component * elements;
    const stride = view?.byteStride ?? elementBytes;
    const end = (accessor.byteOffset ?? 0) + Math.max(0, accessor.count - 1) * stride + (accessor.count ? elementBytes : 0);
    requireCondition(view && integer(accessor.byteOffset ?? 0) && stride >= elementBytes && end <= view.byteLength, `Accessor ${index} exceeds buffer view`);
  });
  const nodes = gltf.nodes ?? [], parents = new Map();
  nodes.forEach((node, index) => (node.children ?? []).forEach(child => {
    requireCondition(integer(child) && child < nodes.length && !parents.has(child), `Invalid or multiply parented child ${child}`);
    parents.set(child, index);
  }));
  const sceneRoots = gltf.scenes?.[gltf.scene ?? 0]?.nodes ?? [];
  const reachable = new Set();
  function visit(index, chain = new Set()) {
    if (chain.has(index)) { issues.push(`Cycle at node ${index}`); return; }
    if (!nodes[index] || reachable.has(index)) return;
    reachable.add(index);
    (nodes[index].children ?? []).forEach(child => visit(child, new Set([...chain, index])));
  }
  sceneRoots.forEach(index => visit(index));
  const required = ['Lamp', 'Chair', 'Cup', 'Shore', 'Camera', 'LampLight'];
  report.requiredNodes = required.map(suffix => {
    const name = `Fading_Study${suffix}`, matches = nodes.flatMap((node, index) => node.name === name ? [index] : []);
    requireCondition(matches.length === 1, `Expected one ${name}; found ${matches.length}`);
    requireCondition(matches.length === 1 && reachable.has(matches[0]), `${name} is not in the active scene`);
    return { name, indices: matches, parent: nodes[parents.get(matches[0])]?.name ?? null };
  });
  report.optionalNodes = ['Backdrop', 'Curtain'].map(suffix => {
    const name = `Fading_Study${suffix}`;
    const indices = nodes.flatMap((node, index) => node.name === name ? [index] : []);
    return { name, indices, note: indices.length ? 'Optional node present' : 'Optional node not delivered' };
  });
  const named = name => nodes.findIndex(node => node.name === `Fading_Study${name}`);
  const lampLight = nodes[named('LampLight')];
  requireCondition(lampLight && lampLight.mesh === undefined && lampLight.camera === undefined &&
    !lampLight.extensions?.KHR_lights_punctual, 'Fading_StudyLampLight must be an empty/socket, not exported geometry, camera or light');
  let ancestor = parents.get(named('Cup'));
  const seen = new Set();
  while (ancestor !== undefined && ancestor !== named('Chair') && !seen.has(ancestor)) { seen.add(ancestor); ancestor = parents.get(ancestor); }
  report.cupDescendsFromChair = ancestor !== undefined && ancestor === named('Chair');
  requireCondition(report.cupDescendsFromChair, 'Cup must descend from chair so rotation carries it');
  const meshes = gltf.meshes ?? [];
  const meshTriangles = meshes.map((mesh, index) => ({ index, name: mesh.name ?? null, triangles: (mesh.primitives ?? []).reduce((sum, primitive) => {
    const count = accessors[primitive.indices ?? primitive.attributes?.POSITION]?.count;
    requireCondition(integer(count), `Mesh ${index} primitive has no valid count accessor`);
    const mode = primitive.mode ?? 4;
    if (mode === 4) { requireCondition(count % 3 === 0, `Mesh ${index} triangle count not divisible by 3`); return sum + count / 3; }
    if (mode === 5 || mode === 6) return sum + Math.max(0, count - 2);
    return sum;
  }, 0) }));
  report.nodes = nodes.map((node, index) => ({ index, name: node.name ?? null, mesh: node.mesh, camera: node.camera, children: node.children ?? [] }));
  report.meshes = meshTriangles;
  report.triangles = { uniqueMeshes: meshTriangles.reduce((sum, mesh) => sum + mesh.triangles, 0), activeSceneInstances: [...reachable].reduce((sum, index) => sum + (meshTriangles[nodes[index].mesh]?.triangles ?? 0), 0) };
  report.materials = gltf.materials ?? [];
  report.textures = gltf.textures ?? [];
  report.images = (gltf.images ?? []).map((image, index) => {
    if (image.uri) return { index, name: image.name, mimeType: image.mimeType, ...resource(image.uri) };
    const view = views[image.bufferView];
    requireCondition(Boolean(view), `Image ${index} has no valid buffer view`);
    return { index, name: image.name, mimeType: image.mimeType, kind: 'embedded-buffer-view', bufferView: image.bufferView, bytes: view?.byteLength ?? null };
  });
  function world(index, chain = new Set()) {
    if (chain.has(index)) throw new Error('Cannot compute camera transform with cyclic ancestry');
    const parent = parents.get(index);
    return multiply(parent === undefined ? identity() : world(parent, new Set([...chain, index])), localMatrix(nodes[index]));
  }
  report.coordinateSystem = 'glTF right-handed, +Y up; cameras look along local -Z. No Blender-space values inferred.';
  report.cameras = nodes.flatMap((node, index) => {
    if (node.camera === undefined) return [];
    const matrix = world(index);
    requireCondition(Boolean(gltf.cameras?.[node.camera]), `Camera node ${index} has invalid camera index`);
    return [{ node: node.name, index: node.camera, definition: gltf.cameras?.[node.camera], worldPosition: matrix.slice(12, 15), worldUp: matrix.slice(4, 7), worldForward: matrix.slice(8, 11).map(value => -value), worldMatrix: matrix }];
  });
  requireCondition(nodes[named('Camera')]?.camera !== undefined, 'Fading_StudyCamera must reference an exported camera');
  report.punctualLights = { definitions: gltf.extensions?.KHR_lights_punctual?.lights ?? [], nodes: nodes.flatMap((node, index) => node.extensions?.KHR_lights_punctual ? [{ index, name: node.name, ...node.extensions.KHR_lights_punctual }] : []) };
  requireCondition(!report.punctualLights.definitions.length && !report.punctualLights.nodes.length, 'Exported punctual lights must be absent; runtime owns lighting');
  const manifestPath = resolve(dirname(file), 'manifest.json');
  try { report.manifest = { path: manifestPath, bytes: statSync(manifestPath).size, content: JSON.parse(readFileSync(manifestPath, 'utf8')) }; }
  catch (error) { report.manifest = { path: manifestPath, status: error.code === 'ENOENT' ? 'pending' : 'invalid', message: error.message }; issues.push('Companion manifest unavailable or invalid'); }
}
try { inspect(readFileSync(file)); process.exitCode = issues.length ? 1 : 0; }
catch (error) { report.status = error.code === 'ENOENT' ? 'pending' : 'invalid'; issues.push(error.message); process.exitCode = error.code === 'ENOENT' ? 2 : 1; }
console.log(JSON.stringify(report, null, 2));
