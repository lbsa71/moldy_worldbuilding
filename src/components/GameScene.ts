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
  AbstractMesh,
} from "@babylonjs/core";
import "@babylonjs/loaders/glTF";
import HavokPhysics from "@babylonjs/havok";
import {
    AdvancedDynamicTexture,
    Button,
    Control,
    TextBlock,
} from "@babylonjs/gui";

import { TerrainSystem } from "./game/TerrainSystem";
import { AtmosphereSystem } from "./game/AtmosphereSystem";
import { EnvironmentSystem } from "./game/EnvironmentSystem";
import { Character } from "./game/Character";
import { loadInkFile, getCurrentDialogue, choose, getPositionTag } from "../utils/ink";
import { Choice } from "inkjs/engine/Choice";

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
  private guiTexture!: any;
  private dialogueText!: any;
  private currentStory: any;

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
      this.setupGUI();
      await this.loadInkStory();
      this.initialized = true;
      console.log("Game initialization complete");
    } catch (error) {
      console.error("Failed to initialize game:", error);
      throw error;
    }
  }

    private async loadInkStory(): Promise<void> {
        try {
            this.currentStory = await loadInkFile("/ink/simple.ink");
            this.progressStory();
        } catch (error) {
            console.error("Failed to load ink story:", error);
        }
    }

    private progressStory(): void {
        if (!this.currentStory) return;

        const { text, choices } = getCurrentDialogue(this.currentStory);
        this.dialogueText.text = text;

        // Remove existing buttons
        if( this.guiTexture.children) {
          this.guiTexture.children
          .filter((child: Control) => child instanceof Button)
          .forEach((child: Control) => this.guiTexture.removeControl(child));
        }

        choices.forEach((choice, index) => {
            const button = Button.CreateSimpleButton(`choice${index}`, choice.text);
            button.width = "30%";
            button.height = "40px";
            button.color = "white";
            button.background = "black";
            button.top = `${(index + 1) * 50 + 50}px`;
            button.left = "20px";
            button.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
            button.onPointerUpObservable.add(() => this.handleChoiceClick(index));
            this.guiTexture.addControl(button);
        });


        const position = getPositionTag(this.currentStory);
        if (position) {
            this.character.moveTo(new Vector3(position.x, 0, position.z), this.terrain.terrain);
        }
    }

    private setupGUI(): void {
        this.guiTexture = AdvancedDynamicTexture.CreateFullscreenUI("gui");

        this.dialogueText = new TextBlock();
        this.dialogueText.color = "white";
        this.dialogueText.fontSize = 24;
        this.dialogueText.textWrapping = true;
        this.dialogueText.width = "80%";
        this.dialogueText.height = "auto";
        this.dialogueText.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
        this.dialogueText.textVerticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
        this.dialogueText.paddingTop = "20px";
        this.dialogueText.paddingLeft = "20px";
        this.guiTexture.addControl(this.dialogueText);
    }


    private handleChoiceClick(choiceIndex: number): void {
        if (!this.currentStory) return;
        choose(this.currentStory, choiceIndex);
        this.progressStory();
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
        (mesh: AbstractMesh) => mesh === this.terrain.terrain
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
