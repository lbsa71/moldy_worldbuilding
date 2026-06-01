export type DialogueViewport = {
  width: number;
  height: number;
};

export type DialogueHorizontalAlignment = "left" | "center";
export type DialogueTextAlignment = "left" | "center";
export type DialoguePhase = "story" | "ending" | "credits";

export type DialoguePresentation = {
  phase: DialoguePhase;
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
    textHorizontalAlignment: DialogueTextAlignment;
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
  choices?: string[];
  phase?: DialoguePhase;
  text?: string;
  viewport: DialogueViewport;
};

export function createDialoguePresentation({
  choiceCount,
  choices = [],
  phase: inputPhase,
  text = "",
  viewport,
}: DialoguePresentationInput): DialoguePresentation {
  const width = Math.max(320, viewport.width);
  const height = Math.max(320, viewport.height);
  const compact = width < 700 || height < 560;
  const phase = inputPhase ?? getDialoguePhase({ choices, text });
  const emphasis = phase !== "story";
  const marginPx = compact ? 12 : 24;
  const safeChoiceCount = Math.max(0, Math.ceil(choiceCount));
  const buttonHeightPx = emphasis ? (compact ? 52 : 56) : compact ? 48 : 52;
  const gapPx = emphasis ? 10 : 8;
  const paddingPx = emphasis ? (compact ? 18 : 26) : compact ? 16 : 22;
  const fontSizePx =
    phase === "credits"
      ? compact
        ? 20
        : 24
      : emphasis
        ? compact
          ? 20
          : 23
        : compact
          ? 19
          : 22;
  const lineSpacingPx = compact ? 3 : 5;
  const panelWidthPx = compact
    ? clamp(width - marginPx * 2, 300, 540)
    : emphasis
      ? clamp(width * 0.56, 660, 760)
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
    phase,
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
    phase,
    panel: {
      widthPx: panelWidthPx,
      heightPx: Math.round(panelHeightPx),
      marginPx,
      leftPx: compact || emphasis ? 0 : marginPx,
      bottomPx: emphasis ? (compact ? 16 : 34) : marginPx,
      horizontalAlignment: compact || emphasis ? "center" : "left",
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
      textHorizontalAlignment: emphasis ? "center" : "left",
    },
    palette: createPalette(phase),
  };
}

export function getDialoguePhase({
  choices = [],
  text = "",
}: {
  choices?: string[];
  text?: string;
}): DialoguePhase {
  const normalizedChoices = choices.map((choice) => choice.trim());
  const isRouteEnding =
    normalizedChoices.length === 2 &&
    normalizedChoices[0] === "Dream On" &&
    normalizedChoices[1] === "Wake Up";

  if (isRouteEnding) return "ending";

  if (
    normalizedChoices.length === 0 &&
    normalizeDialogueText(text).includes("Wake up. Your life is waiting.")
  ) {
    return "credits";
  }

  return "story";
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
  phase,
}: {
  text: string;
  contentWidthPx: number;
  fontSizePx: number;
  lineSpacingPx: number;
  compact: boolean;
  phase: DialoguePhase;
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
    phase === "credits" ? (compact ? 150 : 170) : compact ? 118 : 136,
    phase === "credits"
      ? compact
        ? 320
        : 300
      : phase === "ending"
        ? compact
          ? 300
          : 280
        : compact
          ? 260
          : 230
  );
}

function createPalette(phase: DialoguePhase): DialoguePresentation["palette"] {
  if (phase === "story") {
    return {
      panelBackground: "rgba(5, 10, 8, 0.78)",
      panelBorder: "#b8f5b1",
      panelShadow: "rgba(0, 0, 0, 0.62)",
      text: "#f6f8ef",
      choiceBackground: "rgba(15, 29, 21, 0.92)",
      choiceBorder: "#a8d89f",
      choiceHoverBackground: "rgba(199, 238, 174, 0.96)",
      choiceHoverBorder: "#f5ffe8",
      choiceText: "#f7fff1",
    };
  }

  return {
    panelBackground:
      phase === "credits" ? "rgba(6, 7, 6, 0.84)" : "rgba(18, 14, 8, 0.82)",
    panelBorder: "#ead28a",
    panelShadow: "rgba(0, 0, 0, 0.72)",
    text: "#fff7df",
    choiceBackground: "rgba(34, 27, 14, 0.94)",
    choiceBorder: "#d8bd72",
    choiceHoverBackground: "rgba(238, 212, 133, 0.96)",
    choiceHoverBorder: "#fff4c8",
    choiceText: "#fff8df",
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
