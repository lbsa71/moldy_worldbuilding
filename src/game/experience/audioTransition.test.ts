import { describe, expect, it } from "vitest";
import {
  createAudioTransitionPlan,
  getCrossfadeVolumes,
  normalizeAudioAssetPath,
  normalizeAudioTrackName,
} from "./audioTransition";

describe("normalizeAudioTrackName", () => {
  it("normalizes authored asset paths to stable track names", () => {
    expect(normalizeAudioTrackName(" soundtrack_1.mp3 ")).toBe("soundtrack_1.mp3");
    expect(normalizeAudioTrackName("/assets/soundtrack_2.mp3")).toBe("soundtrack_2.mp3");
  });

  it("rejects empty, absolute, or traversal track names", () => {
    expect(normalizeAudioTrackName("")).toBeNull();
    expect(normalizeAudioTrackName("../soundtrack_1.mp3")).toBeNull();
    expect(normalizeAudioTrackName("https://example.com/soundtrack.mp3")).toBeNull();
  });
});

describe("normalizeAudioAssetPath", () => {
  it("builds public asset URLs for safe authored tracks", () => {
    expect(normalizeAudioAssetPath("soundtrack_3.mp3")).toBe(
      "/assets/soundtrack_3.mp3"
    );
  });
});

describe("createAudioTransitionPlan", () => {
  it("starts the requested track when no music is active", () => {
    expect(
      createAudioTransitionPlan({
        currentTrack: null,
        requestedTrack: "soundtrack_1.mp3",
      })
    ).toMatchObject({
      kind: "start",
      targetTrack: "soundtrack_1.mp3",
      targetVolume: 0.72,
    });
  });

  it("keeps the current track when the request repeats", () => {
    expect(
      createAudioTransitionPlan({
        currentTrack: "/assets/soundtrack_1.mp3",
        requestedTrack: "soundtrack_1.mp3",
      })
    ).toEqual({ kind: "keep", targetTrack: "soundtrack_1.mp3" });
  });

  it("crossfades when the story requests a different track", () => {
    expect(
      createAudioTransitionPlan({
        currentTrack: "soundtrack_1.mp3",
        requestedTrack: "soundtrack_2.mp3",
        fadeDurationMs: 2400,
        tickMs: 80,
      })
    ).toMatchObject({
      kind: "crossfade",
      targetTrack: "soundtrack_2.mp3",
      fadeDurationMs: 2400,
      tickMs: 80,
    });
  });

  it("ignores unsafe or empty requests", () => {
    expect(
      createAudioTransitionPlan({
        currentTrack: "soundtrack_1.mp3",
        requestedTrack: "../soundtrack_2.mp3",
      })
    ).toEqual({ kind: "none" });
  });
});

describe("getCrossfadeVolumes", () => {
  it("returns smooth monotonic volumes across the fade", () => {
    const start = getCrossfadeVolumes({ elapsedMs: 0, durationMs: 2000 });
    const middle = getCrossfadeVolumes({ elapsedMs: 1000, durationMs: 2000 });
    const end = getCrossfadeVolumes({ elapsedMs: 2000, durationMs: 2000 });

    expect(start).toEqual({ incoming: 0, outgoing: 1 });
    expect(middle.incoming).toBeGreaterThan(start.incoming);
    expect(middle.outgoing).toBeLessThan(start.outgoing);
    expect(end).toEqual({ incoming: 0.72, outgoing: 0 });
  });
});
