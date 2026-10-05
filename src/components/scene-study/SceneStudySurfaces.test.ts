import { expect, it } from 'vitest';
import { NullEngine } from '@babylonjs/core/Engines/nullEngine';
import { Scene } from '@babylonjs/core/scene';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { CreateBox } from '@babylonjs/core/Meshes/Builders/boxBuilder';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { getStudyLampPosition } from './SceneStudySurfaces';

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
