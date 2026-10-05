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
import { configureStudyFog, getStudyLampPosition, getStudyShadowCasters } from './SceneStudySurfaces';

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
