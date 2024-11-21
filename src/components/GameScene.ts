import { Engine, Scene, WebGPUEngine } from "@babylonjs/core";
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
  private engine!: Engine;
  private scene!: Scene;
  private cameraSystem!: CameraSystem;
  private lightingSystem!: LightingSystem;
  private environmentSystem!: EnvironmentSystem;
  private particleSystem!: ParticleSystemManager;
  private floatingObjects!: FloatingObjects;
  private centralObjects!: CentralObjects;
  private initialized = false;

  constructor(private canvas: HTMLCanvasElement) {}

  public async initialize(): Promise<void> {
    await this.setupEngine();

    if (typeof window.calculatePhysics === "function") {
      this.initializeSystems();
    } else {
      await new Promise<void>((resolve) => {
        const checkWasm = setInterval(() => {
          if (typeof window.calculatePhysics === "function") {
            clearInterval(checkWasm);
            this.initializeSystems();
            resolve();
          }
        }, 100);
      });
    }

    this.initialized = true;
  }

  private async setupEngine(): Promise<void> {
    // Check if WebGPU is available
    const webGPUSupported = await WebGPUEngine.IsSupportedAsync;

    if (webGPUSupported) {
      const webGPUEngine = new WebGPUEngine(this.canvas);
      await webGPUEngine.initAsync();
      this.engine = webGPUEngine as unknown as Engine;
    } else {
      // Fallback to WebGL
      this.engine = new Engine(this.canvas, true);
    }

    this.scene = new Scene(this.engine);
  }

  private initializeSystems(): void {
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

  public async run(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }

    this.engine.runRenderLoop(() => {
      this.scene.render();
    });

    window.addEventListener("resize", () => {
      this.engine.resize();
    });
  }
}
