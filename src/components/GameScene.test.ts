// @vitest-environment jsdom
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { Compiler } from "../inkjs/compiler/Compiler";
import { GameScene, SAVE_KEY } from "./GameScene";

const harness = vi.hoisted(() => ({
  engines: [] as any[], scenes: [] as any[], interfaces: [] as any[],
  atmosphere: null as any, environment: null as any, audio: null as any, camera: null as any, character: null as any,
  gpuSupported: false, gpuFailure: false, gpuWait: null as Promise<void> | null,
  terrainWait: null as Promise<void> | null,
}));

vi.mock("@babylonjs/core/Engines/engine", () => {
  class Engine {
    kind = "WebGL";
    runRenderLoop = vi.fn(); stopRenderLoop = vi.fn(); resize = vi.fn(); dispose = vi.fn();
    getFps = () => 60;
    constructor() { harness.engines.push(this); }
  }
  return { Engine };
});
vi.mock("@babylonjs/core/Engines/webgpuEngine", () => {
  class WebGPUEngine {
    kind = "WebGPU";
    runRenderLoop = vi.fn(); stopRenderLoop = vi.fn(); resize = vi.fn(); dispose = vi.fn();
    getFps = () => 60;
    constructor() { harness.engines.push(this); }
    static get IsSupportedAsync() { return Promise.resolve(harness.gpuSupported); }
    async initAsync() {
      if (harness.gpuWait) await harness.gpuWait;
      if (harness.gpuFailure) throw new Error("GPU device unavailable");
    }
  }
  return { WebGPUEngine };
});
vi.mock("@babylonjs/core/scene", () => {
  class Scene {
    clearColor: unknown;
    onKeyboardObservable = { add: vi.fn() };
    registerBeforeRender = vi.fn(); render = vi.fn(); dispose = vi.fn();
    constructor() { harness.scenes.push(this); }
  }
  return { Scene };
});
vi.mock("./game/TerrainSystem", () => ({ TerrainSystem: class {
  terrain = {};
  async waitForReady() { if (harness.terrainWait) await harness.terrainWait; }
  getHeightAtPoint() { return 0; }
} }));
vi.mock("./game/AtmosphereSystem", () => ({ AtmosphereSystem: class {
  updateFog = vi.fn(); setReducedMotion = vi.fn(); toggleDebug = vi.fn(); dispose = vi.fn();
  setNarrativeScene = vi.fn(); updateListenerPosition = vi.fn();
  constructor() { harness.atmosphere = this; }
} }));
vi.mock("./game/EnvironmentSystem", () => ({ EnvironmentSystem: class {
  populate = vi.fn(); createObjectsFromTag = vi.fn(); updateObjectVisibilities = vi.fn();
  setNarrativeScene = vi.fn(); resetJourney = vi.fn();
  setReducedMotion = vi.fn(); toggleDebug = vi.fn(); dispose = vi.fn();
  constructor() { harness.environment = this; }
} }));
vi.mock("./game/Character", () => ({ Character: class {
  setPosition = vi.fn(); setReducedMotion = vi.fn(); dispose = vi.fn();
  getPosition = () => ({ x: 0, y: 0, z: 0 });
  moveTo = vi.fn().mockResolvedValue(undefined);
  constructor() { harness.character = this; }
} }));
vi.mock("./game/CameraSystem", () => ({ CameraSystem: class {
  updatePosition = vi.fn(); setCameraTarget = vi.fn(); setReducedMotion = vi.fn(); resize = vi.fn(); dispose = vi.fn();
  setNarrativeScene = vi.fn();
  constructor() { harness.camera = this; }
} }));
vi.mock("./game/AudioSystem", () => ({ AudioSystem: class {
  setEnabled = vi.fn(); setVolume = vi.fn(); setPaused = vi.fn(); setMood = vi.fn(); dispose = vi.fn();
  play = vi.fn().mockResolvedValue(undefined); playAudio = vi.fn().mockResolvedValue(undefined);
  playTapCue = vi.fn().mockResolvedValue(undefined);
  constructor() { harness.audio = this; }
} }));
vi.mock("../game/experience/DialogueUI", () => ({ DialogueUI: class {
  render = vi.fn(); setAudioEnabled = vi.fn(); setReducedMotion = vi.fn();
  setNotice = vi.fn(); setVolume = vi.fn(); dispose = vi.fn();
  callbacks: any;
  constructor(_host: HTMLElement, callbacks: any) { this.callbacks = callbacks; harness.interfaces.push(this); }
} }));

const script = `
VAR connection = 0
VAR hospital_clarity = false
-> opening
=== opening ===
# scene: lamp
# mood: hushed
# fog: 0.9
# position: (0, 0)
# objects: lamp
The first room.
* [Look at the cup] -> cup
=== cup ===
# scene: rail
# mood: warm
# audio soundtrack_2.mp3
# fog: 0.35
# position: (10, 0)
# objects: geometric
~ connection = 2
~ hospital_clarity = true
A cup, still warm.
* [Keep the light] -> ending
=== ending ===
# scene: keep
# mood: resolved
# ending: keep
The lamp remains.
-> END
`;

function game() {
  const instance = new GameScene(document.querySelector("canvas")!);
  instance.setStory(new Compiler(script).Compile());
  return instance;
}
function currentUI() { return harness.interfaces.at(-1)!; }

beforeEach(() => {
  window.history.replaceState({}, "", "/");
  localStorage.clear();
  document.body.innerHTML = '<canvas></canvas><div id="experience-ui"></div>';
  harness.engines = []; harness.scenes = []; harness.interfaces = [];
  harness.gpuSupported = false; harness.gpuFailure = false;
  harness.gpuWait = null; harness.terrainWait = null;
  vi.spyOn(document, "hidden", "get").mockReturnValue(false);
  vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => { vi.restoreAllMocks(); });

describe("game runtime ownership", () => {
  it("allows explicit WebGL inspection without attempting a supported WebGPU device", async () => {
    window.history.replaceState({}, "", "/?debug&renderer=webgl");
    harness.gpuSupported = true;
    const instance = game();
    await instance.run();
    expect(harness.engines.map(engine => engine.kind)).toEqual(["WebGL"]);
    expect(instance.getRendererType()).toBe("WebGL");
    instance.dispose();
  });
  it("falls back to WebGL after supported WebGPU fails and disposes its device", async () => {
    harness.gpuSupported = true; harness.gpuFailure = true;
    const instance = game();
    await instance.run();
    expect(harness.engines.map(engine => engine.kind)).toEqual(["WebGPU", "WebGL"]);
    expect(harness.engines[0].dispose).toHaveBeenCalledOnce();
    expect(instance.getRendererType()).toBe("WebGL");
    instance.dispose();
    expect(harness.engines[1].dispose).toHaveBeenCalledOnce();
  });

  it("starts once, pauses rendering and audio in hidden tabs, and removes owned resources", async () => {
    const instance = game();
    await instance.run();
    await instance.run();
    const engine = harness.engines[0];
    const scene = harness.scenes[0];
    expect(engine.runRenderLoop).toHaveBeenCalledOnce();
    vi.spyOn(document, "hidden", "get").mockReturnValue(true);
    document.dispatchEvent(new Event("visibilitychange"));
    expect(engine.stopRenderLoop).toHaveBeenCalledOnce();
    expect(harness.audio.setPaused).toHaveBeenLastCalledWith(true);
    vi.spyOn(document, "hidden", "get").mockReturnValue(false);
    document.dispatchEvent(new Event("visibilitychange"));
    expect(engine.runRenderLoop).toHaveBeenCalledTimes(2);
    expect(harness.audio.setPaused).toHaveBeenLastCalledWith(false);
    instance.dispose(); instance.dispose();
    expect(engine.dispose).toHaveBeenCalledOnce();
    expect(scene.dispose).toHaveBeenCalledOnce();
    expect(currentUI().dispose).toHaveBeenCalledOnce();
    expect(harness.audio.dispose).toHaveBeenCalledOnce();
    window.dispatchEvent(new Event("resize"));
    document.dispatchEvent(new Event("visibilitychange"));
    expect(engine.resize).not.toHaveBeenCalled();
    expect(engine.runRenderLoop).toHaveBeenCalledTimes(2);
    expect(scene.onKeyboardObservable.add).not.toHaveBeenCalled();
  });

  it("cannot resurrect a disposed game while terrain is still initializing", async () => {
    let finishTerrain!: () => void;
    harness.terrainWait = new Promise<void>(resolve => { finishTerrain = resolve; });
    const instance = game();
    const startup = instance.run();
    await vi.waitFor(() => expect(harness.scenes).toHaveLength(1));
    instance.dispose(); finishTerrain();
    await expect(startup).rejects.toThrow("closed");
    expect(harness.engines[0].dispose).toHaveBeenCalledOnce();
    expect(harness.interfaces).toHaveLength(0);
  });

  it("cannot leak a GPU device that finishes initialization after disposal", async () => {
    harness.gpuSupported = true;
    let finishGPU!: () => void;
    harness.gpuWait = new Promise<void>(resolve => { finishGPU = resolve; });
    const instance = game();
    const startup = instance.run();
    await vi.waitFor(() => expect(harness.engines).toHaveLength(1));
    instance.dispose(); finishGPU();
    await expect(startup).rejects.toThrow("closed");
    expect(harness.engines).toHaveLength(1);
    expect(harness.engines[0].dispose).toHaveBeenCalledOnce();
    expect(harness.scenes).toHaveLength(0);
  });
});

describe("story and world contract", () => {
  it("applies authored fog, connection, clarity and mood after a choice", async () => {
    const instance = game();
    await instance.run();
    expect(harness.atmosphere.updateFog).toHaveBeenLastCalledWith(0.9);
    currentUI().callbacks.onChoice(0);
    expect(currentUI().render.mock.lastCall[0].text).toContain("A cup, still warm.");
    expect(harness.atmosphere.updateFog).toHaveBeenLastCalledWith(0.35);
    expect(harness.environment.updateObjectVisibilities).toHaveBeenLastCalledWith(2, true);
    expect(harness.audio.setMood).toHaveBeenLastCalledWith("warm");
    expect(harness.audio.playAudio).not.toHaveBeenCalled();
    expect(harness.environment.setNarrativeScene).toHaveBeenLastCalledWith("rail");
    expect(harness.atmosphere.setNarrativeScene).toHaveBeenLastCalledWith("rail");
    expect(harness.camera.setNarrativeScene).toHaveBeenLastCalledWith("rail", expect.objectContaining({ x: 10, z: 0 }));
    expect(harness.character.moveTo).toHaveBeenLastCalledWith(expect.objectContaining({ x: 10, z: 0 }), expect.anything());
    expect(harness.camera.setNarrativeScene.mock.invocationCallOrder.at(-1)).toBeLessThan(harness.character.moveTo.mock.invocationCallOrder.at(-1));
    expect(harness.audio.playTapCue).toHaveBeenCalledOnce();
    currentUI().callbacks.onChoice(0);
    expect(currentUI().render.mock.lastCall[0]).toMatchObject({ ending: "keep", choices: [] });
    expect(harness.audio.setMood).toHaveBeenLastCalledWith("resolved");
    expect(harness.environment.setNarrativeScene).toHaveBeenLastCalledWith("keep");
    instance.dispose();
  });

  it("restores the same beat with its choices, and replay starts with fresh state", async () => {
    const first = game();
    await first.run();
    currentUI().callbacks.onChoice(0);
    const before = currentUI().render.mock.lastCall[0];
    expect(localStorage.getItem(SAVE_KEY)).toBeTruthy();
    first.dispose();
    const resumed = game();
    await resumed.run();
    const restored = currentUI().render.mock.lastCall[0];
    expect(restored.text).toBe(before.text);
    expect(restored.choices.map((choice: any) => choice.text)).toEqual(before.choices.map((choice: any) => choice.text));
    expect(harness.environment.createObjectsFromTag.mock.calls.map((call: any[]) => call[0])).toEqual([["lamp"], ["geometric"]]);
    expect(currentUI().setNotice).toHaveBeenLastCalledWith(expect.stringContaining("restored"));
    resumed.restart();
    expect(harness.environment.resetJourney).toHaveBeenCalledOnce();
    expect(harness.camera.setNarrativeScene).toHaveBeenLastCalledWith("lamp", expect.objectContaining({ x: 0, z: 0 }));
    expect(harness.camera.setNarrativeScene.mock.invocationCallOrder.at(-1)).toBeLessThan(harness.camera.setCameraTarget.mock.invocationCallOrder.at(-1));
    expect(currentUI().render.mock.lastCall[0].text).toContain("The first room.");
    expect(harness.environment.updateObjectVisibilities).toHaveBeenLastCalledWith(0, false);
    currentUI().callbacks.onChoice(0);
    expect(currentUI().setNotice).toHaveBeenLastCalledWith("");
    resumed.dispose();
  });

  it("rejects malformed saved world coordinates before rebuilding a memory trail", async () => {
    const first = game(); await first.run();
    const saved = JSON.parse(localStorage.getItem(SAVE_KEY)!);
    saved.journey = [{ scene: "chair", objects: ["chair"], position: { x: 900, z: 0 } }];
    localStorage.setItem(SAVE_KEY, JSON.stringify(saved));
    first.dispose();
    const resumed = game(); await resumed.run();
    expect(currentUI().setNotice).toHaveBeenLastCalledWith(expect.stringContaining("could not be read"));
    expect(harness.environment.createObjectsFromTag).toHaveBeenCalledOnce();
    expect(harness.environment.createObjectsFromTag.mock.lastCall[2]).toEqual({ x: 0, z: 0 });
    resumed.dispose();
  });

  it("recovers corrupt saves and remains playable when storage is unavailable", async () => {
    localStorage.setItem(SAVE_KEY, "broken json");
    const instance = game();
    await instance.run();
    expect(currentUI().render.mock.lastCall[0].text).toContain("The first room.");
    expect(currentUI().setNotice).toHaveBeenCalledWith(expect.stringContaining("could not be read"));
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("blocked"); });
    currentUI().callbacks.onChoice(0);
    expect(currentUI().render.mock.lastCall[0].text).toContain("A cup, still warm.");
    expect(currentUI().setNotice).toHaveBeenCalledWith(expect.stringContaining("cannot be saved"));
    instance.dispose();
  });
});
