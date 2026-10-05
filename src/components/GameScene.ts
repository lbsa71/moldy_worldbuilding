import { Engine } from "@babylonjs/core/Engines/engine";
import { WebGPUEngine } from "@babylonjs/core/Engines/webgpuEngine";
import { Scene } from "@babylonjs/core/scene";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Color4 } from "@babylonjs/core/Maths/math.color";
import { KeyboardEventTypes } from "@babylonjs/core/Events/keyboardEvents";
import { TerrainSystem } from "./game/TerrainSystem";
import { AtmosphereSystem } from "./game/AtmosphereSystem";
import { EnvironmentSystem } from "./game/EnvironmentSystem";
import { Character } from "./game/Character";
import { AudioSystem } from "./game/AudioSystem";
import { CameraSystem } from "./game/CameraSystem";
import { DialogueUI } from "../game/experience/DialogueUI";
import { getCurrentDialogue, choose, parseDialogueTags } from "../utils/ink";
import type { Story } from "../inkjs/engine/Story";

// Ink's internal content indices changed with the spatial edition. Keep old saves
// intact under their prior key instead of interpreting them against a new script.
export const SAVE_KEY = "fading:chapter-one:save:v2";
const PREFERENCES_KEY = "fading:preferences:v1";

type Preferences = { audio: boolean; volume: number; reducedMotion: boolean };
type JourneyStop = { scene: string; objects: string[]; position: { x: number; z: number } };

export class GameScene {
  private engine!: Engine;
  private scene!: Scene;
  private terrain!: TerrainSystem;
  private atmosphere!: AtmosphereSystem;
  private environment!: EnvironmentSystem;
  private character!: Character;
  private cameraSystem!: CameraSystem;
  private audioSystem!: AudioSystem;
  private dialogueUI!: DialogueUI;
  private currentStory?: Story;
  private initialization: Promise<void> | null = null;
  private isWebGPU = false;
  private disposed = false;
  private running = false;
  private changingChoice = false;
  private preferences: Preferences;
  private storageNotice = "";
  private journey: JourneyStop[] = [];
  private readonly renderFrame = () => { if (!this.disposed) this.scene.render(); };
  private readonly resize = () => {
    if (!this.disposed) {
      this.engine.resize();
      this.cameraSystem.resize();
    }
  };
  private readonly visibilityChanged = () => {
    if (!this.running || this.disposed) return;
    this.audioSystem.setPaused(document.hidden);
    if (document.hidden) this.engine.stopRenderLoop(this.renderFrame);
    else this.engine.runRenderLoop(this.renderFrame);
  };

  constructor(private canvas: HTMLCanvasElement) {
    this.preferences = this.readPreferences();
  }

  public setStory(story: Story): void { this.currentStory = story; }

  private ensureActive(): void {
    if (this.disposed) throw new Error("The game was closed during initialization.");
  }

  public initialize(): Promise<void> {
    if (this.initialization) return this.initialization;
    this.initialization = (async () => {
      try {
        this.ensureActive();
        if (!this.currentStory) throw new Error("The story has not been loaded.");
        await this.setupEngine();
        this.ensureActive();
        this.cameraSystem = new CameraSystem(this.scene, this.canvas);
        this.audioSystem = new AudioSystem(this.scene);
        this.atmosphere = new AtmosphereSystem(this.scene);
        this.terrain = new TerrainSystem(this.scene);
        await this.terrain.waitForReady();
        this.ensureActive();
        this.environment = new EnvironmentSystem(this.scene, { heroAssets: true });
        this.environment.populate(this.terrain.terrain, []);
        this.character = new Character(this.scene, (x, z) => this.terrain.getHeightAtPoint(x, z));
        this.character.setPosition(new Vector3(0, this.terrain.getHeightAtPoint(0, 0) + 0.04, 0));
        this.scene.registerBeforeRender(() => {
          this.cameraSystem.updatePosition(this.character.getPosition());
          this.atmosphere.updateListenerPosition(this.character.getPosition());
        });
        const host = document.getElementById("experience-ui");
        if (!host) throw new Error("The story interface is missing.");
        this.dialogueUI = new DialogueUI(host, {
          onChoice: index => this.handleChoice(index),
          onRestart: () => this.restart(),
          onAudioToggle: () => {
            this.preferences.audio = !this.preferences.audio;
            this.audioSystem.setEnabled(this.preferences.audio);
            this.dialogueUI.setAudioEnabled(this.preferences.audio);
            this.savePreferences();
          },
          onMotionToggle: () => {
            this.preferences.reducedMotion = !this.preferences.reducedMotion;
            this.applyMotionPreference();
            this.savePreferences();
          },
          onVolumeChange: value => {
            this.preferences.volume = Math.min(1, Math.max(0, value));
            this.audioSystem.setVolume(this.preferences.volume);
            this.dialogueUI.setVolume(this.preferences.volume);
            this.savePreferences();
          },
        });
        this.audioSystem.setEnabled(this.preferences.audio);
        this.audioSystem.setVolume(this.preferences.volume);
        this.dialogueUI.setAudioEnabled(this.preferences.audio);
        this.dialogueUI.setVolume(this.preferences.volume);
        this.applyMotionPreference();
        this.restoreStory();
        this.progressStory(true);
        if (this.storageNotice) this.dialogueUI.setNotice(this.storageNotice);
        if (new URLSearchParams(window.location.search).has("debug")) {
          this.scene.onKeyboardObservable.add(event => {
            if (event.type === KeyboardEventTypes.KEYDOWN && event.event.key.toLowerCase() === "d") {
              this.environment.toggleDebug();
              this.atmosphere.toggleDebug();
            }
          });
        }
      } catch (error) {
        this.dispose();
        throw error;
      }
    })();
    return this.initialization;
  }

  private progressStory(immediate = false): void {
    if (!this.currentStory || this.disposed) return;
    // Store the entrance to this beat so Continue() cannot skip it when resuming.
    this.saveStory();
    const dialogue = getCurrentDialogue(this.currentStory);
    this.dialogueUI.render(dialogue);
    this.audioSystem.setMood(dialogue.mood || "hushed");
    if (dialogue.scene === "rail") {
      void this.audioSystem.playTapCue().catch(error => {
        if (!this.disposed) console.warn("The optional rail taps could not play.", error);
      });
    }
    if (dialogue.audio && !dialogue.mood) {
      void this.audioSystem.playAudio(dialogue.audio).catch(error => {
        if (!this.disposed) this.dialogueUI.setNotice("Sound is unavailable. You can continue reading.");
        console.warn("Audio cue could not play.", error);
      });
    } else {
      void this.audioSystem.play().catch(() => {
        if (!this.disposed) this.dialogueUI.setNotice("Use the sound control to enable audio.");
      });
    }
    this.environment.setNarrativeScene(dialogue.scene);
    this.atmosphere.setNarrativeScene(dialogue.scene);
    const destination = dialogue.position
      ? new Vector3(dialogue.position.x, this.terrain.getHeightAtPoint(dialogue.position.x, dialogue.position.z) + 0.04, dialogue.position.z)
      : undefined;
    this.cameraSystem.setNarrativeScene(dialogue.scene, destination);
    if (destination) {
      if (immediate) {
        this.character.setPosition(destination);
        this.cameraSystem.setCameraTarget(destination);
      } else {
        void this.character.moveTo(destination, this.terrain.terrain);
      }
    }
    if (dialogue.fog !== null) this.atmosphere.updateFog(dialogue.fog);
    if (dialogue.objects !== null) {
      this.environment.createObjectsFromTag(dialogue.objects, this.terrain.terrain, dialogue.position || undefined);
      if (dialogue.scene && dialogue.position) {
        this.journey = this.journey.filter(stop => stop.scene !== dialogue.scene);
        this.journey.push({ scene: dialogue.scene, objects: dialogue.objects, position: dialogue.position });
      }
    }
    const connection = Number(this.currentStory.variablesState.$("connection")) || 0;
    const clarity = Boolean(this.currentStory.variablesState.$("hospital_clarity"));
    this.environment.updateObjectVisibilities(connection, clarity);
  }

  private handleChoice(index: number): void {
    if (!this.currentStory || this.disposed || this.changingChoice) return;
    if (!Number.isInteger(index) || index < 0 || index >= this.currentStory.currentChoices.length) return;
    this.changingChoice = true;
    try {
      this.storageNotice = "";
      this.dialogueUI.setNotice("");
      choose(this.currentStory, index);
      this.progressStory();
    } finally { this.changingChoice = false; }
  }

  public restart(): void {
    if (!this.currentStory || this.disposed) return;
    this.currentStory.ResetState();
    this.environment.resetJourney();
    this.journey = [];
    this.storageNotice = "";
    this.progressStory(true);
    this.dialogueUI.setNotice(this.storageNotice || "A fresh passage. Your previous choices have been cleared.");
  }

  private applyMotionPreference(): void {
    const enabled = this.preferences.reducedMotion;
    this.character.setReducedMotion(enabled);
    this.cameraSystem.setReducedMotion(enabled);
    this.atmosphere.setReducedMotion(enabled);
    this.environment.setReducedMotion(enabled);
    this.dialogueUI.setReducedMotion(enabled);
  }

  private readPreferences(): Preferences {
    const defaults = {
      audio: true, volume: 0.55,
      reducedMotion: typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    };
    try {
      const stored = JSON.parse(localStorage.getItem(PREFERENCES_KEY) || "null");
      if (!stored || typeof stored !== "object") return defaults;
      return {
        audio: typeof stored.audio === "boolean" ? stored.audio : defaults.audio,
        volume: typeof stored.volume === "number" && Number.isFinite(stored.volume) ? Math.min(1, Math.max(0, stored.volume)) : defaults.volume,
        reducedMotion: typeof stored.reducedMotion === "boolean" ? stored.reducedMotion : defaults.reducedMotion,
      };
    } catch { return defaults; }
  }

  private savePreferences(): void {
    try { localStorage.setItem(PREFERENCES_KEY, JSON.stringify(this.preferences)); }
    catch { this.dialogueUI.setNotice("Settings apply for this visit; browser storage is unavailable."); }
  }

  private saveStory(): void {
    if (!this.currentStory) return;
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify({ version: 2, state: this.currentStory.state.ToJson(), journey: this.journey }));
    } catch {
      this.storageNotice = "Progress cannot be saved in this browser. Keep this tab open to finish.";
      this.dialogueUI?.setNotice(this.storageNotice);
    }
  }

  private restoreStory(): void {
    if (!this.currentStory) return;
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return;
      const stored = JSON.parse(raw);
      if (stored.version !== 2 || typeof stored.state !== "string") throw new Error("Unsupported saved passage.");
      this.currentStory.state.LoadJson(stored.state);
      if (!this.currentStory.canContinue) throw new Error("The saved passage has no readable entrance.");
      // Rebuild visited places before displaying the saved entrance, preserving
      // the same faint landmarks after a reload without replaying choices/audio.
      const trail = stored.journey ?? [];
      if (!Array.isArray(trail) || trail.length > 14) throw new Error("Invalid memory trail.");
      const restored: JourneyStop[] = trail.map(stop => {
        if (!stop || typeof stop.scene !== "string" || !Array.isArray(stop.objects) || !stop.position) throw new Error("Invalid memory stop.");
        const parsed = parseDialogueTags([`scene: ${stop.scene}`, `objects: ${stop.objects.join(",")}`, `position: (${stop.position.x}, ${stop.position.z})`]);
        return { scene: parsed.scene!, objects: parsed.objects!, position: parsed.position! };
      });
      this.journey = restored;
      for (const stop of restored) {
        this.environment.setNarrativeScene(stop.scene);
        this.environment.createObjectsFromTag(stop.objects, this.terrain.terrain, stop.position);
      }
      this.storageNotice = "Your last passage has been restored.";
    } catch {
      this.currentStory.ResetState();
      this.environment.resetJourney();
      this.journey = [];
      this.storageNotice = "Your saved passage could not be read. A fresh passage has opened.";
    }
  }

  private async setupEngine(): Promise<void> {
    let candidate: WebGPUEngine | undefined;
    try {
      const params = new URLSearchParams(window.location.search);
      const inspectWebGL = params.has("debug") && params.get("renderer") === "webgl";
      if (!inspectWebGL && await WebGPUEngine.IsSupportedAsync) {
        this.ensureActive();
        candidate = new WebGPUEngine(this.canvas);
        await candidate.initAsync();
        this.ensureActive();
        this.engine = candidate as unknown as Engine;
        this.isWebGPU = true;
      }
    } catch (error) {
      candidate?.dispose();
      this.ensureActive();
      console.warn("WebGPU initialization failed; using WebGL.", error);
    }
    this.ensureActive();
    if (!this.engine) {
      this.engine = new Engine(this.canvas, true, { powerPreference: "high-performance" });
      this.isWebGPU = false;
    }
    this.scene = new Scene(this.engine);
    this.scene.clearColor = new Color4(0.035, 0.045, 0.055, 1);
  }

  public async run(): Promise<void> {
    await this.initialize();
    this.ensureActive();
    if (this.running) return;
    this.running = true;
    window.addEventListener("resize", this.resize);
    document.addEventListener("visibilitychange", this.visibilityChanged);
    this.visibilityChanged();
  }

  public getFps(): number { return this.engine.getFps(); }
  public getRendererType(): string { return this.isWebGPU ? "WebGPU" : "WebGL"; }

  public dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.running = false;
    window.removeEventListener("resize", this.resize);
    document.removeEventListener("visibilitychange", this.visibilityChanged);
    this.engine?.stopRenderLoop(this.renderFrame);
    this.dialogueUI?.dispose();
    this.audioSystem?.dispose();
    this.character?.dispose();
    this.cameraSystem?.dispose();
    this.environment?.dispose();
    this.atmosphere?.dispose();
    this.scene?.dispose();
    this.engine?.dispose();
  }
}
