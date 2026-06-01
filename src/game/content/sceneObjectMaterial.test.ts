import { describe, expect, it } from "vitest";
import {
  createSceneObjectMaterialProfile,
  type SceneObjectColor,
} from "./sceneObjectMaterial";
import type { NarrativeObjectType } from "./worldDesign";

function profileFor(
  type: NarrativeObjectType,
  options: Partial<Parameters<typeof createSceneObjectMaterialProfile>[0]> = {}
) {
  return createSceneObjectMaterialProfile({
    offMapIntensity: 0,
    role: "primary",
    state: {},
    type,
    variant: 0,
    ...options,
  });
}

function distance(a: SceneObjectColor, b: SceneObjectColor): number {
  return Math.hypot(a.r - b.r, a.g - b.g, a.b - b.b);
}

function energy(color: SceneObjectColor): number {
  return color.r + color.g + color.b;
}

describe("createSceneObjectMaterialProfile", () => {
  it("assigns distinct authored material families to implemented story objects", () => {
    const lamp = profileFor("lamp");
    const hand = profileFor("hand", { state: { trust: 3 } });
    const hospital = profileFor("hospital", {
      state: { hospitalClarity: true },
    });
    const geometric = profileFor("geometric", { variant: 5 });

    expect(lamp.diffuse.r).toBeGreaterThan(lamp.diffuse.b + 0.15);
    expect(lamp.accent.r).toBeGreaterThan(lamp.accent.b + 0.25);
    expect(hand.diffuse.g).toBeGreaterThan(hand.diffuse.r + 0.08);
    expect(hand.emissive.b).toBeGreaterThan(hand.emissive.r);
    expect(hospital.diffuse.b).toBeGreaterThanOrEqual(hospital.diffuse.r);
    expect(hospital.accent.r - hospital.accent.b).toBeLessThan(0.35);
    expect(distance(geometric.diffuse, lamp.diffuse)).toBeGreaterThan(0.2);
    expect(distance(geometric.diffuse, hospital.diffuse)).toBeGreaterThan(0.18);
  });

  it("makes the hand motif more legible as trust rises", () => {
    const guarded = profileFor("hand", { state: { trust: 0 } });
    const trusting = profileFor("hand", { state: { trust: 4 } });

    expect(trusting.alpha).toBeGreaterThan(guarded.alpha);
    expect(trusting.glow).toBeGreaterThan(guarded.glow);
    expect(trusting.emissive.g).toBeGreaterThan(guarded.emissive.g);
    expect(trusting.emissive.b).toBeGreaterThan(guarded.emissive.b);
  });

  it("uses hospital clarity to soften alarm red into calmer ward colors", () => {
    const obscured = profileFor("hospital", {
      state: { hospitalClarity: false },
    });
    const clear = profileFor("hospital", {
      state: { hospitalClarity: true },
    });

    const obscuredAlarmGap = obscured.accent.r - obscured.accent.g;
    const clearAlarmGap = clear.accent.r - clear.accent.g;

    expect(clear.alpha).toBeGreaterThan(obscured.alpha);
    expect(clearAlarmGap).toBeLessThan(obscuredAlarmGap);
    expect(clear.secondary.b).toBeGreaterThan(obscured.secondary.b);
    expect(clear.emissive.b).toBeGreaterThan(obscured.emissive.b);
  });

  it("adds spectral haze for off-map object beats without saturating alpha", () => {
    const grounded = profileFor("geometric", { offMapIntensity: 0, variant: 3 });
    const offMap = profileFor("geometric", { offMapIntensity: 1, variant: 3 });

    expect(offMap.glow).toBeGreaterThan(grounded.glow);
    expect(energy(offMap.emissive)).toBeGreaterThan(energy(grounded.emissive));
    expect(offMap.alpha).toBeGreaterThan(grounded.alpha);
    expect(offMap.alpha).toBeLessThanOrEqual(0.92);
  });

  it("keeps geometric variants deterministic inside a bounded route palette", () => {
    const first = profileFor("geometric", { variant: 8 });
    const second = profileFor("geometric", { variant: 8 });
    const alternate = profileFor("geometric", { variant: 9 });

    expect(first).toEqual(second);
    expect(distance(first.diffuse, alternate.diffuse)).toBeGreaterThan(0.08);

    for (const variant of [0, 1, 2, 3, 4, 5, 6, 7]) {
      const profile = profileFor("geometric", { variant });
      const channels = [
        profile.diffuse.r,
        profile.diffuse.g,
        profile.diffuse.b,
        profile.emissive.r,
        profile.emissive.g,
        profile.emissive.b,
      ];

      expect(Math.min(...channels)).toBeGreaterThanOrEqual(0.05);
      expect(Math.max(...channels)).toBeLessThanOrEqual(0.98);
      expect(profile.alpha).toBeGreaterThanOrEqual(0.42);
      expect(profile.alpha).toBeLessThanOrEqual(0.86);
      expect(profile.glow).toBeGreaterThanOrEqual(0.18);
      expect(profile.glow).toBeLessThanOrEqual(0.78);
    }
  });
});
