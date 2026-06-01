// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
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
});
