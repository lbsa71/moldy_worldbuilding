import { Choice } from "../inkjs/engine/Choice";
import { Story } from "../inkjs/ink";

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

    const tags = story.currentTags;
    if (tags) {
      for (const tag of tags) {
        const positionMatch = tag.match(/position:\s*\((.*)\)/);
        if (positionMatch) {
          try {
            const splits = positionMatch[1].split(",");
            const positions = splits.map((s) => parseFloat(s));
            position = { x: positions[0], z: positions[1] };
          } catch (e) {
            console.error("Error parsing position tag:", e);
          }
        }
        const fogMatch = tag.match(/fog:\s*([0-9.]+)/);
        if (fogMatch) {
          try {
            fog = parseFloat(fogMatch[1]);
          } catch (e) {
            console.error("Error parsing fog tag:", e);
          }
        }
        const audioMatch = tag.match(/audio\s+(.+)/);
        if (audioMatch) {
          audio = audioMatch[1].trim();
        }

        const objectsMatch = tag.match(/objects:?\s*(.+)?/);
        if (objectsMatch) {
          objects = objectsMatch[1] ? objectsMatch[1].split(",").map(s => s.trim()).filter(s => s) : [];
        }
      }
    }
  }
  console.log(
    "Current dialogue:",
    text,
    "choices:",
    choices,
    "position:",
    position,
    "fog:",
    fog,
    "objects:",
    objects
  );
  return { text, choices, position, fog, audio, objects: objects };
}

export function choose(story: Story, choiceIndex: number) {
  story.ChooseChoiceIndex(choiceIndex);
}
