/** Each authored edition owns its Ink save slot; experiments cannot consume chapter saves. */
export type StoryEdition = {
  id: string;
  saveKey: string;
  saveVersion: number;
  label: string;
};

export const CHAPTER_EDITION: StoryEdition = {
  id: 'chapter-one-v4', saveKey: 'fading:chapter-one:save:v4', saveVersion: 4,
  label: 'A place beside the light',
};

export const JOURNEY_EDITION: StoryEdition = {
  id: 'journey-2026-10-07-v1', saveKey: 'fading:journey:save:v1', saveVersion: 1,
  label: 'The account we leave',
};
