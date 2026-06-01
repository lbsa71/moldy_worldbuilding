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
  Rectangle,
  StackPanel,
  TextBlock,
} from "@babylonjs/gui";

import { TerrainSystem } from "./game/TerrainSystem";
import { AtmosphereSystem } from "./game/AtmosphereSystem";
import { EnvironmentSystem } from "./game/EnvironmentSystem";
import { Character } from "./game/Character";
import { AudioSystem } from "./game/AudioSystem";
import { CameraSystem } from "./game/CameraSystem";
import { getCurrentDialogue, choose } from "../utils/ink";
import {
  createDialoguePresentation,
  normalizeDialogueText,
  type DialogueHorizontalAlignment,
  type DialoguePresentation,
} from "../game/experience/dialoguePresentation";
import { createWorldTreatment } from "../game/content/worldZones";

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
  private guiTexture!: AdvancedDynamicTexture;
  private dialoguePanel!: Rectangle;
  private dialogueText!: TextBlock;
  private choiceStack!: StackPanel;
  private currentStory: any;
  private currentChoiceControls: Control[] = [];
  private currentChoiceTexts: string[] = [];
  private currentChoiceCount = 0;
  private currentDialogueText = "";
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

    const { text, choices, position, fog, audio, objects } =
      getCurrentDialogue(this.currentStory);

    if (audio) {
      void this.audioSystem.playAudio(audio);
    }

    this.currentChoiceTexts = choices.map((choice) => choice.text);
    this.currentChoiceCount = this.currentChoiceTexts.length;
    this.currentDialogueText = normalizeDialogueText(text);
    const presentation = this.applyDialogueLayout(
      this.currentChoiceCount,
      this.currentDialogueText
    );
    this.dialogueText.text = this.currentDialogueText;
    this.renderChoiceControls(presentation);

    if (position) {
      this.character.moveTo(
        new Vector3(position.x, 0, position.z),
        this.terrain.terrain
      );
    }

    // Get route state and update atmosphere
    if (this.enableAtmosphere) {
      const trust = this.currentStory.variablesState.trust || 0;
      const worldTreatment = createWorldTreatment(position);
      this.atmosphere.updateFog(fog, position, worldTreatment);
      this.cameraSystem.applyWorldTreatment(worldTreatment.camera);

      const hospital_clarity = this.currentStory.variablesState.hospital_clarity || false;
      if (this.enableEnvironment) {
        // Convert objects to array, defaulting to empty if null/undefined
        const objectsArray = objects || [];
        
        // Create new objects
        this.environment.createObjectsFromTag(objectsArray, this.terrain.terrain, position || undefined);
        this.environment.updateObjectVisibilities(trust, hospital_clarity);

        // Camera always follows character smoothly now
      }
    }
  }

  private setupGUI(): void {
    this.guiTexture = AdvancedDynamicTexture.CreateFullscreenUI("gui");

    this.dialoguePanel = new Rectangle("dialoguePanel");
    this.dialoguePanel.cornerRadius = 6;
    this.dialoguePanel.thickness = 1;
    this.dialoguePanel.shadowBlur = 18;
    this.dialoguePanel.shadowOffsetY = 8;
    this.dialoguePanel.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
    this.dialoguePanel.zIndex = 10;
    this.guiTexture.addControl(this.dialoguePanel);

    this.dialogueText = new TextBlock("dialogueText");
    this.dialogueText.textWrapping = true;
    this.dialogueText.fontFamily = "Georgia, 'Times New Roman', serif";
    this.dialogueText.textHorizontalAlignment =
      Control.HORIZONTAL_ALIGNMENT_LEFT;
    this.dialogueText.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
    this.dialogueText.textVerticalAlignment =
      Control.VERTICAL_ALIGNMENT_TOP;
    this.dialogueText.zIndex = 12;
    this.dialoguePanel.addControl(this.dialogueText);

    this.choiceStack = new StackPanel("choiceStack");
    this.choiceStack.isVertical = true;
    this.choiceStack.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    this.choiceStack.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
    this.choiceStack.zIndex = 12;
    this.dialoguePanel.addControl(this.choiceStack);

    this.applyDialogueLayout(0);
  }

  private clearChoiceControls(): void {
    this.currentChoiceControls.forEach((control) => {
      this.choiceStack.removeControl(control);
    });
    this.currentChoiceControls = [];
  }

  private renderChoiceControls(presentation: DialoguePresentation): void {
    this.clearChoiceControls();

    this.currentChoiceTexts.forEach((choiceText, index) => {
      this.addChoiceButton(
        choiceText,
        index,
        this.currentChoiceTexts.length,
        presentation
      );
    });
  }

  private addChoiceButton(
    choiceText: string,
    index: number,
    totalChoices: number,
    presentation: DialoguePresentation
  ): void {
    const { palette } = presentation;
    const buttonName = `choice${index}`;
    const slot = new Rectangle(`${buttonName}Slot`);
    const hasGap = index < totalChoices - 1;
    slot.thickness = 0;
    slot.width = "100%";
    slot.height = `${
      presentation.choice.buttonHeightPx + (hasGap ? presentation.choice.gapPx : 0)
    }px`;
    slot.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;

    const button = Button.CreateSimpleButton(buttonName, choiceText);
    button.width = "100%";
    button.height = `${presentation.choice.buttonHeightPx}px`;
    button.cornerRadius = 4;
    button.thickness = 1;
    button.color = palette.choiceBorder;
    button.background = palette.choiceBackground;
    button.fontFamily = "Segoe UI, Arial, sans-serif";
    button.fontSize = presentation.choice.fontSizePx;
    button.onPointerEnterObservable.add(() => {
      button.background = palette.choiceHoverBackground;
      button.color = palette.choiceHoverBorder;
      if (button.textBlock) {
        button.textBlock.color = "#071008";
      }
    });
    button.onPointerOutObservable.add(() => {
      button.background = palette.choiceBackground;
      button.color = palette.choiceBorder;
      if (button.textBlock) {
        button.textBlock.color = palette.choiceText;
      }
    });
    button.onPointerUpObservable.add(() => this.handleChoiceClick(index));

    if (button.textBlock) {
      button.textBlock.color = palette.choiceText;
      button.textBlock.fontFamily = "Segoe UI, Arial, sans-serif";
      button.textBlock.fontSize = presentation.choice.fontSizePx;
      button.textBlock.fontWeight = "600";
      button.textBlock.textWrapping = true;
      button.textBlock.textHorizontalAlignment =
        Control.HORIZONTAL_ALIGNMENT_LEFT;
      button.textBlock.paddingLeft = "16px";
      button.textBlock.paddingRight = "16px";
    }

    slot.addControl(button);
    this.choiceStack.addControl(slot);
    this.currentChoiceControls.push(slot);
  }

  private applyDialogueLayout(
    choiceCount = this.currentChoiceCount,
    dialogueText = this.currentDialogueText
  ): DialoguePresentation {
    const presentation = createDialoguePresentation({
      choiceCount,
      text: dialogueText,
      viewport: this.getDialogueViewport(),
    });
    const panelWidth = presentation.panel.widthPx;
    const contentWidth = panelWidth - presentation.text.paddingPx * 2;

    this.dialoguePanel.width = `${panelWidth}px`;
    this.dialoguePanel.height = `${presentation.panel.heightPx}px`;
    this.dialoguePanel.left = `${presentation.panel.leftPx}px`;
    this.dialoguePanel.top = `-${presentation.panel.bottomPx}px`;
    this.dialoguePanel.horizontalAlignment = this.toGuiHorizontalAlignment(
      presentation.panel.horizontalAlignment
    );
    this.dialoguePanel.background = presentation.palette.panelBackground;
    this.dialoguePanel.color = presentation.palette.panelBorder;
    this.dialoguePanel.shadowColor = presentation.palette.panelShadow;

    this.dialogueText.width = `${contentWidth}px`;
    this.dialogueText.height = `${presentation.text.heightPx}px`;
    this.dialogueText.left = `${presentation.text.paddingPx}px`;
    this.dialogueText.top = `${presentation.text.paddingPx}px`;
    this.dialogueText.color = presentation.palette.text;
    this.dialogueText.fontSize = presentation.text.fontSizePx;
    this.dialogueText.lineSpacing = `${presentation.text.lineSpacingPx}px`;

    this.choiceStack.width = `${contentWidth}px`;
    this.choiceStack.height = `${presentation.choiceStack.heightPx}px`;
    this.choiceStack.left = `${presentation.text.paddingPx}px`;
    this.choiceStack.top = `-${presentation.text.paddingPx}px`;
    this.choiceStack.isVisible = choiceCount > 0;

    return presentation;
  }

  private getDialogueViewport(): { width: number; height: number } {
    return {
      width: this.canvas.clientWidth || window.innerWidth,
      height: this.canvas.clientHeight || window.innerHeight,
    };
  }

  private toGuiHorizontalAlignment(
    alignment: DialogueHorizontalAlignment
  ): number {
    return alignment === "center"
      ? Control.HORIZONTAL_ALIGNMENT_CENTER
      : Control.HORIZONTAL_ALIGNMENT_LEFT;
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
      this.audioSystem = new AudioSystem();
      
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
      const presentation = this.applyDialogueLayout();
      this.renderChoiceControls(presentation);
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
