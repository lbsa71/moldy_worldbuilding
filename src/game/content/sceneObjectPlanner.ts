import {
  LIMINAL_POSITION_LIMIT,
  NARRATIVE_OBJECT_TYPES,
  type NarrativeObjectType,
} from "./worldDesign";
import {
  createSceneObjectMaterialProfile,
  type SceneObjectMaterialProfile,
} from "./sceneObjectMaterial";
import { getOffMapIntensity } from "./worldZones";

export type ScenePoint = {
  x: number;
  z: number;
};

export type SceneRotation = {
  x: number;
  y: number;
  z: number;
};

export type SceneObjectState = {
  trust?: number;
  hospitalClarity?: boolean;
};

export type SceneObjectPresentationRole = "primary" | "echo";

export type SceneObjectPresentation = {
  lightIntensity: number;
  material: SceneObjectMaterialProfile;
  role: SceneObjectPresentationRole;
  scale: number;
  variant: number;
  verticalOffset: number;
};

export type SceneObjectPlacement = {
  type: NarrativeObjectType;
  worldPosition: ScenePoint;
  rotation: SceneRotation;
  visibility: number;
  presentation: SceneObjectPresentation;
};

const OBJECT_RADII: Record<NarrativeObjectType, number> = {
  lamp: 2.5,
  hand: 4.5,
  geometric: 5.5,
  hospital: 5,
};

const OBJECT_HEIGHT_TILT: Record<NarrativeObjectType, number> = {
  lamp: 0,
  hand: -0.12,
  geometric: 0.08,
  hospital: 0,
};

const OBJECT_BASE_SCALE: Record<NarrativeObjectType, number> = {
  lamp: 1,
  hand: 1,
  geometric: 1.08,
  hospital: 1.12,
};

const OBJECT_BASE_LIGHT: Record<NarrativeObjectType, number> = {
  lamp: 1.2,
  hand: 1.05,
  geometric: 0.95,
  hospital: 1.1,
};

const knownObjectTypes = new Set<string>(NARRATIVE_OBJECT_TYPES);

export function planSceneObjects(
  objectNames: string[],
  center: ScenePoint = { x: 0, z: 0 },
  state: SceneObjectState = {}
): SceneObjectPlacement[] {
  const knownNames = objectNames.filter((name): name is NarrativeObjectType =>
    knownObjectTypes.has(name)
  );

  if (knownNames.length === 0) {
    return [];
  }

  const objectTypeCounts = countObjectTypes(knownNames);
  const objectTypeIndexes = new Map<NarrativeObjectType, number>();
  const offMapIntensity = getOffMapIntensity(center);
  const angleStep = (Math.PI * 2) / knownNames.length;
  const startAngle = -Math.PI / 2;

  return knownNames.map((type, index) => {
    const typeIndex = objectTypeIndexes.get(type) ?? 0;
    objectTypeIndexes.set(type, typeIndex + 1);
    const angle = startAngle + angleStep * index;
    const radius = OBJECT_RADII[type] + offMapIntensity * 2 + typeIndex * 0.45;
    const targetX = center.x + Math.cos(angle) * radius;
    const targetZ = center.z + Math.sin(angle) * radius;
    const worldPosition = {
      x: clamp(targetX, -LIMINAL_POSITION_LIMIT, LIMINAL_POSITION_LIMIT),
      z: clamp(targetZ, -LIMINAL_POSITION_LIMIT, LIMINAL_POSITION_LIMIT),
    };

    return {
      type,
      worldPosition,
      rotation: {
        x: OBJECT_HEIGHT_TILT[type],
        y: angle + Math.PI / 2,
        z: -OBJECT_HEIGHT_TILT[type],
      },
      visibility: getSceneObjectVisibility(type, state),
      presentation: getSceneObjectPresentation({
        center,
        duplicateCount: objectTypeCounts.get(type) ?? 1,
        duplicateIndex: typeIndex,
        objectIndex: index,
        offMapIntensity,
        state,
        type,
      }),
    };
  });
}

export function getSceneObjectVisibility(
  type: NarrativeObjectType,
  { trust = 0, hospitalClarity = false }: SceneObjectState
): number {
  if (type === "lamp") {
    return 1;
  }

  if (type === "hospital") {
    return hospitalClarity ? 0.7 : 0;
  }

  if (type === "hand") {
    return clamp(0.35 + trust * 0.12, 0.35, 0.85);
  }

  return 0.58;
}

function getSceneObjectPresentation({
  center,
  duplicateCount,
  duplicateIndex,
  objectIndex,
  offMapIntensity,
  state,
  type,
}: {
  center: ScenePoint;
  duplicateCount: number;
  duplicateIndex: number;
  objectIndex: number;
  offMapIntensity: number;
  state: SceneObjectState;
  type: NarrativeObjectType;
}): SceneObjectPresentation {
  const role: SceneObjectPresentationRole =
    duplicateIndex === 0 ? "primary" : "echo";
  const trust = state.trust ?? 0;
  const duplicateScale = duplicateIndex === 0 ? 1.08 : 0.9;
  const routeScale =
    type === "hand"
      ? trust * 0.025
      : type === "hospital" && state.hospitalClarity
        ? 0.12
        : 0;
  const echoLift = duplicateCount > 1 ? duplicateIndex * 0.22 : 0;
  const variant = getStableVariant(type, objectIndex, center);

  return {
    lightIntensity: clamp(
      OBJECT_BASE_LIGHT[type] +
        offMapIntensity * 0.35 +
        (role === "primary" ? 0.08 : -0.08),
      0.6,
      1.65
    ),
    material: createSceneObjectMaterialProfile({
      offMapIntensity,
      role,
      state,
      type,
      variant,
    }),
    role,
    scale: clamp(
      (OBJECT_BASE_SCALE[type] + routeScale + offMapIntensity * 0.22) *
        duplicateScale,
      0.72,
      1.7
    ),
    variant,
    verticalOffset: echoLift + offMapIntensity * 0.12,
  };
}

function countObjectTypes(
  objectNames: NarrativeObjectType[]
): Map<NarrativeObjectType, number> {
  const counts = new Map<NarrativeObjectType, number>();

  objectNames.forEach((name) => {
    counts.set(name, (counts.get(name) ?? 0) + 1);
  });

  return counts;
}

function getStableVariant(
  type: NarrativeObjectType,
  index: number,
  center: ScenePoint
): number {
  const seed = `${type}:${index}:${Math.round(center.x)}:${Math.round(center.z)}`;

  return [...seed].reduce((hash, char) => hash + char.charCodeAt(0), 0);
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
