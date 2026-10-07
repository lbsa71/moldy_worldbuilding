import { describe, expect, it } from 'vitest';
import { dialogueCards, CARD_WORD_LIMIT, CARD_CHARACTER_LIMIT } from './DialogueCards';

describe('authored reading cards', () => {
  it('preserves paragraphs and source offsets without losing punctuation or literal markup', () => {
    const source = '  The lamp stays.\n\n"A <small> thing," she says.\n  The cup is warm.  ';
    const cards = dialogueCards(source);
    expect(cards.map(card => card.text)).toEqual([source.trim()]);
    for (const card of cards) expect(source.slice(card.start, card.start + card.text.length)).toBe(card.text);
  });

  it('splits legacy paragraphs at word or sentence boundaries and retains every word exactly once', () => {
    const source = Array.from({ length: 170 }, (_, index) => `word${index}${index % 20 === 19 ? '.' : ''}`).join(' ');
    const cards = dialogueCards(source);
    expect(cards.length).toBeGreaterThan(1);
    expect(cards.length).toBeLessThan(4);
    expect(cards.every(card => card.text.length <= CARD_CHARACTER_LIMIT && card.text.split(/\s+/).length <= CARD_WORD_LIMIT)).toBe(true);
    expect(cards.map(card => card.text).join(' ')).toBe(source);
    for (const card of cards) expect(source.slice(card.start, card.start + card.text.length)).toBe(card.text);
  });

  it('leaves an empty card available for a dialogue with only choices', () => {
    expect(dialogueCards('  \n\n ')).toEqual([{ text: '', start: 0 }]);
  });
});
