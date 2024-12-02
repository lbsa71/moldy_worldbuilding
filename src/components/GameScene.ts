import {
  Engine,
  Scene,
  Vector3,
  WebGPUEngine,
  ArcRotateCamera,
  Color4,
  Matrix,
  PointerEventTypes,
  Ray,
  HavokPlugin,
} from "@babylonjs/core";
import "@babylonjs/loaders/glTF";
import HavokPhysics from "@babylonjs/havok";

import { TerrainSystem } from "./game/TerrainSystem";
import { AtmosphereSystem } from "./game/AtmosphereSystem";
import { EnvironmentSystem } from "./game/EnvironmentSystem";
import { Character } from "./game/Character";

export class GameScene {
  private engine!: Engine;
  private scene!: Scene;
  private camera!: ArcRotateCamera;
  private terrain!: TerrainSystem;
  private atmosphere!: AtmosphereSystem;
  private environment!: EnvironmentSystem;
  private character!: Character;
  private initialized = false;
  private isWebGPU = false;
  private cameraTarget = Vector3.Zero();
  private havokPlugin?: HavokPlugin;
  private cameraOffset: Vector3;
  private cameraSmoothingFactor = 0.1;
  private cameraHeightOffset = 5;
  private cameraDistanceFromCharacter = 25;

  constructor(private canvas: HTMLCanvasElement) {
    this.cameraOffset = new Vector3(
      0,
      this.cameraHeightOffset,
      -this.cameraDistanceFromCharacter
    );
  }

  public async initialize(): Promise<void> {
    try {
      await this.setupEngine();
      await this.setupPhysics();
      this.setupCamera();
      await this.initializeSystems();
      this.setupInteraction();
      this.initialized = true;
      console.log("Game initialization complete");
    } catch (error) {
      console.error("Failed to initialize game:", error);
      throw error;
    }
  }

  private async setupEngine(): Promise<void> {
    const webGPUSupported = await WebGPUEngine.IsSupportedAsync;

    if (webGPUSupported) {
      const webGPUEngine = new WebGPUEngine(this.canvas);
      await webGPUEngine.initAsync();
      this.engine = webGPUEngine as unknown as Engine;
      this.isWebGPU = true;
    } else {
      this.engine = new Engine(this.canvas, true);
      this.isWebGPU = false;
    }

    this.scene = new Scene(this.engine);
    this.scene.clearColor = new Color4(0.05, 0.05, 0.05, 1);

    // Enable collision detection
    this.scene.collisionsEnabled = true;
    this.scene.gravity = new Vector3(0, -9.81, 0);
  }

  private async setupPhysics(): Promise<void> {
    try {
      const havokInstance = await HavokPhysics({
        locateFile: () => "/HavokPhysics.wasm",
      });

      this.havokPlugin = new HavokPlugin(false, havokInstance);
      this.scene.enablePhysics(new Vector3(0, -9.81 * 2, 0), this.havokPlugin);
      this.havokPlugin.setTimeStep(1 / 120);

      console.log("Physics initialized successfully");
    } catch (error) {
      console.error("Failed to initialize physics:", error);
      throw error;
    }
  }

  private setupCamera(): void {
    this.camera = new ArcRotateCamera(
      "camera",
      Math.PI * 0.75,
      Math.PI * 0.35,
      this.cameraDistanceFromCharacter,
      this.cameraTarget,
      this.scene
    );

    this.camera.attachControl(this.canvas, true);
    this.camera.lowerRadiusLimit = 15;
    this.camera.upperRadiusLimit = 50;
    this.camera.wheelDeltaPercentage = 0.01;

    this.camera.upperBetaLimit = Math.PI / 2.2;
    this.camera.lowerBetaLimit = Math.PI / 4;

    this.camera.inertia = 0.7;
    this.camera.angularSensibilityX = 500;
    this.camera.angularSensibilityY = 500;

    this.camera.panningSensibility = 0;
  }

  private updateCameraPosition(): void {
    const characterPos = this.character.getPosition();

    this.cameraTarget = Vector3.Lerp(
      this.cameraTarget,
      new Vector3(
        characterPos.x,
        characterPos.y + this.cameraHeightOffset,
        characterPos.z
      ),
      this.cameraSmoothingFactor
    );

    this.camera.target = this.cameraTarget;
  }

  private lerpAngle(start: number, end: number, factor: number): number {
    let difference = end - start;
    while (difference < -Math.PI) difference += Math.PI * 2;
    while (difference > Math.PI) difference -= Math.PI * 2;
    return start + difference * factor;
  }

  private async initializeSystems(): Promise<void> {
    try {
      this.atmosphere = new AtmosphereSystem(this.scene);

      console.log("Creating terrain...");
      this.terrain = new TerrainSystem(this.scene);
      await this.terrain.waitForReady();
      console.log("Terrain ready");

      console.log("Setting up environment...");
      this.environment = new EnvironmentSystem(this.scene);
      this.environment.populate(this.terrain.terrain);

      console.log("Creating character...");
      this.character = new Character(this.scene);

      const startPos = new Vector3(0, 50, 0);
      this.character.setPosition(startPos);

      const ray = new Ray(startPos, new Vector3(0, -1, 0), 100);
      const hit = this.scene.pickWithRay(
        ray,
        (mesh) => mesh === this.terrain.terrain
      );

      if (hit?.pickedPoint) {
        this.character.setPosition(
          new Vector3(
            hit.pickedPoint.x,
            hit.pickedPoint.y + 1,
            hit.pickedPoint.z
          )
        );
        this.cameraTarget = hit.pickedPoint.clone();
      }

      this.scene.registerBeforeRender(() => {
        this.updateCameraPosition();
      });

      console.log("Systems initialization complete");
    } catch (error) {
      console.error("Failed to initialize systems:", error);
      throw error;
    }
  }

  private setupInteraction(): void {
    this.scene.onPointerObservable.add((pointerInfo) => {
      if (pointerInfo.type === PointerEventTypes.POINTERDOWN) {
        const ray = this.scene.createPickingRay(
          this.scene.pointerX,
          this.scene.pointerY,
          Matrix.Identity(),
          this.camera
        );

        const hit = this.scene.pickWithRay(ray);
        if (hit?.pickedPoint && hit.pickedMesh === this.terrain.terrain) {
          console.log("Moving to:", hit.pickedPoint);
          this.character.moveTo(hit.pickedPoint, this.terrain.terrain);
        }
      }
    });
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

  public getFps(): number {
    return this.engine.getFps();
  }

  public getRendererType(): string {
    return this.isWebGPU ? "WebGPU" : "WebGL";
  }
}
