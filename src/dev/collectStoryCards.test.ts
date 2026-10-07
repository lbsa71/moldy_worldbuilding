import { describe, expect, it } from 'vitest';
import { collectStoryCards } from './collectStoryCards';

describe('the development rendered-card collector', () => {
  it('deduplicates exact visuals while continuing every hidden-state prefix', () => {
    const result = collectStoryCards(`VAR remembered = false
Choose.
* [Keep it]
  ~ remembered = true
  -> common
* [Leave it]
  -> common
=== common ===
# chapter: The same visible card
The same words.
* [Continue]
  -> finish
=== finish ===
# ending: done
{remembered: A kept promise.|An absent promise.}
-> END`);
    expect(result.prefixes).toBe(5);
    expect(result.routes).toBe(2);
    expect(result.variants).toHaveLength(4);
    expect(result.variants.filter(value => value.dialogue.ending).map(value => value.dialogue.text)).toEqual(['A kept promise.', 'An absent promise.']);
    expect(result.variants.at(-1)!.witness).toEqual([1, 0]);
  });
  it('keeps different choice labels even when passage text is identical', () => {
    const result = collectStoryCards(`VAR kept = false
Choose.
* [Keep]
  ~ kept = true
  -> shared
* [Leave]
  -> shared
=== shared ===
Same text.
* {kept} [Use what was kept]
  -> done
* {not kept} [Use what remains]
  -> done
=== done ===
Done.
-> END`);
    expect(result.prefixes).toBe(5);
    expect(result.variants).toHaveLength(4);
    expect(result.variants.filter(value => value.dialogue.text === 'Same text.')).toHaveLength(2);
  });
});
