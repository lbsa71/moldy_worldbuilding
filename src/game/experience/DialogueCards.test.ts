import { describe, expect, it } from 'vitest';
import { dialogueCards } from './DialogueCards';

describe('authored reading cards', () => {
  it('preserves paragraphs and source offsets without losing punctuation or literal markup', () => {
    const source = '  The lamp stays.\n\n"A <small> thing," she says.\n  The cup is warm.  ';
    const cards = dialogueCards(source);
    expect(cards.map(card => card.text)).toEqual(['The lamp stays.', '"A <small> thing," she says.', 'The cup is warm.']);
    for (const card of cards) expect(source.slice(card.start, card.start + card.text.length)).toBe(card.text);
  });

  it('splits legacy paragraphs at word or sentence boundaries and retains every word exactly once', () => {
    const source = Array.from({ length: 170 }, (_, index) => `word${index}${index % 20 === 19 ? '.' : ''}`).join(' ');
    const cards = dialogueCards(source);
    expect(cards.length).toBeGreaterThan(4);
    expect(cards.every(card => card.text.length <= 220 && card.text.split(/\s+/).length <= 35)).toBe(true);
    expect(cards.map(card => card.text).join(' ')).toBe(source);
    for (const card of cards) expect(source.slice(card.start, card.start + card.text.length)).toBe(card.text);
  });

  it('leaves an empty card available for a dialogue with only choices', () => {
    expect(dialogueCards('  \n\n ')).toEqual([{ text: '', start: 0 }]);
  });
});
