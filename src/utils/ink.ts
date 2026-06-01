import type { Choice } from "../inkjs/engine/Choice";
import type { Story } from "../inkjs/ink";

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
};

type DialogueTagState = {
  audio?: string;
  fog?: number;
  objects?: string[];
  position?: { x: number; z: number };
};

export function getCurrentDialogue(story: Story): Dialogue {
  let choices: Choice[] = [];
  let text = "";
  let position: { x: number; z: number } | null = null;
  let fog: number | null = null;
  let audio: string | null = null;
  let objects: string[] | null = null;

  while (story.canContinue) {
    const continuation = story.Continue();
    text += continuation;
    choices = story.currentChoices;

    const parsedTags = parseDialogueTags(story.currentTags);
    if (parsedTags.position) position = parsedTags.position;
    if (parsedTags.fog !== undefined) fog = parsedTags.fog;
    if (parsedTags.audio !== undefined) audio = parsedTags.audio;
    if (parsedTags.objects !== undefined) objects = parsedTags.objects;
  }
  return { text, choices, position, fog, audio, objects };
}

export function choose(story: Story, choiceIndex: number) {
  story.ChooseChoiceIndex(choiceIndex);
}

export function parseDialogueTags(
  tags: string[] | null | undefined
): DialogueTagState {
  const parsed: DialogueTagState = {};

  for (const tag of tags ?? []) {
    const position = parsePositionTag(tag);
    if (position) parsed.position = position;

    const fogMatch = tag.match(/fog:\s*([0-9.]+)/);
    if (fogMatch) parsed.fog = Number(fogMatch[1]);

    const audioMatch = tag.match(/audio\s+(.+)/);
    if (audioMatch) parsed.audio = audioMatch[1].trim();

    const objectsMatch = tag.match(/objects:?\s*(.*)$/);
    if (objectsMatch) {
      parsed.objects = objectsMatch[1]
        .split(",")
        .map((objectName) => objectName.trim())
        .filter(Boolean);
    }
  }

  return parsed;
}

function parsePositionTag(tag: string): { x: number; z: number } | undefined {
  const positionMatch = tag.match(
    /position:\s*\((-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)\)/
  );
  if (!positionMatch) return undefined;

  return {
    x: Number(positionMatch[1]),
    z: Number(positionMatch[2]),
  };
}
