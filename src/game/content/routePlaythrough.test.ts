import { describe, expect, it } from "vitest";
import { Compiler } from "../../inkjs/compiler/Compiler";
import inkSource from "../../ink/demo.ink?raw";
import { GROUNDED_POSITION_LIMIT } from "./worldDesign";
import {
  AUTHORED_ROUTE_PLAYTHROUGHS,
  playAuthoredRoute,
} from "./routePlaythrough";

describe("authored route playthroughs", () => {
  it.each(AUTHORED_ROUTE_PLAYTHROUGHS)(
    "can play the $route route through credits",
    (routePlan) => {
      const story = new Compiler(inkSource).Compile();
      const result = playAuthoredRoute(story, routePlan);

      expect(result.ended).toBe(true);
      expect(result.finalText).toContain("Wake up. Your life is waiting.");
      expect(result.endingBeat?.choices.map((choice) => choice.text)).toEqual([
        "Dream On",
        "Wake Up",
      ]);
      expect(result.endingBeat?.text).toEqual(
        expect.stringContaining(routePlan.endingTextIncludes)
      );
      expect(result.choicePath).toEqual(routePlan.expectedChoicePath);
      expect(result.beats.length).toBeGreaterThanOrEqual(
        routePlan.minimumBeatCount
      );
      expect(result.maxAxisDistance).toBeGreaterThan(
        GROUNDED_POSITION_LIMIT
      );
      expect(result.audioTimeline).toContain("soundtrack_3.mp3");
      expect(result.audioTimeline.at(-1)).toBe("end_credits.mp3");
    }
  );

  it("covers every first-screen route choice", () => {
    const openingChoices = new Set(
      AUTHORED_ROUTE_PLAYTHROUGHS.map((route) => route.openingChoice)
    );

    expect(openingChoices).toEqual(
      new Set([
        "Step into the lamp's circle.",
        "Follow the metallic pulse in the mist.",
        "Stay quiet until the fog answers.",
        "Walk away from the lamp and into uncertainty.",
      ])
    );
  });
});
