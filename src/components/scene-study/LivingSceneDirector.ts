import { FreeCamera } from '@babylonjs/core/Cameras/freeCamera';
import type { Camera } from '@babylonjs/core/Cameras/camera';
import { Vector3, Quaternion } from '@babylonjs/core/Maths/math.vector';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { PBRMaterial } from '@babylonjs/core/Materials/PBR/pbrMaterial';
import { Material } from '@babylonjs/core/Materials/material';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData';
import { Ray } from '@babylonjs/core/Culling/ray';
import type { Scene } from '@babylonjs/core/scene';
import type { StudyAssets } from './SceneStudyAssets';
import { SceneStudyObjects } from './SceneStudyObjects';
import { openingDirection, type SceneDirection, type SceneArrangement, type CameraCue } from '../../game/presentation/SceneDirection';

type Pose = { position: Vector3; target: Vector3; up: Vector3; fov: number };
export type DirectorViewport = { aspect: number; width: number };
type Pending = { direction: SceneDirection; from: Pose; to?: Pose; elapsed: number; duration: number; changed: boolean; veilFrom: number;
  rotation?: { chairFrom: number; chairTo: number; cupFrom: Quaternion; cupTo: Quaternion } };
export type LivingSceneDiagnostics = {
  cameraCue: CameraCue;
  transitionKind: SceneDirection['transition']['kind'];
  transitionProgress: number;
  arrangement: SceneArrangement;
  settled: boolean;
};

function sampleCamera(camera: Camera): Pose {
  // glTF camera positions are local to an exported transform. Sample the inverse
  // view, including that complete parent chain, instead of copying .position.
  const world = camera.getViewMatrix(true).clone().invert();
  const position = world.getTranslation();
  const forward = Vector3.TransformNormal(new Vector3(0, 0, -1), world).normalize();
  return { position, target: position.add(forward.scale(8.2)), up: Vector3.TransformNormal(Vector3.Up(), world).normalize(), fov: camera.fov };
}

function assignPose(camera: FreeCamera, pose: Pose): void {
  camera.position.copyFrom(pose.position);
  camera.upVector.copyFrom(pose.up);
  camera.setTarget(pose.target);
  camera.fov = pose.fov;
  camera.getViewMatrix(true);
}

/** Created before the display postprocess so both paths use the same tone mapping. */
export function createLivingSceneCamera(scene: Scene, authored: Camera): FreeCamera {
  const camera = new FreeCamera('Fading_StoryCamera', Vector3.Zero(), scene);
  camera.detachControl();
  camera.minZ = authored.minZ;
  camera.maxZ = authored.maxZ;
  assignPose(camera, sampleCamera(authored));
  scene.activeCamera = camera;
  return camera;
}

const copyDirection = (value: SceneDirection): SceneDirection => ({
  camera: value.camera, transition: { ...value.transition }, arrangement: { ...value.arrangement },
});
const smooth = (value: number) => value * value * (3 - 2 * value);

/** A flat stain on real seat triangles; arcs crossing slat gaps are omitted. */
export function createCupSeatTrace(scene: Scene, chair: StudyAssets['chair'], cup: StudyAssets['cup']): Mesh {
  chair.computeWorldMatrix(true);
  const world = chair.getWorldMatrix();
  const inverse = world.clone().invert();
  const wood = chair.getChildMeshes().filter(mesh => !mesh.isDescendantOf(cup) && /wood/i.test(mesh.material?.name ?? mesh.name));
  wood.forEach(mesh => mesh.computeWorldMatrix(true));
  const positions: number[] = [], indices: number[] = [], normals: number[] = [];
  const point = (angle: number, radius: number) => cup.position.add(new Vector3(Math.cos(angle) * radius, 0, Math.sin(angle) * radius));
  const hit = (local: Vector3): Vector3 | undefined => {
    const origin = Vector3.TransformCoordinates(local, world).add(new Vector3(0, 0.045, 0));
    const ray = new Ray(origin, Vector3.Down(), 0.1);
    const nearest = wood.map(mesh => ray.intersectsMesh(mesh, false)).filter(pick => pick.hit && pick.pickedPoint && (pick.getNormal(true, true)?.y ?? 0) > 0.8)
      .sort((a, b) => a.distance - b.distance)[0];
    return nearest?.pickedPoint ? Vector3.TransformCoordinates(nearest.pickedPoint.add(new Vector3(0, 0.0002, 0)), inverse) : undefined;
  };
  for (let segment = 0; segment < 64; segment++) {
    const a = segment / 64 * Math.PI * 2, b = (segment + 1) / 64 * Math.PI * 2;
    const corners = [point(a, 0.0285), point(a, 0.032), point(b, 0.032), point(b, 0.0285)];
    const samples = [...corners, point((a + b) / 2, 0.0285), point((a + b) / 2, 0.032), point((a + b) / 2, 0.03025),
      Vector3.Lerp(corners[0], corners[2], 0.5), Vector3.Lerp(corners[1], corners[3], 0.5)].map(hit);
    if (samples.some(value => !value)) continue;
    const start = positions.length / 3;
    samples.slice(0, 4).forEach(value => { positions.push(value!.x, value!.y, value!.z); normals.push(0, 1, 0); });
    indices.push(start, start + 2, start + 1, start, start + 3, start + 2);
  }
  const trace = new Mesh('cup blue stain on the seat', scene);
  // Custom +Y triangles use CCW winding. Babylon's RH Mesh default is CW,
  // which culled the flat stain from the camera above the seat.
  trace.sideOrientation = Material.CounterClockWiseSideOrientation;
  const data = new VertexData();
  data.positions = positions; data.indices = indices; data.normals = normals;
  data.applyToMesh(trace);
  trace.parent = chair;
  return trace;
}

/** Fixed editorial shots; only an active, finite transition moves the camera. */
export class LivingSceneDirector {
  private readonly wide: Pose;
  private readonly cupRotation: Quaternion;
  private readonly trace;
  private direction = openingDirection();
  private arrangement = { ...this.direction.arrangement };
  private pending?: Pending;
  private reducedMotion = false;
  private opacity = 0;
  private disposed = false;
  private pose?: Pose;

  constructor(private readonly options: {
    scene: Scene;
    camera: FreeCamera;
    authoredCamera: Camera;
    assets: StudyAssets;
    objects: SceneStudyObjects;
    viewport: () => DirectorViewport;
    setLampRest: (value: boolean) => void;
    onTransitionOpacity?: (opacity: number) => void;
  }) {
    this.wide = sampleCamera(options.authoredCamera);
    this.cupRotation = options.assets.cup.rotationQuaternion?.clone() ?? Quaternion.FromEulerVector(options.assets.cup.rotation);
    const trace = createCupSeatTrace(options.scene, options.assets.chair, options.assets.cup);
    trace.isPickable = false;
    trace.receiveShadows = true;
    trace.metadata = { livingSceneTrace: true };
    const material = new PBRMaterial('muted blue-gray porcelain trace', options.scene);
    material.albedoColor = new Color3(0.075, 0.13, 0.17);
    material.metallic = 0;
    material.roughness = 0.98;
    trace.material = material;
    trace.setEnabled(false);
    // The existing presence controller feeds this same live list to the mirror.
    // Shadow collection explicitly excludes the thin mark rather than adding light.
    options.assets.meshes.push(trace);
    this.trace = trace;
    this.applyDirection(openingDirection(), true);
  }

  private veil(value: number): void {
    this.opacity = Math.max(0, Math.min(1, value));
    try { this.options.onTransitionOpacity?.(this.opacity); } catch { /* UI callbacks do not own the scene. */ }
  }

  private move(pose: Pose): void {
    assignPose(this.options.camera, pose);
    this.pose = { position: pose.position.clone(), target: pose.target.clone(), up: pose.up.clone(), fov: pose.fov };
  }

  private applyArrangement(value: SceneArrangement): void {
    const { assets, objects } = this.options;
    this.arrangement = { ...value };
    assets.cup.rotationQuaternion = this.cupRotation.multiply(Quaternion.RotationAxis(Vector3.Up(), value.cup === 'away' ? Math.PI : 0));
    this.trace.setEnabled(value.trace === 'cup' && value.cup === 'absent');
    this.options.setLampRest(value.lamp === 'rest');
    objects.settleArrangement(value.chair === 'turned', value.cup !== 'absent');
    assets.cup.computeWorldMatrix(true);
    this.trace.computeWorldMatrix(true);
  }

  private shot(cue: CameraCue): Pose {
    const raw = this.options.viewport();
    const aspect = Number.isFinite(raw.aspect) && raw.aspect > 0 ? raw.aspect : 1.5;
    const mobile = raw.width <= 900;
    if (cue === 'wide') {
      // Retain the exact accepted 3:2 view. On a narrow top scene panel, expand
      // the vertical field just enough to retain the same horizontal composition.
      const fov = 2 * Math.atan(Math.tan(this.wide.fov / 2) * Math.max(1, 1.5 / aspect));
      return { ...this.wide, fov: Math.min(1.5, fov) };
    }
    const { assets } = this.options;
    assets.chair.computeWorldMatrix(true);
    assets.cup.computeWorldMatrix(true);
    assets.lamp.computeWorldMatrix(true);
    const chair = assets.chair.getAbsolutePosition();
    const cup = assets.cup.getAbsolutePosition();
    const lamp = assets.lamp.getAbsolutePosition();
    let position: Vector3;
    let subject: Vector3;
    let fov: number;
    switch (cue) {
      case 'cup': {
        // Look toward the near-facing notch from just above the rim. An editorial
        // close shot makes its exported 5.45mm chip legible without free navigation.
        const height = this.arrangement.cup === 'absent' ? 0.006 : 0.055;
        const look = new Vector3(0, height, 0);
        const offset = Vector3.TransformNormal(look.add(new Vector3(0.16, 0.15, 0.29).subtract(look).scale(1.2)), assets.chair.getWorldMatrix());
        position = cup.add(offset);
        subject = cup.add(new Vector3(0, height, 0));
        fov = 0.62;
        break;
      }
      case 'chair':
        subject = chair.add(new Vector3(0, 0.58, 0));
        position = chair.add(new Vector3(0.12, 1.12, 2.65));
        fov = 0.5;
        break;
      case 'bedside': {
        const curtain = this.options.scene.getTransformNodeByName('Fading_StudyCurtain');
        curtain?.computeWorldMatrix(true);
        const fixture = Vector3.Lerp(chair, lamp, 0.55);
        subject = Vector3.Lerp(fixture, curtain?.getAbsolutePosition() ?? fixture, 0.42).add(new Vector3(0, 1, 0));
        position = subject.add(new Vector3(-0.15, 0.46, 5));
        fov = 0.72;
        break;
      }
      case 'water':
        subject = new Vector3(0.1, 0.02, 0.9);
        position = new Vector3(-0.45, 0.85, 4.9);
        fov = 0.52;
        break;
      case 'shore':
        subject = chair.add(new Vector3(0.2, 0.6, 0.5));
        position = subject.add(new Vector3(-0.35, 0.8, 5));
        fov = 0.7;
        break;
    }
    if (mobile && aspect < 1) fov = 2 * Math.atan(Math.tan(fov / 2) / aspect);
    const narrowDesktop = !mobile && raw.width < 1100;
    const panelRight = Math.min(56, Math.max(20, raw.width * 0.04)) + 570;
    if (narrowDesktop) {
      const available = Math.max(1, raw.width - panelRight);
      fov = 2 * Math.atan(Math.tan(fov / 2) * Math.max(1, 600 / available));
    }
    const distance = Vector3.Distance(position, subject);
    const forward = subject.subtract(position).normalize();
    const right = Vector3.Cross(forward, Vector3.Up()).normalize();
    // The tablet desktop panel is 570px plus its CSS left margin. Retain the
    // reviewed >=1100px composition; fit close shots inside the narrower pane.
    const left = narrowDesktop ? panelRight / raw.width : Math.min(0.7, Math.max(0.44, 560 / Math.max(901, raw.width)));
    const center = mobile ? 0.5 : (1 + left) / 2;
    const target = subject.subtract(right.scale((center * 2 - 1) * distance * Math.tan(fov / 2) * aspect));
    return { position, target, up: Vector3.Up(), fov: Math.min(1.5, fov) };
  }

  applyDirection(value: SceneDirection, immediate = false): void {
    if (this.disposed) return;
    const next = copyDirection(value);
    const unchanged = next.camera === this.direction.camera && JSON.stringify(next.arrangement) === JSON.stringify(this.direction.arrangement);
    if (unchanged && !immediate && !this.reducedMotion) return;
    this.direction = next;
    const duration = Number.isFinite(next.transition.seconds) ? Math.max(0, Math.min(8, next.transition.seconds)) : 0;
    if (immediate || this.reducedMotion || next.transition.kind === 'cut' || duration === 0) {
      this.pending = undefined;
      this.applyArrangement(next.arrangement);
      this.move(this.shot(next.camera));
      this.veil(0);
      return;
    }
    const pending: Pending = { direction: next, from: this.pose ?? sampleCamera(this.options.camera), elapsed: 0, duration, changed: false, veilFrom: this.opacity };
    if (next.transition.kind === 'ease') {
      const chairFrom = this.options.objects.getChairTurnAngle();
      const cupFrom = this.options.assets.cup.rotationQuaternion!.clone();
      this.applyArrangement(next.arrangement);
      pending.to = this.shot(next.camera);
      pending.rotation = { chairFrom, chairTo: this.options.objects.getChairTurnAngle(), cupFrom, cupTo: this.options.assets.cup.rotationQuaternion!.clone() };
      // Measure the final shot under final transforms, then restore the visible
      // start transforms before rendering. Camera and object rotations share t.
      this.options.objects.setEditorialTurn(chairFrom, next.arrangement.chair === 'turned');
      this.options.assets.cup.rotationQuaternion = cupFrom.clone();
      pending.changed = true;
      this.veil(0);
    }
    // Replacing this single pending value retires every previous transition.
    this.pending = pending;
  }

  update(seconds: number): void {
    if (this.disposed || !this.pending) return;
    const p = this.pending;
    p.elapsed += Number.isFinite(seconds) ? Math.max(0, seconds) : 0;
    const progress = Math.min(1, p.elapsed / p.duration);
    if (p.direction.transition.kind === 'dissolve') {
      if (progress >= 0.5 && !p.changed) {
        this.applyArrangement(p.direction.arrangement);
        p.to = this.shot(p.direction.camera);
        this.move(p.to);
        p.changed = true;
      }
      this.veil(progress < 0.5 ? p.veilFrom + (1 - p.veilFrom) * smooth(progress * 2) : 1 - smooth((progress - 0.5) * 2));
    } else if (p.to) {
      const t = smooth(progress);
      if (p.rotation) {
        this.options.objects.setEditorialTurn(p.rotation.chairFrom + (p.rotation.chairTo - p.rotation.chairFrom) * t, p.direction.arrangement.chair === 'turned');
        this.options.assets.cup.rotationQuaternion = Quaternion.Slerp(p.rotation.cupFrom, p.rotation.cupTo, t);
        this.options.assets.cup.computeWorldMatrix(true);
        this.trace.computeWorldMatrix(true);
      }
      this.move({
        position: Vector3.Lerp(p.from.position, p.to.position, t),
        target: Vector3.Lerp(p.from.target, p.to.target, t),
        up: Vector3.Lerp(p.from.up, p.to.up, t).normalize(), fov: p.from.fov + (p.to.fov - p.from.fov) * t,
      });
    }
    if (progress >= 1) {
      if (p.rotation) this.applyArrangement(p.direction.arrangement);
      this.move(p.to ?? this.shot(p.direction.camera));
      this.pending = undefined;
      this.veil(0);
    }
  }

  setReducedMotion(value: boolean): void {
    if (this.disposed) return;
    this.reducedMotion = value;
    this.options.objects.setReducedMotion(value);
    if (value) this.applyDirection(this.direction, true);
  }

  resize(): void {
    if (this.disposed) return;
    // Reframe only on an actual resize, never drift while a paragraph is read.
    if (this.pending?.to) {
      const rotation = this.pending.rotation;
      const angle = this.options.objects.getChairTurnAngle();
      const cup = this.options.assets.cup.rotationQuaternion!.clone();
      if (rotation) {
        this.options.objects.setEditorialTurn(rotation.chairTo, this.direction.arrangement.chair === 'turned');
        this.options.assets.cup.rotationQuaternion = rotation.cupTo.clone();
      }
      this.pending.to = this.shot(this.direction.camera);
      if (rotation) {
        this.options.objects.setEditorialTurn(angle, this.direction.arrangement.chair === 'turned');
        this.options.assets.cup.rotationQuaternion = cup;
      }
      if (this.pending.direction.transition.kind === 'dissolve' && this.pending.changed) this.move(this.pending.to);
    } else if (!this.pending) this.move(this.shot(this.direction.camera));
  }

  reset(): void { this.applyDirection(openingDirection(), true); }

  getDiagnostics(): LivingSceneDiagnostics {
    return { cameraCue: this.direction.camera, transitionKind: this.direction.transition.kind,
      transitionProgress: this.pending ? Math.min(1, this.pending.elapsed / this.pending.duration) : 1,
      arrangement: { ...this.arrangement }, settled: !this.pending };
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.pending = undefined;
    this.veil(0);
    this.trace.dispose(false, true);
  }
}
