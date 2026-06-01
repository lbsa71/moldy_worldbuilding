import { GROUNDED_POSITION_LIMIT, LIMINAL_POSITION_LIMIT } from "./worldDesign";

export type WorldPoint = {
  x: number;
  z: number;
};

export type WorldZone =
  | "grounded"
  | "off-map"
  | "outside-liminal-envelope";

export type WorldClassification = {
  maxAxisDistance: number;
  offMapIntensity: number;
  zone: WorldZone;
};

export type WorldTreatment = WorldClassification & {
  atmosphericMistMultiplier: number;
  camera: {
    adjustmentSpeed: number;
    heightOffset: number;
    radius: number;
  };
  fogColor: {
    b: number;
    g: number;
    r: number;
  };
  fogDensityMultiplier: number;
  groundMistMultiplier: number;
  mistExtent: number;
};

export function classifyWorldPosition(
  point: WorldPoint | null | undefined
): WorldClassification {
  const maxAxisDistance = Math.max(Math.abs(point?.x ?? 0), Math.abs(point?.z ?? 0));
  const offMapIntensity = getOffMapIntensity(point);

  if (maxAxisDistance <= GROUNDED_POSITION_LIMIT) {
    return {
      maxAxisDistance,
      offMapIntensity,
      zone: "grounded",
    };
  }

  if (maxAxisDistance <= LIMINAL_POSITION_LIMIT) {
    return {
      maxAxisDistance,
      offMapIntensity,
      zone: "off-map",
    };
  }

  return {
    maxAxisDistance,
    offMapIntensity,
    zone: "outside-liminal-envelope",
  };
}

export function getOffMapIntensity(point: WorldPoint | null | undefined): number {
  const maxAxisDistance = Math.max(Math.abs(point?.x ?? 0), Math.abs(point?.z ?? 0));
  const offMapDistance = maxAxisDistance - GROUNDED_POSITION_LIMIT;
  const offMapSpan = LIMINAL_POSITION_LIMIT - GROUNDED_POSITION_LIMIT;

  return clamp(offMapDistance / offMapSpan, 0, 1);
}

export function createWorldTreatment(
  point: WorldPoint | null | undefined
): WorldTreatment {
  const classification = classifyWorldPosition(point);
  const intensity = classification.offMapIntensity;

  return {
    ...classification,
    atmosphericMistMultiplier: 1 + intensity * 1.35,
    camera: {
      adjustmentSpeed: 0.05 - intensity * 0.018,
      heightOffset: 12 + intensity * 5,
      radius: 20 + intensity * 7,
    },
    fogColor: {
      b: 0.04 + intensity * 0.09,
      g: 0.06 + intensity * 0.035,
      r: 0.04 + intensity * 0.025,
    },
    fogDensityMultiplier: 1 + intensity * 1.35,
    groundMistMultiplier: 1 + intensity * 0.55,
    mistExtent: 50 + intensity * 30,
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
