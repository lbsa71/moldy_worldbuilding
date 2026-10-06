/** Historical, read-only audit of the published chapter.
 * Run: npx vitest run scripts/narrative-baseline.test.ts
 * Explicit regeneration: NARRATIVE_BASELINE_WRITE=1 npx vitest run scripts/narrative-baseline.test.ts
 * This historical audit also runs read-only in normal suites and never writes by default.
 */
import { expect, it } from 'vitest';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { Compiler } from '../src/inkjs/compiler/Compiler';
import { Story } from '../src/inkjs/engine/Story';
import { choose, getCurrentDialogue } from '../src/utils/ink';

const revision = 'ac2d31424b6312f81dba9c51fa8d26fc2827c510';
const fixturePath = 'docs/evidence/narrative-baseline-ac2d314.ink';
const fixture = new URL('../docs/evidence/narrative-baseline-ac2d314.ink', import.meta.url);
const sourceSha256 = '1b2cf45733c0a1c6d8b80d57a045501d87f41ee1e775340a550b895fa2a35203';
const destination = new URL('../docs/evidence/narrative-baseline-ac2d314.json', import.meta.url);
const writing = process.env.NARRATIVE_BASELINE_WRITE === '1';
const tokenPattern = /[\p{L}\p{N}]+(?:['’−-][\p{L}\p{N}]+)*/gu;
const words = (text: string) => (text.match(tokenPattern) ?? []).length;

it('reproduces the published narrative baseline without changing game files', () => {
  const source = readFileSync(fixture, 'utf8');
  expect(createHash('sha256').update(source).digest('hex')).toBe(sourceSha256);
  const compiled = new Compiler(source).Compile().ToJson() as string;
  function play(indices: number[]) {
    const story = new Story(compiled);
    let narrativeWords = 0, displayedChoiceWords = 0, decisions = 0;
    const scenes: string[] = [];
    for (;;) {
      const passage = getCurrentDialogue(story);
      narrativeWords += words(passage.text);
      displayedChoiceWords += passage.choices.reduce((count, choice) => count + words(choice.text), 0);
      scenes.push(passage.scene!);
      if (!passage.choices.length) break;
      choose(story, indices[decisions++]);
    }
    return { indices, narrativeWords, displayedChoiceWords, totalDisplayedWords: narrativeWords + displayedChoiceWords, beats: scenes.length, decisions, scenes };
  }
  const samples: ReturnType<typeof play>[] = [];
  for (let route = 0; route < 18; route++) for (let keepsake = 0; keepsake < 3; keepsake++) for (let ending = 0; ending < 3; ending++) {
    const prefix = Array.from({ length: 8 }, (_, depth) => (route + depth * Math.floor(route / 3 + 1)) % 3);
    samples.push(play([...prefix, keepsake, route % 3, ending]));
  }
  function distribution(key: 'narrativeWords' | 'displayedChoiceWords' | 'totalDisplayedWords' | 'beats' | 'decisions') {
    const values = samples.map(sample => sample[key]);
    return { min: Math.min(...values), max: Math.max(...values), mean: values.reduce((sum, value) => sum + value, 0) / values.length };
  }
  const lines = source.split('\n');
  const variables = lines.flatMap(line => line.match(/^VAR\s+(\w+)\s*=/)?.[1] ?? []);
  const variableUsage = variables.map(name => {
    const writes: number[] = [], consumerReads: number[] = [];
    const token = new RegExp(`\\b${name}\\b`);
    lines.forEach((original, index) => {
      const line = original.replace(/\/\/.*$/, '').replace(/"(?:\\.|[^"\\])*"/g, '""').trim();
      const assignment = line.match(/^~\s*(\w+)\s*(?:\+=|=)\s*(.*)$/);
      if (assignment?.[1] === name) writes.push(index + 1);
      const expression = assignment?.[2] ?? (/^\{|^-\s+.*:/.test(line) ? line : '');
      if (token.test(expression)) consumerReads.push(index + 1);
    });
    return { name, writes, consumerReads, noConsumerReads: consumerReads.length === 0 };
  });
  const report = {
    schemaVersion: 1,
    revision,
    source: { path: 'src/ink/demo.ink', sha256: sourceSha256, retrieval: `git show ${revision}:src/ink/demo.ink`, fixturePath },
    method: {
      runtime: 'Current local Compiler compiles the hash-verified frozen Ink fixture; a fresh current Story consumes each beat with current getCurrentDialogue and chooses zero-based indices.',
      tokenizer: String(tokenPattern),
      wordScope: 'Narrative text returned by getCurrentDialogue plus all currently displayed choice labels; excludes tags, comments, headings from chapter metadata, and hypothetical unvisited text.',
      sampling: { routeValues: '0..17', prefixDepths: '0..7', prefixChoice: '(route + depth * floor(route / 3 + 1)) % 3', ninthChoice: 'keepsake 0..2', tenthChoice: 'route % 3', eleventhChoice: 'ending 0..2', count: samples.length, uniqueIndexSequences: new Set(samples.map(sample => JSON.stringify(sample.indices))).size },
      limitations: 'The 162 samples are not exhaustive route enumeration. Ranges/means weight repeated index sequences equally. No human playtime, emotional response, reader speed or replay motivation was measured. Historical Ink content is frozen and hash-verified; compiler, parser and runtime are current local implementations, not frozen historical binaries. This file audits the pinned chapter content under that runtime, not current or future game content.',
      stateReadScope: 'Syntactic consumer reads in pinned Ink conditional expressions and assignment RHS only. Ignores declarations, comments, quoted prose/string constants and self-read implied by +=. Does not prove dead state across TypeScript, save metadata or external tools. chosen_ending is intentional ending metadata, despite no Ink consumer read.',
      reproduction: 'npx vitest run scripts/narrative-baseline.test.ts',
      regeneration: 'NARRATIVE_BASELINE_WRITE=1 npx vitest run scripts/narrative-baseline.test.ts',
    },
    distributions: { narrativeWords: distribution('narrativeWords'), displayedChoiceWords: distribution('displayedChoiceWords'), totalDisplayedWords: distribution('totalDisplayedWords'), beats: distribution('beats'), decisions: distribution('decisions') },
    canonical: [0, 1, 2].map(index => ({ name: `all-${index}`, ...play(Array(11).fill(index)) })),
    variableUsage,
    samples,
  };
  expect(samples).toHaveLength(162);
  expect(report.distributions.beats).toEqual({ min: 12, max: 12, mean: 12 });
  expect(report.distributions.decisions).toEqual({ min: 11, max: 11, mean: 11 });
  if (writing) writeFileSync(destination, `${JSON.stringify(report, null, 2)}\n`);
  else expect(report).toEqual(JSON.parse(readFileSync(destination, 'utf8')));
}, 15_000);
