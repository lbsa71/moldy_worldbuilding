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

  it("turns repeated object tags into primary and echo staging", () => {
    const plan = planSceneObjects(
      ["hand", "hand", "hand"],
      { x: 40, z: 0 },
      { trust: 3 }
    );

    expect(plan).toHaveLength(3);
    expect(plan[0].presentation.role).toBe("primary");
    expect(plan[1].presentation.role).toBe("echo");
    expect(plan[2].presentation.role).toBe("echo");
    expect(plan[0].presentation.scale).toBeGreaterThan(plan[1].presentation.scale);
    expect(plan[2].presentation.verticalOffset).toBeGreaterThan(
      plan[1].presentation.verticalOffset
    );
  });

  it("amplifies object staging when the story goes off the map", () => {
    const grounded = planSceneObjects(["hospital"], { x: 0, z: 0 }, {
      hospitalClarity: true,
    })[0];
    const offMap = planSceneObjects(["hospital"], { x: 0, z: 92 }, {
      hospitalClarity: true,
    })[0];

    expect(offMap.presentation.scale).toBeGreaterThan(grounded.presentation.scale);
    expect(offMap.presentation.lightIntensity).toBeGreaterThan(
      grounded.presentation.lightIntensity
    );
  });

  it("assigns stable visual variants for implemented object tags", () => {
    const firstPlan = planSceneObjects(
      ["geometric", "hospital", "geometric"],
      { x: 20, z: 20 },
      { hospitalClarity: true }
    );
    const secondPlan = planSceneObjects(
      ["geometric", "hospital", "geometric"],
      { x: 20, z: 20 },
      { hospitalClarity: true }
    );

    expect(firstPlan.map((placement) => placement.presentation.variant)).toEqual(
      secondPlan.map((placement) => placement.presentation.variant)
    );
  });

  it("attaches stable material profiles to planned story objects", () => {
    const firstPlan = planSceneObjects(
      ["lamp", "hand", "geometric", "hospital"],
      { x: 24, z: -18 },
      { trust: 3, hospitalClarity: true }
    );
    const secondPlan = planSceneObjects(
      ["lamp", "hand", "geometric", "hospital"],
      { x: 24, z: -18 },
      { trust: 3, hospitalClarity: true }
    );

    expect(
      firstPlan.every((placement) => placement.presentation.material.alpha > 0)
    ).toBe(true);
    expect(firstPlan.map((placement) => placement.presentation.material)).toEqual(
      secondPlan.map((placement) => placement.presentation.material)
    );
    expect(
      firstPlan.find((placement) => placement.type === "lamp")?.presentation
        .material.diffuse.r
    ).toBeGreaterThan(
      firstPlan.find((placement) => placement.type === "hand")?.presentation
        .material.diffuse.r ?? 1
    );
  });

  it("carries off-map intensity into material glow", () => {
    const grounded = planSceneObjects(["geometric"], { x: 0, z: 0 })[0];
    const offMap = planSceneObjects(["geometric"], { x: 0, z: 92 })[0];

    expect(offMap.presentation.material.glow).toBeGreaterThan(
      grounded.presentation.material.glow
    );
    expect(offMap.presentation.material.emissive.b).toBeGreaterThan(
      grounded.presentation.material.emissive.b
    );
  });

  it("attaches stable composition profiles to planned story objects", () => {
    const firstPlan = planSceneObjects(
      ["lamp", "hand", "geometric", "hospital"],
      { x: -18, z: 32 },
      { trust: 4, hospitalClarity: true }
    );
    const secondPlan = planSceneObjects(
      ["lamp", "hand", "geometric", "hospital"],
      { x: -18, z: 32 },
      { trust: 4, hospitalClarity: true }
    );

    expect(firstPlan.map((placement) => placement.presentation.composition)).toEqual(
      secondPlan.map((placement) => placement.presentation.composition)
    );
    expect(
      firstPlan.find((placement) => placement.type === "lamp")?.presentation
        .composition.silhouette
    ).toBe("beacon");
    expect(
      firstPlan.find((placement) => placement.type === "hospital")
        ?.presentation.composition.detailOpacity
    ).toBeGreaterThan(0.6);
  });

  it("carries off-map intensity into silhouette stretch", () => {
    const grounded = planSceneObjects(["geometric"], { x: 0, z: 0 })[0];
    const offMap = planSceneObjects(["geometric"], { x: 0, z: 92 })[0];

    expect(offMap.presentation.composition.frameScale).toBeGreaterThan(
      grounded.presentation.composition.frameScale
    );
    expect(offMap.presentation.composition.verticalStretch).toBeGreaterThan(
      grounded.presentation.composition.verticalStretch
    );
  });
});
