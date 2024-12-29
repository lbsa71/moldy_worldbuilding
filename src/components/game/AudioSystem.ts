import { Scene } from "@babylonjs/core";

export class AudioSystem {
  private currentAudio: HTMLAudioElement | null = null;
  private nextAudio: HTMLAudioElement | null = null;
  private fadeInterval: number | null = null;

  constructor(private scene: Scene) {
    // Create hidden audio elements container
    const container = document.createElement('div');
    container.style.display = 'none';
    document.body.appendChild(container);
  }

  public async playAudio(audioFile: string): Promise<void> {
    if (this.currentAudio?.src.endsWith(audioFile)) {
      return; // Already playing this audio
    }

    // Create new audio element
    this.nextAudio = new Audio(`/assets/${audioFile}`);
    this.nextAudio.loop = true;
    await this.nextAudio.load();

    // If there's current audio playing, fade it out
    if (this.currentAudio) {
      await this.fadeOutCurrentAudio();
    }

    // Start playing new audio
    this.currentAudio = this.nextAudio;
    this.nextAudio = null;
    this.currentAudio.volume = 1;
    await this.currentAudio.play();
  }

  private fadeOutCurrentAudio(): Promise<void> {
    return new Promise((resolve) => {
      if (!this.currentAudio) {
        resolve();
        return;
      }

      // Clear any existing fade interval
      if (this.fadeInterval) {
        clearInterval(this.fadeInterval);
      }

      const fadeStep = 0.05; // Adjust volume by 5% each step
      const fadeInterval = 50; // Update every 50ms
      const fadeDuration = 2000; // 2 second fade
      const steps = fadeDuration / fadeInterval;
      const volumeStep = fadeStep;
      let currentStep = 0;

      this.fadeInterval = window.setInterval(() => {
        if (!this.currentAudio) {
          if (this.fadeInterval) clearInterval(this.fadeInterval);
          resolve();
          return;
        }

        currentStep++;
        this.currentAudio.volume = Math.max(0, 1 - (currentStep * volumeStep));

        if (currentStep >= steps || this.currentAudio.volume <= 0) {
          if (this.fadeInterval) clearInterval(this.fadeInterval);
          this.currentAudio.pause();
          this.currentAudio = null;
          resolve();
        }
      }, fadeInterval);
    });
  }

  public dispose(): void {
    if (this.fadeInterval) {
      clearInterval(this.fadeInterval);
    }
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio = null;
    }
    if (this.nextAudio) {
      this.nextAudio = null;
    }
  }
}
