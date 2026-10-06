import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { Story } from "../inkjs/engine/Story";
import { Compiler } from "../inkjs/compiler/Compiler";
import { choose, getCurrentDialogue, parseDialogueTags } from "./ink";

const source = readFileSync(new URL("../ink/demo.ink", import.meta.url), "utf8");
const compiled = new Compiler(source).Compile().ToJson() as string;
const compile = () => new Story(compiled);

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
  const cues = ["camera: cup", "transition: ease 1.8", "arrangement: chair=rest,cup=away,lamp=steady,trace=none"];
  it("requires complete direction while preserving legacy snippets without cues", () => {
    expect(parseDialogueTags([]).direction).toBeNull();
    expect(parseDialogueTags(cues).direction).toEqual({ camera: "cup", transition: { kind: "ease", seconds: 1.8 }, weather: "none", arrangement: { chair: "rest", cup: "away", lamp: "steady", trace: "none" } });
    for (const partial of [[cues[0]], cues.slice(0, 2), cues.slice(1)]) expect(() => parseDialogueTags(partial)).toThrow("Partial scene direction");
    for (const cue of cues) expect(() => parseDialogueTags([...cues, cue])).toThrow("Multiple");
  });
  it.each([
    ["camera: orbit", 0], ["transition: cut 1", 1], ["transition: ease NaN", 1],
    ["transition: ease Infinity", 1], ["transition: ease -1", 1], ["transition: ease 5.01", 1],
    ["transition: ease 1.8junk", 1], ["transition: dissolve 1e2", 1],
    ["arrangement: chair=rest,cup=near,lamp=steady", 2],
    ["arrangement: chair=rest,cup=near,lamp=steady,trace=none,trace=cup", 2],
    ["arrangement: chair=rest,cup=near,lamp=steady,trace=none,books=reward", 2],
    ["arrangement: chair=rest,cup=teleported,lamp=steady,trace=none", 2],
    ["arrangement: chair=rest,cup=near,lamp=steady,trace=cup", 2],
    ["arrangement: chair=rest,cup=away,lamp=steady,trace=cup", 2],
  ])("rejects invalid direction %s", (tag, index) => {
    const invalid = [...cues]; invalid[index as number] = tag as string;
    expect(() => parseDialogueTags(invalid)).toThrow();
  });
  it("validates sound and accepts the duration bounds", () => {
    expect(parseDialogueTags([...cues, "sound: taps"]).sound).toBe("taps");
    expect(() => parseDialogueTags([...cues, "sound: pulse"])).toThrow();
    for (const transition of ["cut 0", "ease 0", "dissolve 5"]) {
      expect(parseDialogueTags([cues[0], `transition: ${transition}`, cues[2]]).direction).not.toBeNull();
    }
  });
  it("validates weather without breaking legacy trios", () => {
    expect(parseDialogueTags(cues).direction!.weather).toBe("none");
    expect(parseDialogueTags([...cues, "weather: rain-memory"]).direction!.weather).toBe("rain-memory");
    expect(() => parseDialogueTags([...cues, "weather: storm"])).toThrow();
    expect(() => parseDialogueTags([...cues, "weather: none", "weather: rain-memory"])).toThrow("Multiple weather");
    expect(() => parseDialogueTags(["weather: rain-memory"])).toThrow("Partial scene direction");
  });
  it("distinguishes absent objects from an explicit clear and validates every metadata field", () => {
    expect(parseDialogueTags([]).objects).toBeNull();
    expect(parseDialogueTags(["objects:"]).objects).toEqual([]);
    expect(parseDialogueTags(["position: (-3.5, +2)", "fog: .4", "audio soundtrack_1.mp3", "objects: lamp, cup, rail", "scene: bedside", "chapter: Two small taps", "mood: warm", "ending: carry"])).toEqual({
      position: { x: -3.5, z: 2 }, fog: 0.4, audio: "soundtrack_1.mp3", objects: ["lamp", "cup", "rail"], scene: "bedside", chapter: "Two small taps", mood: "warm", ending: "carry", direction: null, sound: null,
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
    expect(looking.last.direction!.camera).toBe("chair");
    expect(waiting.last.direction!.camera).toBe("wide");
    const keep = play([...Array(10).fill(0), 0]).last;
    const carry = play([...Array(10).fill(0), 1]).last;
    const rest = play([...Array(10).fill(0), 2]).last;
    expect(keep.direction!.camera).toBe("cup");
    expect(carry.direction!.camera).toBe("shore");
    expect(rest.direction!.arrangement.lamp).toBe("rest");
    expect(keep.direction!.arrangement.lamp).toBe("steady");
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
          expect(passage.objects).toBeNull();
          expect(passage.position).toBeNull();
          expect(passage.fog).toBeNull();
          expect(passage.direction).not.toBeNull();
          expect(["none", "rain-memory"]).toContain(passage.direction!.weather);
          expect(Object.keys(passage.direction!.arrangement).sort()).toEqual(["chair", "cup", "lamp", "trace"]);
          expect(passage.direction!.transition.seconds).toBeGreaterThanOrEqual(0);
          expect(passage.direction!.transition.seconds).toBeLessThanOrEqual(5);
          expect(["taps", "none"]).toContain(passage.sound);
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
    expect(resumed.direction).toEqual(original.direction);
    expect(resumed.sound).toBe(original.sound);
    expect(resumed.choices.map(choice => choice.text)).toEqual(original.choices.map(choice => choice.text));
    expect(restored.variablesState.$("memory_rail")).toBe(true);
  });

  it("restores complete direction at every beat across branch histories, keepsakes and endings", () => {
    for (let route = 0; route < 18; route++) {
      const story = compile();
      for (let beat = 0; beat < 12; beat++) {
        const saved = story.state.ToJson();
        const original = getCurrentDialogue(story);
        const restored = compile(); restored.state.LoadJson(saved);
        const resumed = getCurrentDialogue(restored);
        expect(resumed.direction).toEqual(original.direction);
        expect(resumed.sound).toBe(original.sound);
        expect(resumed.text).toBe(original.text);
        expect(original.direction).not.toBeNull();
        if (beat < 11) choose(story, (route + beat * (Math.floor(route / 3) + 1)) % 3);
      }
    }
  });

  it("validates every reachable presentation context without repeating equivalent choice histories", () => {
    const pending = [compile()];
    const visited = new Set<string>();
    const branches = new Set<string>();
    // connection/inquiry have no presentation conditions; silence is capped at
    // the authored >=3 threshold. Other variables affecting prose/cues are retained.
    while (pending.length) {
      const story = pending.pop()!;
      const entrance = story.state.ToJson();
      const dialogue = getCurrentDialogue(story);
      const key = JSON.stringify([dialogue.scene,
        ...["last_response", "memory_cup", "memory_rail", "hospital_clarity", "accepted_uncertainty", "keepsake", "chosen_ending"].map(name => story.variablesState.$(name)),
        Math.min(3, Number(story.variablesState.$("silence_count"))),
      ]);
      if (visited.has(key)) continue;
      visited.add(key);
      expect(dialogue.direction).not.toBeNull();
      expect(dialogue.sound).not.toBeNull();
      expect(dialogue.position).toBeNull();
      const restored = compile(); restored.state.LoadJson(entrance);
      const replay = getCurrentDialogue(restored);
      expect(replay.direction).toEqual(dialogue.direction);
      expect(replay.sound).toBe(dialogue.sound);
      for (let choice = 0; choice < dialogue.choices.length; choice++) {
        branches.add(`${dialogue.scene}:${choice}`);
        const next = compile(); next.state.LoadJson(story.state.ToJson());
        choose(next, choice); pending.push(next);
      }
    }
    expect(branches.size).toBe(33);
  }, 15_000);

  it.each([0, 1, 2])("preserves physical cup semantics for keepsake %s in every ending", keepsake => {
    for (let ending = 0; ending < 3; ending++) {
      const result = play([0, 0, 0, 1, 0, 0, 0, 0, keepsake, 1, ending]);
      const arrangement = result.last.direction!.arrangement;
      expect(arrangement.cup === "absent").toBe(keepsake === 0 && ending !== 2);
      expect(arrangement.trace === "cup").toBe(keepsake === 0 && ending === 0);
      if (ending === 0) expect(result.last.direction!.camera).toBe(keepsake === 0 ? "cup" : "wide");
      expect(result.last.sound).toBe(keepsake === 1 ? "taps" : "none");
    }
  });

  it("describes the retained cup orientation when a remembered chip is selected as keepsake", () => {
    const { passages, last } = play([0, 0, 0, 1, 0, 0, 0, 0, 0]);
    expect(passages.at(-2)!.direction!.arrangement.cup).toBe("away");
    expect(last.direction!.arrangement.cup).toBe("away");
    expect(last.text).toContain("The cup holds its chip on the far side.");
  });
  it("authors remembered rain only alongside the sleeve memories and ends it at the next beat", () => {
    for (const response of [0, 1, 2]) {
      const result = play([0, response, 0, 1, 0, 0]);
      for (const passage of result.passages) {
        const expectedRain = passage.scene === "contradiction" || (passage.scene === "cup" && response === 1);
        expect(passage.direction!.weather).toBe(expectedRain ? "rain-memory" : "none");
        if (expectedRain) expect(passage.text).toMatch(/rain.*sleeve|sleeve[\s\S]*rain/i);
      }
    }
    expect(source.match(/# weather: /g)).toHaveLength(15); // 14 beats, cup has two exclusive variants.
  });
});
