import type { Choice } from "../inkjs/engine/Choice";
import type { Story } from "../inkjs/engine/Story";

export type Mood = "hushed" | "warm" | "uneasy" | "resolved";

export const STORY_MOTIFS = ["lamp", "hand", "geometric", "hospital", "chair", "cup", "rail"] as const;
export const STORY_AUDIO = ["soundtrack_1.mp3", "soundtrack_2.mp3", "soundtrack_3.mp3", "end_credits.mp3"] as const;
export const STORY_POSITION_LIMIT = 35;

export function loadInkFile(story: Story): Story {
  return story;
}

export type Dialogue = {
  text: string;
  choices: Choice[];
  position: { x: number; z: number } | null;
  fog: number | null;
  audio: string | null;
  objects: string[] | null;
  scene: string | null;
  chapter: string | null;
  mood: Mood | null;
  ending: string | null;
};

type Presentation = Omit<Dialogue, "text" | "choices">;

function emptyPresentation(): Presentation {
  return { position: null, fog: null, audio: null, objects: null, scene: null, chapter: null, mood: null, ending: null };
}

/** Validate the complete tag set for one displayed passage. Absence retains scene state; objects: clears memories. */
export function parseDialogueTags(tags: readonly string[]): Presentation {
  const presentation = emptyPresentation();
  const seen = new Set<string>();
  for (const rawTag of tags) {
    const tag = rawTag.trim();
    const match = tag.match(/^(position|fog|objects|scene|chapter|mood|ending):\s*(.*)$/)
      ?? tag.match(/^(audio)(?::\s*|\s+)(.+)$/);
    if (!match) throw new Error(`Unknown or malformed story tag: ${tag}`);
    const [, key, rawValue] = match;
    const value = rawValue.trim();
    if (seen.has(key)) throw new Error(`Multiple ${key} tags in one passage; end each scene at a choice.`);
    seen.add(key);
    const invalid = () => new Error(`Invalid ${key} story tag: ${tag}`);

    switch (key) {
      case "position": {
        const coordinates = value.match(/^\(([^()]*)\)$/)?.[1].split(",").map(part => part.trim());
        if (!coordinates || coordinates.length !== 2 || coordinates.some(part => !/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(part))) throw invalid();
        const [x, z] = coordinates.map(Number);
        if (![x, z].every(coordinate => Number.isFinite(coordinate) && Math.abs(coordinate) <= STORY_POSITION_LIMIT)) throw invalid();
        presentation.position = { x, z };
        break;
      }
      case "fog": {
        if (!/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(value)) throw invalid();
        const fog = Number(value);
        if (!Number.isFinite(fog) || fog < 0 || fog > 1) throw invalid();
        presentation.fog = fog;
        break;
      }
      case "audio":
        if (!(STORY_AUDIO as readonly string[]).includes(value)) throw invalid();
        presentation.audio = value;
        break;
      case "objects": {
        const objects = value ? value.split(",").map(object => object.trim()) : [];
        if (objects.some(object => !(STORY_MOTIFS as readonly string[]).includes(object))) throw invalid();
        presentation.objects = objects;
        break;
      }
      case "mood":
        if (!["hushed", "warm", "uneasy", "resolved"].includes(value)) throw invalid();
        presentation.mood = value as Mood;
        break;
      case "scene":
      case "ending":
        if (!/^[a-z][a-z0-9_-]*$/.test(value)) throw invalid();
        presentation[key] = value;
        break;
      case "chapter":
        if (!value || value.length > 120) throw invalid();
        presentation.chapter = value;
        break;
    }
  }
  return presentation;
}

/** Advance to the next player decision, without silently discarding authored scene changes. */
export function getCurrentDialogue(story: Story): Dialogue {
  const lines: string[] = [];
  const tags: string[] = [];
  while (story.canContinue) {
    lines.push(story.Continue() ?? "");
    tags.push(...(story.currentTags ?? []));
  }
  return { text: lines.join("").trim(), choices: [...story.currentChoices], ...parseDialogueTags(tags) };
}

export function choose(story: Story, choiceIndex: number): void {
  if (!Number.isInteger(choiceIndex) || choiceIndex < 0 || choiceIndex >= story.currentChoices.length) {
    throw new RangeError(`Invalid story choice index: ${choiceIndex}`);
  }
  story.ChooseChoiceIndex(choiceIndex);
}
