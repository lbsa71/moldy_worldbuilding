import { describe, expect, it } from "vitest";
import {
  advanceCharacterMotion,
  createCharacterJourney,
  getShortestAngleDelta,
} from "./characterMotion";

describe("getShortestAngleDelta", () => {
  it("wraps rotation across the -PI/PI boundary", () => {
    const delta = getShortestAngleDelta(Math.PI - 0.03, -Math.PI + 0.03);

    expect(delta).toBeCloseTo(0.06, 3);
  });
});

describe("createCharacterJourney", () => {
  it("paces off-map passages more deliberately than grounded passages", () => {
    const grounded = createCharacterJourney({
      start: { x: 0, z: 0 },
      target: { x: 20, z: 0 },
      currentRotationY: Math.PI / 2,
    });
    const offMap = createCharacterJourney({
      start: { x: 72, z: 0 },
      target: { x: 92, z: 0 },
      currentRotationY: Math.PI / 2,
    });

    expect(grounded.routeClass).toBe("passage");
    expect(offMap.routeClass).toBe("off-map");
    expect(offMap.durationMs).toBeGreaterThan(grounded.durationMs);
    expect(offMap.speedUnitsPerSecond).toBeLessThan(
      grounded.speedUnitsPerSecond
    );
  });

  it("treats tiny retargets as a hold instead of a visible shuffle", () => {
    const journey = createCharacterJourney({
      start: { x: 12, z: -4 },
      target: { x: 12.08, z: -4.06 },
      currentRotationY: 0,
    });

    expect(journey.routeClass).toBe("hold");
    expect(journey.durationMs).toBe(0);
    expect(journey.speedUnitsPerSecond).toBe(0);
  });
});

describe("advanceCharacterMotion", () => {
  it("advances by elapsed time instead of assuming a fixed frame rate", () => {
    const target = { x: 12, z: 0 };
    const start = { x: 0, z: 0, rotationY: Math.PI / 2 };
    const journey = createCharacterJourney({
      start,
      target,
      currentRotationY: start.rotationY,
    });

    const oneStep = advanceCharacterMotion(
      start,
      target,
      journey,
      journey.durationMs / 2
    );
    const firstHalf = advanceCharacterMotion(
      start,
      target,
      journey,
      journey.durationMs / 4
    );
    const secondHalf = advanceCharacterMotion(
      firstHalf.pose,
      target,
      journey,
      journey.durationMs / 4
    );

    expect(secondHalf.pose.x).toBeCloseTo(oneStep.pose.x, 4);
    expect(secondHalf.pose.z).toBeCloseTo(oneStep.pose.z, 4);
  });

  it("snaps to the target instead of overshooting arrival", () => {
    const target = { x: 3, z: 0 };
    const start = { x: 0, z: 0, rotationY: Math.PI / 2 };
    const journey = createCharacterJourney({
      start,
      target,
      currentRotationY: start.rotationY,
    });

    const result = advanceCharacterMotion(
      start,
      target,
      journey,
      journey.durationMs * 3
    );

    expect(result.arrived).toBe(true);
    expect(result.pose.x).toBe(target.x);
    expect(result.pose.z).toBe(target.z);
  });
});
