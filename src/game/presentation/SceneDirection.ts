/** Author-facing vocabulary shared by Ink, the game and the living-scene director. */
export const CAMERA_CUES = ['wide', 'chair', 'cup', 'books', 'bedside', 'water', 'shore'] as const;
export type CameraCue = typeof CAMERA_CUES[number];
export type WeatherCue = 'none' | 'rain-memory';
export type TransitionCue = { kind: 'cut' | 'ease' | 'dissolve'; seconds: number };
export type SceneArrangement = {
  chair: 'rest' | 'turned';
  cup: 'near' | 'away' | 'absent';
  lamp: 'steady' | 'rest';
  trace: 'none' | 'cup';
};
export type StagePresence = {
  chair: 'present' | 'absent';
  lamp: 'present' | 'absent';
  books: 'present' | 'absent';
  curtain: 'present' | 'absent';
  rail: 'present' | 'absent';
};
export type SceneDirection = {
  camera: CameraCue;
  transition: TransitionCue;
  arrangement: SceneArrangement;
  weather: WeatherCue;
  /** Omitted by legacy chapters; the renderer treats omission as a full stage. */
  stage?: StagePresence;
};

export function fullStage(): StagePresence {
  return { chair: 'present', lamp: 'present', books: 'present', curtain: 'present', rail: 'present' };
}

export function openingDirection(): SceneDirection {
  return {
    camera: 'wide', transition: { kind: 'cut', seconds: 0 }, weather: 'none',
    arrangement: { chair: 'rest', cup: 'near', lamp: 'steady', trace: 'none' },
  };
}
