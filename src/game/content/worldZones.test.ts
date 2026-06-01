import { describe, expect, it } from "vitest";
import { GROUNDED_POSITION_LIMIT, LIMINAL_POSITION_LIMIT } from "./worldDesign";
import {
  classifyWorldPosition,
  createWorldTreatment,
  getOffMapIntensity,
} from "./worldZones";

describe("classifyWorldPosition", () => {
  it("treats the terrain bounds as grounded world", () => {
    expect(classifyWorldPosition({ x: 0, z: 0 }).zone).toBe("grounded");
    expect(
      classifyWorldPosition({ x: GROUNDED_POSITION_LIMIT, z: 0 }).zone
    ).toBe("grounded");
  });

  it("treats the intentional +92 coordinates as off-map but still liminal", () => {
    const classification = classifyWorldPosition({ x: 92, z: 0 });

    expect(classification.zone).toBe("off-map");
    expect(classification.maxAxisDistance).toBeLessThanOrEqual(
      LIMINAL_POSITION_LIMIT
    );
    expect(classification.offMapIntensity).toBeGreaterThan(0.85);
  });

  it("separates content outside the liminal envelope from intentional off-map space", () => {
    expect(classifyWorldPosition({ x: 120, z: 0 }).zone).toBe(
      "outside-liminal-envelope"
    );
  });
});

describe("getOffMapIntensity", () => {
  it("ramps from zero at the terrain edge to one at the liminal boundary", () => {
    expect(getOffMapIntensity({ x: 0, z: 0 })).toBe(0);
    expect(getOffMapIntensity({ x: GROUNDED_POSITION_LIMIT, z: 0 })).toBe(0);
    expect(getOffMapIntensity({ x: LIMINAL_POSITION_LIMIT, z: 0 })).toBe(1);
  });
});

describe("createWorldTreatment", () => {
  it("keeps grounded scenes close and lightly misted", () => {
    const treatment = createWorldTreatment({ x: 0, z: 0 });

    expect(treatment.zone).toBe("grounded");
    expect(treatment.fogDensityMultiplier).toBe(1);
    expect(treatment.camera.radius).toBe(20);
    expect(treatment.camera.heightOffset).toBe(12);
  });

  it("makes off-map scenes denser, higher, and more distant", () => {
    const treatment = createWorldTreatment({ x: 92, z: 0 });

    expect(treatment.zone).toBe("off-map");
    expect(treatment.fogDensityMultiplier).toBeGreaterThan(2);
    expect(treatment.atmosphericMistMultiplier).toBeGreaterThan(2);
    expect(treatment.camera.radius).toBeGreaterThan(25);
    expect(treatment.camera.heightOffset).toBeGreaterThan(15);
  });
});
