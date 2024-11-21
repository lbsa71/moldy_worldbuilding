import { Engine, Scene } from "@babylonjs/core";
import { CameraSystem } from "./game/CameraSystem";
import { LightingSystem } from "./game/LightingSystem";
import { EnvironmentSystem } from "./game/EnvironmentSystem";
import { ParticleSystemManager } from "./game/ParticleSystem";
import { FloatingObjects } from "./game/FloatingObjects";
import { CentralObjects } from "./game/CentralObjects";

declare global {
  interface Window {
    calculatePhysics: (x: number, y: number, z: number) => number;
  }
}

export class GameScene {
  private engine: Engine;
  private scene: Scene;
  private cameraSystem!: CameraSystem;
  private lightingSystem!: LightingSystem;
  private environmentSystem!: EnvironmentSystem;
  private particleSystem!: ParticleSystemManager;
  private floatingObjects!: FloatingObjects;
  private centralObjects!: CentralObjects;

  constructor(private canvas: HTMLCanvasElement) {
    this.engine = new Engine(canvas, true);
    this.scene = new Scene(this.engine);

    if (typeof window.calculatePhysics === "function") {
      this.initialize();
    } else {
      const checkWasm = setInterval(() => {
        if (typeof window.calculatePhysics === "function") {
          clearInterval(checkWasm);
          this.initialize();
        }
      }, 100);
    }
  }

  private initialize(): void {
    // Initialize all systems
    this.cameraSystem = new CameraSystem(this.scene, this.canvas);
    this.lightingSystem = new LightingSystem(this.scene);
    this.environmentSystem = new EnvironmentSystem(
      this.scene,
      this.cameraSystem.getCamera()
    );
    this.particleSystem = new ParticleSystemManager(this.scene);

    // Initialize central objects
    this.centralObjects = new CentralObjects(this.scene, this.lightingSystem);

    // Initialize floating objects last since it depends on other systems
    this.floatingObjects = new FloatingObjects(
      this.scene,
      this.particleSystem,
      this.cameraSystem,
      this.lightingSystem
    );
  }

  public render(): void {
    this.engine.runRenderLoop(() => {
      this.scene.render();
    });

    window.addEventListener("resize", () => {
      this.engine.resize();
    });
  }
}
