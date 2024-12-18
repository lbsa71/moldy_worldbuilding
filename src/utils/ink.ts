import * as inkjs from "inkjs";
import { Choice } from "inkjs/engine/Choice";
import { Compiler } from "inkjs/compiler/Compiler";
import { Story } from "inkjs";

export async function loadInkFile(path: string): Promise<Story> {
  const response = await fetch(path);
  const inkFileContents = await response.text();
  const compiler = new Compiler(inkFileContents);
  const story = compiler.Compile();
  return story;
}

export function getCurrentDialogue(story: inkjs.Story): {
  text: string;
  choices: Choice[];
  position: { x: number; z: number } | null;
} {
  let choices: Choice[] = [];
  let text = "";
  let position: { x: number; z: number } | null = null;

  while (story.canContinue) {
    const continuation = story.Continue();
    text += continuation;
    choices = story.currentChoices;

    const tags = story.currentTags;
    if (tags) {
      for (const tag of tags) {
        const match = tag.match(/position:\s*\((.*)\)/);
        if (match) {
          try {
            const splits = match[1].split(",");
            const positions = splits.map((s) => parseFloat(s));

            position = { x: positions[0], z: positions[1] };
          } catch (e) {
            console.error("Error parsing position tag:", e);
          }
        } else {
          console.log("Found no position in", tag);
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
    position
  );
  return { text, choices, position };
}

export function choose(story: inkjs.Story, choiceIndex: number) {
  story.ChooseChoiceIndex(choiceIndex);
}
