import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData';
import { VertexBuffer } from '@babylonjs/core/Buffers/buffer';
import { PBRMaterial } from '@babylonjs/core/Materials/PBR/pbrMaterial';
import { Material } from '@babylonjs/core/Materials/material';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Ray } from '@babylonjs/core/Culling/ray';
import type { AbstractMesh } from '@babylonjs/core/Meshes/abstractMesh';
import type { Scene } from '@babylonjs/core/scene';
import type { StudyAssets } from './SceneStudyAssets';
import type { WeatherCue } from '../../game/presentation/SceneDirection';

type Drop = { x: number; z: number; seed: number; floor: number; surface: number; y: number; previous: number };
type Ripple = { x: number; z: number; age: number };
export type LivingSceneWeatherDiagnostics = {
  weather: WeatherCue; rainIntensity: number; weatherMoving: boolean; weatherSettled: boolean;
  visibleRainDrops: number; rippleCount: number; dampPatchCount: number;
  supportRefreshes: number;
};

const DROP_COUNT = 128;
const RIPPLE_COUNT = 12;
const RING_SEGMENTS = 24;
const TOP = 3.15;
const FADE_SECONDS = 1.5;
const smooth = (t: number) => t * t * (3 - 2 * t);

function below(meshes: readonly AbstractMesh[], x: number, z: number, top = TOP, length = TOP): { y: number; point: Vector3 } | undefined {
  const ray = new Ray(new Vector3(x, top, z), Vector3.Down(), length);
  let best: { y: number; point: Vector3 } | undefined;
  for (const mesh of meshes) {
    if (!mesh.isEnabled() || !mesh.isVisible || mesh.isDisposed()) continue;
    const hit = ray.intersectsMesh(mesh, false);
    if (hit.hit && hit.pickedPoint && (!best || hit.pickedPoint.y > best.y)) best = { y: hit.pickedPoint.y, point: hit.pickedPoint };
  }
  return best;
}

function runtimeMesh(scene: Scene, name: string, positions: number[], indices: number[], normals: number[], colors?: number[]): Mesh {
  const mesh = new Mesh(name, scene);
  mesh.sideOrientation = Material.CounterClockWiseSideOrientation;
  mesh.isPickable = false;
  mesh.metadata = { livingSceneWeather: true };
  mesh.alwaysSelectAsActiveMesh = true;
  const data = new VertexData();
  data.positions = positions; data.indices = indices; data.normals = normals;
  if (colors) { data.colors = colors; mesh.hasVertexAlpha = true; }
  data.applyToMesh(mesh, true);
  mesh.setEnabled(false);
  return mesh;
}

/** Local world-space drizzle. Only three small draw meshes; no shader/backend fork. */
export class LivingSceneWeather {
  private weather: WeatherCue = 'none';
  private intensity = 0;
  private fade?: { from: number; to: number; elapsed: number };
  private time = 0;
  private reducedMotion = false;
  private disposed = false;
  private readonly drops: Drop[] = [];
  private readonly ripples: Ripple[] = [];
  private readonly dynamic: AbstractMesh[];
  private readonly lamp: StudyAssets['lamp'];
  private readonly rain: Mesh;
  private readonly rippleMesh: Mesh;
  private readonly damp: Mesh;
  private readonly dropPositions = new Float32Array(DROP_COUNT * 12);
  private readonly dropColors = new Float32Array(DROP_COUNT * 16);
  private readonly dropNormals = new Float32Array(DROP_COUNT * 12);
  private readonly billboardNormal = new Vector3(0, 0, 1);
  private dynamicState: number[] = [];
  private supportRefreshes = 0;
  private readonly ripplePositions = new Float32Array(RIPPLE_COUNT * RING_SEGMENTS * 12);
  private readonly rippleColors = new Float32Array(RIPPLE_COUNT * RING_SEGMENTS * 16);
  private readonly materials: PBRMaterial[];
  private readonly dampPatchCount: number;

  constructor(private readonly scene: Scene, assets: StudyAssets, private readonly refreshPresence: () => void) {
    this.lamp = assets.lamp;
    assets.meshes.forEach(mesh => mesh.computeWorldMatrix(true));
    const foreground = assets.meshes.filter(mesh => {
      for (let node = mesh.parent; node; node = node.parent) if (/Fading_StudySky|Fading_StudyBackdrop/.test(node.name)) return false;
      return mesh.getTotalVertices() > 0 && !mesh.metadata?.livingSceneTrace;
    });
    this.dynamic = foreground.filter(mesh => {
      if (mesh === assets.chair || mesh.isDescendantOf(assets.chair) || mesh === assets.lamp || mesh.isDescendantOf(assets.lamp)) return true;
      // Books, curtain and rail can leave the stage. Treat them as mutable
      // supports too, otherwise a cached fixed floor would stop rain in midair.
      for (let node: typeof mesh.parent = mesh; node; node = node.parent) {
        if (['Fading_StudyBooks', 'Fading_StudyCurtain', 'StudyPartialCurtain', 'StudyBedRail'].includes(node.name)) return true;
      }
      return false;
    });
    const fixed = foreground.filter(mesh => !this.dynamic.includes(mesh));
    let seed = 71429;
    const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
    for (let index = 0; index < DROP_COUNT; index++) {
      const x = -0.2 + random() * 2.65, z = -0.55 + random() * 3.15;
      const floor = Math.max(0, below(fixed, x, z)?.y ?? 0);
      this.drops.push({ x, z, seed: random(), floor, surface: floor, y: TOP, previous: TOP });
    }
    const rainIndices: number[] = [];
    for (let index = 0; index < DROP_COUNT; index++) { const v = index * 4; rainIndices.push(v, v + 1, v + 2, v, v + 2, v + 3); }
    for (let index = 2; index < this.dropNormals.length; index += 3) this.dropNormals[index] = 1;
    this.rain = runtimeMesh(scene, 'remembered rain around the lamp', Array.from(this.dropPositions), rainIndices, Array.from(this.dropNormals), Array.from(this.dropColors));
    const rippleIndices: number[] = [];
    for (let index = 0; index < RIPPLE_COUNT * RING_SEGMENTS; index++) { const v = index * 4; rippleIndices.push(v, v + 2, v + 1, v, v + 3, v + 2); }
    this.rippleMesh = runtimeMesh(scene, 'localized remembered water ripples', Array.from(this.ripplePositions), rippleIndices,
      Array.from({ length: this.ripplePositions.length }, (_, i) => i % 3 === 1 ? 1 : 0), Array.from(this.rippleColors));
    const dampPositions: number[] = [], dampIndices: number[] = [], dampNormals: number[] = [];
    let patchCount = 0;
    // Thin water-facing strips on a small subset of actual block tops. Shared
    // authored rock materials stay untouched; neither furniture nor books gloss.
    for (const mesh of fixed.filter(mesh => mesh.metadata?.gltf?.extras?.contact_surface || mesh.name.startsWith('StudyPavingSlab_')).slice(0, 28)) {
      const bounds = mesh.getBoundingInfo().boundingBox;
      const min = bounds.minimumWorld, max = bounds.maximumWorld;
      if (max.y < 0.02 || min.x > 3 || min.z > 3) continue;
      const xs = [min.x + 0.016, Math.min(max.x - 0.016, min.x + 0.045)], zs = [min.z + (max.z - min.z) * 0.22, min.z + (max.z - min.z) * 0.75];
      if (xs[1] <= xs[0]) continue;
      const corners = [[xs[0], zs[0]], [xs[1], zs[0]], [xs[1], zs[1]], [xs[0], zs[1]]].map(([x, z]) => below([mesh], x, z, max.y + 0.1, 0.25));
      if (corners.some(hit => !hit)) continue;
      const start = dampPositions.length / 3;
      corners.forEach(hit => { dampPositions.push(hit!.point.x, hit!.point.y + 0.0003, hit!.point.z); dampNormals.push(0, 1, 0); });
      dampIndices.push(start, start + 2, start + 1, start, start + 3, start + 2);
      patchCount++;
    }
    this.dampPatchCount = patchCount;
    this.damp = runtimeMesh(scene, 'selectively damp rock edges', dampPositions, dampIndices, dampNormals);
    const rainMaterial = new PBRMaterial('small lamp-catching rain', scene);
    rainMaterial.albedoColor = new Color3(0.68, 0.75, 0.79); rainMaterial.emissiveColor = new Color3(0.08, 0.095, 0.11);
    rainMaterial.roughness = 0.3; rainMaterial.backFaceCulling = false;
    const rippleMaterial = new PBRMaterial('quiet local ripple highlights', scene);
    rippleMaterial.albedoColor = new Color3(0.25, 0.37, 0.42); rippleMaterial.roughness = 0.6;
    const dampMaterial = new PBRMaterial('edge dampness without broad gloss', scene);
    dampMaterial.albedoColor = new Color3(0.025, 0.04, 0.05); dampMaterial.roughness = 0.56;
    this.materials = [rainMaterial, rippleMaterial, dampMaterial];
    this.materials.forEach(material => { material.metallic = 0; material.transparencyMode = PBRMaterial.PBRMATERIAL_ALPHABLEND; material.alpha = 0; });
    this.rain.material = rainMaterial; this.rippleMesh.material = rippleMaterial; this.damp.material = dampMaterial;
    this.damp.receiveShadows = true;
    assets.meshes.push(this.rain, this.rippleMesh, this.damp);
  }

  applyCue(cue: WeatherCue, immediate = false): void {
    if (this.disposed) return;
    if (cue === this.weather && !immediate) return;
    this.weather = cue;
    const target = cue === 'rain-memory' ? 1 : 0;
    if (immediate || this.reducedMotion) { this.intensity = target; this.fade = undefined; }
    else this.fade = { from: this.intensity, to: target, elapsed: 0 };
    this.refresh();
    if (immediate && !this.reducedMotion) this.updateDrops(0);
  }

  setReducedMotion(value: boolean): void {
    if (this.disposed) return;
    this.reducedMotion = value;
    this.applyCue(this.weather, true);
    if (value) this.ripples.length = 0;
  }

  private refresh(): void {
    const active = this.intensity > 0.001;
    const states = [active && !this.reducedMotion, active && !this.reducedMotion, active && this.dampPatchCount > 0];
    let changed = false;
    [this.rain, this.rippleMesh, this.damp].forEach((mesh, index) => { if (mesh.isEnabled() !== states[index]) { mesh.setEnabled(states[index]); changed = true; } });
    this.materials[0].alpha = this.intensity * 0.58;
    this.materials[1].alpha = this.intensity * 0.3;
    this.materials[2].alpha = this.intensity * 0.65;
    if (!active) this.ripples.length = 0;
    if (changed) this.refreshPresence();
  }

  update(seconds: number): void {
    if (this.disposed) return;
    const dt = Number.isFinite(seconds) ? Math.max(0, seconds) : 0;
    if (this.fade) {
      this.fade.elapsed += dt;
      const progress = Math.min(1, this.fade.elapsed / FADE_SECONDS);
      this.intensity = this.fade.from + (this.fade.to - this.fade.from) * smooth(progress);
      if (progress === 1) this.fade = undefined;
      this.refresh();
    }
    if (this.intensity <= 0.001 || this.reducedMotion) return;
    this.time += dt;
    this.updateDrops(dt);
  }

  private updateDrops(dt: number): void {
    const state: number[] = [];
    this.dynamic.forEach(mesh => {
      mesh.computeWorldMatrix(true);
      state.push(mesh.isEnabled() ? 1 : 0, mesh.isVisible ? 1 : 0, mesh.visibility, ...mesh.getWorldMatrix().m);
    });
    if (this.supportRefreshes === 0 || state.length !== this.dynamicState.length || state.some((value, index) => value !== this.dynamicState[index])) {
      this.dynamicState = state;
      this.supportRefreshes++;
      this.drops.forEach(drop => { drop.surface = Math.min(TOP - 0.05, Math.max(drop.floor, below(this.dynamic, drop.x, drop.z)?.y ?? 0)); });
    }
    const view = this.scene.activeCamera?.getViewMatrix(true).clone().invert();
    const right = view ? Vector3.TransformNormal(Vector3.Right(), view).normalize().scale(0.0028) : new Vector3(0.0028, 0, 0);
    const normal = Vector3.Cross(right, Vector3.Up()).normalize();
    if (!normal.equalsWithEpsilon(this.billboardNormal, 0.000001)) {
      this.billboardNormal.copyFrom(normal);
      for (let index = 0; index < this.dropNormals.length; index += 3) this.dropNormals.set([normal.x, normal.y, normal.z], index);
      this.rain.updateVerticesData(VertexBuffer.NormalKind, this.dropNormals);
    }
    this.drops.forEach((drop, index) => {
      const height = TOP - drop.surface - 0.002;
      const phase = ((drop.seed - this.time * 1.15 / height) % 1 + 1) % 1;
      drop.y = drop.surface + 0.002 + phase * height;
      if (drop.y > drop.previous + 0.3 && drop.surface < 0.001 && this.ripples.length < RIPPLE_COUNT) this.ripples.push({ x: drop.x, z: drop.z, age: 0 });
      drop.previous = drop.y;
      const base = index * 12;
      const top = Math.min(TOP, drop.y + 0.055);
      this.dropPositions.set([drop.x - right.x, drop.y, drop.z - right.z, drop.x + right.x, drop.y, drop.z + right.z,
        drop.x + right.x, top, drop.z + right.z, drop.x - right.x, top, drop.z - right.z], base);
      const warm = this.lamp.isEnabled() ? Math.max(0, 1 - Math.hypot(drop.x - 1.17, drop.y - 1.63, drop.z - 0.12) / 1.35) : 0;
      for (let vertex = 0; vertex < 4; vertex++) this.dropColors.set([0.55 + warm * 0.45, 0.65 + warm * 0.13, 0.76 - warm * 0.35, vertex < 2 ? 0.85 : 0.16], index * 16 + vertex * 4);
    });
    this.rain.updateVerticesData(VertexBuffer.PositionKind, this.dropPositions);
    this.rain.updateVerticesData(VertexBuffer.ColorKind, this.dropColors);
    this.ripples.forEach(ripple => { ripple.age += dt; });
    for (let index = this.ripples.length - 1; index >= 0; index--) if (this.ripples[index].age >= 0.9) this.ripples.splice(index, 1);
    this.ripplePositions.fill(0); this.rippleColors.fill(0);
    this.ripples.forEach((ripple, index) => {
      const radius = 0.015 + ripple.age * 0.14, width = 0.0018;
      for (let segment = 0; segment < RING_SEGMENTS; segment++) {
        const a = segment / RING_SEGMENTS * Math.PI * 2, b = (segment + 1) / RING_SEGMENTS * Math.PI * 2;
        const points = [[a, radius], [a, radius + width], [b, radius + width], [b, radius]];
        points.forEach(([angle, r], vertex) => {
          const base = (index * RING_SEGMENTS + segment) * 12 + vertex * 3;
          this.ripplePositions.set([ripple.x + Math.cos(angle) * r, 0.001, ripple.z + Math.sin(angle) * r], base);
          this.rippleColors.set([0.6, 0.75, 0.8, (1 - ripple.age / 0.9) * 0.7], (index * RING_SEGMENTS + segment) * 16 + vertex * 4);
        });
      }
    });
    this.rippleMesh.updateVerticesData(VertexBuffer.PositionKind, this.ripplePositions);
    this.rippleMesh.updateVerticesData(VertexBuffer.ColorKind, this.rippleColors);
  }

  reset(): void { this.applyCue('none', true); }
  getRainSamples(): readonly { x: number; y: number; z: number; surfaceY: number }[] { return this.drops.map(drop => ({ x: drop.x, y: drop.y, z: drop.z, surfaceY: drop.surface })); }
  getDiagnostics(): LivingSceneWeatherDiagnostics {
    return { weather: this.weather, rainIntensity: this.intensity, weatherMoving: Boolean(this.fade) || (!this.reducedMotion && this.intensity > 0.001),
      weatherSettled: !this.fade, visibleRainDrops: this.rain.isEnabled() ? DROP_COUNT : 0,
      rippleCount: this.rippleMesh.isEnabled() ? this.ripples.length : 0, dampPatchCount: this.damp.isEnabled() ? this.dampPatchCount : 0,
      supportRefreshes: this.supportRefreshes };
  }
  dispose(): void {
    if (this.disposed) return;
    this.disposed = true; this.weather = 'none'; this.fade = undefined; this.intensity = 0; this.ripples.length = 0;
    [this.rain, this.rippleMesh, this.damp].forEach(mesh => { mesh.setEnabled(false); mesh.dispose(false, true); });
    this.refreshPresence();
  }
}
