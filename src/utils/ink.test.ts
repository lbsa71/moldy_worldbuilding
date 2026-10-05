import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { Compiler } from "../inkjs/compiler/Compiler";
import { choose, getCurrentDialogue, parseDialogueTags } from "./ink";

const source = readFileSync(new URL("../ink/demo.ink", import.meta.url), "utf8");
const compile = () => new Compiler(source).Compile();

function play(indices: number[]) {
  const story = compile();
  const passages = [getCurrentDialogue(story)];
  for (const index of indices) {
    choose(story, index);
    passages.push(getCurrentDialogue(story));
  }
  return { story, passages, last: passages.at(-1)! };
}

describe("the story presentation contract", () => {
  it("distinguishes absent objects from an explicit clear and validates every metadata field", () => {
    expect(parseDialogueTags([]).objects).toBeNull();
    expect(parseDialogueTags(["objects:"]).objects).toEqual([]);
    expect(parseDialogueTags(["position: (-3.5, +2)", "fog: .4", "audio soundtrack_1.mp3", "objects: lamp, cup, rail", "scene: bedside", "chapter: Two small taps", "mood: warm", "ending: carry"])).toEqual({
      position: { x: -3.5, z: 2 }, fog: 0.4, audio: "soundtrack_1.mp3", objects: ["lamp", "cup", "rail"], scene: "bedside", chapter: "Two small taps", mood: "warm", ending: "carry",
    });
  });

  it.each([
    "position: (NaN, 2)", "position: (1foo, 2)", "position: (1)", "position: (1, 2, 3)", "position: (, 2)", "position: (36, 2)", "position: (Infinity, 2)",
    "fog: -0.2", "fog: 1.1", "fog: NaN", "fog: 0.4junk", "objects: lamp, dragon", "objects: lamp,", "audio ../../secret.mp3", "mood: ecstatic", "scene: <script>", "chapter:", "notobjects: lamp",
  ])("rejects invalid presentation data: %s", tag => {
    expect(() => parseDialogueTags([tag])).toThrow();
  });

  it("rejects collapsed scene transitions instead of silently keeping only their final tags", () => {
    const story = new Compiler("# scene: first\nFirst.\n-> second\n=== second ===\n# scene: second\nSecond.\n* [Wait]\n    -> END").Compile();
    expect(() => getCurrentDialogue(story)).toThrow("Multiple scene tags");
  });

  it("validates choices before mutating story state", () => {
    const story = compile();
    getCurrentDialogue(story);
    const state = story.state.ToJson();
    for (const index of [-1, 3, NaN, 1.5]) expect(() => choose(story, index)).toThrow(RangeError);
    expect(story.state.ToJson()).toBe(state);
  });
});

describe("Fading: The place beside the light", () => {
  it("lets replies change the approach and gives carrying a different spatial resolution", () => {
    const looking = play([1]), waiting = play([2]);
    expect(looking.last.scene).toBe("chair");
    expect(waiting.last.scene).toBe("chair");
    expect(looking.last.position).not.toEqual(waiting.last.position);
    const keep = play([...Array(10).fill(0), 0]).last;
    const carry = play([...Array(10).fill(0), 1]).last;
    const rest = play([...Array(10).fill(0), 2]).last;
    expect(keep.position).toEqual({ x: 0, z: 0 });
    expect(rest.position).toEqual(keep.position);
    expect(Math.hypot(carry.position!.x, carry.position!.z)).toBeGreaterThan(25);
  });

  it.each(["keep", "carry", "rest"])("makes the %s ending available on a fresh journey", (ending) => {
    const index = ["keep", "carry", "rest"].indexOf(ending);
    const { story, last, passages } = play([...Array(10).fill(0), index]);
    expect(passages).toHaveLength(12);
    expect(last.ending).toBe(ending);
    expect(last.choices).toEqual([]);
    expect(story.canContinue).toBe(false);
    expect(story.variablesState.$("chosen_ending")).toBe(ending);
  });

  it("acknowledges chosen silence later, without locking any ending", () => {
    const spoken = play([0, 0, 1, 0, 0, 0, 1]);
    const quiet = play([2, 2, 2, 2, 2, 1, 2]);
    expect(quiet.last.scene).toBe("quiet");
    expect(quiet.last.text).toContain("from the beginning");
    expect(spoken.last.text).toContain("leave a little room");
    expect(quiet.story.variablesState.$("silence_count")).toBeGreaterThan(3);
    for (const endingIndex of [0, 1, 2]) {
      const result = play([2, 2, 2, 2, 2, 1, 2, 0, 2, 2, endingIndex]);
      expect(result.last.ending).toBe(["keep", "carry", "rest"][endingIndex]);
      expect(result.story.variablesState.$("connection")).toBe(0);
    }
  });

  it("remembers independently discovered cup and rail details in later dialogue", () => {
    const found = play([0, 0, 0, 1, 0, 0, 0, 1]);
    const missed = play([0, 0, 1, 0, 0, 0, 1, 1]);
    expect(found.last.scene).toBe("recollection");
    expect(found.last.text).toContain("chipped side turned away");
    expect(found.last.text).toContain("pause after two taps");
    expect(missed.last.text).not.toContain("You helped me keep that");
    expect(missed.last.text).toContain("without every detail");
  });

  it.each([0, 1, 2])("carries the chosen keepsake into the coda: %s", keepsake => {
    const result = play([0, 0, 0, 1, 0, 0, 0, 0, keepsake, 1, 1]);
    expect(result.last.text).toContain(["chipped cup", "You tap twice", "draw up a chair"][keepsake]);
  });

  it("exercises every choice at every scene and validates bounded scene staging", () => {
    const expectedScenes = ["lamp", "chair", "cup", "rail", "hand", "contradiction", "boundary", "quiet", "recollection", "preparation", "decision"];
    const scenes = new Set<string>();
    const endings = new Set<string>();
    // Each prefix uses a fresh story; every branch is exercised without an exponential route explosion.
    for (let depth = 0; depth < expectedScenes.length; depth++) {
      for (let variant = 0; variant < 3; variant++) {
        const result = play([...Array(depth).fill(0), variant]);
        for (const passage of result.passages) {
          expect(passage.text.length).toBeGreaterThan(30);
          expect(passage.scene).toBeTruthy();
          expect(passage.chapter).toBeTruthy();
          expect(passage.mood).toBeTruthy();
          expect(passage.objects).toContain("lamp");
          expect(passage.position).not.toBeNull();
          expect(Math.abs(passage.position!.x)).toBeLessThanOrEqual(35);
          expect(Math.abs(passage.position!.z)).toBeLessThanOrEqual(35);
          expect(passage.fog).toBeGreaterThanOrEqual(0);
          expect(passage.fog).toBeLessThanOrEqual(1);
          if (passage.ending) endings.add(passage.ending);
          else { scenes.add(passage.scene!); expect(passage.choices).toHaveLength(3); }
        }
        expect(result.story.hasError).toBe(false);
      }
    }
    expect([...scenes]).toEqual(expectedScenes);
    expect([...endings].sort()).toEqual(["carry", "keep", "rest"]);
  });

  it("keeps mixed histories playable through every keepsake and resolution", () => {
    for (let route = 0; route < 18; route++) {
      const prefix = Array.from({ length: 8 }, (_, depth) => (route + depth * Math.floor(route / 3 + 1)) % 3);
      for (let keepsake = 0; keepsake < 3; keepsake++) {
        for (let ending = 0; ending < 3; ending++) {
          const result = play([...prefix, keepsake, route % 3, ending]);
          expect(result.last.ending).toBe(["keep", "carry", "rest"][ending]);
          expect(result.story.hasError).toBe(false);
          expect(result.passages.every(passage => passage.text.trim().length > 0)).toBe(true);
        }
      }
    }
  });

  it("resets all narrative consequences and restores a fresh opening for replay", () => {
    const { story } = play([2, 2, 2, 0, 2, 1, 2, 0, 2, 2, 2]);
    expect(story.variablesState.$("hospital_clarity")).toBe(true);
    story.ResetState();
    const opening = getCurrentDialogue(story);
    const fresh = getCurrentDialogue(compile());
    expect({ ...opening, choices: opening.choices.map(choice => choice.text) }).toEqual({ ...fresh, choices: fresh.choices.map(choice => choice.text) });
    expect(story.variablesState.$("silence_count")).toBe(0);
    expect(story.variablesState.$("hospital_clarity")).toBe(false);
    expect(story.variablesState.$("chosen_ending")).toBe("");
  });

  it("restores the exact passage from a pre-continuation save", () => {
    const { story } = play([2, 0, 2]);
    choose(story, 1);
    const saved = story.state.ToJson();
    const original = getCurrentDialogue(story);
    const restored = compile();
    restored.state.LoadJson(saved);
    const resumed = getCurrentDialogue(restored);
    expect(resumed.text).toBe(original.text);
    expect(resumed.scene).toBe(original.scene);
    expect(resumed.choices.map(choice => choice.text)).toEqual(original.choices.map(choice => choice.text));
    expect(restored.variablesState.$("memory_rail")).toBe(true);
  });
});
