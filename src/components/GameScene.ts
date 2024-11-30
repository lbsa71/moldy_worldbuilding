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

  constructor(private canvas: HTMLCanvasElement) {}

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
      // Load Havok WASM
      const havokInstance = await HavokPhysics({
        locateFile: () => "/HavokPhysics.wasm",
      });

      // Create and initialize the physics plugin with continuous collision detection
      // Set the last parameter to false to disable debug visualization
      this.havokPlugin = new HavokPlugin(false, havokInstance); // Changed from true to false

      // Enable physics in the scene with increased gravity
      this.scene.enablePhysics(new Vector3(0, -9.81 * 2, 0), this.havokPlugin);

      // Set physics timestep for better stability
      this.havokPlugin.setTimeStep(1 / 120);

      console.log("Physics initialized successfully");
    } catch (error) {
      console.error("Failed to initialize physics:", error);
      throw error;
    }
  }

  private setupCamera(): void {
    // More dramatic initial angle
    this.camera = new ArcRotateCamera(
      "camera",
      Math.PI * 0.75, // More side view
      Math.PI * 0.35, // Lower angle
      25,
      Vector3.Zero(),
      this.scene
    );
    this.camera.attachControl(this.canvas, true);
    this.camera.lowerRadiusLimit = 15;
    this.camera.upperRadiusLimit = 50;
    this.camera.wheelDeltaPercentage = 0.01;

    // Limit vertical rotation for better views
    this.camera.upperBetaLimit = Math.PI / 2.2;
    this.camera.lowerBetaLimit = Math.PI / 4;

    // Smoother camera movement
    this.camera.inertia = 0.7;
    this.camera.angularSensibilityX = 500;
    this.camera.angularSensibilityY = 500;
  }

  private async initializeSystems(): Promise<void> {
    try {
      // Initialize atmosphere first for proper rendering order
      this.atmosphere = new AtmosphereSystem(this.scene);

      // Create terrain and wait for it to be ready
      console.log("Creating terrain...");
      this.terrain = new TerrainSystem(this.scene);
      await this.terrain.waitForReady();
      console.log("Terrain ready");

      // Add environmental objects
      console.log("Setting up environment...");
      this.environment = new EnvironmentSystem(this.scene);
      this.environment.populate(this.terrain.terrain);

      // Create character
      console.log("Creating character...");
      this.character = new Character(this.scene);

      // Position character above ground and update its height
      const startPos = new Vector3(0, 50, 0); // Start high to ensure ray hits terrain
      this.character.setPosition(startPos);

      // Cast ray to find ground height
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

      // Smooth camera follow
      this.scene.registerBeforeRender(() => {
        const charPos = this.character.getPosition();
        // Smoothly interpolate camera target
        this.cameraTarget = Vector3.Lerp(this.cameraTarget, charPos, 0.1);
        this.camera.target = this.cameraTarget;
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
