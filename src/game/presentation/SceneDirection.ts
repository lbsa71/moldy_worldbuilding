/** Author-facing vocabulary shared by Ink, the game and the living-scene director. */
export const CAMERA_CUES = ['wide', 'chair', 'cup', 'bedside', 'water', 'shore'] as const;
export type CameraCue = typeof CAMERA_CUES[number];
export type WeatherCue = 'none' | 'rain-memory';
export type TransitionCue = { kind: 'cut' | 'ease' | 'dissolve'; seconds: number };
export type SceneArrangement = {
  chair: 'rest' | 'turned';
  cup: 'near' | 'away' | 'absent';
  lamp: 'steady' | 'rest';
  trace: 'none' | 'cup';
};
export type SceneDirection = {
  camera: CameraCue;
  transition: TransitionCue;
  arrangement: SceneArrangement;
  weather: WeatherCue;
};

export function openingDirection(): SceneDirection {
  return {
    camera: 'wide', transition: { kind: 'cut', seconds: 0 }, weather: 'none',
    arrangement: { chair: 'rest', cup: 'near', lamp: 'steady', trace: 'none' },
  };
}
