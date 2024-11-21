import {
  Scene,
  Vector3,
  MeshBuilder,
  PBRMaterial,
  Color3,
  Color4,
  TransformNode,
  Mesh,
  ActionManager,
  ExecuteCodeAction,
  Space,
} from "@babylonjs/core";
import { ParticleSystemManager } from "./ParticleSystem";
import { CameraSystem } from "./CameraSystem";
import { LightingSystem } from "./LightingSystem";

export class FloatingObjects {
  private orbitRoot: TransformNode;
  private floatingObjects: Mesh[] = [];
  private time = 0;
  private path: Vector3[];

  constructor(
    private scene: Scene,
    private particleSystem: ParticleSystemManager,
    private cameraSystem: CameraSystem,
    private lightingSystem: LightingSystem
  ) {
    this.orbitRoot = new TransformNode("orbitRoot", scene);
    this.path = this.createOrbitalPath();
    this.createFloatingObjects();
    this.setupAnimation();
  }

  private createOrbitalPath(): Vector3[] {
    const points: Vector3[] = [];
    const segments = 120;
    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      const x = Math.cos(angle) * 8;
      const z = Math.sin(angle) * 8;
      const y = Math.sin(angle * 3) * 2 + 3;
      points.push(new Vector3(x, y, z));
    }
    return points;
  }

  private createFloatingObjects(): void {
    const numObjects = 8;

    for (let i = 0; i < numObjects; i++) {
      const box = MeshBuilder.CreateBox(`box${i}`, { size: 0.8 }, this.scene);

      const boxMaterial = new PBRMaterial(`boxMaterial${i}`, this.scene);
      boxMaterial.metallic = 0.5;
      boxMaterial.roughness = 0.3;
      const color = new Color3(Math.random(), Math.random(), Math.random());
      boxMaterial.albedoColor = color;
      boxMaterial.emissiveColor = color.scale(0.5);
      box.material = boxMaterial;

      this.lightingSystem.addShadowCaster(box);
      box.parent = this.orbitRoot;
      this.floatingObjects.push(box);

      // Add interaction
      box.actionManager = new ActionManager(this.scene);
      box.actionManager.registerAction(
        new ExecuteCodeAction(ActionManager.OnPickTrigger, () => {
          this.handleObjectClick(box);
        })
      );
    }
  }

  private handleObjectClick(box: Mesh): void {
    // Get current color for explosion effect
    const material = box.material as PBRMaterial;
    const color = material.albedoColor;

    // Create explosion effect with current color
    this.particleSystem.createExplosionEffect(
      box,
      new Color4(color.r, color.g, color.b, 1.0)
    );

    // Animate camera to look at the clicked box
    this.cameraSystem.animateToPosition(
      box.getAbsolutePosition().add(new Vector3(0, 2, -5)),
      this.cameraSystem.getCamera().alpha + Math.PI / 4,
      Math.PI / 2.2
    );
  }

  private setupAnimation(): void {
    this.scene.onBeforeRenderObservable.add(() => {
      this.time += this.scene.getEngine().getDeltaTime() / 1000;

      this.floatingObjects.forEach((box, index) => {
        if (box.visibility === 0) return; // Skip if object is currently exploding

        const offset = (index / this.floatingObjects.length) * this.path.length;
        const pos = Math.floor((this.time * 0.2 + offset) % this.path.length);
        const nextPos = (pos + 1) % this.path.length;

        const current = this.path[pos];
        const next = this.path[nextPos];

        const interpolation = (this.time * 0.2 + offset) % 1;
        const position = Vector3.Lerp(current, next, interpolation);

        box.position = position;
        box.rotate(Vector3.Up(), 0.02, Space.WORLD);
      });

      this.orbitRoot.rotate(Vector3.Up(), 0.005, Space.WORLD);
    });
  }
}
