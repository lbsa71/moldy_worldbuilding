import type { Scene } from '@babylonjs/core';

type Mood = 'hushed' | 'warm' | 'uneasy' | 'resolved';
type Voice = { audio: HTMLAudioElement; gain: number; from: number; target: number };
const cues: Record<Mood, string> = {
  hushed: 'fading-hushed.mp3', warm: 'fading-warm.mp3',
  uneasy: 'fading-uneasy.mp3', resolved: 'fading-resolved.mp3',
};
const legacy: Record<string, Mood> = {
  'soundtrack_1.mp3': 'hushed', 'soundtrack_2.mp3': 'warm',
  'soundtrack_3.mp3': 'resolved', 'end_credits.mp3': 'resolved',
};

/** Bounded, latest-request-wins music crossfades. Narrative never waits for music. */
export class AudioSystem {
  private voices: Voice[] = [];
  private desired = cues.hushed;
  private activeFile = '';
  private request = 0;
  private pending: HTMLAudioElement | null = null;
  private tapEffect: HTMLAudioElement | null = null;
  private tapRequest = 0;
  private fadeTimer: number | undefined;
  private fadeStart = 0;
  private enabled = true;
  private paused = false;
  private volume = 0.55;
  private disposed = false;
  private readonly fadeMs = 2200;

  constructor(_scene?: Scene) {}

  public setMood(mood: Mood): void {
    this.stopTapCue();
    this.desired = cues[mood] || cues.hushed;
  }

  /** A scene-bound pair of taps, separate from the looping score. Never resumes after cancellation. */
  public async playTapCue(): Promise<void> {
    this.stopTapCue();
    if (this.disposed || this.paused || !this.enabled) return;
    const id = this.tapRequest;
    const audio = new Audio('/assets/fading-taps.mp3');
    this.tapEffect = audio;
    audio.loop = false;
    audio.preload = 'auto';
    audio.volume = this.volume;
    audio.onended = () => {
      if (this.tapEffect !== audio) return;
      this.tapEffect = null;
      this.release(audio);
    };
    try {
      await audio.play();
    } catch (error) {
      this.release(audio);
      if (this.tapEffect === audio) this.tapEffect = null;
      if (id === this.tapRequest && !this.disposed && this.enabled && !this.paused) throw error;
      return;
    }
    if (id !== this.tapRequest || this.disposed || this.paused || !this.enabled) this.release(audio);
  }

  private stopTapCue(): void {
    ++this.tapRequest;
    this.release(this.tapEffect);
    this.tapEffect = null;
  }

  public async playAudio(file: string): Promise<void> {
    const mood = legacy[file];
    if (mood) this.desired = cues[mood];
    else if (Object.values(cues).includes(file)) this.desired = file;
    else throw new Error(`Unknown music cue: ${file}`);
    await this.play();
  }

  public async play(): Promise<void> {
    if (this.disposed || this.paused || !this.enabled) return;
    if (this.activeFile === this.desired && this.voices.length) {
      // Returning to the current cue also cancels a different cue still loading.
      ++this.request;
      this.release(this.pending);
      this.pending = null;
      await Promise.all(this.voices.filter(v => v.target > 0 && v.audio.paused).map(v => v.audio.play()));
      return;
    }
    const id = ++this.request;
    const file = this.desired;
    this.release(this.pending);
    const audio = new Audio(`/assets/${file}`);
    this.pending = audio;
    audio.loop = true;
    audio.preload = 'auto';
    audio.volume = 0;
    try {
      await audio.play();
    } catch (error) {
      this.release(audio);
      if (id === this.request) this.pending = null;
      if (!this.disposed && id === this.request && this.enabled && !this.paused) throw error;
      return;
    }
    if (id !== this.request || this.disposed) { this.release(audio); return; }
    this.pending = null;
    if (this.paused || !this.enabled) audio.pause();
    // Retain only the strongest outgoing voice during a rapid succession of choices.
    this.voices.sort((a, b) => b.gain - a.gain);
    for (const voice of this.voices.splice(1)) this.release(voice.audio);
    for (const voice of this.voices) { voice.from = voice.gain; voice.target = 0; }
    this.voices.push({ audio, gain: 0, from: 0, target: 1 });
    this.activeFile = file;
    this.fadeStart = performance.now();
    if (this.fadeTimer !== undefined) clearInterval(this.fadeTimer);
    this.fadeTimer = window.setInterval(() => this.updateFade(), 40);
    this.updateFade();
  }

  private updateFade(): void {
    const progress = Math.min(1, Math.max(0, (performance.now() - this.fadeStart) / this.fadeMs));
    for (const voice of this.voices) {
      voice.gain = voice.from + (voice.target - voice.from) * progress;
      this.applyVolume(voice);
    }
    if (progress >= 1) {
      this.voices = this.voices.filter(voice => {
        if (voice.target === 0) { this.release(voice.audio); return false; }
        return true;
      });
      clearInterval(this.fadeTimer);
      this.fadeTimer = undefined;
    }
  }

  private applyVolume(voice: Voice): void {
    voice.audio.volume = this.enabled && !this.paused ? Math.sin(voice.gain * Math.PI / 2) * this.volume : 0;
  }

  private release(audio: HTMLAudioElement | null): void {
    if (!audio) return;
    audio.onended = null;
    audio.pause();
    audio.removeAttribute('src');
    audio.load();
  }

  public setVolume(value: number): void {
    if (!Number.isFinite(value)) return;
    this.volume = Math.min(1, Math.max(0, value));
    this.voices.forEach(voice => this.applyVolume(voice));
    if (this.tapEffect) this.tapEffect.volume = this.enabled && !this.paused ? this.volume : 0;
  }

  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) this.stopTapCue();
    this.voices.forEach(voice => { this.applyVolume(voice); if (!enabled) voice.audio.pause(); });
    if (!enabled) this.pending?.pause();
    else void this.play().catch(() => { /* A later user gesture can retry denied playback. */ });
  }

  public setPaused(paused: boolean): void {
    this.paused = paused;
    if (paused) this.stopTapCue();
    this.voices.forEach(voice => { this.applyVolume(voice); if (paused) voice.audio.pause(); });
    if (paused) this.pending?.pause();
    else void this.play().catch(() => { /* Tab resumption must not reject the game loop. */ });
  }

  public dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    ++this.request;
    this.stopTapCue();
    clearInterval(this.fadeTimer);
    this.fadeTimer = undefined;
    this.release(this.pending);
    this.pending = null;
    this.voices.forEach(voice => this.release(voice.audio));
    this.voices = [];
  }
}
