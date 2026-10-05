import { FreeCamera } from '@babylonjs/core/Cameras/freeCamera';
import type { Camera } from '@babylonjs/core/Cameras/camera';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import type { Scene } from '@babylonjs/core/scene';

export type StudyCameraHint = { position?: number[]; target?: number[]; fov?: number; portrait?: StudyCameraHint };

/** A fixed view: no attached controls, automatic orbit or reading-time movement. */
export function selectStudyCamera(scene: Scene, imported?: Camera, hint?: StudyCameraHint): Camera {
  const camera = imported ?? new FreeCamera('Fading_StudyCamera_provisional', new Vector3(-0.65, 2.4, 6.2), scene);
  camera.detachControl();
  camera.minZ = 0.05;
  camera.maxZ = 200;
  if (!imported && camera instanceof FreeCamera) {
    camera.setTarget(new Vector3(-0.65, 1.05, 0));
    camera.fov = 0.7;
  }
  // Hints are world-space. glTF cameras can inherit an authored transform parent;
  // preserve that complete hierarchy and only apply hints when no camera exported.
  if (!imported) {
    if (hint?.position?.length === 3) camera.position.copyFrom(Vector3.FromArray(hint.position));
    if (hint?.target?.length === 3 && camera instanceof FreeCamera) camera.setTarget(Vector3.FromArray(hint.target));
    if (typeof hint?.fov === 'number' && hint.fov > 0 && hint.fov < Math.PI) camera.fov = hint.fov;
  }
  scene.activeCamera = camera;
  return camera;
}
