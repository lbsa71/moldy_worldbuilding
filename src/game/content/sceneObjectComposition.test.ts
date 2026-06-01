import { describe, expect, it } from "vitest";
import { createSceneObjectCompositionProfile } from "./sceneObjectComposition";
import type { NarrativeObjectType } from "./worldDesign";

function profileFor(
  type: NarrativeObjectType,
  options: Partial<Parameters<typeof createSceneObjectCompositionProfile>[0]> = {}
) {
  return createSceneObjectCompositionProfile({
    offMapIntensity: 0,
    role: "primary",
    state: {},
    type,
    variant: 0,
    ...options,
  });
}

describe("createSceneObjectCompositionProfile", () => {
  it("assigns authored silhouette roles to implemented story objects", () => {
    expect(profileFor("lamp").silhouette).toBe("beacon");
    expect(profileFor("hand").silhouette).toBe("reach");
    expect(profileFor("hospital").silhouette).toBe("ward");
    expect(profileFor("geometric").silhouette).toBe("threshold");
  });

  it("lets trust open the hand motif into a clearer reach shape", () => {
    const guarded = profileFor("hand", { state: { trust: 0 } });
    const trusting = profileFor("hand", { state: { trust: 4 } });

    expect(trusting.detailOpacity).toBeGreaterThan(guarded.detailOpacity);
    expect(trusting.echoSpread).toBeGreaterThan(guarded.echoSpread);
    expect(trusting.frameScale).toBeGreaterThan(guarded.frameScale);
  });

  it("uses hospital clarity to reveal more ward detail", () => {
    const obscured = profileFor("hospital", {
      state: { hospitalClarity: false },
    });
    const clear = profileFor("hospital", {
      state: { hospitalClarity: true },
    });

    expect(clear.detailOpacity).toBeGreaterThan(obscured.detailOpacity);
    expect(clear.frameScale).toBeGreaterThan(obscured.frameScale);
    expect(clear.lineWeight).toBeGreaterThanOrEqual(obscured.lineWeight);
  });

  it("stretches off-map silhouettes without losing their object identity", () => {
    const grounded = profileFor("geometric", { offMapIntensity: 0, variant: 7 });
    const offMap = profileFor("geometric", { offMapIntensity: 1, variant: 7 });

    expect(offMap.silhouette).toBe(grounded.silhouette);
    expect(offMap.echoSpread).toBeGreaterThan(grounded.echoSpread);
    expect(offMap.frameScale).toBeGreaterThan(grounded.frameScale);
    expect(offMap.verticalStretch).toBeGreaterThan(grounded.verticalStretch);
  });

  it("makes echo objects lighter but more spatially separated", () => {
    const primary = profileFor("hand", { role: "primary", state: { trust: 2 } });
    const echo = profileFor("hand", { role: "echo", state: { trust: 2 } });

    expect(echo.detailOpacity).toBeLessThan(primary.detailOpacity);
    expect(echo.echoSpread).toBeGreaterThan(primary.echoSpread);
  });
});
