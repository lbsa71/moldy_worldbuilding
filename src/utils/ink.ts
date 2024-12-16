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
    let choices : Choice[] = [];
    let text = "";
    let i = 0;

    while (story.canContinue) {
        if(i++ > 10) {
            console.log("Max iterations reached in getCurrentDialogue");
            break;
        }

        const continuation = story.Continue();
        text += continuation;

        choices = story.currentChoices;

        console.log("Continue:" + continuation);
        console.log(" canContinue:" + story.canContinue);
        console.log("choises:" + choices?.map((c) => { c.text }).join(','));
       
        if(choices && choices.length > 0) break;
    }
    console.log("Current dialogue:", text, "choices:", choices);
    return { text, choices };
}

export function choose(story: inkjs.Story, choiceIndex: number) {
  story.ChooseChoiceIndex(choiceIndex);
}

export function getPositionTag(story: inkjs.Story): { x: number, z: number } | null {
    const tags = story.currentTags;
    if (tags) {
        for (const tag of tags) {
            const match = tag.match(/position:\s*({.*})/);
            if (match) {
                try {
                    const positionString = match[1].trim();
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
