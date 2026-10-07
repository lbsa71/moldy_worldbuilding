export type DialogueCard = { text: string; start: number; decision?: boolean };

/** Respect authored paragraphs, splitting older long passages at word boundaries. */
export function dialogueCards(text: string): DialogueCard[] {
  const cards: DialogueCard[] = [];
  for (const match of text.matchAll(/[^\n]+/g)) {
    const leading = match[0].length - match[0].trimStart().length;
    let remainder = match[0].trim();
    let start = match.index! + leading;
    while (remainder) {
      const words = [...remainder.matchAll(/\S+/g)];
      let count = Math.min(35, words.length);
      while (count > 1 && words[count - 1].index! + words[count - 1][0].length > 220) count--;
      let end = words[count - 1].index! + words[count - 1][0].length;
      if (count < words.length) end = preferredCardBreak(remainder, end);
      cards.push({ text: remainder.slice(0, end), start });
      const tail = remainder.slice(end);
      const skip = tail.length - tail.trimStart().length;
      start += end + skip;
      remainder = tail.trimStart();
    }
  }
  return cards.length ? cards : [{ text: '', start: 0 }];
}

/** Prefer complete sentences or clauses without stranding a one-word card. */
export function preferredCardBreak(text: string, maximum: number): number {
  const prefix = text.slice(0, maximum);
  const boundaries = [...prefix.matchAll(/[.!?;:](?:[”"'])?(?=\s|$)/g)];
  const last = boundaries.at(-1);
  const boundary = last ? last.index! + last[0].length : 0;
  return boundary >= maximum * 0.55 ? boundary : maximum;
}
