import type { Story } from "../../inkjs/ink";
import { choose, getCurrentDialogue, type Dialogue } from "../../utils/ink";

export type AuthoredRouteName = "trust" | "memory" | "silence" | "uncertainty";

export type AuthoredRoutePlaythrough = {
  endingTextIncludes: string;
  expectedChoicePath: string[];
  minimumBeatCount: number;
  openingChoice: string;
  route: AuthoredRouteName;
};

export type RouteBeat = Dialogue & {
  step: number;
};

export type RoutePlaythroughResult = {
  audioTimeline: string[];
  beats: RouteBeat[];
  choicePath: string[];
  endingBeat?: RouteBeat;
  ended: boolean;
  finalText: string;
  maxAxisDistance: number;
};

const WAKE_UP_CHOICE = "Wake Up";

export const AUTHORED_ROUTE_PLAYTHROUGHS: AuthoredRoutePlaythrough[] = [
  {
    route: "trust",
    endingTextIncludes: "You did not fix me.",
    openingChoice: "Step into the lamp's circle.",
    minimumBeatCount: 7,
    expectedChoicePath: [
      "Step into the lamp's circle.",
      "Tell the voice you will stay near the light.",
      "Treat the remembered hands as careful, not threatening.",
      "Offer the gentleness on purpose.",
      "Accept the fragile bond without trying to own it.",
      WAKE_UP_CHOICE,
    ],
  },
  {
    route: "memory",
    endingTextIncludes: "If I had to be carried",
    openingChoice: "Follow the metallic pulse in the mist.",
    minimumBeatCount: 7,
    expectedChoicePath: [
      "Follow the metallic pulse in the mist.",
      "Name the room as a hospital.",
      "Say that the touch mattered.",
      "Press your palm to the nearest handprint.",
      "Anchor the memory to care instead of terror.",
      WAKE_UP_CHOICE,
    ],
  },
  {
    route: "silence",
    endingTextIncludes: "I cannot follow you past this quiet",
    openingChoice: "Stay quiet until the fog answers.",
    minimumBeatCount: 7,
    expectedChoicePath: [
      "Stay quiet until the fog answers.",
      "Keep the silence open.",
      "Let the machines become part of the quiet.",
      "Stay until the rhythm steadies.",
      "Rest beside the hand until it lowers.",
      WAKE_UP_CHOICE,
    ],
  },
  {
    route: "uncertainty",
    endingTextIncludes: "Some answers keep their backs turned",
    openingChoice: "Walk away from the lamp and into uncertainty.",
    minimumBeatCount: 7,
    expectedChoicePath: [
      "Walk away from the lamp and into uncertainty.",
      "Keep walking without demanding an answer.",
      "Slow down so the fragments can catch up.",
      "Tell the voice that uncertainty is not failure.",
      "Choose compassion over certainty.",
      WAKE_UP_CHOICE,
    ],
  },
];

export function playAuthoredRoute(
  story: Story,
  routePlan: AuthoredRoutePlaythrough
): RoutePlaythroughResult {
  const beats: RouteBeat[] = [];
  const choicePath: string[] = [];
  const audioTimeline: string[] = [];
  let endingBeat: RouteBeat | undefined;
  let finalText = "";
  let maxAxisDistance = 0;

  for (let step = 0; step < 40; step += 1) {
    const dialogue = getCurrentDialogue(story);
    const beat = { ...dialogue, step };
    beats.push(beat);
    finalText = dialogue.text;

    if (dialogue.audio) {
      audioTimeline.push(dialogue.audio);
    }

    if (dialogue.position) {
      maxAxisDistance = Math.max(
        maxAxisDistance,
        Math.abs(dialogue.position.x),
        Math.abs(dialogue.position.z)
      );
    }

    if (dialogue.choices.length === 0) {
      return {
        audioTimeline,
        beats,
        choicePath,
        endingBeat,
        ended: true,
        finalText,
        maxAxisDistance,
      };
    }

    if (isEndingBeat(dialogue)) {
      endingBeat = beat;
    }

    const expectedChoice = routePlan.expectedChoicePath[choicePath.length];
    if (!expectedChoice) {
      throw new Error(
        `${routePlan.route} route reached an unexpected choice: ${formatChoices(
          dialogue
        )}`
      );
    }

    const choiceIndex = dialogue.choices.findIndex(
      (choice) => choice.text === expectedChoice
    );
    if (choiceIndex === -1) {
      throw new Error(
        `${routePlan.route} route expected "${expectedChoice}" but saw ${formatChoices(
          dialogue
        )}`
      );
    }

    choicePath.push(expectedChoice);
    choose(story, choiceIndex);
  }

  return {
    audioTimeline,
    beats,
    choicePath,
    endingBeat,
    ended: false,
    finalText,
    maxAxisDistance,
  };
}

function formatChoices(dialogue: Dialogue): string {
  return `[${dialogue.choices.map((choice) => `"${choice.text}"`).join(", ")}]`;
}

function isEndingBeat(dialogue: Dialogue): boolean {
  const choiceTexts = dialogue.choices.map((choice) => choice.text);

  return choiceTexts[0] === "Dream On" && choiceTexts[1] === WAKE_UP_CHOICE;
}
