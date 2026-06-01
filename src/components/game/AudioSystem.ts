import {
  createAudioTransitionPlan,
  DEFAULT_AUDIO_VOLUME,
  DEFAULT_FADE_DURATION_MS,
  DEFAULT_FADE_TICK_MS,
  getCrossfadeVolumes,
  normalizeAudioAssetPath,
  type AudioTransitionPlan,
} from "../../game/experience/audioTransition";

type ManagedAudioElement = {
  loop: boolean;
  paused: boolean;
  preload: string;
  src: string;
  volume: number;
  load(): void;
  pause(): void;
  play(): Promise<void> | void;
  remove?(): void;
};

type ManagedTrack = {
  element: ManagedAudioElement;
  name: string;
};

type AudioSystemOptions = {
  audioFactory?: (assetPath: string) => ManagedAudioElement;
  fadeDurationMs?: number;
  targetVolume?: number;
  tickMs?: number;
};

export type AudioSystemStatus = {
  currentTrack: string | null;
  isTransitioning: boolean;
  lastPlaybackError: string | null;
};

export class AudioSystem {
  private audioFactory: (assetPath: string) => ManagedAudioElement;
  private currentTrack: ManagedTrack | null = null;
  private fadeTimer: ReturnType<typeof setInterval> | null = null;
  private retiringTracks: ManagedTrack[] = [];
  private readonly fadeDurationMs: number;
  private readonly targetVolume: number;
  private readonly tickMs: number;
  private lastPlaybackError: string | null = null;

  constructor({
    audioFactory = (assetPath) => new Audio(assetPath),
    fadeDurationMs = DEFAULT_FADE_DURATION_MS,
    targetVolume = DEFAULT_AUDIO_VOLUME,
    tickMs = DEFAULT_FADE_TICK_MS,
  }: AudioSystemOptions = {}) {
    this.audioFactory = audioFactory;
    this.fadeDurationMs = fadeDurationMs;
    this.targetVolume = targetVolume;
    this.tickMs = tickMs;
  }

  public async playAudio(
    audioFile: string | null | undefined
  ): Promise<AudioTransitionPlan["kind"]> {
    const plan = createAudioTransitionPlan({
      currentTrack: this.currentTrack?.name,
      requestedTrack: audioFile,
      fadeDurationMs: this.fadeDurationMs,
      targetVolume: this.targetVolume,
      tickMs: this.tickMs,
    });

    if (plan.kind === "none" || plan.kind === "keep") {
      return plan.kind;
    }

    const assetPath = normalizeAudioAssetPath(plan.targetTrack);
    if (!assetPath) {
      return "none";
    }

    this.clearFadeTimer();

    const nextTrack = this.createTrack(plan.targetTrack, assetPath);
    nextTrack.element.volume = plan.kind === "start" ? plan.targetVolume : 0;

    if (!(await this.safePlay(nextTrack.element))) {
      this.disposeTrack(nextTrack);
      return "none";
    }

    if (plan.kind === "start" || !this.currentTrack) {
      this.disposeCurrentTrack();
      this.currentTrack = nextTrack;
      return plan.kind;
    }

    this.startCrossfade(this.currentTrack, nextTrack, plan);
    return plan.kind;
  }

  public async resume(): Promise<boolean> {
    if (!this.currentTrack || !this.currentTrack.element.paused) {
      return true;
    }

    return this.safePlay(this.currentTrack.element);
  }

  public getStatus(): AudioSystemStatus {
    return {
      currentTrack: this.currentTrack?.name ?? null,
      isTransitioning: this.fadeTimer !== null,
      lastPlaybackError: this.lastPlaybackError,
    };
  }

  public dispose(): void {
    this.clearFadeTimer();
    this.disposeCurrentTrack();
  }

  private createTrack(name: string, assetPath: string): ManagedTrack {
    const element = this.audioFactory(assetPath);
    element.loop = true;
    element.preload = "auto";
    element.load();

    return { element, name };
  }

  private startCrossfade(
    outgoingTrack: ManagedTrack,
    incomingTrack: ManagedTrack,
    plan: Extract<AudioTransitionPlan, { kind: "crossfade" }>
  ): void {
    const startedAt = Date.now();
    const outgoingStartVolume = outgoingTrack.element.volume;

    this.currentTrack = incomingTrack;
    this.retiringTracks.push(outgoingTrack);
    this.fadeTimer = setInterval(() => {
      const { incoming, outgoing } = getCrossfadeVolumes({
        elapsedMs: Date.now() - startedAt,
        durationMs: plan.fadeDurationMs,
        incomingTargetVolume: plan.targetVolume,
        outgoingStartVolume,
      });

      incomingTrack.element.volume = incoming;
      outgoingTrack.element.volume = outgoing;

      if (outgoing <= 0 && incoming >= plan.targetVolume) {
        this.clearFadeTimer();
      }
    }, plan.tickMs);
  }

  private async safePlay(element: ManagedAudioElement): Promise<boolean> {
    try {
      await element.play();
      this.lastPlaybackError = null;
      return true;
    } catch (error) {
      this.lastPlaybackError =
        error instanceof Error ? error.message : "Audio playback failed";
      return false;
    }
  }

  private clearFadeTimer(): void {
    if (this.fadeTimer) {
      clearInterval(this.fadeTimer);
      this.fadeTimer = null;
    }

    this.retiringTracks.forEach((track) => this.disposeTrack(track));
    this.retiringTracks = [];
  }

  private disposeCurrentTrack(): void {
    if (this.currentTrack) {
      this.disposeTrack(this.currentTrack);
      this.currentTrack = null;
    }
  }

  private disposeTrack(track: ManagedTrack): void {
    track.element.pause();
    track.element.remove?.();
  }
}
