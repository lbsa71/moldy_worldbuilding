import { afterEach, describe, expect, it } from 'vitest';
import { NullEngine } from '@babylonjs/core/Engines/nullEngine';
import { Scene } from '@babylonjs/core/scene';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { CreateBox } from '@babylonjs/core/Meshes/Builders/boxBuilder';
import { PBRMaterial } from '@babylonjs/core/Materials/PBR/pbrMaterial';
import { FreeCamera } from '@babylonjs/core/Cameras/freeCamera';
import { VertexBuffer } from '@babylonjs/core/Buffers/buffer';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { LivingSceneWeather } from './LivingSceneWeather';
import { SceneStudyObjects } from './SceneStudyObjects';
import type { StudyAssets } from './SceneStudyAssets';
import { fullStage } from '../../game/presentation/SceneDirection';

const cleanups: (() => void)[] = [];
afterEach(() => cleanups.splice(0).forEach(fn => fn()));
function fixture(withBooks = false) {
  const engine = new NullEngine();
  const scene = new Scene(engine);
  scene.useRightHandedSystem = true;
  const chair = new TransformNode('Fading_StudyChair', scene);
  chair.position.set(0.8, 0.2, 1.5);
  const cup = new TransformNode('Fading_StudyCup', scene);
  cup.parent = chair; cup.position.y = 1;
  const lamp = new TransformNode('Fading_StudyLamp', scene);
  const seat = CreateBox('wood', { width: 1.1, depth: 1.1, height: 1 }, scene);
  seat.position.y = 0.5; seat.parent = chair;
  seat.material = new PBRMaterial('wood', scene);
  const porcelain = CreateBox('porcelain', { size: 0.1 }, scene);
  porcelain.parent = cup; porcelain.material = new PBRMaterial('porcelain', scene);
  const stone = CreateBox('StudyPavingSlab_001', { width: 1, depth: 1, height: 0.2 }, scene);
  stone.position.set(1.2, 0.1, 0.2);
  const rock = new PBRMaterial('rough authored dark rock', scene);
  rock.roughness = 0.95; stone.material = rock;
  const assets: StudyAssets = { mode: 'production', message: '', warnings: [], meshes: [seat, stone, porcelain], chair, cup, lamp, manifest: {} };
  if (withBooks) {
    // An oversized cover guarantees deterministic rays on the removable prop.
    const books = CreateBox('Fading_StudyBooks', { width: 3, height: 0.1, depth: 3.5 }, scene);
    books.position.set(1.125, 1.8, 1.025);
    books.material = new PBRMaterial('book cover', scene);
    assets.meshes.push(books);
  }
  let reflected = [...assets.meshes];
  const objects = new SceneStudyObjects(chair, cup, assets.meshes, meshes => { reflected = meshes; });
  const weather = new LivingSceneWeather(scene, assets, () => objects.refreshPresence());
  cleanups.push(() => { weather.dispose(); objects.dispose(); scene.dispose(); engine.dispose(); });
  return { weather, scene, chair, cup, stone, rock, objects, getReflected: () => reflected };
}

describe('remembered rain', () => {
  it('invalidates supports when books leave or return, without recasting unchanged stage props every frame', () => {
    const f = fixture(true);
    f.weather.applyCue('rain-memory', true);
    expect(f.weather.getRainSamples().every(drop => Math.abs(drop.surfaceY - 1.85) < 0.001)).toBe(true);
    const initialQueries = f.weather.getDiagnostics().supportRefreshes;
    f.objects.settleArrangement(false, true, { ...fullStage(), books: 'absent' });
    f.weather.update(0.01);
    expect(f.weather.getRainSamples().every(drop => drop.surfaceY < 1.4)).toBe(true);
    expect(f.weather.getDiagnostics().supportRefreshes).toBe(initialQueries + 1);
    f.weather.update(1);
    expect(f.weather.getDiagnostics().supportRefreshes).toBe(initialQueries + 1);
    f.objects.reset();
    f.weather.update(0.01);
    expect(f.weather.getRainSamples().every(drop => Math.abs(drop.surfaceY - 1.85) < 0.001)).toBe(true);
  });

  it('fades latest-wins, holds constant through repeated beat directions, and leaves no lingering weather after reset', () => {
    const f = fixture();
    f.weather.applyCue('rain-memory');
    f.weather.update(0.75);
    expect(f.weather.getDiagnostics().rainIntensity).toBeCloseTo(0.5);
    f.weather.applyCue('rain-memory');
    f.weather.update(0.75);
    expect(f.weather.getDiagnostics()).toMatchObject({ weather: 'rain-memory', rainIntensity: 1, weatherSettled: true, weatherMoving: true, visibleRainDrops: 128 });
    f.weather.applyCue('none');
    f.weather.update(0.4);
    const partial = f.weather.getDiagnostics().rainIntensity;
    f.weather.applyCue('rain-memory');
    expect(f.weather.getDiagnostics().rainIntensity).toBe(partial);
    f.weather.update(1.5);
    expect(f.weather.getDiagnostics().rainIntensity).toBe(1);
    f.weather.reset();
    f.weather.update(10);
    expect(f.weather.getDiagnostics()).toMatchObject({ weather: 'none', rainIntensity: 0, weatherMoving: false, visibleRainDrops: 0, rippleCount: 0, dampPatchCount: 0 });
    expect(f.getReflected().some(mesh => mesh.metadata?.livingSceneWeather)).toBe(false);
  });

  it('stops drops on actual stone and moving furniture while water impacts remain localized', () => {
    const f = fixture();
    f.weather.applyCue('rain-memory', true);
    const initialQueries = f.weather.getDiagnostics().supportRefreshes;
    for (let index = 0; index < 100; index++) {
      f.weather.update(0.05);
      const drops = f.weather.getRainSamples();
      expect(drops.every(drop => drop.y >= drop.surfaceY + 0.001)).toBe(true);
      expect(drops.some(drop => Math.abs(drop.surfaceY - 1.2) < 0.001)).toBe(true);
      expect(drops.some(drop => Math.abs(drop.surfaceY - 0.2) < 0.001)).toBe(true);
    }
    expect(f.weather.getDiagnostics().supportRefreshes).toBe(initialQueries);
    f.chair.position.y += 0.3;
    f.weather.update(0.05);
    expect(f.weather.getDiagnostics().supportRefreshes).toBe(initialQueries + 1);
    expect(f.weather.getRainSamples().some(drop => Math.abs(drop.surfaceY - 1.5) < 0.001)).toBe(true);
    expect(f.weather.getRainSamples().every(drop => drop.y >= drop.surfaceY + 0.001)).toBe(true);
    expect(f.weather.getDiagnostics().rippleCount).toBeGreaterThan(0);
    expect(f.weather.getDiagnostics().rippleCount).toBeLessThanOrEqual(12);
    expect(f.rock.roughness).toBe(0.95);
    f.cup.setEnabled(false);
    f.weather.update(0.05);
    expect(f.weather.getDiagnostics().supportRefreshes).toBe(initialQueries + 2);
  });

  it('supplies the actual camera-facing plane normal to PBR when the shot changes', () => {
    const f = fixture();
    const camera = new FreeCamera('weather test camera', new Vector3(3, 1, 3), f.scene);
    camera.setTarget(new Vector3(0, 0.5, 0)); f.scene.activeCamera = camera;
    f.weather.applyCue('rain-memory', true);
    const mesh = f.scene.getMeshByName('remembered rain around the lamp')!;
    const positions = mesh.getVerticesData(VertexBuffer.PositionKind)!, normals = mesh.getVerticesData(VertexBuffer.NormalKind)!;
    const a = Vector3.FromArray(positions, 0), b = Vector3.FromArray(positions, 3), c = Vector3.FromArray(positions, 6);
    const expected = Vector3.Cross(b.subtract(a), c.subtract(a)).normalize();
    // Millimetre-wide geometry stored in float32 loses a few ulps when its
    // world-space endpoints are subtracted to recover the plane normal.
    expect(Vector3.FromArray(normals).equalsWithEpsilon(expected, 0.0001)).toBe(true);
    const first = Vector3.FromArray(normals).clone();
    camera.position.x = -3; camera.setTarget(Vector3.Zero());
    f.weather.update(0.05);
    expect(Vector3.FromArray(mesh.getVerticesData(VertexBuffer.NormalKind)!).equalsWithEpsilon(first, 0.01)).toBe(false);
  });

  it('reduced motion immediately settles fades to static edge dampness with no falling drops or growing ripples', () => {
    const f = fixture();
    f.weather.applyCue('rain-memory');
    f.weather.update(0.2);
    f.weather.setReducedMotion(true);
    expect(f.weather.getDiagnostics()).toMatchObject({ rainIntensity: 1, weatherMoving: false, weatherSettled: true, visibleRainDrops: 0, rippleCount: 0, dampPatchCount: 1 });
    const positions = f.weather.getRainSamples();
    f.weather.update(20);
    expect(f.weather.getRainSamples()).toEqual(positions);
    expect(f.getReflected().filter(mesh => mesh.metadata?.livingSceneWeather).map(mesh => mesh.name)).toEqual(['selectively damp rock edges']);
    f.weather.applyCue('none');
    expect(f.weather.getDiagnostics()).toMatchObject({ rainIntensity: 0, weatherMoving: false, dampPatchCount: 0 });
  });

  it('immediate restores and disposal cannot revive rain or mutate the authored scene materials', () => {
    const f = fixture();
    f.weather.applyCue('rain-memory', true);
    expect(f.weather.getDiagnostics().rainIntensity).toBe(1);
    expect(f.rock.roughness).toBe(0.95);
    f.weather.dispose();
    f.weather.applyCue('rain-memory', true);
    f.weather.setReducedMotion(false);
    f.weather.update(100);
    expect(f.weather.getDiagnostics()).toMatchObject({ rainIntensity: 0, weatherMoving: false, visibleRainDrops: 0, rippleCount: 0, dampPatchCount: 0 });
    expect(f.getReflected().some(mesh => mesh.metadata?.livingSceneWeather)).toBe(false);
    expect(f.rock.roughness).toBe(0.95);
  });
});
