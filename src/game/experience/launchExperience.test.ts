// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { createLaunchExperience } from "./launchExperience";

function renderLaunchDom() {
  document.body.innerHTML = `
    <main>
      <section id="launchScreen">
        <button id="startButton">Wake up</button>
        <p id="launchStatus"></p>
      </section>
      <canvas id="gameCanvas"></canvas>
      <span id="rendererType">Loading...</span>
      <span id="fpsCounter">0</span>
    </main>
  `;

  return {
    canvas: document.getElementById("gameCanvas") as HTMLCanvasElement,
    launchScreen: document.getElementById("launchScreen") as HTMLElement,
    startButton: document.getElementById("startButton") as HTMLButtonElement,
    statusText: document.getElementById("launchStatus") as HTMLElement,
    rendererType: document.getElementById("rendererType") as HTMLElement,
    fpsCounter: document.getElementById("fpsCounter") as HTMLElement,
  };
}

describe("createLaunchExperience", () => {
  afterEach(() => { vi.restoreAllMocks(); });
  it("waits for the player gesture before loading wasm or running the game", () => {
    const elements = renderLaunchDom();
    const loadWasm = vi.fn().mockResolvedValue(true);
    const gameFactory = vi.fn();

    createLaunchExperience({
      ...elements,
      loadWasm,
      gameFactory,
    });

    expect(loadWasm).not.toHaveBeenCalled();
    expect(gameFactory).not.toHaveBeenCalled();
    expect(elements.launchScreen.hidden).toBe(false);
  });

  it("starts once, hides the launch screen, and wires renderer and fps telemetry", async () => {
    const elements = renderLaunchDom();
    const run = vi.fn().mockResolvedValue(undefined);
    const setIntervalFn = vi.fn((callback: () => void) => {
      callback();
      return 7;
    });

    const controller = createLaunchExperience({
      ...elements,
      loadWasm: vi.fn().mockResolvedValue(true),
      gameFactory: vi.fn().mockResolvedValue({
        run,
        getRendererType: () => "WebGPU",
        getFps: () => 59.7,
      }),
      setIntervalFn,
    });

    await Promise.all([
      controller.start(),
      controller.start(),
    ]);

    expect(run).toHaveBeenCalledTimes(1);
    expect(elements.launchScreen.hidden).toBe(true);
    expect(elements.launchScreen.getAttribute("aria-hidden")).toBe("true");
    expect(elements.startButton.disabled).toBe(true);
    expect(elements.rendererType.textContent).toBe("WebGPU");
    expect(elements.fpsCounter.textContent).toBe("60");
    expect(setIntervalFn).toHaveBeenCalledWith(expect.any(Function), 1000);
  });

  it("restores the launch screen when startup fails so the player can retry", async () => {
    const elements = renderLaunchDom();
    const error = new Error("lost in the fog");
    const onError = vi.fn();

    const controller = createLaunchExperience({
      ...elements,
      loadWasm: vi.fn().mockRejectedValue(error),
      gameFactory: vi.fn(),
      onError,
    });

    await expect(controller.start()).rejects.toThrow("lost in the fog");

    expect(elements.launchScreen.hidden).toBe(false);
    expect(elements.startButton.disabled).toBe(false);
    expect(elements.statusText.textContent).toContain("couldn't open");
    expect(onError).toHaveBeenCalledWith(error);
  });

  it("disposes a failed runtime and retries even a synchronous factory failure", async () => {
    const elements = renderLaunchDom();
    const failed = { run: vi.fn().mockRejectedValue(new Error("scene failed")), getRendererType: () => "WebGL", getFps: () => 60, dispose: vi.fn() };
    const working = { ...failed, run: vi.fn().mockResolvedValue(undefined), dispose: vi.fn() };
    const factory = vi.fn()
      .mockImplementationOnce(() => { throw new Error("factory failed"); })
      .mockReturnValueOnce(failed)
      .mockReturnValueOnce(working);
    const controller = createLaunchExperience({ ...elements, gameFactory: factory, setIntervalFn: () => 1 });

    await expect(controller.start()).rejects.toThrow("factory failed");
    await expect(controller.start()).rejects.toThrow("scene failed");
    expect(failed.dispose).toHaveBeenCalledTimes(1);
    await expect(controller.start()).resolves.toBe(working);
    expect(factory).toHaveBeenCalledTimes(3);
    controller.destroy();
    expect(working.dispose).toHaveBeenCalledTimes(1);
  });

  it("resolves the live canvas again for retries and focus after context replacement", async () => {
    const elements = renderLaunchDom();
    const replacement = document.createElement("canvas"); replacement.id = "gameCanvas"; replacement.tabIndex = -1;
    const finalCanvas = replacement.cloneNode(false) as HTMLCanvasElement;
    const failed = {
      run: vi.fn(async () => { elements.canvas.replaceWith(replacement); throw new Error("Asset loading failed after fallback"); }),
      getRendererType: () => "WebGL", getFps: () => 60, dispose: vi.fn(),
    };
    const working = {
      run: vi.fn(async () => { replacement.replaceWith(finalCanvas); }),
      getRendererType: () => "WebGL", getFps: () => 60, dispose: vi.fn(),
    };
    const factory = vi.fn().mockReturnValueOnce(failed).mockReturnValueOnce(working);
    const getCanvas = vi.fn(() => document.getElementById("gameCanvas") as HTMLCanvasElement);
    const controller = createLaunchExperience({ ...elements, getCanvas, gameFactory: factory, setIntervalFn: () => 1 });
    expect(getCanvas).not.toHaveBeenCalled();
    await expect(controller.start()).rejects.toThrow("Asset loading failed after fallback");
    expect(factory).toHaveBeenNthCalledWith(1, elements.canvas);
    expect(failed.dispose).toHaveBeenCalledOnce();
    await controller.start();
    expect(factory).toHaveBeenNthCalledWith(2, replacement);
    expect(document.activeElement).toBe(finalCanvas);
    controller.destroy(); expect(working.dispose).toHaveBeenCalledOnce();
  });

  it("handles rejected startup from a click without an unhandled event promise", async () => {
    const elements = renderLaunchDom();
    const onError = vi.fn();
    const controller = createLaunchExperience({ ...elements, gameFactory: () => Promise.reject(new Error("offline")), onError });
    elements.startButton.click();
    await vi.waitFor(() => expect(onError).toHaveBeenCalledTimes(1));
    expect(elements.startButton.disabled).toBe(false);
    controller.destroy();
  });

  it("disposes a runtime that arrives after its launch controller was destroyed", async () => {
    const elements = renderLaunchDom();
    const runtime = { run: vi.fn().mockResolvedValue(undefined), getRendererType: () => "WebGL", getFps: () => 60, dispose: vi.fn() };
    let resolveFactory!: (game: typeof runtime) => void;
    const factory = vi.fn(() => new Promise<typeof runtime>(resolve => { resolveFactory = resolve; }));
    const controller = createLaunchExperience({ ...elements, gameFactory: factory });
    const startup = controller.start();
    await Promise.resolve();
    controller.destroy();
    resolveFactory(runtime);
    await expect(startup).rejects.toThrow("closed");
    expect(runtime.run).not.toHaveBeenCalled();
    expect(runtime.dispose).toHaveBeenCalledTimes(1);
    expect(elements.launchScreen.hidden).toBe(false);
    await expect(controller.start()).rejects.toThrow("closed");
  });

  it("disposes exactly once if destroyed during runtime initialization", async () => {
    const elements = renderLaunchDom();
    let finishRun!: () => void;
    const runtime = { run: vi.fn(() => new Promise<void>(resolve => { finishRun = resolve; })), getRendererType: () => "WebGL", getFps: () => 60, dispose: vi.fn() };
    const controller = createLaunchExperience({ ...elements, gameFactory: () => runtime });
    const startup = controller.start();
    await vi.waitFor(() => expect(runtime.run).toHaveBeenCalled());
    controller.destroy();
    finishRun();
    await expect(startup).rejects.toThrow("closed");
    expect(runtime.dispose).toHaveBeenCalledTimes(1);
    expect(elements.launchScreen.hidden).toBe(false);
  });

  it("clears telemetry and focuses the accessible story heading when started", async () => {
    const elements = renderLaunchDom();
    const heading = document.createElement("h2");
    heading.id = "dialogue-heading";
    heading.tabIndex = -1;
    document.body.append(heading);
    const clearIntervalFn = vi.fn();
    const runtime = { run: async () => {}, getRendererType: () => "WebGL", getFps: () => 60, dispose: vi.fn() };
    const controller = createLaunchExperience({ ...elements, gameFactory: () => runtime, setIntervalFn: () => 42, clearIntervalFn });
    await controller.start();
    expect(document.activeElement).toBe(heading);
    controller.destroy();
    controller.destroy();
    expect(clearIntervalFn).toHaveBeenCalledOnce();
    expect(clearIntervalFn).toHaveBeenCalledWith(42);
    expect(runtime.dispose).toHaveBeenCalledOnce();
  });
});
