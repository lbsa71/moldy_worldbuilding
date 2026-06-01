export type DialogueViewport = {
  width: number;
  height: number;
};

export type DialogueHorizontalAlignment = "left" | "center";

export type DialoguePresentation = {
  panel: {
    widthPx: number;
    heightPx: number;
    marginPx: number;
    leftPx: number;
    bottomPx: number;
    horizontalAlignment: DialogueHorizontalAlignment;
  };
  text: {
    heightPx: number;
    fontSizePx: number;
    lineSpacingPx: number;
    paddingPx: number;
  };
  choiceStack: {
    heightPx: number;
    gapPx: number;
  };
  choice: {
    buttonHeightPx: number;
    fontSizePx: number;
    gapPx: number;
  };
  palette: {
    panelBackground: string;
    panelBorder: string;
    panelShadow: string;
    text: string;
    choiceBackground: string;
    choiceBorder: string;
    choiceHoverBackground: string;
    choiceHoverBorder: string;
    choiceText: string;
  };
};

type DialoguePresentationInput = {
  choiceCount: number;
  text?: string;
  viewport: DialogueViewport;
};

export function createDialoguePresentation({
  choiceCount,
  text = "",
  viewport,
}: DialoguePresentationInput): DialoguePresentation {
  const width = Math.max(320, viewport.width);
  const height = Math.max(320, viewport.height);
  const compact = width < 700 || height < 560;
  const marginPx = compact ? 12 : 24;
  const safeChoiceCount = Math.max(0, Math.ceil(choiceCount));
  const buttonHeightPx = compact ? 48 : 52;
  const gapPx = 8;
  const paddingPx = compact ? 16 : 22;
  const fontSizePx = compact ? 19 : 22;
  const lineSpacingPx = compact ? 3 : 5;
  const panelWidthPx = compact
    ? clamp(width - marginPx * 2, 300, 540)
    : clamp(width * 0.46, 520, 650);
  const choiceStackHeightPx =
    safeChoiceCount === 0
      ? 0
      : safeChoiceCount * buttonHeightPx + (safeChoiceCount - 1) * gapPx;
  const targetTextHeightPx = estimateTextHeight({
    text,
    contentWidthPx: panelWidthPx - paddingPx * 2,
    fontSizePx,
    lineSpacingPx,
    compact,
  });
  const maxPanelHeightPx = height - marginPx * 2;
  const panelHeightPx = Math.min(
    maxPanelHeightPx,
    paddingPx * 2 +
      targetTextHeightPx +
      (choiceStackHeightPx > 0 ? gapPx + choiceStackHeightPx : 0)
  );
  const textHeightPx = Math.max(
    96,
    panelHeightPx -
      paddingPx * 2 -
      (choiceStackHeightPx > 0 ? gapPx + choiceStackHeightPx : 0)
  );

  return {
    panel: {
      widthPx: panelWidthPx,
      heightPx: Math.round(panelHeightPx),
      marginPx,
      leftPx: compact ? 0 : marginPx,
      bottomPx: marginPx,
      horizontalAlignment: compact ? "center" : "left",
    },
    text: {
      heightPx: Math.round(textHeightPx),
      fontSizePx,
      lineSpacingPx,
      paddingPx,
    },
    choiceStack: {
      heightPx: choiceStackHeightPx,
      gapPx,
    },
    choice: {
      buttonHeightPx,
      fontSizePx: compact ? 16 : 18,
      gapPx,
    },
    palette: {
      panelBackground: "rgba(5, 10, 8, 0.78)",
      panelBorder: "#b8f5b1",
      panelShadow: "rgba(0, 0, 0, 0.62)",
      text: "#f6f8ef",
      choiceBackground: "rgba(15, 29, 21, 0.92)",
      choiceBorder: "#a8d89f",
      choiceHoverBackground: "rgba(199, 238, 174, 0.96)",
      choiceHoverBorder: "#f5ffe8",
      choiceText: "#f7fff1",
    },
  };
}

export function normalizeDialogueText(text: string): string {
  return text.replace(/\r\n/g, "\n").trim().replace(/\n{3,}/g, "\n\n");
}

function estimateTextHeight({
  text,
  contentWidthPx,
  fontSizePx,
  lineSpacingPx,
  compact,
}: {
  text: string;
  contentWidthPx: number;
  fontSizePx: number;
  lineSpacingPx: number;
  compact: boolean;
}): number {
  const normalizedText = normalizeDialogueText(text);
  const charsPerLine = Math.max(
    compact ? 26 : 34,
    Math.floor(contentWidthPx / (fontSizePx * 0.56))
  );
  const estimatedLines = normalizedText
    ? normalizedText
        .split(/\n+/)
        .reduce(
          (lineCount, paragraph) =>
            lineCount +
            Math.max(1, Math.ceil(paragraph.trim().length / charsPerLine)),
          0
        )
    : 3;
  const lineHeightPx = fontSizePx * 1.28 + lineSpacingPx;

  return clamp(
    estimatedLines * lineHeightPx + 8,
    compact ? 118 : 136,
    compact ? 260 : 230
  );
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
