export type GameRuntime = {
  run: () => Promise<void>;
  getRendererType: () => string;
  getFps: () => number;
  dispose?: () => void;
};

type LaunchExperienceOptions = {
  canvas: HTMLCanvasElement;
  /** Resolve the live canvas after a renderer replaces a bound graphics context. */
  getCanvas?: () => HTMLCanvasElement;
  launchScreen: HTMLElement;
  startButton: HTMLButtonElement;
  rendererType: HTMLElement;
  fpsCounter: HTMLElement;
  statusText?: HTMLElement | null;
  loadWasm?: () => Promise<unknown>;
  gameFactory: (canvas: HTMLCanvasElement) => Promise<GameRuntime> | GameRuntime;
  fpsIntervalMs?: number;
  setIntervalFn?: (handler: () => void, timeout: number) => number;
  clearIntervalFn?: (handle: number) => void;
  onError?: (error: unknown) => void;
};

export type LaunchExperience = {
  start: () => Promise<GameRuntime>;
  destroy: () => void;
};

export function createLaunchExperience({
  canvas, getCanvas, launchScreen, startButton, rendererType, fpsCounter, statusText,
  loadWasm, gameFactory, fpsIntervalMs = 1000,
  setIntervalFn = window.setInterval.bind(window),
  clearIntervalFn = window.clearInterval.bind(window), onError,
}: LaunchExperienceOptions): LaunchExperience {
  let startPromise: Promise<GameRuntime> | null = null;
  let game: GameRuntime | null = null;
  let fpsTimer: number | undefined;
  let destroyed = false;
  const disposedGames = new WeakSet<GameRuntime>();

  const disposeGame = (runtime: GameRuntime | null) => {
    if (runtime && !disposedGames.has(runtime)) {
      disposedGames.add(runtime);
      runtime.dispose?.();
    }
  };
  const ensureActive = () => {
    if (destroyed) throw new Error("The launch experience was closed.");
  };
  const updateFps = (runtime: GameRuntime) => {
    fpsCounter.textContent = runtime.getFps().toFixed(0);
  };

  const start = (): Promise<GameRuntime> => {
    if (destroyed) return Promise.reject(new Error("The launch experience was closed."));
    if (startPromise) return startPromise;

    launchScreen.dataset.state = "loading";
    startButton.disabled = true;
    startButton.setAttribute("aria-busy", "true");
    if (statusText) statusText.textContent = "Lighting the room…";

    startPromise = (async () => {
      try {
        // Assign the shared promise before a synchronous factory failure can reset it.
        await Promise.resolve();
        ensureActive();
        if (loadWasm) await loadWasm();
        ensureActive();
        const activeCanvas = getCanvas?.() ?? canvas;
        game = await gameFactory(activeCanvas);
        ensureActive();
        await game.run();
        ensureActive();
        rendererType.textContent = game.getRendererType();
        updateFps(game);
        fpsTimer = setIntervalFn(() => {
          if (game && !destroyed) updateFps(game);
        }, fpsIntervalMs);
        launchScreen.hidden = true;
        launchScreen.setAttribute("aria-hidden", "true");
        launchScreen.dataset.state = "started";
        startButton.setAttribute("aria-busy", "false");
        (document.getElementById("dialogue-heading") || getCanvas?.() || activeCanvas).focus({ preventScroll: true });
        return game;
      } catch (error) {
        disposeGame(game);
        game = null;
        if (!destroyed) {
          startPromise = null;
          startButton.disabled = false;
          startButton.setAttribute("aria-busy", "false");
          launchScreen.hidden = false;
          launchScreen.setAttribute("aria-hidden", "false");
          launchScreen.dataset.state = "error";
          if (statusText) statusText.textContent = "The room couldn't open. Please try again.";
          onError?.(error);
        }
        throw error;
      }
    })();
    return startPromise;
  };

  // DOM event dispatch cannot await the handled startup promise.
  const onClick = () => { void start().catch(() => {}); };
  startButton.addEventListener("click", onClick);

  return {
    start,
    destroy: () => {
      if (destroyed) return;
      destroyed = true;
      startButton.removeEventListener("click", onClick);
      if (fpsTimer !== undefined) clearIntervalFn(fpsTimer);
      disposeGame(game);
    },
  };
}
