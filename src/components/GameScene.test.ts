// @vitest-environment jsdom
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { Compiler } from "../inkjs/compiler/Compiler";
import { GameScene, SAVE_KEY } from "./GameScene";
import { CHAPTER_EDITION, JOURNEY_EDITION, type StoryEdition } from "../game/experience/StoryEdition";

const harness = vi.hoisted(() => ({
  handles: [] as any[], interfaces: [] as any[], audios: [] as any[], options: [] as any[],
  wait: null as Promise<void> | null, failure: null as Error | null, production: true,
}));
vi.mock("./scene-study/createSceneStudy", () => ({ createSceneStudy: vi.fn(async (_canvas: HTMLCanvasElement, options: any) => {
  harness.options.push(options);
  if (harness.wait) await harness.wait;
  if (harness.failure) throw harness.failure;
  const state = { assetMode: harness.production ? "production" : "provisional", backend: "WebGPU", fps: 57, settled: true, weather: "none", rainIntensity: 0, antialiasing: "taa" };
  const observers = new Set<() => void>();
  const scene = {
    acceptedScene: true,
    onAfterRenderObservable: {
      add: vi.fn((callback: () => void) => { observers.add(callback); return callback; }),
      remove: vi.fn((callback: () => void) => observers.delete(callback)),
    },
    renderFrame: () => { for (const callback of [...observers]) callback(); },
    observers,
  };
  const handle = {
    state, scene, applyDirection: vi.fn((direction, immediate) => {
      state.settled = Boolean(immediate || direction.transition.kind === "cut");
      state.weather = direction.weather;
      state.rainIntensity = direction.weather === "rain-memory" ? 1 : 0;
      state.antialiasing = state.rainIntensity || !state.settled ? "fxaa" : "taa";
    }),
    getScene: vi.fn(() => scene), getDiagnostics: vi.fn(() => state),
    reset: vi.fn(() => { state.settled = true; }), setReducedMotion: vi.fn((value) => { if (value) state.settled = true; }), dispose: vi.fn(),
  };
  harness.handles.push(handle);
  return handle;
}) }));
vi.mock("./game/AudioSystem", () => ({ AudioSystem: class {
  setEnabled = vi.fn(); setVolume = vi.fn(); setPaused = vi.fn(); setMood = vi.fn(); setWeather = vi.fn(); dispose = vi.fn();
  play = vi.fn().mockResolvedValue(undefined); playAudio = vi.fn().mockResolvedValue(undefined);
  playTapCue = vi.fn().mockResolvedValue(undefined);
  constructor(public scene: unknown) { harness.audios.push(this); }
} }));
vi.mock("../game/experience/DialogueUI", () => ({ DialogueUI: class {
  render = vi.fn(); setAudioEnabled = vi.fn(); setReducedMotion = vi.fn();
  setNotice = vi.fn(); setVolume = vi.fn(); dispose = vi.fn();
  constructor(_host: HTMLElement, public callbacks: any) { harness.interfaces.push(this); }
} }));

const script = `
VAR connection = 0
-> opening
=== opening ===
# scene: lamp
# mood: hushed
# camera: wide
# transition: cut 0
# arrangement: chair=rest,cup=near,lamp=steady,trace=none
# sound: none
# weather: none
The first shore.
* [Look at the cup] -> cup
=== cup ===
# scene: rail
# mood: warm
# camera: cup
# transition: dissolve 0.8
# arrangement: chair=turned,cup=away,lamp=steady,trace=none
# sound: none
# weather: rain-memory
~ connection = 10
A cup, still warm.
* [Wait for permission] -> taps
=== taps ===
# scene: hand
# mood: warm
# camera: bedside
# transition: ease 1.2
# arrangement: chair=turned,cup=near,lamp=steady,trace=none
# sound: taps
# weather: none
Two taps, then a pause.
* [Keep the light] -> ending
=== ending ===
# scene: keep
# mood: resolved
# ending: keep
# camera: water
# transition: dissolve 1.5
# arrangement: chair=rest,cup=absent,lamp=rest,trace=cup
# sound: none
# weather: none
The lamp remains.
-> END
`;
const games: GameScene[] = [];
function game(source = script, edition: StoryEdition = CHAPTER_EDITION) {
  const instance = new GameScene(document.querySelector("canvas")!, edition);
  instance.setStory(new Compiler(source).Compile());
  games.push(instance);
  return instance;
}
const ui = () => harness.interfaces.at(-1)!;
const renderer = () => harness.handles.at(-1)!;
const audio = () => harness.audios.at(-1)!;
const passage = () => ui().render.mock.calls.at(-1)[0];
const lastDirection = () => renderer().applyDirection.mock.calls.at(-1);
function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>(done => { resolve = done; });
  return { promise, resolve };
}

beforeEach(() => {
  window.history.replaceState({}, "", "/");
  localStorage.clear();
  document.body.innerHTML = '<div id="game-container"><canvas id="gameCanvas"></canvas><div id="experience-ui"></div></div>';
  Object.defineProperty(document, "hidden", { configurable: true, get: () => false });
  harness.handles = []; harness.interfaces = []; harness.audios = []; harness.options = [];
  harness.wait = null; harness.failure = null; harness.production = true;
});
afterEach(() => { games.splice(0).forEach(instance => instance.dispose()); vi.restoreAllMocks(); vi.useRealTimers(); });

describe("accepted living-scene game runtime", () => {
  it("keeps prototype and accepted chapter progress in independent edition slots", async () => {
    const chapter = game(); await chapter.run();
    ui().callbacks.onChoice(0);
    const savedChapter = localStorage.getItem(SAVE_KEY);
    chapter.dispose();
    const journey = game(script, JOURNEY_EDITION); await journey.run();
    expect(passage().text).toBe("The first shore.");
    ui().callbacks.onChoice(0); ui().callbacks.onChoice(0);
    const savedJourney = localStorage.getItem(JOURNEY_EDITION.saveKey);
    expect(JSON.parse(savedJourney!).edition).toBe(JOURNEY_EDITION.id);
    expect(localStorage.getItem(SAVE_KEY)).toBe(savedChapter);
    journey.dispose();
    const restoredChapter = game(); await restoredChapter.run();
    expect(passage().text).toBe("A cup, still warm.");
    expect(localStorage.getItem(JOURNEY_EDITION.saveKey)).toBe(savedJourney);
    restoredChapter.dispose();
    await game(script, JOURNEY_EDITION).run();
    expect(passage().text).toBe("Two taps, then a pause.");
    expect(audio().playTapCue).not.toHaveBeenCalled();
    ui().callbacks.onRestart();
    expect(passage().text).toBe("The first shore.");
    expect(localStorage.getItem(SAVE_KEY)).toBe(savedChapter);
  });

  it("rejects an Ink save from a different edition even when its numeric version matches", async () => {
    const first = game(script, JOURNEY_EDITION); await first.run();
    ui().callbacks.onChoice(0); first.dispose();
    const stored = JSON.parse(localStorage.getItem(JOURNEY_EDITION.saveKey)!);
    stored.edition = "another-story-v1";
    localStorage.setItem(JOURNEY_EDITION.saveKey, JSON.stringify(stored));
    await game(script, JOURNEY_EDITION).run();
    expect(passage().text).toBe("The first shore.");
    expect(ui().setNotice).toHaveBeenCalledWith(expect.stringContaining("could not be read"));
  });

  it("waits for accepted assets, initializes once, and constructs audio from the renderer scene", async () => {
    const pending = deferred(); harness.wait = pending.promise;
    const instance = game();
    const first = instance.initialize(); const second = instance.initialize();
    expect(second).toBe(first);
    expect(harness.audios).toHaveLength(0); expect(harness.interfaces).toHaveLength(0);
    pending.resolve(); await first; await instance.run(); await instance.run();
    expect(harness.handles).toHaveLength(1);
    expect(audio().scene).toBe(renderer().scene);
    expect(harness.options[0].narrative).toBe(true);
    expect(lastDirection()).toEqual([passage().direction, true]);
    expect(passage().text).toBe("The first shore.");
    expect(instance.getRendererType()).toBe("WebGPU"); expect(instance.getFps()).toBe(57);
  });

  it("requires a story before allocating the renderer", async () => {
    const instance = new GameScene(document.querySelector("canvas")!); games.push(instance);
    await expect(instance.run()).rejects.toThrow("story has not been loaded");
    expect(harness.options).toHaveLength(0);
  });

  it("restores remembered rain in scene and ambience, then explicitly clears both on departure and restart", async () => {
    const first = game(); await first.run();
    expect(audio().setWeather).toHaveBeenLastCalledWith("none", true);
    ui().callbacks.onChoice(0);
    expect(lastDirection()[0].weather).toBe("rain-memory");
    expect(audio().setWeather).toHaveBeenLastCalledWith("rain-memory", false);
    expect(document.getElementById("game-container")!.dataset).toMatchObject({ weather: "rain-memory", antialiasing: "fxaa", rainIntensity: "1" });
    first.dispose();
    await game().run();
    expect(lastDirection()[0].weather).toBe("rain-memory");
    expect(lastDirection()[1]).toBe(true);
    expect(audio().setWeather).toHaveBeenLastCalledWith("rain-memory", true);
    expect(audio().playTapCue).not.toHaveBeenCalled();
    ui().callbacks.onChoice(0);
    expect(audio().setWeather).toHaveBeenLastCalledWith("none", false);
    ui().callbacks.onRestart();
    expect(audio().setWeather).toHaveBeenLastCalledWith("none", true);
    expect(lastDirection()[0].weather).toBe("none");
  });

  it("uses only the opening fallback for legacy passages without direction tags", async () => {
    await game("A legacy passage.\n* [Remain] -> END").run();
    expect(passage().direction).toBeNull();
    expect(lastDirection()).toEqual([{
      camera: "wide", transition: { kind: "cut", seconds: 0 }, weather: "none",
      arrangement: { chair: "rest", cup: "near", lamp: "steady", trace: "none" },
    }, true]);
    expect(audio().playTapCue).not.toHaveBeenCalled();
  });

  it("rejects provisional assets before exposing story or audio", async () => {
    harness.production = false;
    await expect(game().run()).rejects.toThrow("accepted scene assets");
    expect(renderer().dispose).toHaveBeenCalledOnce();
    expect(harness.interfaces).toHaveLength(0); expect(harness.audios).toHaveLength(0);
  });

  it("propagates renderer failure and aborts initialization for launch retry", async () => {
    harness.failure = new Error("Textures unavailable");
    await expect(game().run()).rejects.toThrow("Textures unavailable");
    expect(harness.options[0].signal.aborted).toBe(true);
    expect(harness.interfaces).toHaveLength(0);
    harness.failure = null;
    await game().run(); expect(passage().text).toBe("The first shore.");
  });

  it("cancels loading and disposes a late renderer without constructing audio or UI", async () => {
    const pending = deferred(); harness.wait = pending.promise;
    const instance = game(); const starting = instance.run();
    instance.dispose(); instance.dispose();
    expect(harness.options[0].signal.aborted).toBe(true);
    pending.resolve(); await expect(starting).rejects.toThrow("closed");
    expect(renderer().dispose).toHaveBeenCalledOnce();
    expect(harness.audios).toHaveLength(0); expect(harness.interfaces).toHaveLength(0);
  });

  it("passes backend fallback options and accepts a replaced canvas", async () => {
    window.history.replaceState({}, "", "/?debug&renderer=webgl");
    const pending = deferred(); harness.wait = pending.promise;
    const instance = game(); const starting = instance.run();
    expect(harness.options[0].forceWebGL).toBe(true);
    const replacement = document.createElement("canvas"); replacement.id = "gameCanvas";
    document.querySelector("canvas")!.replaceWith(replacement);
    harness.options[0].onCanvasReplaced(replacement);
    pending.resolve(); await starting;
    expect((instance as unknown as { canvas: HTMLCanvasElement }).canvas).toBe(replacement);
  });

  it("lets rapid choices apply the latest complete direction without waiting for scene animation", async () => {
    await game().run();
    ui().callbacks.onChoice(999); expect(renderer().applyDirection).toHaveBeenCalledOnce();
    ui().callbacks.onChoice(0);
    expect(lastDirection()[0]).toEqual({ camera: "cup", weather: "rain-memory", transition: { kind: "dissolve", seconds: 0.8 }, arrangement: { chair: "turned", cup: "away", lamp: "steady", trace: "none" } });
    expect(audio().playTapCue).not.toHaveBeenCalled(); // Scene name alone never plays taps.
    ui().callbacks.onChoice(0); ui().callbacks.onChoice(0);
    expect(passage().ending).toBe("keep"); expect(lastDirection()[0].camera).toBe("water");
    expect(lastDirection()[1]).toBe(false); expect(audio().playTapCue).not.toHaveBeenCalled();
    expect(renderer().scene.observers.size).toBe(0); // New choice retired the waiting cue.
    const container = document.getElementById("game-container")!;
    expect(container.dataset).toMatchObject({ cameraCue: "water", scene: "keep", transition: "dissolve", settled: "false" });
  });

  it("restores the saved entrance and its full authored state immediately without replaying taps", async () => {
    const first = game(); await first.run();
    ui().callbacks.onChoice(0); ui().callbacks.onChoice(0);
    expect(passage().text).toBe("Two taps, then a pause.");
    const direction = structuredClone(passage().direction);
    const saved = JSON.parse(localStorage.getItem(SAVE_KEY)!);
    expect(saved.version).toBe(4); first.dispose();
    await game().run();
    expect(passage().text).toBe("Two taps, then a pause.");
    expect(lastDirection()).toEqual([direction, true]);
    expect(audio().playTapCue).not.toHaveBeenCalled();
    expect(ui().setNotice).toHaveBeenCalledWith("Your last passage has been restored.");
    ui().callbacks.onChoice(0); expect(passage().ending).toBe("keep");
  });

  it("restores terminal endings without skipping their text or arrangement", async () => {
    const first = game(); await first.run();
    ui().callbacks.onChoice(0); ui().callbacks.onChoice(0); ui().callbacks.onChoice(0);
    first.dispose(); await game().run();
    expect(passage().text).toBe("The lamp remains."); expect(passage().choices).toHaveLength(0);
    expect(lastDirection()).toEqual([passage().direction, true]);
    expect(lastDirection()[0].arrangement).toMatchObject({ cup: "absent", lamp: "rest", trace: "cup" });
  });

  it("recovers invalid saves and leaves earlier editions untouched", async () => {
    localStorage.setItem("fading:chapter-one:save:v2", "earlier edition");
    localStorage.setItem("fading:chapter-one:save:v3", "living scene edition");
    localStorage.setItem(SAVE_KEY, JSON.stringify({ version: 4, state: "not Ink JSON" }));
    await game().run();
    expect(passage().text).toBe("The first shore.");
    expect(lastDirection()[1]).toBe(true);
    expect(ui().setNotice).toHaveBeenCalledWith(expect.stringContaining("could not be read"));
    expect(localStorage.getItem("fading:chapter-one:save:v2")).toBe("earlier edition");
    expect(localStorage.getItem("fading:chapter-one:save:v3")).toBe("living scene edition");
    expect(JSON.parse(localStorage.getItem(SAVE_KEY)!).version).toBe(4);
  });

  it("restarts by resetting transitions, retiring audio one-shots, and settling the opening", async () => {
    await game().run(); ui().callbacks.onChoice(0); ui().callbacks.onChoice(0);
    ui().callbacks.onRestart();
    expect(renderer().reset).toHaveBeenCalledOnce();
    expect(audio().setMood).toHaveBeenLastCalledWith("hushed");
    expect(passage().text).toBe("The first shore."); expect(lastDirection()[1]).toBe(true);
    expect(audio().playTapCue).not.toHaveBeenCalled();
    expect(renderer().scene.observers.size).toBe(0);
    const saved = localStorage.getItem(SAVE_KEY)!;
    await game().run(); expect(passage().text).toBe("The first shore.");
    expect(localStorage.getItem(SAVE_KEY)).toBe(saved);
  });

  it("applies and persists audio, volume and reduced-motion preferences", async () => {
    localStorage.setItem("fading:preferences:v1", JSON.stringify({ audio: false, volume: 0.25, reducedMotion: true }));
    await game().run();
    expect(audio().setEnabled).toHaveBeenCalledWith(false); expect(audio().setVolume).toHaveBeenCalledWith(0.25);
    expect(renderer().setReducedMotion).toHaveBeenCalledWith(true); expect(ui().setReducedMotion).toHaveBeenCalledWith(true);
    ui().callbacks.onAudioToggle(); ui().callbacks.onVolumeChange(0.8); ui().callbacks.onMotionToggle();
    expect(JSON.parse(localStorage.getItem("fading:preferences:v1")!)).toEqual({ audio: true, volume: 0.8, reducedMotion: false });
    ui().callbacks.onVolumeChange(Number.NaN); expect(audio().setVolume).toHaveBeenLastCalledWith(0.8);
  });

  it("pauses audio on tab visibility and does not take over the renderer loop", async () => {
    const instance = game(); await instance.run();
    const hidden = vi.spyOn(document, "hidden", "get").mockReturnValue(true);
    document.dispatchEvent(new Event("visibilitychange")); expect(audio().setPaused).toHaveBeenLastCalledWith(true);
    hidden.mockReturnValue(false); document.dispatchEvent(new Event("visibilitychange"));
    expect(audio().setPaused).toHaveBeenLastCalledWith(false);
    instance.dispose(); audio().setPaused.mockClear();
    document.dispatchEvent(new Event("visibilitychange")); expect(audio().setPaused).not.toHaveBeenCalled();
  });

  it("updates the transition veil and prevents late callbacks or audio failures changing disposed UI", async () => {
    const instance = game(); await instance.run();
    const options = harness.options[0]; const container = document.getElementById("game-container")!;
    options.onTransitionOpacity(0.6); expect(container.style.getPropertyValue("--scene-transition-opacity")).toBe("0.6");
    const pending = deferred(); audio().play.mockReturnValueOnce(pending.promise.then(() => { throw new Error("Denied"); }));
    ui().callbacks.onChoice(0); instance.dispose(); instance.dispose();
    expect(renderer().dispose).toHaveBeenCalledOnce(); expect(audio().dispose).toHaveBeenCalledOnce(); expect(ui().dispose).toHaveBeenCalledOnce();
    const notices = ui().setNotice.mock.calls.length;
    options.onTransitionOpacity(1); expect(container.style.getPropertyValue("--scene-transition-opacity")).toBe("0");
    pending.resolve(); await Promise.resolve(); await Promise.resolve();
    expect(ui().setNotice.mock.calls).toHaveLength(notices);
  });

  it("ignores an obsolete audio rejection after a newer choice has already rendered", async () => {
    await game().run();
    const pending = deferred();
    audio().play.mockReturnValueOnce(pending.promise.then(() => { throw new Error("Denied"); }));
    ui().callbacks.onChoice(0); ui().callbacks.onChoice(0);
    const notices = ui().setNotice.mock.calls.length;
    pending.resolve(); await Promise.resolve(); await Promise.resolve();
    expect(passage().text).toBe("Two taps, then a pause.");
    expect(ui().setNotice.mock.calls).toHaveLength(notices);
  });

  it("plays taps only after the bedside shot has rendered settled, then removes its observer", async () => {
    await game().run(); ui().callbacks.onChoice(0); ui().callbacks.onChoice(0);
    expect(audio().playTapCue).not.toHaveBeenCalled();
    expect(renderer().scene.observers.size).toBe(1);
    renderer().scene.renderFrame(); expect(audio().playTapCue).not.toHaveBeenCalled();
    renderer().state.settled = true;
    renderer().scene.renderFrame();
    expect(audio().playTapCue).toHaveBeenCalledOnce();
    expect(renderer().scene.observers.size).toBe(0);
    renderer().scene.renderFrame(); expect(audio().playTapCue).toHaveBeenCalledOnce();
  });

  it("does not let a retired frame callback cancel a newer cue after restart", async () => {
    await game().run(); ui().callbacks.onChoice(0); ui().callbacks.onChoice(0);
    const retiredFrame = renderer().scene.onAfterRenderObservable.add.mock.calls.at(-1)[0];
    ui().callbacks.onRestart(); ui().callbacks.onChoice(0); ui().callbacks.onChoice(0);
    retiredFrame();
    expect(renderer().scene.observers.size).toBe(1);
    renderer().state.settled = true; renderer().scene.renderFrame();
    expect(audio().playTapCue).toHaveBeenCalledOnce();
    expect(renderer().scene.observers.size).toBe(0);
  });

  it("cancels waiting taps on a hidden tab and never replays them on return", async () => {
    await game().run(); ui().callbacks.onChoice(0); ui().callbacks.onChoice(0);
    const hidden = vi.spyOn(document, "hidden", "get").mockReturnValue(true);
    document.dispatchEvent(new Event("visibilitychange"));
    expect(renderer().scene.observers.size).toBe(0);
    hidden.mockReturnValue(false); document.dispatchEvent(new Event("visibilitychange"));
    renderer().state.settled = true; renderer().scene.renderFrame();
    expect(audio().playTapCue).not.toHaveBeenCalled();
  });

  it("cancels waiting taps on mute and disposal", async () => {
    const instance = game(); await instance.run(); ui().callbacks.onChoice(0); ui().callbacks.onChoice(0);
    ui().callbacks.onAudioToggle();
    expect(renderer().scene.observers.size).toBe(0);
    ui().callbacks.onAudioToggle(); renderer().state.settled = true; renderer().scene.renderFrame();
    expect(audio().playTapCue).not.toHaveBeenCalled();
    ui().callbacks.onRestart(); ui().callbacks.onChoice(0); ui().callbacks.onChoice(0);
    expect(renderer().scene.observers.size).toBe(1);
    instance.dispose(); expect(renderer().scene.observers.size).toBe(0);
    renderer().state.settled = true; renderer().scene.renderFrame();
    expect(audio().playTapCue).not.toHaveBeenCalled();
  });

  it("settles and plays a waiting tap cue immediately when reduced motion is selected", async () => {
    await game().run(); ui().callbacks.onChoice(0); ui().callbacks.onChoice(0);
    expect(audio().playTapCue).not.toHaveBeenCalled();
    ui().callbacks.onMotionToggle();
    expect(renderer().state.settled).toBe(true);
    expect(renderer().scene.observers.size).toBe(0);
    expect(audio().playTapCue).toHaveBeenCalledOnce();
    renderer().scene.renderFrame(); expect(audio().playTapCue).toHaveBeenCalledOnce();
  });

  it("retires a stalled presentation cue after a finite deadline without delayed playback", async () => {
    vi.useFakeTimers();
    await game().run(); ui().callbacks.onChoice(0); ui().callbacks.onChoice(0);
    expect(renderer().scene.observers.size).toBe(1);
    vi.advanceTimersByTime(10000);
    expect(renderer().scene.observers.size).toBe(0);
    renderer().state.settled = true; renderer().scene.renderFrame();
    expect(audio().playTapCue).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("reports unavailable storage while continuing the story", async () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("Storage unavailable"); });
    await game().run();
    expect(passage().text).toBe("The first shore.");
    expect(ui().setNotice).toHaveBeenCalledWith(expect.stringContaining("cannot be saved"));
  });
});
