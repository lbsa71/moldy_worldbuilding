import type { Scene } from "@babylonjs/core/scene";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { ArcRotateCamera } from "@babylonjs/core/Cameras/arcRotateCamera";
import { Viewport } from "@babylonjs/core/Maths/math.viewport";

interface Framing {
  radius: number;
  narrowRadius: number;
  alpha: number;
  beta: number;
  height: number;
}

const JOURNEY: Framing = { radius: 7, narrowRadius: 5, alpha: -Math.PI / 2.5, beta: 1.36, height: 0.82 };
const STATIONS: Record<string, Framing> = {
  chair: { ...JOURNEY, alpha: -1.1, radius: 7.2, narrowRadius: 5.2 },
  cup: { radius: 2.3, narrowRadius: 1.5, alpha: -Math.PI / 2.5, beta: 0.95, height: 0.56 },
  rail: { radius: 8, narrowRadius: 6, alpha: -1.65, beta: 1.25, height: 0.9 },
  hand: { radius: 5.2, narrowRadius: 3.8, alpha: -1.5, beta: 1.25, height: 1 },
  contradiction: { radius: 9, narrowRadius: 7, alpha: -0.95, beta: 1.28, height: 0.9 },
  boundary: { radius: 8.2, narrowRadius: 6.3, alpha: -1.5, beta: 1.34, height: 0.9 },
  quiet: { radius: 10, narrowRadius: 8, alpha: -1.8, beta: 1.28, height: 0.8 },
  recollection: { radius: 9, narrowRadius: 7, alpha: -1.4, beta: 1.3, height: 0.9 },
  preparation: { radius: 8, narrowRadius: 6, alpha: -1.2, beta: 1.3, height: 0.9 },
  decision: { radius: 7.5, narrowRadius: 5.5, alpha: -1.15, beta: 1.32, height: 0.9 },
};
const CARRY: Framing = { radius: 14, narrowRadius: 10, alpha: -1.1, beta: 1.28, height: 1.2 };
const ENDING: Framing = { radius: 12, narrowRadius: 9, alpha: -Math.PI / 2.5, beta: 1.12, height: 0.95 };

export class CameraSystem {
  private camera: ArcRotateCamera;
  private reducedMotion = false;
  private hasTarget = false;
  private narrow = false;
  private narrativeScene: string | null = null;
  private destination: Vector3 | null = null;
  private lastPosition: Vector3 | null = null;

  constructor(private scene: Scene, private canvas: HTMLCanvasElement) {
    this.camera = new ArcRotateCamera(
      "camera", JOURNEY.alpha, JOURNEY.beta, JOURNEY.radius,
      new Vector3(0, JOURNEY.height, 0.3), scene,
    );
    this.camera.minZ = 0.2;
    this.camera.maxZ = 250;
    this.camera.lowerRadiusLimit = 1;
    this.camera.upperRadiusLimit = 24;
    this.camera.inputs.clear();
    this.scene.activeCamera = this.camera;
    this.resize();
  }

  public resize(): void {
    const width = this.canvas.clientWidth || this.scene.getEngine().getRenderWidth();
    this.narrow = width <= 900;
    const framing = this.lastPosition ? this.framingAt(this.lastPosition) : JOURNEY;
    this.camera.radius = this.narrow ? framing.narrowRadius : framing.radius;
    // Babylon viewport coordinates begin at the bottom of the canvas.
    this.camera.viewport = this.narrow
      ? new Viewport(0, 0.58, 1, 0.42)
      : new Viewport(0.35, 0, 0.65, 1);
  }

  private framingAt(position: Vector3): Framing {
    // Keep the journey visible; close-ups and wider emotional views settle on arrival.
    if (this.destination && Math.hypot(position.x - this.destination.x, position.z - this.destination.z) > 0.25) {
      return JOURNEY;
    }
    if (this.narrativeScene === "carry") return CARRY;
    if (this.narrativeScene === "keep" || this.narrativeScene === "rest") return ENDING;
    return (this.narrativeScene && STATIONS[this.narrativeScene]) || JOURNEY;
  }

  public updatePosition(characterPosition: Vector3): void {
    this.lastPosition = characterPosition.clone();
    const framing = this.framingAt(characterPosition);
    const inspectingCup = framing === STATIONS.cup;
    const anchor = inspectingCup ? (this.destination || characterPosition) : characterPosition;
    const desired = new Vector3(
      anchor.x + (inspectingCup ? 0.7 : 0),
      characterPosition.y + framing.height,
      anchor.z + (inspectingCup ? 0.9 : 0.3),
    );
    const deltaSeconds = Math.min(Math.max(this.scene.getEngine().getDeltaTime() / 1000, 0), 0.1);
    const blend = this.reducedMotion || !this.hasTarget ? 1 : 1 - Math.exp(-2.4 * deltaSeconds);
    // Preserve orbit while moving its center; setTarget otherwise rebuilds radius/angles
    // from the previous camera position and turns travel into an unintended zoom.
    this.camera.setTarget(Vector3.Lerp(this.camera.target, desired, blend), false, true, true);
    const radius = this.narrow ? framing.narrowRadius : framing.radius;
    this.camera.radius += (radius - this.camera.radius) * blend;
    this.camera.beta += (framing.beta - this.camera.beta) * blend;
    const angle = framing.alpha - this.camera.alpha;
    this.camera.alpha += Math.atan2(Math.sin(angle), Math.cos(angle)) * blend;
    this.hasTarget = true;
  }

  public setReducedMotion(enabled: boolean): void { this.reducedMotion = enabled; }
  public setNarrativeScene(name: string | null, destination?: Vector3): void {
    this.narrativeScene = name;
    this.destination = destination?.clone() || null;
  }
  public getCamera(): ArcRotateCamera { return this.camera; }
  public setCameraTarget(target: Vector3): void {
    this.hasTarget = false;
    this.updatePosition(target);
  }
  public dispose(): void { this.camera.dispose(); }
}
