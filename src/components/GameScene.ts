import { createSceneStudy, type SceneStudyHandle } from "./scene-study/createSceneStudy";
import { AudioSystem } from "./game/AudioSystem";
import { DialogueUI } from "../game/experience/DialogueUI";
import { getCurrentDialogue, choose } from "../utils/ink";
import { openingDirection } from "../game/presentation/SceneDirection";
import type { Story } from "../inkjs/engine/Story";
import { CHAPTER_EDITION, type StoryEdition } from "../game/experience/StoryEdition";

// The authored living scene changes Ink content indices. Preserve earlier saves
// under their original keys instead of interpreting them against this edition.
export const SAVE_KEY = CHAPTER_EDITION.saveKey;
const PREFERENCES_KEY = "fading:preferences:v1";
type Preferences = { audio: boolean; volume: number; reducedMotion: boolean };

export class GameScene {
  private renderer?: SceneStudyHandle;
  private audioSystem?: AudioSystem;
  private dialogueUI?: DialogueUI;
  private currentStory?: Story;
  private initialization: Promise<void> | null = null;
  private readonly loading = new AbortController();
  private disposed = false;
  private running = false;
  private changingChoice = false;
  private beat = 0;
  private pendingTap?: { beat: number; cleanup: () => void };
  private preferences: Preferences;
  private storageNotice = "";
  private readonly visibilityChanged = () => {
    if (this.running && !this.disposed) {
      if (document.hidden) this.cancelPendingTap();
      this.audioSystem?.setPaused(document.hidden);
    }
  };

  constructor(private canvas: HTMLCanvasElement, private readonly edition: StoryEdition = CHAPTER_EDITION) {
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
        const params = new URLSearchParams(window.location.search);
        const renderer = await createSceneStudy(this.canvas, {
          narrative: true,
          forceWebGL: params.has("debug") && params.get("renderer") === "webgl",
          antialiasing: params.has("debug") && params.get("aa") === "off" ? "off" : "auto",
          signal: this.loading.signal,
          onCanvasReplaced: canvas => { if (!this.disposed) this.canvas = canvas; },
          onTransitionOpacity: opacity => {
            if (this.disposed) return;
            const container = document.getElementById("game-container");
            if (Number.isFinite(opacity)) container?.style.setProperty("--scene-transition-opacity", String(Math.min(1, Math.max(0, opacity))));
            this.syncDiagnostics();
          },
        });
        // A loader may finish after its caller has left, even if it ignores abort.
        if (this.disposed) { renderer.dispose(); this.ensureActive(); }
        this.renderer = renderer;
        if (renderer.getDiagnostics().assetMode !== "production") throw new Error("The accepted scene assets could not be loaded.");
        this.audioSystem = new AudioSystem(renderer.getScene());
        const host = document.getElementById("experience-ui");
        if (!host) throw new Error("The story interface is missing.");
        this.dialogueUI = new DialogueUI(host, {
          onChoice: index => this.handleChoice(index),
          onRestart: () => this.restart(),
          onAudioToggle: () => {
            if (this.disposed) return;
            this.preferences.audio = !this.preferences.audio;
            if (!this.preferences.audio) this.cancelPendingTap();
            this.audioSystem!.setEnabled(this.preferences.audio);
            this.dialogueUI!.setAudioEnabled(this.preferences.audio);
            this.savePreferences();
          },
          onMotionToggle: () => {
            if (this.disposed) return;
            this.preferences.reducedMotion = !this.preferences.reducedMotion;
            this.applyMotionPreference();
            this.savePreferences();
          },
          onVolumeChange: value => {
            if (this.disposed || !Number.isFinite(value)) return;
            this.preferences.volume = Math.min(1, Math.max(0, value));
            this.audioSystem!.setVolume(this.preferences.volume);
            this.dialogueUI!.setVolume(this.preferences.volume);
            this.savePreferences();
          },
        }, this.edition.label);
        this.audioSystem.setPaused(document.hidden);
        this.audioSystem.setVolume(this.preferences.volume);
        this.audioSystem.setEnabled(this.preferences.audio);
        this.dialogueUI.setAudioEnabled(this.preferences.audio);
        this.dialogueUI.setVolume(this.preferences.volume);
        this.applyMotionPreference();
        const restored = this.restoreStory();
        this.progressStory(true, !restored);
        if (this.storageNotice) this.dialogueUI.setNotice(this.storageNotice);
      } catch (error) {
        this.dispose();
        throw error;
      }
    })();
    return this.initialization;
  }

  private progressStory(immediate = false, playOneShot = true): void {
    if (!this.currentStory || this.disposed || !this.renderer || !this.dialogueUI || !this.audioSystem) return;
    // Save the entrance, including terminal passages, before consuming this beat.
    this.saveStory();
    const dialogue = getCurrentDialogue(this.currentStory);
    this.cancelPendingTap();
    const beat = ++this.beat;
    const direction = dialogue.direction || openingDirection();
    this.renderer.applyDirection(direction, immediate);
    const container = document.getElementById("game-container");
    if (container) {
      container.dataset.cameraCue = direction.camera;
      container.dataset.scene = dialogue.scene || "lamp";
      container.dataset.transition = direction.transition.kind;
    }
    this.syncDiagnostics();
    this.dialogueUI.render(dialogue);
    this.audioSystem.setMood(dialogue.mood || "hushed");
    this.audioSystem.setWeather(direction.weather, immediate);
    if (playOneShot && dialogue.sound === "taps") {
      this.scheduleTap(beat);
    }
    const music = dialogue.audio && !dialogue.mood
      ? this.audioSystem.playAudio(dialogue.audio) : this.audioSystem.play();
    void music.catch(() => {
      if (!this.disposed && beat === this.beat) this.dialogueUI?.setNotice("Use the sound control to enable audio.");
    });
  }

  private cancelPendingTap(): void {
    const pending = this.pendingTap;
    this.pendingTap = undefined;
    pending?.cleanup();
  }

  private playTap(beat: number): void {
    if (this.disposed || beat !== this.beat || document.hidden || !this.preferences.audio) return;
    void this.audioSystem?.playTapCue().catch(error => {
      if (!this.disposed && beat === this.beat) console.warn("The optional rail taps could not play.", error);
    });
  }

  private scheduleTap(beat: number): void {
    if (!this.renderer || this.disposed || document.hidden || !this.preferences.audio) return;
    if (this.preferences.reducedMotion || this.renderer.getDiagnostics().settled) {
      this.playTap(beat);
      return;
    }
    const scene = this.renderer.getScene();
    // Check after the final camera pose has actually rendered, rather than during
    // applyDirection or a veil callback. No recurring polling survives the beat.
    const observer = scene.onAfterRenderObservable.add(() => {
      if (this.pendingTap?.beat !== beat) return;
      if (this.disposed || beat !== this.beat || document.hidden || !this.preferences.audio) {
        this.cancelPendingTap();
      } else if (this.renderer?.getDiagnostics().settled) {
        this.cancelPendingTap();
        this.syncDiagnostics();
        this.playTap(beat);
      }
    });
    // Authored transitions are capped at five seconds. Retire a stalled renderer's
    // cue without playing it later in an unrelated view.
    const timeout = window.setTimeout(() => {
      if (this.pendingTap?.beat === beat) this.cancelPendingTap();
    }, 10000);
    this.pendingTap = { beat, cleanup: () => {
      scene.onAfterRenderObservable.remove(observer);
      window.clearTimeout(timeout);
    } };
  }

  private syncDiagnostics(): void {
    if (!this.renderer || this.disposed) return;
    const container = document.getElementById("game-container");
    const diagnostics = this.renderer.getDiagnostics();
    if (container) {
      container.dataset.settled = String(diagnostics.settled);
      container.dataset.weather = diagnostics.weather ?? "none";
      container.dataset.rainIntensity = String(diagnostics.rainIntensity ?? 0);
      container.dataset.antialiasing = diagnostics.antialiasing ?? "off";
      container.dataset.rainDrops = String(diagnostics.visibleRainDrops ?? 0);
      container.dataset.ripples = String(diagnostics.rippleCount ?? 0);
      container.dataset.dampPatches = String(diagnostics.dampPatchCount ?? 0);
      if (diagnostics.stage) container.dataset.stage = JSON.stringify(diagnostics.stage);
    }
    const aaLabel = document.getElementById("aaType");
    const weatherLabel = document.getElementById("weatherType");
    if (aaLabel) aaLabel.textContent = (diagnostics.antialiasing ?? "off").toUpperCase();
    if (weatherLabel) weatherLabel.textContent = diagnostics.weather ?? "none";
  }

  private handleChoice(index: number): void {
    if (!this.currentStory || this.disposed || this.changingChoice || !this.dialogueUI) return;
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
    if (!this.currentStory || !this.renderer || !this.dialogueUI || this.disposed) return;
    this.cancelPendingTap();
    this.renderer.reset();
    this.audioSystem?.setMood("hushed"); // Retires pending one-shots before the fresh entrance.
    this.currentStory.ResetState();
    this.storageNotice = "";
    this.progressStory(true);
    this.dialogueUI.setNotice(this.storageNotice || "A fresh passage. Your previous choices have been cleared.");
  }

  private applyMotionPreference(): void {
    this.renderer?.setReducedMotion(this.preferences.reducedMotion);
    this.dialogueUI?.setReducedMotion(this.preferences.reducedMotion);
    this.syncDiagnostics();
    if (this.preferences.reducedMotion && this.pendingTap) {
      const beat = this.pendingTap.beat;
      this.cancelPendingTap();
      this.playTap(beat);
    }
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
    catch { this.dialogueUI?.setNotice("Settings apply for this visit; browser storage is unavailable."); }
  }
  private saveStory(): void {
    if (!this.currentStory) return;
    try { localStorage.setItem(this.edition.saveKey, JSON.stringify({ version: this.edition.saveVersion, edition: this.edition.id, state: this.currentStory.state.ToJson() })); }
    catch {
      this.storageNotice = "Progress cannot be saved in this browser. Keep this tab open to finish.";
      this.dialogueUI?.setNotice(this.storageNotice);
    }
  }
  private restoreStory(): boolean {
    if (!this.currentStory) return false;
    try {
      const raw = localStorage.getItem(this.edition.saveKey);
      if (!raw) return false;
      const stored = JSON.parse(raw);
      const legacyChapterSave = this.edition.id === CHAPTER_EDITION.id && stored.edition === undefined;
      if (stored.version !== this.edition.saveVersion || (!legacyChapterSave && stored.edition !== this.edition.id) || typeof stored.state !== "string") throw new Error("Unsupported saved passage.");
      this.currentStory.state.LoadJson(stored.state);
      if (!this.currentStory.canContinue) throw new Error("The saved passage has no readable entrance.");
      this.storageNotice = "Your last passage has been restored.";
      return true;
    } catch {
      this.currentStory.ResetState();
      this.storageNotice = "Your saved passage could not be read. A fresh passage has opened.";
      return false;
    }
  }

  public async run(): Promise<void> {
    await this.initialize();
    this.ensureActive();
    if (this.running) return;
    this.running = true;
    document.addEventListener("visibilitychange", this.visibilityChanged);
    this.visibilityChanged();
  }
  public getFps(): number { this.syncDiagnostics(); return this.renderer?.getDiagnostics().fps || 0; }
  public getRendererType(): string { return this.renderer?.getDiagnostics().backend || "WebGL"; }
  public dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.running = false;
    ++this.beat;
    this.cancelPendingTap();
    this.loading.abort();
    document.removeEventListener("visibilitychange", this.visibilityChanged);
    this.dialogueUI?.dispose();
    this.audioSystem?.dispose();
    this.renderer?.dispose();
    document.getElementById("game-container")?.style.setProperty("--scene-transition-opacity", "0");
  }
}
