import { describe, expect, it } from 'vitest';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { Compiler } from '../inkjs/compiler/Compiler';
import { Story } from '../inkjs/engine/Story';
import { choose, getCurrentDialogue, type Dialogue } from '../utils/ink';

const source = readFileSync(new URL('./journey.ink', import.meta.url), 'utf8');
const compiler = new Compiler(source);
const compiled = (() => {
  try { return compiler.Compile().ToJson() as string; }
  catch (error) { throw new Error(`${String(error)}\n${compiler.errors.join('\n')}`); }
})();
const compile = () => new Story(compiled);
const tokenPattern = /[\p{L}\p{N}]+(?:['’−-][\p{L}\p{N}]+)*/gu;
const words = (value: string) => (value.match(tokenPattern) ?? []).length;
const choiceTexts = (dialogue: Dialogue) => dialogue.choices.map(choice => choice.text);
const comparable = (dialogue: Dialogue) => ({ ...dialogue, choices: choiceTexts(dialogue) });

function route(indices: number[], account?: string, readback = 0) {
  const story = compile();
  let current = getCurrentDialogue(story);
  const passages = [current];
  for (const index of indices) {
    choose(story, index);
    current = getCurrentDialogue(story);
    passages.push(current);
  }
  if (account) {
    const index = current.choices.findIndex(choice => choice.text.includes(account));
    expect(index, `Missing account ${account} in ${choiceTexts(current)}`).toBeGreaterThanOrEqual(0);
    choose(story, index); passages.push(getCurrentDialogue(story));
    choose(story, readback); current = getCurrentDialogue(story); passages.push(current);
  }
  return { story, passages, current };
}

describe('the journey consequence prototype', () => {
  it('compiles without narrative errors or warnings', () => {
    expect(compiler.errors).toEqual([]);
    expect(compiler.warnings).toEqual([]);
  });

  it('executes every acyclic route, restores every reached beat, and records bounded coverage', () => {
    const story = compile();
    const restored = compile();
    const scenes = new Set<string>();
    const edges = new Set<string>();
    const renderedSceneEdges = new Set<string>();
    const accounts = new Set<string>();
    const endings: Record<string, number> = {};
    let prefixes = 0;
    let routes = 0;
    const displayMaximums = { paragraphWords: 0, paragraphCharacters: 0, choiceWords: 0, choiceCharacters: 0, headingCharacters: 0, cardsPerBeat: 0, choicesPerDecision: 0 };
    const counts = {
      narrativeWords: { min: Infinity, max: 0 },
      displayedChoiceWords: { min: Infinity, max: 0 },
      totalDisplayedWords: { min: Infinity, max: 0 },
      decisions: { min: Infinity, max: 0 },
      proseCards: { min: Infinity, max: 0 },
    };
    function visit(depth: number, narrative: number, labels: number, cardCount: number, path: number[]) {
      expect(depth, `Acyclic depth at ${path.join('.')}`).toBeLessThanOrEqual(8);
      const entrance = story.state.ToJson();
      const passage = getCurrentDialogue(story);
      prefixes++;
      expect(passage.direction).not.toBeNull();
      expect(passage.sound).not.toBeNull();
      expect(passage.scene).toMatch(/^journey_/);
      const cards = passage.text.split(/\n+/).map(line => line.trim()).filter(Boolean);
      for (const card of cards) {
        expect(words(card), `${passage.scene}: ${card}`).toBeLessThanOrEqual(35);
        expect(card.length, `${passage.scene}: ${card}`).toBeLessThanOrEqual(220);
        displayMaximums.paragraphWords = Math.max(displayMaximums.paragraphWords, words(card));
        displayMaximums.paragraphCharacters = Math.max(displayMaximums.paragraphCharacters, card.length);
      }
      for (const label of choiceTexts(passage)) {
        expect(words(label), label).toBeLessThanOrEqual(8);
        expect(label.length, label).toBeLessThanOrEqual(48);
        displayMaximums.choiceWords = Math.max(displayMaximums.choiceWords, words(label));
        displayMaximums.choiceCharacters = Math.max(displayMaximums.choiceCharacters, label.length);
      }
      expect(passage.chapter!.length).toBeLessThanOrEqual(30);
      expect(cards.length).toBeGreaterThanOrEqual(2);
      expect(cards.length).toBeLessThanOrEqual(4);
      expect(passage.choices.length).toBeLessThanOrEqual(4);
      if (['journey_reassurance', 'journey_inquiry', 'journey_presence'].includes(passage.scene!)) {
        expect(cards[0]).toContain('Three books appear');
      }
      if (passage.direction!.weather === 'rain-memory') {
        expect(cards[0]).toContain('Rain darkens her sleeve');
        expect(cards[0]).toContain('strikes the rail twice');
      }
      displayMaximums.headingCharacters = Math.max(displayMaximums.headingCharacters, passage.chapter!.length);
      displayMaximums.cardsPerBeat = Math.max(displayMaximums.cardsPerBeat, cards.length);
      displayMaximums.choicesPerDecision = Math.max(displayMaximums.choicesPerDecision, passage.choices.length);
      const direction = passage.direction!;
      expect(Object.keys(direction.stage ?? {}).sort()).toEqual(['books', 'chair', 'curtain', 'lamp', 'rail']);
      scenes.add(passage.scene!);
      restored.state.LoadJson(entrance);
      expect(comparable(getCurrentDialogue(restored))).toEqual(comparable(passage));
      for (const fact of ['approach', 'books', 'book_dismissed', 'cup_kept', 'cup_dismissed', 'boundary', 'repair', 'draft', 'readback', 'departure']) {
        expect(restored.variablesState.$(fact)).toEqual(story.variablesState.$(fact));
      }

      const bookDismissed = story.variablesState.$('book_dismissed') === true;
      const cupDismissed = story.variablesState.$('cup_dismissed') === true;
      if (bookDismissed) expect(direction.stage!.books).toBe('absent');
      if (cupDismissed) expect(direction.arrangement.cup).toBe('absent');
      if (passage.scene === 'journey_account') {
        const options = choiceTexts(passage).join('\n');
        const bookState = story.variablesState.$('books');
        const expectedReceipt = bookState === 'open'
          && story.variablesState.$('boundary') === 'revisit'
          && story.variablesState.$('repair') === 'acknowledge'
          && story.variablesState.$('approach') === 'inquiry';
        expect(options.includes("Record the purchase")).toBe(expectedReceipt);
        expect(passage.text.includes('The receipt records tea bought at 21:14')).toBe(expectedReceipt);
        expect(options.includes("cup's custom")).toBe(!cupDismissed && story.variablesState.$('repair') !== 'limit');
        expect(options.includes('unread books')).toBe(bookState === 'closed' && story.variablesState.$('repair') !== 'limit');
      }
      if (passage.scene === 'journey_readback' && story.variablesState.$('books') === 'closed') {
        expect(passage.text).toContain('The notebook stays closed too');
        expect(passage.text).not.toContain('before you write');
      }
      if (passage.scene === 'journey_departure') {
        const act: Record<string, string> = {
          record: 'record, including its uncertainty', belief: "Mara's belief, as a belief",
          custom: "cup's custom", pause: 'two taps and room', unread: 'choice of unread books',
          disagreement: 'both voices', uncertainty: 'honestly unfinished account',
        };
        expect(passage.choices).toHaveLength(3);
        expect(passage.choices[0].text).toContain(act[String(story.variablesState.$('draft'))]);
      }
      const nextNarrative = narrative + words(passage.text);
      const nextLabels = labels + choiceTexts(passage).reduce((sum, label) => sum + words(label), 0);
      if (!passage.choices.length) {
        routes++;
        accounts.add(String(story.variablesState.$('draft')));
        expect(depth).toBe(8);
        expect(passage.ending).toMatch(/^(keep|carry|rest)$/);
        endings[passage.ending!] = (endings[passage.ending!] ?? 0) + 1;
        expect(direction).toEqual({
          camera: 'wide', transition: { kind: 'dissolve', seconds: 2.4 }, weather: 'none',
          arrangement: { chair: 'rest', cup: 'absent', lamp: 'rest', trace: 'none' },
          stage: { chair: 'absent', lamp: 'absent', books: 'absent', curtain: 'absent', rail: 'absent' },
        });
        expect(passage.mood).toBe('resolved');
        expect(passage.sound).toBe('none');
        if (passage.ending === 'keep') {
          expect(passage.text).toContain('Remember the jokes, too');
          expect(passage.text).not.toContain('Remember the backwards cover');
        }
        const values = { narrativeWords: nextNarrative, displayedChoiceWords: nextLabels, totalDisplayedWords: nextNarrative + nextLabels, decisions: depth, proseCards: cardCount + cards.length };
        for (const key of Object.keys(counts) as (keyof typeof counts)[]) {
          counts[key].min = Math.min(counts[key].min, values[key]);
          counts[key].max = Math.max(counts[key].max, values[key]);
        }
        return;
      }
      const waiting = story.state.ToJson();
      for (let index = 0; index < passage.choices.length; index++) {
        edges.add(passage.choices[index].pathStringOnChoice);
        renderedSceneEdges.add(`${passage.scene}:${passage.choices[index].pathStringOnChoice}`);
        story.state.LoadJson(waiting);
        choose(story, index);
        visit(depth + 1, nextNarrative, nextLabels, cardCount + cards.length, [...path, index]);
      }
    }
    visit(0, 0, 0, 0, []);
    expect(routes).toBe(1344);
    expect([...accounts].sort()).toEqual(['belief', 'custom', 'disagreement', 'pause', 'record', 'uncertainty', 'unread']);
    expect(Object.keys(endings).sort()).toEqual(['carry', 'keep', 'rest']);
    expect(new Set(Object.values(endings)).size).toBe(1);
    const report = {
      schemaVersion: 1,
      edition: 'journey-2026-10-07-v2',
      source: { path: 'src/ink/journey.ink', sha256: createHash('sha256').update(source).digest('hex') },
      method: 'Depth-first execution of every available choice at every reachable prefix in this acyclic Ink edition. One compiled Story state is restored for each sibling; an independent Story restores and compares every entrance, including text, choices and all presentation fields. No state equivalence pruning or random sampling.',
      limits: 'Proves the enumerated script properties under the current compiler/parser only. No human playtime, attachment, readability, choice fairness, renderer appearance, historical replay forks or emotional response was measured. All displayed choice labels are counted, including unselected alternatives. Chapter headings and hidden prose are excluded.',
      tokenizer: String(tokenPattern),
      routes, visitedPrefixes: prefixes, stableScenes: [...scenes].sort(), authoredChoiceEdges: edges.size,
      renderedSceneChoiceEdges: renderedSceneEdges.size, accounts: [...accounts].sort(), endings, ranges: counts, displayMaximums,
      displayContract: 'Each nonempty rendered prose line is one UI card. Paragraphs <=35 words and <=220 characters; labels <=8 words and <=48 characters; headings <=30 characters. Two to four prose cards per Ink beat, at most four choices. Continue/Back are presentation navigation and are not Ink decisions.',
      reproduction: 'npx vitest run src/ink/journey.test.ts',
      regeneration: 'JOURNEY_METRICS_WRITE=1 npx vitest run src/ink/journey.test.ts',
    };
    const destination = new URL('../../docs/evidence/journey-01-routes.json', import.meta.url);
    if (process.env.JOURNEY_METRICS_WRITE === '1') writeFileSync(destination, `${JSON.stringify(report, null, 2)}\n`);
    else expect(report).toEqual(JSON.parse(readFileSync(destination, 'utf8')));
  }, 60_000);

  it('changes later acts with the original approach, not just its immediate reply', () => {
    const prefix = [0, 0, 0, 1, 0];
    const reassurance = route(prefix).current;
    const inquiry = route([1, ...prefix.slice(1)]).current;
    const presence = route([2, ...prefix.slice(1)]).current;
    expect(choiceTexts(reassurance).join(' ')).toContain("Mara's belief as hers, not proof");
    expect(choiceTexts(inquiry).join(' ')).toContain("Record the purchase");
    expect(choiceTexts(presence).join(' ')).not.toMatch(/Mara's belief|Record the purchase/);
    const dismissed = route([2, 0, 1, 1, 0]).current;
    expect(choiceTexts(dismissed).join(' ')).toContain('Offer two taps');
    expect(choiceTexts(route([0, 0, 1, 1, 0]).current).join(' ')).not.toContain('Offer two taps');
  });

  it('closes documentary and physical opportunities on deliberate dismissal, never on an ordinary pause', () => {
    const retained = route([1, 0, 0, 1, 0]).current;
    const dismissed = route([1, 2, 1, 1, 0]).current;
    const closed = route([1, 1, 0, 1, 0]).current;
    expect(choiceTexts(retained).join(' ')).toContain("Record the purchase");
    expect(choiceTexts(dismissed).join(' ')).not.toMatch(/Record the purchase|cup's custom|unread books/);
    expect(choiceTexts(closed).join(' ')).toContain('unread books');
    expect(choiceTexts(closed).join(' ')).not.toContain('Record the purchase');
    const paused = route([1, 0, 0, 1, 0], 'Record the purchase', 1).current;
    expect(paused.direction!.stage!.books).toBe('present');
    expect(paused.direction!.arrangement.cup).toBe('away');
    expect(paused.text).toContain('Everything stays where it is');
  });

  it('keeps a firm agreement and makes repair change a delayed departure opportunity without granting forgiveness', () => {
    const finalAgreement = route([1, 0, 0, 0, 0]).current;
    expect(choiceTexts(finalAgreement).join(' ')).not.toContain('Record the purchase');
    expect(finalAgreement.text).toContain('Your promise rules out another examination');
    const acknowledged = route([1, 0, 0, 1, 0], 'Record the purchase');
    const maintained = route([1, 0, 0, 1, 1], 'our disagreement');
    const limited = route([1, 0, 0, 1, 2], 'what remains unknown');
    expect(choiceTexts(acknowledged.current)[0]).toContain('record, including its uncertainty');
    expect(choiceTexts(maintained.current)[0]).toContain('both voices');
    expect(choiceTexts(limited.current)[0]).toContain('honestly unfinished account');
    for (const result of [acknowledged, maintained, limited]) {
      choose(result.story, 0);
      const ending = getCurrentDialogue(result.story);
      if (result === acknowledged) expect(ending.text).toContain('You tried again; Mara promised no forgiveness');
      if (result === maintained) expect(ending.text).toContain('You still disagreed; neither voice won');
      if (result === limited) expect(ending.text).toContain('You stayed, without becoming a witness');
    }
  });

  it('remembers discarded props and the actual message medium in every ending', () => {
    const result = route([0, 2, 1, 0, 0], "Mara's belief as hers");
    const waiting = result.story.state.ToJson();
    for (let endingIndex = 0; endingIndex < 3; endingIndex++) {
      result.story.state.LoadJson(waiting);
      choose(result.story, endingIndex);
      const ending = getCurrentDialogue(result.story);
      expect(ending.text).toContain('The books and their evidence stayed gone');
      expect(ending.text).toContain("You couldn't show the cup again");
      expect(ending.text).toContain('Your promise held');
      if (endingIndex === 0) expect(ending.text).toContain('no letter was written');
      if (endingIndex === 1) expect(ending.text).toContain('They remain spoken');
    }
  });
});
