import { expect, it } from 'vitest';
import { NullEngine } from '@babylonjs/core/Engines/nullEngine';
import { Scene } from '@babylonjs/core/scene';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { CreateBox } from '@babylonjs/core/Meshes/Builders/boxBuilder';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { PBRMaterial } from '@babylonjs/core/Materials/PBR/pbrMaterial';
import { BindFogParameters } from '@babylonjs/core/Materials/materialHelper.functions';
import type { Effect } from '@babylonjs/core/Materials/effect';
import { SpotLight } from '@babylonjs/core/Lights/spotLight';
import { MirrorTexture } from '@babylonjs/core/Materials/Textures/mirrorTexture';
import { SceneStudyObjects } from './SceneStudyObjects';
import { configureStudyFog, configureStudySkyMeshes, createStudyBulbSource, getStudyLampPosition, getStudyShadowCasters } from './SceneStudySurfaces';

it('anchors warm lighting to the authored socket world transform before manifest or bounds hints', () => {
  const engine = new NullEngine();
  const scene = new Scene(engine);
  try {
    const lamp = new TransformNode('Fading_StudyLamp', scene);
    lamp.position.set(2, 0.2, -1);
    lamp.rotation.y = Math.PI / 2;
    lamp.scaling.set(1.2, 1.2, 1.2);
    const shade = CreateBox('shade', { size: 1 }, scene);
    shade.parent = lamp;
    const socket = new TransformNode('Fading_StudyLampLight', scene);
    socket.parent = lamp;
    socket.position.set(0.1, 1.4, 0.2);
    const expectedWorld = Vector3.TransformCoordinates(socket.position, lamp.computeWorldMatrix(true));
    const chair = new TransformNode('chair', scene);
    const cup = new TransformNode('cup', scene);
    const position = getStudyLampPosition({
      mode: 'production', message: 'fixture', warnings: [], lamp, lampLight: socket, chair, cup, meshes: [shade],
      manifest: { lampLight: { position: [99, 99, 99] } },
    });
    expect(position.equalsWithEpsilon(expectedWorld, 0.00001)).toBe(true);
    expect(position.equals(socket.position)).toBe(false);
    position.x = 99;
    expect(socket.getAbsolutePosition().equalsWithEpsilon(expectedWorld, 0.00001)).toBe(true);
  } finally { scene.dispose(); engine.dispose(); }
});

it('binds an authored low or zero browser fog coefficient without replacing it with a density floor', () => {
  const engine = new NullEngine();
  const scene = new Scene(engine);
  try {
    for (const density of [0.012, 0]) {
      configureStudyFog(scene, { environment: { fog_density: density, fog_density_suggestion: 0.1 } });
      let boundDensity: number | undefined;
      const effect = { setFloat4: (_name: string, _mode: number, _start: number, _end: number, coefficient: number) => { boundDensity = coefficient; }, setColor3: () => {} } as unknown as Effect;
      BindFogParameters(scene, undefined, effect, true);
      expect(boundDensity).toBe(density);
    }
    configureStudyFog(scene, {});
    expect(scene.fogDensity).toBe(0.018);
  } finally { scene.dispose(); engine.dispose(); }
});

it('reflects the authored sky and new foreground objects once while excluding sky from both shadow lists through cup changes', () => {
  const engine = new NullEngine();
  const scene = new Scene(engine);
  try {
    const skyRoot = new TransformNode('Fading_StudySky', scene);
    const sky = CreateBox('authored sky surface', { size: 10 }, scene);
    sky.parent = skyRoot;
    sky.receiveShadows = true;
    const lampRoot = new TransformNode('Fading_StudyLamp', scene);
    const chair = new TransformNode('Fading_StudyChair', scene);
    const cup = new TransformNode('Fading_StudyCup', scene);
    const porcelain = CreateBox('cup porcelain', { size: 0.1 }, scene);
    porcelain.parent = cup;
    const books = CreateBox('Fading_StudyBooks', { size: 0.3 }, scene);
    const paving = CreateBox('Fading_StudyPaving', { size: 1 }, scene);
    const meshes = [sky, porcelain, books, paving];
    configureStudySkyMeshes(meshes);
    const mirror = new MirrorTexture('live mirror fixture', 64, scene);
    const spot = new SpotLight('downlight', new Vector3(1, 2, 0), Vector3.Down(), 2.65, 1.1, scene);
    const bulb = createStudyBulbSource(scene, spot);
    let spotCasters: string[] = [];
    const objects = new SceneStudyObjects(chair, cup, meshes, visible => {
      mirror.renderList = [...visible];
      const casters = getStudyShadowCasters(visible, lampRoot);
      spotCasters = casters.map(mesh => mesh.name);
      bulb.shadows.getShadowMap()!.renderList = [...casters];
    });
    objects.setCupVisible(false);
    objects.setChairTurned(true);
    objects.setCupVisible(true);
    expect(mirror.renderList?.filter(mesh => mesh === sky)).toHaveLength(1);
    expect(mirror.renderList).toContain(books);
    expect(mirror.renderList).toContain(paving);
    expect(mirror.renderList).toContain(porcelain);
    expect(spotCasters).toEqual(['cup porcelain', 'Fading_StudyBooks', 'Fading_StudyPaving']);
    expect(bulb.shadows.getShadowMap()!.renderList).not.toContain(sky);
    expect(sky.applyFog).toBe(false);
    expect(sky.receiveShadows).toBe(false);
    expect(sky.isEnabled()).toBe(true);
    objects.setCupVisible(false);
    expect(mirror.renderList).not.toContain(porcelain);
    expect(bulb.shadows.getShadowMap()!.renderList).not.toContain(porcelain);
    expect(mirror.renderList?.filter(mesh => mesh === sky)).toHaveLength(1);
  } finally { scene.dispose(); engine.dispose(); }
});

it('preserves the calibrated bulb energy at the fixture and provides cube shadows for broad illumination', () => {
  const engine = new NullEngine();
  const scene = new Scene(engine);
  try {
    const down = new SpotLight('fixture downlight', new Vector3(1.17, 1.635, 0.135), Vector3.Down(), 2.65, 1.1, scene);
    down.intensity = 10;
    down.range = 6;
    down.diffuse = new Color3(1, 0.64, 0.31);
    const bulb = createStudyBulbSource(scene, down);
    expect(bulb.light.getScaledIntensity()).toBe(10);
    expect(bulb.light.position.equals(down.position)).toBe(true);
    expect(bulb.light.range).toBe(6);
    expect(bulb.light.needCube()).toBe(true);
    expect(new Set(Array.from({ length: 6 }, (_, index) => bulb.light.getShadowDirection(index).asArray().join(','))).size).toBe(6);
    expect(bulb.shadows.getShadowMap()?.getSize().width).toBeLessThanOrEqual(256);
    expect(bulb.light.getShadowGenerator()).toBe(bulb.shadows);
    expect(bulb.shadows.usePoissonSampling).toBe(true);
    bulb.light.position.x = 99;
    expect(down.position.x).toBe(1.17);
  } finally { scene.dispose(); engine.dispose(); }
});

it('binds the same linear fog color as the clear background with exactly one sRGB conversion', () => {
  const engine = new NullEngine();
  const scene = new Scene(engine);
  try {
    const swatch = new Color3(0.34, 0.44, 0.52);
    configureStudyFog(scene, { environment: { fog_color: swatch.asArray(), fog_density_suggestion: 0.017 } });
    let boundColor: Color3 | undefined;
    const effect = { setFloat4: () => {}, setColor3: (_name: string, color: Color3) => { boundColor = color.clone(); } } as unknown as Effect;
    BindFogParameters(scene, undefined, effect, true);
    const expected = swatch.toLinearSpace(engine.useExactSrgbConversions);
    expect(boundColor?.equals(expected)).toBe(true);
    expect(scene.clearColor.r).toBeCloseTo(expected.r, 6);
    expect(scene.clearColor.g).toBeCloseTo(expected.g, 6);
    expect(scene.clearColor.b).toBeCloseTo(expected.b, 6);
    expect(boundColor?.r).toBeGreaterThan(0.05);
    expect(scene.fogColor.equals(swatch)).toBe(true);
  } finally { scene.dispose(); engine.dispose(); }
});

it('allows light through the luminous fixture while retaining opaque foreground shadow casters and visible shade geometry', () => {
  const engine = new NullEngine();
  const scene = new Scene(engine);
  try {
    const lamp = new TransformNode('lamp', scene);
    const shade = CreateBox('StudyLampShade', { size: 0.5 }, scene);
    shade.parent = lamp;
    const filament = CreateBox('StudyLampFilament', { size: 0.01 }, scene);
    filament.parent = lamp;
    const emission = new PBRMaterial('filament emission', scene);
    emission.emissiveColor = new Color3(1, 0.6, 0.3);
    filament.material = emission;
    const stem = CreateBox('StudyLampFoot', { size: 0.05 }, scene);
    stem.parent = lamp;
    const chair = CreateBox('chair', { size: 1 }, scene);
    const cup = CreateBox('cup', { size: 0.1 }, scene);
    const shore = CreateBox('shore', { size: 3 }, scene);
    const visible = [shade, filament, stem, chair, cup, shore];
    expect(getStudyShadowCasters(visible, lamp).map(mesh => mesh.name)).toEqual(['StudyLampFoot', 'chair', 'cup', 'shore']);
    expect(visible).toContain(shade);
    expect(shade.isEnabled()).toBe(true);
    expect(getStudyShadowCasters(visible.filter(mesh => mesh !== cup), lamp)).not.toContain(cup);
  } finally { scene.dispose(); engine.dispose(); }
});
