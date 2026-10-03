import type { Scene } from "@babylonjs/core/scene";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { ArcRotateCamera } from "@babylonjs/core/Cameras/arcRotateCamera";
import { Viewport } from "@babylonjs/core/Maths/math.viewport";

export class CameraSystem {
  private camera: ArcRotateCamera;
  private reducedMotion = false;
  private hasTarget = false;
  private narrow = false;
  private narrativeScene: string | null = null;

  constructor(private scene: Scene, private canvas: HTMLCanvasElement) {
    // A directed view keeps the lamp in the composition and the story panel clear.
    this.camera = new ArcRotateCamera(
      "camera", -Math.PI / 2.5, 1.36, 7,
      new Vector3(0, 0.82, 0.3), scene,
    );
    this.camera.minZ = 0.2;
    this.camera.maxZ = 250;
    this.camera.lowerRadiusLimit = 1;
    this.camera.upperRadiusLimit = 9;
    this.camera.inputs.clear();
    this.scene.activeCamera = this.camera;
    this.resize();
  }

  public resize(): void {
    const width = this.canvas.clientWidth || this.scene.getEngine().getRenderWidth();
    this.narrow = width <= 900;
    this.camera.radius = this.framingRadius();
    // Babylon viewport coordinates begin at the bottom of the canvas.
    // Reserve the lower sheet on narrow displays and the reading column on wide ones.
    this.camera.viewport = width <= 900
      ? new Viewport(0, 0.58, 1, 0.42)
      : new Viewport(0.35, 0, 0.65, 1);
  }

  public updatePosition(characterPosition: Vector3): void {
    const boundedShift = (value: number) => Math.max(-0.7, Math.min(0.7, value * 0.025));
    // The chip is narrative evidence: give the human-scale cup a deliberate close-up.
    const inspectingCup = this.narrativeScene === "cup";
    const desired = inspectingCup ? new Vector3(0.7, 0.56, 0.9)
      : new Vector3(boundedShift(characterPosition.x), 0.82, 0.3 + boundedShift(characterPosition.z));
    const deltaSeconds = Math.min(Math.max(this.scene.getEngine().getDeltaTime() / 1000, 0), 0.1);
    const blend = this.reducedMotion || !this.hasTarget ? 1 : 1 - Math.exp(-2.4 * deltaSeconds);
    this.camera.target = Vector3.Lerp(this.camera.target, desired, blend);
    this.camera.radius += (this.framingRadius() - this.camera.radius) * blend;
    this.camera.beta += ((inspectingCup ? 0.95 : 1.36) - this.camera.beta) * blend;
    this.hasTarget = true;
  }

  public setReducedMotion(enabled: boolean): void { this.reducedMotion = enabled; }
  public setNarrativeScene(name: string | null): void { this.narrativeScene = name; }
  private framingRadius(): number {
    return this.narrativeScene === "cup" ? (this.narrow ? 1.5 : 2.3) : (this.narrow ? 5 : 7);
  }
  public getCamera(): ArcRotateCamera { return this.camera; }
  public setCameraTarget(target: Vector3): void {
    this.hasTarget = false;
    this.updatePosition(target);
  }
  public dispose(): void { this.camera.dispose(); }
}
