import { getOffMapIntensity } from "../content/worldZones";

export type CharacterMotionPoint = {
  x: number;
  z: number;
};

export type CharacterMotionPose = CharacterMotionPoint & {
  rotationY: number;
};

export type CharacterJourneyClass = "hold" | "step" | "passage" | "off-map";

export type CharacterJourneyPlan = {
  arrivalRadius: number;
  desiredRotationY: number;
  distance: number;
  durationMs: number;
  movementAlignmentRadians: number;
  offMapIntensity: number;
  routeClass: CharacterJourneyClass;
  speedUnitsPerSecond: number;
  turnDurationMs: number;
  turnRateRadiansPerSecond: number;
};

export type CharacterMotionStep = {
  arrived: boolean;
  phase: "arrived" | "turning" | "walking";
  pose: CharacterMotionPose;
  remainingDistance: number;
};

const HOLD_DISTANCE = 0.35;
const BASE_SPEED_UNITS_PER_SECOND = 7.4;
const STEP_SPEED_UNITS_PER_SECOND = 6.2;
const OFF_MAP_SPEED_PENALTY = 2.3;
const MIN_TURN_RATE_RADIANS_PER_SECOND = 2.5;

export function createCharacterJourney({
  start,
  target,
  currentRotationY = 0,
}: {
  currentRotationY?: number;
  start: CharacterMotionPoint;
  target: CharacterMotionPoint;
}): CharacterJourneyPlan {
  const distance = getHorizontalDistance(start, target);
  const desiredRotationY =
    distance > 0
      ? Math.atan2(target.x - start.x, target.z - start.z)
      : currentRotationY;
  const offMapIntensity = getOffMapIntensity(target);

  if (distance <= HOLD_DISTANCE) {
    return {
      arrivalRadius: 0.05,
      desiredRotationY,
      distance,
      durationMs: 0,
      movementAlignmentRadians: Math.PI / 5,
      offMapIntensity,
      routeClass: "hold",
      speedUnitsPerSecond: 0,
      turnDurationMs: 0,
      turnRateRadiansPerSecond: MIN_TURN_RATE_RADIANS_PER_SECOND,
    };
  }

  const routeClass = getJourneyClass(distance, offMapIntensity);
  const speedUnitsPerSecond = getJourneySpeed(routeClass, offMapIntensity);
  const durationMs = getJourneyDurationMs(
    distance,
    speedUnitsPerSecond,
    routeClass
  );
  const turnDelta = Math.abs(
    getShortestAngleDelta(currentRotationY, desiredRotationY)
  );
  const turnDurationMs =
    turnDelta < 0.04 ? 0 : clamp((turnDelta / Math.PI) * 720, 140, 820);
  const turnRateRadiansPerSecond =
    turnDurationMs === 0
      ? MIN_TURN_RATE_RADIANS_PER_SECOND
      : Math.max(
          MIN_TURN_RATE_RADIANS_PER_SECOND,
          turnDelta / (turnDurationMs / 1000)
        );

  return {
    arrivalRadius: routeClass === "step" ? 0.12 : 0.28,
    desiredRotationY,
    distance,
    durationMs,
    movementAlignmentRadians:
      routeClass === "off-map" ? Math.PI / 3 : Math.PI / 4,
    offMapIntensity,
    routeClass,
    speedUnitsPerSecond,
    turnDurationMs,
    turnRateRadiansPerSecond,
  };
}

export function advanceCharacterMotion(
  pose: CharacterMotionPose,
  target: CharacterMotionPoint,
  journey: CharacterJourneyPlan,
  deltaMs: number
): CharacterMotionStep {
  const remainingDistance = getHorizontalDistance(pose, target);

  if (
    journey.routeClass === "hold" ||
    remainingDistance <= journey.arrivalRadius
  ) {
    return {
      arrived: true,
      phase: "arrived",
      pose: {
        x: target.x,
        z: target.z,
        rotationY: pose.rotationY,
      },
      remainingDistance: 0,
    };
  }

  const elapsedSeconds = Math.max(0, deltaMs) / 1000;
  if (elapsedSeconds === 0) {
    return {
      arrived: false,
      phase: "turning",
      pose,
      remainingDistance,
    };
  }

  const desiredRotationY = Math.atan2(target.x - pose.x, target.z - pose.z);
  const rotationDelta = getShortestAngleDelta(pose.rotationY, desiredRotationY);
  const rotationStep =
    Math.sign(rotationDelta) *
    Math.min(
      Math.abs(rotationDelta),
      journey.turnRateRadiansPerSecond * elapsedSeconds
    );
  const nextRotationY = normalizeAngle(pose.rotationY + rotationStep);
  const remainingTurn = Math.abs(
    getShortestAngleDelta(nextRotationY, desiredRotationY)
  );

  if (remainingTurn > journey.movementAlignmentRadians) {
    return {
      arrived: false,
      phase: "turning",
      pose: {
        ...pose,
        rotationY: nextRotationY,
      },
      remainingDistance,
    };
  }

  const alignmentScale = clamp(
    1 - (remainingTurn / journey.movementAlignmentRadians) * 0.35,
    0.65,
    1
  );
  const travelDistance =
    journey.speedUnitsPerSecond * elapsedSeconds * alignmentScale;

  if (travelDistance >= remainingDistance - journey.arrivalRadius) {
    return {
      arrived: true,
      phase: "arrived",
      pose: {
        x: target.x,
        z: target.z,
        rotationY: nextRotationY,
      },
      remainingDistance: 0,
    };
  }

  const directionX = (target.x - pose.x) / remainingDistance;
  const directionZ = (target.z - pose.z) / remainingDistance;
  const nextPose = {
    x: pose.x + directionX * travelDistance,
    z: pose.z + directionZ * travelDistance,
    rotationY: nextRotationY,
  };

  return {
    arrived: false,
    phase: "walking",
    pose: nextPose,
    remainingDistance: getHorizontalDistance(nextPose, target),
  };
}

export function getShortestAngleDelta(
  fromRadians: number,
  toRadians: number
): number {
  return Math.atan2(
    Math.sin(toRadians - fromRadians),
    Math.cos(toRadians - fromRadians)
  );
}

function getJourneyClass(
  distance: number,
  offMapIntensity: number
): CharacterJourneyClass {
  if (offMapIntensity > 0.05) return "off-map";
  if (distance < 6) return "step";
  return "passage";
}

function getJourneySpeed(
  routeClass: CharacterJourneyClass,
  offMapIntensity: number
): number {
  if (routeClass === "step") return STEP_SPEED_UNITS_PER_SECOND;
  return clamp(
    BASE_SPEED_UNITS_PER_SECOND - offMapIntensity * OFF_MAP_SPEED_PENALTY,
    4.7,
    BASE_SPEED_UNITS_PER_SECOND
  );
}

function getJourneyDurationMs(
  distance: number,
  speedUnitsPerSecond: number,
  routeClass: CharacterJourneyClass
): number {
  const rawDurationMs = (distance / speedUnitsPerSecond) * 1000;
  if (routeClass === "step") return clamp(rawDurationMs, 700, 1800);
  if (routeClass === "off-map") return clamp(rawDurationMs, 1100, 6800);
  return clamp(rawDurationMs, 1100, 5200);
}

function getHorizontalDistance(
  a: CharacterMotionPoint,
  b: CharacterMotionPoint
): number {
  return Math.hypot(b.x - a.x, b.z - a.z);
}

function normalizeAngle(radians: number): number {
  return Math.atan2(Math.sin(radians), Math.cos(radians));
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
