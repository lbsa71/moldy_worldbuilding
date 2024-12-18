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
  AbstractMesh,
} from "@babylonjs/core";
import "@babylonjs/loaders/glTF";
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
import { loadInkFile, getCurrentDialogue, choose } from "../utils/ink";

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
  private cameraOffset: Vector3;
  private cameraSmoothingFactor = 0.1;
  private cameraHeightOffset = 5;
  private cameraDistanceFromCharacter = 25;
  private guiTexture!: any;
  private dialogueText!: any;
  private currentStory: any;
  private currentButtonNames: string[] = [];
  private enableAtmosphere = true; // Toggle for atmosphere
  private enableEnvironment = true; // Toggle for environment
  private enableInk = true; // Toggle for Ink
  private enableTerrain = true; // Toggle for terrain
  private enableCharacter = true; // Toggle for character

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
      this.setupCamera();
      await this.initializeSystems();
      this.setupGUI();
      if (this.enableInk) {
        await this.loadInkStory();
      }
      this.initialized = true;
      console.log("Game initialization complete");
    } catch (error) {
      console.error("Failed to initialize game:", error);
      throw error;
    }
  }

  private async loadInkStory(): Promise<void> {
    try {
      this.currentStory = await loadInkFile("/ink/demo.ink");
      this.progressStory();
    } catch (error) {
      console.error("Failed to load ink story:", error);
    }
  }

  private progressStory(): void {
    if (!this.currentStory) return;

    const { text, choices, position } = getCurrentDialogue(this.currentStory);

    this.dialogueText.text = text;

    // Remove existing buttons
    this.currentButtonNames.forEach((buttonName) => {
      const button = this.guiTexture.getControlByName(buttonName);
      if (button) {
        this.guiTexture.removeControl(button);
      }
    });
    this.currentButtonNames = [];

    choices.forEach((choice, index) => {
      const buttonName = `choice${index}`;
      const button = Button.CreateSimpleButton(buttonName, choice.text);
      button.width = "30%";
      button.height = "40px";
      button.color = "white";
      button.background = "black";
      button.top = `${(index + 1) * 50 + 50}px`;
      button.left = "20px";
      button.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
      button.onPointerUpObservable.add(() => this.handleChoiceClick(index));
      this.guiTexture.addControl(button);
      this.currentButtonNames.push(buttonName);
    });

    if (position) {
      this.character.moveTo(
        new Vector3(position.x, 0, position.z),
        this.terrain.terrain
      );
    }

    // Get trust value and update atmosphere
    if (this.enableAtmosphere) {
      const trust = this.currentStory.variablesState.trust || 0;
      this.atmosphere.updateFog(trust);
    }
  }

  private setupGUI(): void {
    this.guiTexture = AdvancedDynamicTexture.CreateFullscreenUI("gui");

    this.dialogueText = new TextBlock();
    this.dialogueText.color = "white";
    this.dialogueText.fontSize = 24;
    this.dialogueText.textWrapping = true;
    this.dialogueText.top = "0px";
    this.dialogueText.width = "80%";
    this.dialogueText.height = "200px";
    this.dialogueText.textHorizontalAlignment =
      Control.HORIZONTAL_ALIGNMENT_LEFT;
    this.dialogueText.textVerticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
    this.dialogueText.paddingTop = "20px";
    this.dialogueText.paddingLeft = "20px";
    this.dialogueText.background = "rgba(0, 0, 0, 0.5)";
    this.dialogueText.zIndex = 10;
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
    if (!this.character) return;

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
      if (this.enableAtmosphere) {
        this.atmosphere = new AtmosphereSystem(this.scene);
      }

      if (this.enableTerrain) {
        console.log("Creating terrain...");
        this.terrain = new TerrainSystem(this.scene);
        await this.terrain.waitForReady();
        console.log("Terrain ready");
      }

      if (this.enableEnvironment && this.terrain) {
        console.log("Setting up environment...");
        this.environment = new EnvironmentSystem(this.scene);
        this.environment.populate(this.terrain.terrain);
      }

      if (this.enableCharacter) {
        console.log("Creating character...");
        this.character = new Character(this.scene);

        if (this.terrain) {
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
        }
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
