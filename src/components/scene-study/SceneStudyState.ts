/** Complete settled state for the visual apparatus proof, independent of Ink. */
export interface SceneStudyState {
  chairTurned: boolean;
  cupVisible: boolean;
  /** Supplied by the caller; this changes transition behavior, never the arrangement. */
  reducedMotion: boolean;
}

export type SceneStudyStateId = "opening" | "invitation" | "memory" | "reset";

/** These names are study proposals, not approved interpretations of story choices. */
export const SCENE_STUDY_STATES = [
  { id: "opening", label: "Opening", chairTurned: false, cupVisible: true },
  { id: "invitation", label: "Invitation · chair turned", chairTurned: true, cupVisible: true },
  { id: "memory", label: "Memory · cup absent", chairTurned: false, cupVisible: false },
  { id: "reset", label: "Reset", chairTurned: false, cupVisible: true },
] as const satisfies ReadonlyArray<{
  id: SceneStudyStateId;
  label: string;
  chairTurned: boolean;
  cupVisible: boolean;
}>;

/** Each request replaces the whole arrangement. Unknown IDs safely recover to opening. */
export function getSceneStudyState(id: string, reducedMotion = false): SceneStudyState {
  const selected = SCENE_STUDY_STATES.find(state => state.id === id) ?? SCENE_STUDY_STATES[0];
  return {
    chairTurned: selected.chairTurned,
    cupVisible: selected.cupVisible,
    reducedMotion,
  };
}
