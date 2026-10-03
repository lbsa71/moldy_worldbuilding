import type { Scene } from "@babylonjs/core/scene";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { CreateTorus } from "@babylonjs/core/Meshes/Builders/torusBuilder";
import { CreateCylinder } from "@babylonjs/core/Meshes/Builders/cylinderBuilder";
import type { Mesh } from "@babylonjs/core/Meshes/mesh";
import type { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";
// This module also registers scene.pickWithRay, used for terrain grounding.
import { Ray } from "@babylonjs/core/Culling/ray";

export class Character {
  private root: TransformNode;
  private targetPosition?: Vector3;
  private terrain?: AbstractMesh;
  private moveSpeed = 4;
  private reducedMotion = false;
  private disposed = false;
  private completeMovement?: () => void;
  private readonly updateFrame = () => this.update();

  constructor(private scene: Scene) {
    this.root = new TransformNode("characterRoot", scene);
    // A quiet point of attention, rather than an embodied avatar suggesting free movement.
    const surface = new StandardMaterial("listenerSurface", scene);
    surface.diffuseColor = new Color3(0.58, 0.61, 0.62);
    surface.emissiveColor = new Color3(0.035, 0.042, 0.05);
    surface.specularColor = Color3.Black();
    surface.alpha = 0.4;
    const ring = CreateTorus("listenerRing", { diameter: 0.65, thickness: 0.025, tessellation: 32 }, scene);
    ring.parent = this.root;
    ring.material = surface;
    ring.isPickable = false;
    const center = CreateCylinder("listenerCenter", { diameter: 0.13, height: 0.012, tessellation: 24 }, scene);
    center.parent = this.root;
    center.material = surface;
    center.isPickable = false;
    scene.registerBeforeRender(this.updateFrame);
  }

  private update(): void {
    if (this.disposed || !this.targetPosition) return;
    if (this.reducedMotion) { this.finishAtTarget(); return; }
    const deltaSeconds = Math.min(Math.max(this.scene.getEngine().getDeltaTime() / 1000, 0), 0.1);
    const direction = this.targetPosition.subtract(this.root.position);
    direction.y = 0;
    const distance = direction.length();
    const step = Math.min(this.moveSpeed * deltaSeconds, distance);
    if (distance <= step || distance < 0.02) { this.finishAtTarget(); return; }
    direction.normalize();
    const targetAngle = Math.atan2(direction.x, direction.z);
    const difference = targetAngle - this.root.rotation.y;
    const shortestAngle = Math.atan2(Math.sin(difference), Math.cos(difference));
    this.root.rotation.y += shortestAngle * (1 - Math.exp(-8 * deltaSeconds));
    const next = this.root.position.add(direction.scale(step));
    this.groundPosition(next);
    this.root.position.copyFrom(next);
  }

  private groundPosition(position: Vector3): void {
    if (!this.terrain) return;
    const hit = this.scene.pickWithRay(
      new Ray(new Vector3(position.x, 100, position.z), Vector3.Down(), 200),
      mesh => mesh === this.terrain,
    );
    if (hit?.pickedPoint) position.y = hit.pickedPoint.y + 0.04;
  }

  private finishAtTarget(): void {
    if (this.targetPosition) {
      const destination = this.targetPosition.clone();
      this.groundPosition(destination);
      this.root.position.copyFrom(destination);
    }
    this.targetPosition = undefined;
    this.completeMovement?.();
    this.completeMovement = undefined;
  }

  public moveTo(target: Vector3, terrain: Mesh): Promise<void> {
    if (this.disposed) return Promise.resolve();
    this.completeMovement?.();
    this.terrain = terrain;
    this.targetPosition = target.clone();
    const movement = new Promise<void>(resolve => { this.completeMovement = resolve; });
    if (this.reducedMotion) this.finishAtTarget();
    return movement;
  }

  public setReducedMotion(enabled: boolean): void {
    this.reducedMotion = enabled;
    if (enabled) {
      if (this.targetPosition) this.finishAtTarget();
    }
  }
  public setPosition(position: Vector3): void {
    this.completeMovement?.();
    this.completeMovement = undefined;
    this.targetPosition = undefined;
    this.root.position.copyFrom(position);
  }
  public getPosition(): Vector3 { return this.root.position; }
  public dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.scene.unregisterBeforeRender(this.updateFrame);
    this.completeMovement?.();
    this.completeMovement = undefined;
    this.root.dispose(false, true);
  }
}
