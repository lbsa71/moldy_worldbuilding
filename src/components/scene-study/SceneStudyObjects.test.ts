import { afterEach, describe, expect, it } from 'vitest';
import { NullEngine } from '@babylonjs/core/Engines/nullEngine';
import { Scene } from '@babylonjs/core/scene';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { CreateBox } from '@babylonjs/core/Meshes/Builders/boxBuilder';
import { MirrorTexture } from '@babylonjs/core/Materials/Textures/mirrorTexture';
import { SpotLight } from '@babylonjs/core/Lights/spotLight';
import { ShadowGenerator } from '@babylonjs/core/Lights/Shadows/shadowGenerator';
import '@babylonjs/core/Lights/Shadows/shadowGeneratorSceneComponent';
import { Quaternion, Vector3 } from '@babylonjs/core/Maths/math.vector';
import { SceneStudyObjects } from './SceneStudyObjects';
import { fullStage, type StagePresence } from '../../game/presentation/SceneDirection';

const cleanups: (() => void)[] = [];
afterEach(() => cleanups.splice(0).forEach(cleanup => cleanup()));

function fixture() {
  const engine = new NullEngine();
  const scene = new Scene(engine);
  scene.useRightHandedSystem = true;
  cleanups.push(() => { scene.dispose(); engine.dispose(); });
  const chair = new TransformNode('chair', scene);
  chair.position.set(2, 0.1, -0.3);
  chair.rotationQuaternion = Quaternion.RotationAxis(Vector3.Up(), 0.2);
  const seat = CreateBox('seat', { size: 0.5 }, scene);
  seat.parent = chair;
  const cup = new TransformNode('cup', scene);
  cup.position.set(2.2, 0.7, -0.15);
  const porcelain = CreateBox('porcelain', { size: 0.1 }, scene);
  porcelain.parent = cup;
  const handle = CreateBox('handle', { size: 0.03 }, scene);
  handle.parent = cup;
  const shore = CreateBox('shore', { size: 3 }, scene);
  const books = CreateBox('Fading_StudyBooks', { size: 0.3 }, scene);
  const lamp = CreateBox('Fading_StudyLamp', { size: 0.3 }, scene);
  const curtainRoot = new TransformNode('Fading_StudyCurtain', scene);
  const curtain = CreateBox('StudyPartialCurtain', { size: 1 }, scene);
  const rail = CreateBox('StudyBedRail', { size: 0.4 }, scene);
  curtain.parent = rail.parent = curtainRoot;
  const mirror = new MirrorTexture('mirror', 64, scene);
  const light = new SpotLight('lamp', new Vector3(1, 2, 0), Vector3.Down(), 2, 1, scene);
  const shadow = new ShadowGenerator(64, light);
  const meshes = [seat, porcelain, handle, shore];
  const openingWorld = cup.computeWorldMatrix(true).clone();
  const openingRotation = chair.rotationQuaternion.clone();
  const objects = new SceneStudyObjects(chair, cup, meshes, visible => {
    mirror.renderList = [...visible];
    shadow.getShadowMap()!.renderList = [...visible];
  });
  return { objects, chair, cup, seat, porcelain, handle, shore, mirror, shadow, openingWorld, openingRotation, books, lamp, curtain, rail, meshes };
}

describe('scene study live object presence', () => {
  it('independently removes fabric and rail, clears every prop from reflection/shadows, and restores the accepted stage on reset', () => {
    const f = fixture();
    f.meshes.push(f.books, f.lamp, f.curtain, f.rail);
    f.objects.settleArrangement(false, true, { ...fullStage(), curtain: 'absent' });
    expect(f.curtain.isEnabled()).toBe(false);
    expect(f.rail.isEnabled()).toBe(true);
    expect(f.mirror.renderList).toContain(f.rail);
    expect(f.mirror.renderList).not.toContain(f.curtain);
    expect(f.shadow.getShadowMap()!.renderList).not.toContain(f.curtain);
    const empty: StagePresence = { chair: 'absent', lamp: 'absent', books: 'absent', curtain: 'absent', rail: 'absent' };
    f.objects.settleArrangement(false, false, empty);
    const props = [f.seat, f.porcelain, f.handle, f.books, f.lamp, f.curtain, f.rail];
    expect(props.every(mesh => !mesh.isEnabled())).toBe(true);
    expect(f.mirror.renderList?.map(mesh => mesh.name)).toEqual(['shore']);
    expect(f.shadow.getShadowMap()!.renderList?.map(mesh => mesh.name)).toEqual(['shore']);
    expect(f.objects.getState()).toMatchObject({ stage: empty, cupVisible: false });
    f.objects.reset();
    expect(props.every(mesh => mesh.isEnabled())).toBe(true);
    expect(f.mirror.renderList?.map(mesh => mesh.name)).toEqual(f.meshes.map(mesh => mesh.name));
    expect(f.shadow.getShadowMap()!.renderList?.map(mesh => mesh.name)).toEqual(f.meshes.map(mesh => mesh.name));
    expect(f.objects.getState().stage).toEqual(fullStage());
  });

  it('removes every cup descendant from the main view, reflection and dynamic shadow list, then restores them', () => {
    const f = fixture();
    f.objects.setCupVisible(false);
    expect(f.porcelain.isEnabled()).toBe(false);
    expect(f.handle.isEnabled()).toBe(false);
    expect(f.mirror.renderList?.map(mesh => mesh.name)).toEqual(['seat', 'shore']);
    expect(f.shadow.getShadowMap()!.renderList?.map(mesh => mesh.name)).toEqual(['seat', 'shore']);
    f.objects.setCupVisible(true);
    expect(f.porcelain.isEnabled()).toBe(true);
    expect(f.mirror.renderList).toContain(f.handle);
    expect(f.shadow.getShadowMap()!.renderList).toContain(f.porcelain);
  });

  it('keeps the exported cup placement when parenting it, then moves its reflection and shadow geometry with the chair', () => {
    const f = fixture();
    expect(f.cup.computeWorldMatrix(true).equalsWithEpsilon(f.openingWorld, 0.00001)).toBe(true);
    f.objects.setReducedMotion(true);
    f.objects.setChairTurned(true);
    expect(f.cup.computeWorldMatrix(true).equalsWithEpsilon(f.openingWorld, 0.00001)).toBe(false);
    expect(f.mirror.renderList).toContain(f.porcelain);
    expect(f.shadow.getShadowMap()!.renderList).toContain(f.porcelain);
    f.objects.reset();
    expect(f.chair.rotationQuaternion!.equalsWithEpsilon(f.openingRotation, 0.00001)).toBe(true);
    expect(f.cup.computeWorldMatrix(true).equalsWithEpsilon(f.openingWorld, 0.00001)).toBe(true);
  });

  it('settles rapid repeated choices deterministically and ignores calls after disposal', () => {
    const f = fixture();
    for (let index = 0; index < 20; index++) {
      f.objects.setChairTurned(index % 2 === 0);
      f.objects.setCupVisible(index % 3 === 0);
      f.objects.update(0.01);
    }
    f.objects.setChairTurned(true);
    f.objects.setCupVisible(false);
    for (let index = 0; index < 80; index++) f.objects.update(0.016);
    expect(f.objects.getState()).toMatchObject({ chairTurned: true, cupVisible: false, settled: true });
    const settled = f.chair.rotationQuaternion!.clone();
    f.objects.dispose();
    f.objects.reset();
    f.objects.setReducedMotion(true);
    f.objects.setChairTurned(false);
    f.objects.setCupVisible(true);
    f.objects.update(10);
    expect(f.chair.rotationQuaternion!.equals(settled)).toBe(true);
    expect(f.porcelain.isEnabled()).toBe(false);
    expect(f.mirror.renderList).not.toContain(f.porcelain);
  });
});
