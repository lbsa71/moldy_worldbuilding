export type GameRuntime = {
  run: () => Promise<void>;
  getRendererType: () => string;
  getFps: () => number;
};

type LaunchExperienceOptions = {
  canvas: HTMLCanvasElement;
  launchScreen: HTMLElement;
  startButton: HTMLButtonElement;
  rendererType: HTMLElement;
  fpsCounter: HTMLElement;
  statusText?: HTMLElement | null;
  loadWasm: () => Promise<unknown>;
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
  canvas,
  launchScreen,
  startButton,
  rendererType,
  fpsCounter,
  statusText,
  loadWasm,
  gameFactory,
  fpsIntervalMs = 1000,
  setIntervalFn = window.setInterval.bind(window),
  clearIntervalFn = window.clearInterval.bind(window),
  onError,
}: LaunchExperienceOptions): LaunchExperience {
  let startPromise: Promise<GameRuntime> | null = null;
  let fpsTimer: number | undefined;

  const setStatus = (message: string) => {
    if (statusText) {
      statusText.textContent = message;
    }
  };

  const updateFps = (game: GameRuntime) => {
    fpsCounter.textContent = game.getFps().toFixed(0);
  };

  const markLoading = () => {
    launchScreen.dataset.state = "loading";
    startButton.disabled = true;
    startButton.setAttribute("aria-busy", "true");
    setStatus("Waking...");
  };

  const markStarted = () => {
    launchScreen.hidden = true;
    launchScreen.setAttribute("aria-hidden", "true");
    launchScreen.dataset.state = "started";
    startButton.setAttribute("aria-busy", "false");
    canvas.focus({ preventScroll: true });
  };

  const markFailed = (error: unknown) => {
    startPromise = null;
    startButton.disabled = false;
    startButton.setAttribute("aria-busy", "false");
    launchScreen.hidden = false;
    launchScreen.setAttribute("aria-hidden", "false");
    launchScreen.dataset.state = "error";
    setStatus("The dream couldn't open. Try again.");
    onError?.(error);
  };

  const start = async (): Promise<GameRuntime> => {
    if (startPromise) {
      return startPromise;
    }

    startPromise = (async () => {
      markLoading();
      try {
        await loadWasm();
        const game = await gameFactory(canvas);
        await game.run();
        rendererType.textContent = game.getRendererType();
        updateFps(game);
        fpsTimer = setIntervalFn(() => updateFps(game), fpsIntervalMs);
        markStarted();
        return game;
      } catch (error) {
        markFailed(error);
        throw error;
      }
    })();

    return startPromise;
  };

  startButton.addEventListener("click", start);

  return {
    start,
    destroy: () => {
      startButton.removeEventListener("click", start);
      if (fpsTimer !== undefined) {
        clearIntervalFn(fpsTimer);
      }
    },
  };
}
