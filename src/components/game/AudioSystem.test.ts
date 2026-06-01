import { afterEach, describe, expect, it, vi } from "vitest";
import { AudioSystem } from "./AudioSystem";

class FakeAudioElement {
  public loadCalls = 0;
  public loop = false;
  public pauseCalls = 0;
  public paused = true;
  public playCalls = 0;
  public preload = "";
  public removeCalls = 0;
  public volume = 1;

  constructor(public src: string) {}

  load(): void {
    this.loadCalls += 1;
  }

  pause(): void {
    this.pauseCalls += 1;
    this.paused = true;
  }

  play(): Promise<void> {
    this.playCalls += 1;
    this.paused = false;
    return Promise.resolve();
  }

  remove(): void {
    this.removeCalls += 1;
  }
}

describe("AudioSystem", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("starts a safe authored track once and does not reload duplicate requests", async () => {
    const elements: FakeAudioElement[] = [];
    const audioSystem = new AudioSystem({
      audioFactory: (assetPath) => {
        const element = new FakeAudioElement(assetPath);
        elements.push(element);
        return element;
      },
    });

    expect(await audioSystem.playAudio("soundtrack_1.mp3")).toBe("start");
    expect(await audioSystem.playAudio("/assets/soundtrack_1.mp3")).toBe("keep");

    expect(elements).toHaveLength(1);
    expect(elements[0]).toMatchObject({
      loadCalls: 1,
      loop: true,
      playCalls: 1,
      preload: "auto",
      src: "/assets/soundtrack_1.mp3",
      volume: 0.72,
    });
    expect(audioSystem.getStatus()).toMatchObject({
      currentTrack: "soundtrack_1.mp3",
      isTransitioning: false,
      lastPlaybackError: null,
    });
  });

  it("crossfades between different tracks and disposes the outgoing element", async () => {
    vi.useFakeTimers();
    const elements: FakeAudioElement[] = [];
    const audioSystem = new AudioSystem({
      audioFactory: (assetPath) => {
        const element = new FakeAudioElement(assetPath);
        elements.push(element);
        return element;
      },
      fadeDurationMs: 1000,
      tickMs: 100,
    });

    await audioSystem.playAudio("soundtrack_1.mp3");
    expect(await audioSystem.playAudio("soundtrack_2.mp3")).toBe("crossfade");

    expect(elements).toHaveLength(2);
    expect(audioSystem.getStatus()).toMatchObject({
      currentTrack: "soundtrack_2.mp3",
      isTransitioning: true,
    });

    vi.advanceTimersByTime(500);
    expect(elements[0].volume).toBeLessThan(0.72);
    expect(elements[1].volume).toBeGreaterThan(0);

    vi.advanceTimersByTime(600);
    expect(elements[0].pauseCalls).toBe(1);
    expect(elements[0].removeCalls).toBe(1);
    expect(elements[1].volume).toBe(0.72);
    expect(audioSystem.getStatus().isTransitioning).toBe(false);
  });

  it("keeps playback failures as state instead of throwing unhandled errors", async () => {
    const audioSystem = new AudioSystem({
      audioFactory: (assetPath) => ({
        loop: false,
        paused: true,
        preload: "",
        src: assetPath,
        volume: 1,
        load: () => undefined,
        pause: () => undefined,
        play: () => Promise.reject(new Error("autoplay denied")),
      }),
    });

    await expect(audioSystem.playAudio("soundtrack_1.mp3")).resolves.toBe("none");
    expect(audioSystem.getStatus()).toMatchObject({
      currentTrack: null,
      isTransitioning: false,
      lastPlaybackError: "autoplay denied",
    });
  });
});
