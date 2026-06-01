export const TERRAIN_SIZE = 100;
export const GROUNDED_POSITION_LIMIT = TERRAIN_SIZE / 2;
export const LIMINAL_POSITION_LIMIT = 96;

export const NARRATIVE_OBJECT_TYPES = [
  "lamp",
  "hand",
  "geometric",
  "hospital",
] as const;

export type NarrativeObjectType = (typeof NARRATIVE_OBJECT_TYPES)[number];
