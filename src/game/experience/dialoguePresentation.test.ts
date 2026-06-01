import { describe, expect, it } from "vitest";
import {
  createDialoguePresentation,
  normalizeDialogueText,
} from "./dialoguePresentation";

describe("createDialoguePresentation", () => {
  it("keeps desktop dialogue compact enough to leave the scene readable", () => {
    const presentation = createDialoguePresentation({
      choiceCount: 4,
      viewport: { width: 1280, height: 720 },
    });

    expect(presentation.panel.horizontalAlignment).toBe("left");
    expect(presentation.panel.widthPx).toBeLessThanOrEqual(680);
    expect(presentation.panel.widthPx).toBeLessThan(1280 * 0.55);
    expect(presentation.panel.heightPx).toBeLessThan(720 * 0.7);
    expect(presentation.choice.buttonHeightPx).toBeGreaterThanOrEqual(50);
  });

  it("gives longer authored nodes more text space before the choices", () => {
    const shortNode = createDialoguePresentation({
      choiceCount: 3,
      text: "The lamp waits.",
      viewport: { width: 1280, height: 720 },
    });
    const longerNode = createDialoguePresentation({
      choiceCount: 3,
      text:
        "You step closer to the lamp. Its light does not brighten, but it begins to feel less alone.\n" +
        "The voice follows carefully:\n" +
        '"There was another light once. White, buzzing, always above me. This one is kinder."',
      viewport: { width: 1280, height: 720 },
    });

    expect(longerNode.text.heightPx).toBeGreaterThan(shortNode.text.heightPx);
    expect(longerNode.text.heightPx).toBeGreaterThanOrEqual(170);
  });

  it("uses a centered compact layout on narrow screens", () => {
    const presentation = createDialoguePresentation({
      choiceCount: 3,
      viewport: { width: 390, height: 844 },
    });

    expect(presentation.panel.horizontalAlignment).toBe("center");
    expect(presentation.panel.leftPx).toBe(0);
    expect(presentation.panel.widthPx).toBeLessThanOrEqual(390 - 24);
    expect(presentation.text.fontSizePx).toBeLessThan(22);
    expect(presentation.choice.fontSizePx).toBeGreaterThanOrEqual(15);
  });

  it("allocates enough height for every choice without overflowing the viewport", () => {
    const presentation = createDialoguePresentation({
      choiceCount: 5,
      viewport: { width: 960, height: 540 },
    });

    const requiredChoiceHeight =
      presentation.choice.buttonHeightPx * 5 + presentation.choice.gapPx * 4;

    expect(presentation.choiceStack.heightPx).toBeGreaterThanOrEqual(requiredChoiceHeight);
    expect(presentation.panel.heightPx).toBeLessThanOrEqual(540 - presentation.panel.marginPx * 2);
  });
});

describe("normalizeDialogueText", () => {
  it("trims authored text while preserving intentional line breaks", () => {
    expect(
      normalizeDialogueText(`  First line.


Second line.  `)
    ).toBe(
      `First line.

Second line.`
    );
  });
});
