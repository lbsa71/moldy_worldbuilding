export type DialogueCard = { text: string; start: number; decision?: boolean };

export const CARD_WORD_LIMIT = 100;
export const CARD_CHARACTER_LIMIT = 660;

/** Keep related paragraphs together; source offsets survive responsive reflow. */
export function dialogueCards(text: string): DialogueCard[] {
  const cards: DialogueCard[] = [];
  let remainder = text.trim();
  let start = text.length - text.trimStart().length;
  while (remainder) {
    const words = [...remainder.matchAll(/\S+/g)];
    let count = Math.min(CARD_WORD_LIMIT, words.length);
    while (count > 1 && words[count - 1].index! + words[count - 1][0].length > CARD_CHARACTER_LIMIT) count--;
    let end = words[count - 1].index! + words[count - 1][0].length;
    if (count < words.length) end = preferredCardBreak(remainder, end);
    cards.push({ text: remainder.slice(0, end).trimEnd(), start });
    const tail = remainder.slice(end);
    const skip = tail.length - tail.trimStart().length;
    start += end + skip;
    remainder = tail.trimStart();
  }
  return cards.length ? cards : [{ text: '', start: 0 }];
}

/** Prefer complete sentences or clauses without stranding a one-word card. */
export function preferredCardBreak(text: string, maximum: number): number {
  const prefix = text.slice(0, maximum);
  const paragraphEnd = prefix.lastIndexOf('\n');
  if (paragraphEnd >= maximum * 0.55) return prefix.slice(0, paragraphEnd).trimEnd().length;
  const boundaries = [...prefix.matchAll(/[.!?;:](?:[”"'])?(?=\s|$)/g)];
  const last = boundaries.at(-1);
  const boundary = last ? last.index! + last[0].length : 0;
  return boundary >= maximum * 0.55 ? boundary : maximum;
}
