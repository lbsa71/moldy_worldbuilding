import { Color3 } from "@babylonjs/core/Maths/math.color";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import type { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";
import type { Observer } from "@babylonjs/core/Misc/observable";
import type { Scene } from "@babylonjs/core/scene";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { CreateTube } from "@babylonjs/core/Meshes/Builders/tubeBuilder";

export const palette = {
  slate: Color3.FromHexString("#546468"), stone: Color3.FromHexString("#303D40"),
  bone: Color3.FromHexString("#CFD7CC"), brass: Color3.FromHexString("#C99550"),
  ivory: Color3.FromHexString("#ECE6CD"), blue: Color3.FromHexString("#719297"),
};
export function bounded(value: number, fallback = 0): number {
  return Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : fallback;
}
export function material(scene: Scene, name: string, color: Color3, emission = 0): StandardMaterial {
  const result = new StandardMaterial(name, scene);
  result.diffuseColor = color; result.specularColor = Color3.Black();
  result.emissiveColor = color.scale(emission); result.backFaceCulling = false;
  return result;
}
/** Memories own their geometry, materials and a removable transition observer. */
export class FadingSymbol {
  protected root: TransformNode;
  protected meshes: AbstractMesh[] = [];
  protected materials: StandardMaterial[] = [];
  protected visibility = 0;
  protected targetVisibility = 0;
  protected reducedMotion = false;
  private observer: Observer<Scene> | null;
  private elapsed = 0;
  private restingY: number;
  private targetRotationY: number;
  constructor(protected scene: Scene, name: string, position: Vector3, rotation = Vector3.Zero(), private floatAmount = 0) {
    this.root = new TransformNode(name, scene);
    this.root.position.copyFrom(position); this.root.rotation.copyFrom(rotation); this.restingY = position.y;
    this.targetRotationY = rotation.y;
    this.observer = scene.onBeforeRenderObservable.add(() => {
      const dt = Math.min(scene.getEngine().getDeltaTime() / 1000 || 1 / 60, 0.1);
      this.elapsed += dt;
      this.visibility += (this.targetVisibility - this.visibility) * (1 - Math.exp(-dt * 2));
      this.applyVisibility();
      this.root.position.y = this.restingY + (this.reducedMotion ? 0 : Math.sin(this.elapsed * 0.55) * this.floatAmount);
      const difference = this.targetRotationY - this.root.rotation.y;
      const shortest = Math.atan2(Math.sin(difference), Math.cos(difference));
      this.root.rotation.y += shortest * (this.reducedMotion ? 1 : 1 - Math.exp(-dt * 1.5));
    });
  }
  protected add(mesh: Mesh, surface: StandardMaterial): Mesh {
    mesh.parent = this.root; mesh.material = surface; mesh.isPickable = false; mesh.visibility = this.visibility;
    this.meshes.push(mesh); if (!this.materials.includes(surface)) this.materials.push(surface); return mesh;
  }
  protected line(name: string, points: Vector3[], surface: StandardMaterial, radius = 0.025): Mesh {
    return this.add(CreateTube(name, { path: points, radius, tessellation: 6, cap: Mesh.CAP_ALL }, this.scene), surface);
  }
  private applyVisibility(): void {
    this.meshes.forEach(mesh => { mesh.visibility = this.visibility; mesh.setEnabled(this.visibility > 0.002 || this.targetVisibility > 0); });
  }
  setVisibility(value: number): void {
    this.targetVisibility = bounded(value);
    if (this.reducedMotion) { this.visibility = this.targetVisibility; this.applyVisibility(); }
  }
  setReducedMotion(value: boolean): void {
    this.reducedMotion = value;
    if (value) { this.visibility = this.targetVisibility; this.root.position.y = this.restingY; this.root.rotation.y = this.targetRotationY; this.applyVisibility(); }
  }
  setRotationY(value: number): void {
    if (!Number.isFinite(value)) return;
    this.targetRotationY = value;
    if (this.reducedMotion) this.root.rotation.y = value;
  }
  updatePosition(position: Vector3): void { this.root.position.copyFrom(position); this.restingY = position.y; }
  setScale(value: number): void {
    if (Number.isFinite(value) && value > 0) this.root.scaling.setAll(value);
  }
  dispose(): void {
    this.scene.onBeforeRenderObservable.remove(this.observer); this.root.dispose();
    this.materials.forEach(surface => surface.dispose());
  }
}
export function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state / 4294967296; };
}
