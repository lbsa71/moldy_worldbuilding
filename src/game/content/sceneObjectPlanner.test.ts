import { describe, expect, it } from "vitest";
import {
  LIMINAL_POSITION_LIMIT,
  NARRATIVE_OBJECT_TYPES,
} from "./worldDesign";
import { planSceneObjects } from "./sceneObjectPlanner";

describe("planSceneObjects", () => {
  it("keeps duplicate story tags and produces stable placements", () => {
    const input = ["lamp", "hand", "hand", "geometric"];
    const firstPlan = planSceneObjects(input, { x: 20, z: 0 }, {
      trust: 2,
      hospitalClarity: false,
    });
    const secondPlan = planSceneObjects(input, { x: 20, z: 0 }, {
      trust: 2,
      hospitalClarity: false,
    });

    expect(firstPlan.map((placement) => placement.type)).toEqual(input);
    expect(firstPlan).toEqual(secondPlan);
  });

  it("ignores object tags that do not have implemented scene objects", () => {
    const plan = planSceneObjects(["lamp", "weather", "hospital"], { x: 0, z: 0 });

    expect(plan.map((placement) => placement.type)).toEqual(["lamp", "hospital"]);
    expect(plan.every((placement) => NARRATIVE_OBJECT_TYPES.includes(placement.type))).toBe(true);
  });

  it("keeps generated object positions inside the liminal envelope", () => {
    const plan = planSceneObjects(
      ["hand", "hand", "geometric", "hospital"],
      { x: 92, z: 0 },
      { trust: 3, hospitalClarity: true }
    );

    for (const placement of plan) {
      expect(Math.abs(placement.worldPosition.x)).toBeLessThanOrEqual(LIMINAL_POSITION_LIMIT);
      expect(Math.abs(placement.worldPosition.z)).toBeLessThanOrEqual(LIMINAL_POSITION_LIMIT);
    }
  });

  it("maps story state to route-readable visibility", () => {
    const lowTrustPlan = planSceneObjects(["lamp", "hand", "hospital"], { x: 0, z: 0 }, {
      trust: 0,
      hospitalClarity: false,
    });
    const highTrustPlan = planSceneObjects(["lamp", "hand", "hospital"], { x: 0, z: 0 }, {
      trust: 4,
      hospitalClarity: true,
    });

    const lowTrustHand = lowTrustPlan.find((placement) => placement.type === "hand");
    const highTrustHand = highTrustPlan.find((placement) => placement.type === "hand");
    const hiddenHospital = lowTrustPlan.find((placement) => placement.type === "hospital");
    const clearHospital = highTrustPlan.find((placement) => placement.type === "hospital");

    expect(lowTrustPlan.find((placement) => placement.type === "lamp")?.visibility).toBe(1);
    expect(lowTrustHand?.visibility).toBeLessThan(highTrustHand?.visibility ?? 0);
    expect(hiddenHospital?.visibility).toBe(0);
    expect(clearHospital?.visibility).toBeGreaterThan(0.55);
  });
});
