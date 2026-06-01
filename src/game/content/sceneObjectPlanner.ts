import {
  LIMINAL_POSITION_LIMIT,
  NARRATIVE_OBJECT_TYPES,
  type NarrativeObjectType,
} from "./worldDesign";

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

export type SceneObjectPlacement = {
  type: NarrativeObjectType;
  worldPosition: ScenePoint;
  rotation: SceneRotation;
  visibility: number;
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

  const angleStep = (Math.PI * 2) / knownNames.length;
  const startAngle = -Math.PI / 2;

  return knownNames.map((type, index) => {
    const angle = startAngle + angleStep * index;
    const radius = OBJECT_RADII[type];
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

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
