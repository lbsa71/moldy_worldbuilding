import {
  Engine,
  Scene,
  Vector3,
  WebGPUEngine,
  Color4,
  Ray,
  AbstractMesh,
  KeyboardEventTypes,
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
import { AudioSystem } from "./game/AudioSystem";
import { CameraSystem } from "./game/CameraSystem";
import { loadInkFile, getCurrentDialogue, choose } from "../utils/ink";

export class GameScene {
  private engine!: Engine;
  private scene!: Scene;
  private terrain!: TerrainSystem;
  private atmosphere!: AtmosphereSystem;
  private environment!: EnvironmentSystem;
  private character!: Character;
  private cameraSystem!: CameraSystem;
  private initialized = false;
  private isWebGPU = false;
  private guiTexture!: any;
  private dialogueText!: any;
  private currentStory: any;
  private currentButtonNames: string[] = [];
  private enableAtmosphere = true; // Toggle for atmosphere
  private enableEnvironment = true; // Toggle for environment
  private enableInk = true; // Toggle for Ink
  private enableTerrain = true; // Toggle for terrain
  private enableCharacter = true; // Toggle for character
  private audioSystem!: AudioSystem;

  constructor(private canvas: HTMLCanvasElement) {}

  public setStory(story: any): void {
    this.currentStory = story;
  }

  public async initialize(): Promise<void> {
    try {
      await this.setupEngine();
      this.cameraSystem = new CameraSystem(this.scene, this.canvas);
      await this.initializeSystems();
      this.setupGUI();
      if (this.enableInk && this.currentStory) {
        this.progressStory();
      }
      this.initialized = true;
      console.log("Game initialization complete");
    } catch (error) {
      console.error("Failed to initialize game:", error);
      throw error;
    }
  }

  private progressStory(): void {
    if (!this.currentStory) return;

    const { text, choices, position, audio, objects } = getCurrentDialogue(this.currentStory);

    // Handle audio
    this.audioSystem.play();

    if (audio) {
      this.audioSystem.playAudio(audio);
    }

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
      button.height = "55px";
      button.color = "white";
      button.background = "black";
      button.top = `${(index + 1) * 65 + 30}px`;
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
      
      // Get hospital clarity and update environment
      const hospital_clarity = this.currentStory.variablesState.hospital_clarity || false;
      if (this.enableEnvironment) {
        // Convert objects to array, defaulting to empty if null/undefined
        const objectsArray = objects || [];
        
        // Create new objects
        this.environment.createObjectsFromTag(objectsArray, this.terrain.terrain, position || undefined);
        this.environment.updateObjectVisibilities(trust, hospital_clarity);

        // If we have objects, set camera focus to first object
        const firstObjectPosition = this.environment.getFirstObjectPosition();
        if (firstObjectPosition) {
          this.cameraSystem.setCameraFocus(firstObjectPosition);
        }
      }
    }
  }

  private setupGUI(): void {
    this.guiTexture = AdvancedDynamicTexture.CreateFullscreenUI("gui");

    this.dialogueText = new TextBlock();
    this.dialogueText.color = "white";
    this.dialogueText.fontSize = 24;
    this.dialogueText.textWrapping = true;
    this.dialogueText.top = "60px";
    this.dialogueText.width = "100%";
    this.dialogueText.height = "300px";
    this.dialogueText.left = "0px";
    this.dialogueText.textHorizontalAlignment =
      Control.HORIZONTAL_ALIGNMENT_LEFT;
    this.dialogueText.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
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

  private async initializeSystems(): Promise<void> {
    try {
      // Initialize audio system first
      this.audioSystem = new AudioSystem(this.scene);
      
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
        this.environment.populate(this.terrain.terrain, []);  // Pass empty array as initial objects
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
            this.cameraSystem.setCameraTarget(hit.pickedPoint.clone());
          }
        }
      }

      this.scene.registerBeforeRender(() => {
        if (this.character) {
          this.cameraSystem.updatePosition(this.character.getPosition());
        }
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

    this.scene.onKeyboardObservable.add((kbInfo) => {
      if (kbInfo.type === KeyboardEventTypes.KEYDOWN) {
        if (kbInfo.event.key === "d") {
          this.environment.toggleDebug();
          this.atmosphere.toggleDebug();
        }
      }
    });
  }

  public getFps(): number {
    return this.engine.getFps();
  }

  public getRendererType(): string {
    return this.isWebGPU ? "WebGPU" : "WebGL";
  }
}
