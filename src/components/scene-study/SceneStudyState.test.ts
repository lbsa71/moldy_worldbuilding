import { describe, expect, it, vi } from "vitest";
import { getSceneStudyState, SCENE_STUDY_STATES } from "./SceneStudyState";

describe("complete scene study states", () => {
  it("recovers an unknown ID to the complete opening while retaining motion preference", () => {
    expect(getSceneStudyState("unknown", true)).toEqual({
      chairTurned: false, cupVisible: true, reducedMotion: true,
    });
  });

  it("reset restores both objects regardless of the previous arrangement", () => {
    const previous = getSceneStudyState("memory");
    previous.chairTurned = true;
    expect(getSceneStudyState("reset")).toEqual({
      chairTurned: false, cupVisible: true, reducedMotion: false,
    });
    expect(getSceneStudyState("opening")).toEqual(getSceneStudyState("reset"));
  });

  it("supplies identical settled arrangements with either motion preference", () => {
    for (const { id } of SCENE_STUDY_STATES) {
      expect(getSceneStudyState(id, true)).toEqual({ ...getSceneStudyState(id), reducedMotion: true });
    }
  });

  it("has no timed or history-dependent state and does not share mutable output", () => {
    vi.useFakeTimers();
    try {
      const first = getSceneStudyState("invitation");
      first.cupVisible = false;
      getSceneStudyState("memory");
      vi.advanceTimersByTime(60 * 60 * 1000);
      expect(getSceneStudyState("invitation")).toEqual({
        chairTurned: true, cupVisible: true, reducedMotion: false,
      });
      expect(vi.getTimerCount()).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });
});
