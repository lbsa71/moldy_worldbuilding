import { afterEach, describe, expect, it } from 'vitest';
import { NullEngine } from '@babylonjs/core/Engines/nullEngine';
import { Scene } from '@babylonjs/core/scene';
import { FreeCamera } from '@babylonjs/core/Cameras/freeCamera';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { CreateBox } from '@babylonjs/core/Meshes/Builders/boxBuilder';
import { PBRMaterial } from '@babylonjs/core/Materials/PBR/pbrMaterial';
import { VertexBuffer } from '@babylonjs/core/Buffers/buffer';
import { Material } from '@babylonjs/core/Materials/material';
import { readFileSync } from 'node:fs';
import { Vector3, Quaternion, Matrix } from '@babylonjs/core/Maths/math.vector';
import { SceneStudyObjects } from './SceneStudyObjects';
import { createLivingSceneCamera, createCupSeatTrace, LivingSceneDirector } from './LivingSceneDirector';
import { getStudyShadowCasters } from './SceneStudySurfaces';
import { CAMERA_CUES, openingDirection, fullStage, type StagePresence, type SceneDirection } from '../../game/presentation/SceneDirection';
import type { StudyAssets } from './SceneStudyAssets';

const cleanups: (() => void)[] = [];
afterEach(() => cleanups.splice(0).forEach(fn => fn()));

function fixture() {
  const engine = new NullEngine({ renderWidth: 1200, renderHeight: 800, textureSize: 512, deterministicLockstep: false, lockstepMaxSteps: 4 });
  const scene = new Scene(engine);
  scene.useRightHandedSystem = true;
  const cameraParent = new TransformNode('exported camera transform', scene);
  cameraParent.position.set(0, 1, 8.2);
  cameraParent.rotationQuaternion = Quaternion.RotationAxis(Vector3.Up(), 0.04);
  const authored = new FreeCamera('Camera', Vector3.Zero(), scene);
  authored.parent = cameraParent;
  authored.setTarget(new Vector3(0, -0.3, -8.2));
  authored.fov = 0.429630785;
  const acceptedView = authored.getViewMatrix(true).clone();
  const camera = createLivingSceneCamera(scene, authored);
  const chair = new TransformNode('Fading_StudyChair', scene);
  chair.position.set(1.52, 0.145, 1.6);
  chair.rotationQuaternion = Quaternion.RotationAxis(Vector3.Up(), 0.04);
  const wood = CreateBox('wood', { width: 0.6, height: 0.035, depth: 0.6 }, scene);
  wood.parent = chair;
  wood.position.y = 0.5675;
  wood.material = new PBRMaterial('wood', scene);
  const cup = new TransformNode('Fading_StudyCup', scene);
  cup.parent = chair;
  cup.position.set(-0.23, 0.585, 0.15);
  const porcelain = CreateBox('porcelain', { size: 0.1 }, scene);
  porcelain.parent = cup;
  const lamp = new TransformNode('Fading_StudyLamp', scene);
  lamp.position.set(1.17, 0.145, 0.12);
  const curtain = new TransformNode('Fading_StudyCurtain', scene);
  curtain.position.set(2.95, 0.14, -0.85);
  const fabric = CreateBox('StudyPartialCurtain', { size: 1 }, scene);
  fabric.parent = curtain;
  const rail = CreateBox('StudyBedRail', { size: 0.5 }, scene);
  rail.parent = curtain;
  const shade = CreateBox('shade', { size: 0.4 }, scene);
  shade.parent = lamp;
  const books = CreateBox('Fading_StudyBooks', { width: 0.2, height: 0.09, depth: 0.3 }, scene);
  books.position.set(1.98, 0.145, 1.35);
  const stageMeshes = [wood, porcelain, shade, books, fabric, rail];
  const assets: StudyAssets = { mode: 'production', message: '', warnings: [], chair, cup, lamp, meshes: [...stageMeshes], manifest: {}, camera: authored };
  let reflected = [...assets.meshes];
  const objects = new SceneStudyObjects(chair, cup, assets.meshes, value => { reflected = value; });
  const openingChair = chair.rotationQuaternion.clone();
  const openingCup = cup.computeWorldMatrix(true).clone();
  let viewport = { width: 1200, aspect: 1.5 };
  let lampRest = false;
  let lampPresent = true;
  const weatherCalls: { cue: SceneDirection['weather']; immediate: boolean }[] = [];
  const veils: number[] = [];
  const director = new LivingSceneDirector({ scene, camera, authoredCamera: authored, assets, objects,
    viewport: () => viewport, setLampRest: value => { lampRest = value; }, onTransitionOpacity: value => veils.push(value),
    setLampPresent: value => { lampPresent = value; },
    setWeather: (cue, immediate) => weatherCalls.push({ cue, immediate }) });
  cleanups.push(() => { director.dispose(); scene.dispose(); engine.dispose(); });
  return { director, camera, authored, acceptedView, chair, cup, porcelain, scene, assets, objects, openingChair, openingCup,
    veils, weatherCalls, books, stageMeshes, getReflected: () => reflected, getLampRest: () => lampRest, getLampPresent: () => lampPresent,
    resize: (width: number, aspect: number) => { viewport = { width, aspect }; director.resize(); } };
}

function cue(camera: SceneDirection['camera'], kind: SceneDirection['transition']['kind'] = 'cut', seconds = 0, arrangement = openingDirection().arrangement): SceneDirection {
  return { camera, transition: { kind, seconds }, arrangement: { ...arrangement }, weather: 'none' };
}

describe('living scene editorial direction', () => {
  it('applies stage-only changes under a dissolve, holds them through resize, and settles the same empty ending with reduced motion or restore', () => {
    const f = fixture();
    const absentBooks = { ...openingDirection(), transition: { kind: 'dissolve', seconds: 2 } as const, stage: { ...fullStage(), books: 'absent' as const } };
    f.director.applyDirection(absentBooks);
    f.director.update(0.9);
    expect(f.books.isEnabled()).toBe(true);
    f.resize(980, 980 / 720);
    expect(f.books.isEnabled()).toBe(true);
    f.director.update(0.1);
    expect(f.books.isEnabled()).toBe(false);
    expect(f.getReflected()).not.toContain(f.books);
    f.director.update(1);
    f.resize(1200, 1.5);
    expect(f.camera.getViewMatrix(true).equalsWithEpsilon(f.acceptedView, 0.000001)).toBe(true);
    const empty: StagePresence = { chair: 'absent', lamp: 'absent', books: 'absent', curtain: 'absent', rail: 'absent' };
    const ending: SceneDirection = { ...openingDirection(), transition: { kind: 'dissolve', seconds: 3 },
      arrangement: { chair: 'rest', cup: 'absent', lamp: 'rest', trace: 'none' }, stage: empty };
    f.director.applyDirection(ending);
    f.director.update(0.1);
    f.director.setReducedMotion(true);
    expect(f.stageMeshes.every(mesh => !mesh.isEnabled())).toBe(true);
    expect(f.getReflected()).toHaveLength(0);
    expect(f.getLampPresent()).toBe(false);
    expect(f.director.getDiagnostics()).toMatchObject({ stage: empty, settled: true, cameraCue: 'wide' });
    expect(f.veils.at(-1)).toBe(0);
    f.director.reset();
    expect(f.stageMeshes.every(mesh => mesh.isEnabled())).toBe(true);
    expect(f.getLampPresent()).toBe(true);
    f.director.setReducedMotion(false);
    f.director.applyDirection(ending, true);
    expect(f.stageMeshes.every(mesh => !mesh.isEnabled())).toBe(true);
    f.director.update(30);
    expect(f.camera.getViewMatrix(true).equalsWithEpsilon(f.acceptedView, 0.000001)).toBe(true);
  });

  it('never resurrects a retired stage when a second choice interrupts its dissolve', () => {
    const f = fixture();
    f.director.applyDirection({ ...cue('books', 'dissolve', 2), stage: { ...fullStage(), books: 'absent' } });
    f.director.update(0.3);
    f.director.applyDirection({ ...cue('chair', 'cut'), stage: { ...fullStage(), curtain: 'absent', rail: 'absent' } });
    f.director.update(60);
    expect(f.books.isEnabled()).toBe(true);
    expect(f.director.getDiagnostics()).toMatchObject({ stage: { ...fullStage(), curtain: 'absent', rail: 'absent' }, settled: true });
    expect(f.veils.at(-1)).toBe(0);
  });

  it('forwards weather-only cues without restarting the camera, including immediate preference changes and reset', () => {
    const f = fixture();
    const before = f.camera.getViewMatrix(true).clone();
    f.director.applyDirection({ ...openingDirection(), weather: 'rain-memory', transition: { kind: 'ease', seconds: 2 } });
    expect(f.weatherCalls.at(-1)).toEqual({ cue: 'rain-memory', immediate: false });
    expect(f.director.getDiagnostics().settled).toBe(true);
    expect(f.camera.getViewMatrix(true).equals(before)).toBe(true);
    f.director.setReducedMotion(true);
    expect(f.weatherCalls.at(-1)).toEqual({ cue: 'rain-memory', immediate: true });
    f.director.reset();
    expect(f.weatherCalls.at(-1)).toEqual({ cue: 'none', immediate: true });
  });
  it('preserves the accepted parented camera world view and makes finite static shots at desktop and portrait aspects', () => {
    const f = fixture();
    expect(f.camera.parent).toBeNull();
    expect(f.camera.getViewMatrix(true).equalsWithEpsilon(f.acceptedView, 0.000001)).toBe(true);
    const authoredLocal = f.authored.position.clone();
    for (const [width, aspect] of [[1200, 1.5], [390, 1.1], [390, 0.55]]) {
      f.resize(width, aspect);
      for (const camera of CAMERA_CUES) {
        f.director.applyDirection(cue(camera), true);
        const matrix = f.camera.getViewMatrix(true).clone();
        expect([...matrix.m].every(Number.isFinite)).toBe(true);
        expect(Math.abs(matrix.determinant())).toBeGreaterThan(0.99);
        expect(f.camera.fov).toBeGreaterThan(0.1);
        expect(f.camera.fov).toBeLessThan(1.6);
        f.director.update(60);
        expect(f.camera.getViewMatrix(true).equals(matrix)).toBe(true);
      }
    }
    expect(f.authored.position.equals(authoredLocal)).toBe(true);
    f.resize(1200, 1.5);
    f.director.reset();
    expect(f.camera.getViewMatrix(true).equalsWithEpsilon(f.acceptedView, 0.000001)).toBe(true);
  });

  it('switches a complete arrangement at the dissolve midpoint and restores every object property on reset', () => {
    const f = fixture();
    f.director.applyDirection(cue('cup', 'cut', 0, { chair: 'turned', cup: 'away', lamp: 'rest', trace: 'none' }));
    expect(f.getLampRest()).toBe(true);
    expect(f.cup.rotationQuaternion!.w).toBeCloseTo(0, 5);
    expect(f.chair.rotationQuaternion!.equals(f.openingChair)).toBe(false);
    f.director.applyDirection(cue('chair', 'dissolve', 2, { chair: 'turned', cup: 'absent', lamp: 'rest', trace: 'cup' }));
    f.director.update(0.99);
    expect(f.porcelain.isEnabled()).toBe(true);
    expect(f.getReflected().some(mesh => mesh.metadata?.livingSceneTrace)).toBe(false);
    f.director.update(0.01);
    expect(f.veils.at(-1)).toBe(1);
    expect(f.porcelain.isEnabled()).toBe(false);
    const trace = f.getReflected().find(mesh => mesh.metadata?.livingSceneTrace)!;
    expect(trace).toBeDefined();
    expect(getStudyShadowCasters(f.getReflected(), f.assets.lamp)).not.toContain(trace);
    f.director.update(1);
    expect(f.veils.at(-1)).toBe(0);
    f.director.reset();
    expect(f.porcelain.isEnabled()).toBe(true);
    expect(trace.isEnabled()).toBe(false);
    expect(f.getReflected()).toContain(f.porcelain);
    expect(f.getLampRest()).toBe(false);
    expect(f.chair.rotationQuaternion!.equalsWithEpsilon(f.openingChair, 0.000001)).toBe(true);
    expect(f.cup.computeWorldMatrix(true).equalsWithEpsilon(f.openingCup, 0.000001)).toBe(true);
    expect(f.director.getDiagnostics()).toMatchObject({ cameraCue: 'wide', settled: true, arrangement: openingDirection().arrangement });
  });

  it('latest choices retire an interrupted transition and never later restore its camera, veil or arrangement', () => {
    const f = fixture();
    f.director.applyDirection(cue('chair', 'ease', 3));
    f.director.update(0.7);
    f.director.applyDirection(cue('cup', 'dissolve', 2, { chair: 'rest', cup: 'absent', lamp: 'rest', trace: 'cup' }));
    f.director.update(0.7);
    expect(f.veils.at(-1)).toBeGreaterThan(0);
    f.director.applyDirection(cue('water', 'cut', 0));
    const latestView = f.camera.getViewMatrix(true).clone();
    f.director.update(100);
    expect(f.camera.getViewMatrix(true).equals(latestView)).toBe(true);
    expect(f.porcelain.isEnabled()).toBe(true);
    expect(f.getLampRest()).toBe(false);
    expect(f.veils.at(-1)).toBe(0);
    expect(f.director.getDiagnostics()).toMatchObject({ cameraCue: 'water', settled: true, arrangement: openingDirection().arrangement });
    f.director.dispose();
    f.director.applyDirection(cue('cup', 'ease', 1));
    f.director.update(10);
    expect(f.camera.getViewMatrix(true).equals(latestView)).toBe(true);
    expect(f.veils.at(-1)).toBe(0);
  });

  it('reduced motion settles pending and future directions, including the still-unapplied dissolve arrangement and veil', () => {
    const f = fixture();
    const ending = { chair: 'turned', cup: 'absent', lamp: 'rest', trace: 'cup' } as const;
    f.director.applyDirection(cue('cup', 'dissolve', 3, ending));
    f.director.update(0.3);
    f.director.setReducedMotion(true);
    expect(f.veils.at(-1)).toBe(0);
    expect(f.porcelain.isEnabled()).toBe(false);
    expect(f.director.getDiagnostics()).toMatchObject({ cameraCue: 'cup', transitionProgress: 1, settled: true, arrangement: ending });
    f.director.applyDirection(cue('bedside', 'ease', 4));
    expect(f.director.getDiagnostics().settled).toBe(true);
    expect(f.porcelain.isEnabled()).toBe(true);
    const settled = f.camera.getViewMatrix(true).clone();
    f.director.update(20);
    expect(f.camera.getViewMatrix(true).equals(settled)).toBe(true);
  });

  it('eases chair and cup on the camera clock without an opening pop, and interrupts from the actual partial rotation', () => {
    const f = fixture();
    const next = { chair: 'turned', cup: 'away', lamp: 'steady', trace: 'none' } as const;
    f.director.applyDirection(cue('cup', 'ease', 2, next));
    expect(f.chair.rotationQuaternion!.equalsWithEpsilon(f.openingChair, 0.000001)).toBe(true);
    expect(f.cup.computeWorldMatrix(true).equalsWithEpsilon(f.openingCup, 0.000001)).toBe(true);
    f.director.update(0.5);
    const partial = f.objects.getChairTurnAngle();
    expect(partial).toBeLessThan(0);
    expect(partial).toBeGreaterThan(-Math.PI / 9);
    expect(f.cup.rotationQuaternion!.w).toBeGreaterThan(0.9);
    expect(f.cup.rotationQuaternion!.w).toBeLessThan(1);
    expect(f.director.getDiagnostics()).toMatchObject({ transitionProgress: 0.25, settled: false });
    f.director.applyDirection(cue('chair', 'ease', 1));
    expect(f.objects.getChairTurnAngle()).toBe(partial);
    f.director.update(0.3);
    expect(f.objects.getChairTurnAngle()).toBeGreaterThan(partial);
    f.director.setReducedMotion(true);
    expect(f.objects.getChairTurnAngle()).toBe(0);
    expect(f.cup.rotationQuaternion!.w).toBeCloseTo(1, 6);
    const final = f.chair.computeWorldMatrix(true).clone();
    f.director.update(10);
    expect(f.chair.computeWorldMatrix(true).equals(final)).toBe(true);
  });

  it('keeps the full bedside rail and curtain bounds inside the exposed desktop frame', () => {
    const f = fixture();
    f.resize(1280, 1280 / 720);
    f.director.applyDirection(cue('bedside'), true);
    const view = f.camera.getViewMatrix(true);
    for (const x of [2.438, 3.562]) for (const y of [0.14, 2.603]) for (const z of [-0.863, -0.738]) {
      const p = Vector3.TransformCoordinates(new Vector3(x, y, z), view);
      const u = (1 + p.x / (-p.z * Math.tan(f.camera.fov / 2) * 1280 / 720)) / 2;
      const v = (1 - p.y / (-p.z * Math.tan(f.camera.fov / 2))) / 2;
      expect(u).toBeGreaterThan(0.44);
      expect(u).toBeLessThan(0.97);
      expect(v).toBeGreaterThan(0.02);
      expect(v).toBeLessThan(0.98);
    }
  });

  it('draws a flat seat stain and leaves real gaps between wooden slats open', () => {
    const engine = new NullEngine();
    const scene = new Scene(engine);
    scene.useRightHandedSystem = true;
    cleanups.push(() => { scene.dispose(); engine.dispose(); });
    const chair = new TransformNode('chair', scene);
    const cup = new TransformNode('cup', scene);
    cup.parent = chair;
    cup.position.y = 0.1;
    for (const x of [-0.033, 0.033]) {
      const seat = CreateBox('wood slat', { width: 0.054, height: 0.1, depth: 0.2 }, scene);
      seat.parent = chair;
      seat.position.set(x, 0.05, 0);
      seat.material = new PBRMaterial('wood', scene);
    }
    const trace = createCupSeatTrace(scene, chair, cup);
    expect(trace.sideOrientation).toBe(Material.CounterClockWiseSideOrientation);
    const positions = trace.getVerticesData(VertexBuffer.PositionKind)!;
    const indices = trace.getIndices()!;
    expect(indices.length).toBeGreaterThan(0);
    expect(indices.length).toBeLessThan(64 * 6);
    for (let index = 0; index < positions.length; index += 3) {
      expect(Math.abs(positions[index])).toBeGreaterThanOrEqual(0.006 - 0.000001);
      expect(positions[index + 1]).toBeCloseTo(0.1002, 6);
    }
    for (let index = 0; index < indices.length; index += 3) {
      const x = (positions[indices[index] * 3] + positions[indices[index + 1] * 3] + positions[indices[index + 2] * 3]) / 3;
      expect(Math.abs(x)).toBeGreaterThanOrEqual(0.006 - 0.000001);
      const vertex = (i: number) => Vector3.FromArray(positions, i * 3);
      const a = vertex(indices[index]), b = vertex(indices[index + 1]), c = vertex(indices[index + 2]);
      expect(Vector3.Cross(b.subtract(a), c.subtract(a)).y).toBeGreaterThan(0);
    }
  });

  it('fits all delivered cup vertices including the handle in the actual narrow desktop pane', () => {
    const f = fixture();
    const bytes = readFileSync(new URL('../../../public/scene-study/living-scene.glb', import.meta.url));
    const jsonLength = bytes.readUInt32LE(12);
    const gltf = JSON.parse(bytes.subarray(20, 20 + jsonLength).toString());
    const binary = bytes.subarray(28 + jsonLength);
    const cupVertices: Vector3[] = [];
    for (const node of gltf.nodes.filter((node: { name: string; mesh?: number }) => ['StudyCupBody', 'StudyCupHandle'].includes(node.name))) {
      for (const primitive of gltf.meshes[node.mesh].primitives) {
        const accessor = gltf.accessors[primitive.attributes.POSITION], view = gltf.bufferViews[accessor.bufferView];
        for (let index = 0; index < accessor.count; index++) {
          const offset = (view.byteOffset ?? 0) + (accessor.byteOffset ?? 0) + index * (view.byteStride ?? 12);
          cupVertices.push(new Vector3(binary.readFloatLE(offset), binary.readFloatLE(offset + 4), binary.readFloatLE(offset + 8)));
        }
      }
    }
    expect(cupVertices.length).toBeGreaterThan(100);
    for (const width of [901, 980, 1099]) {
      const aspect = width / 720;
      f.resize(width, aspect);
      f.director.applyDirection(cue('cup'), true);
      const world = f.cup.computeWorldMatrix(true), view = f.camera.getViewMatrix(true);
      const panelRight = Math.min(56, Math.max(20, width * 0.04)) + 570;
      const projected: number[] = [];
      for (const vertex of cupVertices) {
        const p = Vector3.TransformCoordinates(Vector3.TransformCoordinates(vertex, world), view);
        const u = (1 + p.x / (-p.z * Math.tan(f.camera.fov / 2) * aspect)) / 2;
        projected.push(u * width);
      }
      expect(Math.min(...projected), `left cup extent at ${width}`).toBeGreaterThan(panelRight + 4);
      expect(Math.max(...projected), `right cup extent at ${width}`).toBeLessThan(width - 2);
    }
  });

  it('keeps the delivered book stack inside the visible pane on desktop, narrow desktop and mobile', () => {
    const f = fixture();
    const bytes = readFileSync(new URL('../../../public/scene-study/living-scene.glb', import.meta.url));
    const jsonLength = bytes.readUInt32LE(12);
    const gltf = JSON.parse(bytes.subarray(20, 20 + jsonLength).toString());
    const binary = bytes.subarray(28 + jsonLength);
    const parents = new Map<number, number>();
    gltf.nodes.forEach((node: { children?: number[] }, index: number) => node.children?.forEach(child => parents.set(child, index)));
    const world = (index: number): Matrix => {
      const node = gltf.nodes[index];
      const local = node.matrix ? Matrix.FromArray(node.matrix) : Matrix.Compose(
        Vector3.FromArray(node.scale ?? [1, 1, 1]), Quaternion.FromArray(node.rotation ?? [0, 0, 0, 1]), Vector3.FromArray(node.translation ?? [0, 0, 0]));
      const parent = parents.get(index);
      return parent === undefined ? local : local.multiply(world(parent));
    };
    const vertices: Vector3[] = [];
    gltf.nodes.forEach((node: { name: string; mesh?: number }, index: number) => {
      if (!/^StudyBook(?:Cover|Pages)_/.test(node.name) || node.mesh === undefined) return;
      const matrix = world(index);
      for (const primitive of gltf.meshes[node.mesh].primitives) {
        const accessor = gltf.accessors[primitive.attributes.POSITION], view = gltf.bufferViews[accessor.bufferView];
        for (let vertex = 0; vertex < accessor.count; vertex++) {
          const offset = (view.byteOffset ?? 0) + (accessor.byteOffset ?? 0) + vertex * (view.byteStride ?? 12);
          vertices.push(Vector3.TransformCoordinates(new Vector3(binary.readFloatLE(offset), binary.readFloatLE(offset + 4), binary.readFloatLE(offset + 8)), matrix));
        }
      }
    });
    expect(vertices.length).toBeGreaterThan(100);
    for (const [width, aspect] of [[1440, 1440 / 900], [1280, 1280 / 720], [901, 901 / 720], [980, 980 / 720], [390, 1.1]]) {
      f.resize(width, aspect);
      f.director.applyDirection(cue('books'), true);
      const view = f.camera.getViewMatrix(true);
      const left = width > 900 ? (Math.min(56, Math.max(20, width * 0.04)) + 570) / width : 0;
      for (const vertex of vertices) {
        const p = Vector3.TransformCoordinates(vertex, view);
        const u = (1 + p.x / (-p.z * Math.tan(f.camera.fov / 2) * aspect)) / 2;
        const v = (1 - p.y / (-p.z * Math.tan(f.camera.fov / 2))) / 2;
        expect(u, `book left at ${width}`).toBeGreaterThan(left + 0.01);
        expect(u, `book right at ${width}`).toBeLessThan(0.99);
        expect(v).toBeGreaterThan(0.03);
        expect(v).toBeLessThan(0.97);
      }
    }
  });

  it('retains lamp shade and chair top in the shore shot with foreground space', () => {
    const f = fixture();
    for (const [width, aspect] of [[1280, 1280 / 720], [390, 1.1]]) {
      f.resize(width, aspect);
      f.director.applyDirection(cue('shore'), true);
      const view = f.camera.getViewMatrix(true);
      for (const point of [new Vector3(0.91, 1.94, 0.12), new Vector3(1.43, 1.94, 0.12), new Vector3(1.18, 1.21, 1.6), new Vector3(1.88, 1.21, 1.6)]) {
        const p = Vector3.TransformCoordinates(point, view);
        const u = (1 + p.x / (-p.z * Math.tan(f.camera.fov / 2) * aspect)) / 2;
        const v = (1 - p.y / (-p.z * Math.tan(f.camera.fov / 2))) / 2;
        expect(u).toBeGreaterThan(width > 900 ? 0.44 : 0.03);
        expect(u).toBeLessThan(0.97);
        expect(v).toBeGreaterThan(0.03);
        expect(v).toBeLessThan(0.9);
      }
    }
  });
});
