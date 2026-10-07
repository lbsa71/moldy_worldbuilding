import { Compiler } from '../inkjs/compiler/Compiler';
import { Story } from '../inkjs/engine/Story';
import { choose, getCurrentDialogue, type Dialogue } from '../utils/ink';

export type RenderedCardVariant = { id: string; dialogue: Dialogue; witness: number[] };

/** Walk every prefix before deduplicating visuals; hidden facts may diverge later. */
export function collectStoryCards(source: string) {
  const compiler = new Compiler(source);
  const story = new Story(compiler.Compile().ToJson() as string);
  if (compiler.errors.length || compiler.warnings.length) throw new Error([...compiler.errors, ...compiler.warnings].join('\n'));
  const variants = new Map<string, RenderedCardVariant>();
  let prefixes = 0;
  let routes = 0;
  function visit(witness: number[]) {
    if (++prefixes > 100_000 || witness.length > 64) throw new Error('Card study requires a bounded acyclic story (at most 100,000 prefixes / 64 decisions).');
    const dialogue = getCurrentDialogue(story);
    const key = JSON.stringify({ chapter: dialogue.chapter, text: dialogue.text,
      labels: dialogue.choices.map(choice => choice.text), ending: Boolean(dialogue.ending) });
    if (!variants.has(key)) variants.set(key, { id: `variant-${String(variants.size + 1).padStart(4, '0')}`, dialogue, witness });
    if (!dialogue.choices.length) { routes++; return; }
    const waiting = story.state.ToJson();
    for (let index = 0; index < dialogue.choices.length; index++) {
      story.state.LoadJson(waiting);
      choose(story, index);
      visit([...witness, index]);
    }
  }
  visit([]);
  return { variants: [...variants.values()], prefixes, routes };
}
