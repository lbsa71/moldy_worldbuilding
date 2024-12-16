import * as inkjs from 'inkjs';
import { Choice } from 'inkjs/engine/Choice';
import { Compiler } from 'inkjs/compiler/Compiler';
import { Story } from 'inkjs';

export async function loadInkFile(path: string): Promise<Story> {
  const response = await fetch(path);
  const inkFileContents = await response.text();
  const compiler = new Compiler(inkFileContents);
  const story = compiler.Compile();
  return story;
}

export function getCurrentDialogue(story: inkjs.Story): { text: string; choices: Choice[] } {
  if (story.canContinue) {
    const text = story.Continue()!;
    const choices = story.currentChoices;
    return { text, choices };
  } else {
      const choices = story.currentChoices;
      return { text: "", choices };
  }
}

export function choose(story: inkjs.Story, choiceIndex: number) {
  story.ChooseChoiceIndex(choiceIndex);
}

export function getPositionTag(story: inkjs.Story): { x: number, z: number } | null {
    const tags = story.currentTags;
    if (tags) {
        for (const tag of tags) {
            if (tag.startsWith("position:")) {
                try {
                    const positionString = tag.substring("position:".length).trim();
                    const position = JSON.parse(positionString);
                    if (typeof position === 'object' && position !== null && 'x' in position && 'z' in position) {
                        return { x: parseFloat(position.x), z: parseFloat(position.z) };
                    }
                } catch (e) {
                    console.error("Error parsing position tag:", e);
                }
            }
        }
    }
    return null;
}
