import { Engine } from '@babylonjs/core/Engines/engine';
import { AbstractEngine } from '@babylonjs/core/Engines/abstractEngine';
import { _CommonDispose } from '@babylonjs/core/Engines/engine.common';
import type { WebGPUEngine } from '@babylonjs/core/Engines/webgpuEngine';
import { Scene } from '@babylonjs/core/scene';
import { loadStudyAssets } from './SceneStudyAssets';
import { selectStudyCamera } from './SceneStudyCamera';
import { createStudySurfaces } from './SceneStudySurfaces';
import { SceneStudyObjects } from './SceneStudyObjects';
import { createLivingSceneCamera, LivingSceneDirector, type LivingSceneDiagnostics } from './LivingSceneDirector';
import type { SceneDirection } from '../../game/presentation/SceneDirection';
import { LivingSceneWeather, type LivingSceneWeatherDiagnostics } from './LivingSceneWeather';

export type SceneStudyDiagnostics = {
  backend: 'WebGPU' | 'WebGL';
  assetMode: 'production' | 'provisional';
  assetMessage: string;
  warnings: string[];
  chairTurned: boolean;
  cupVisible: boolean;
  reducedMotion: boolean;
  settled: boolean;
  disposed: boolean;
  meshCount: number;
  textureCount: number;
  reflectionMeshCount: number;
  shadowMeshCount: number;
  fps: number;
  renderedFrames: number;
  cameraName: string;
  environmentMode: 'hdr' | 'generated';
  environmentUrl: string | null;
  antialiasing: 'taa' | 'fxaa' | 'off';
} & Partial<LivingSceneDiagnostics & LivingSceneWeatherDiagnostics>;

export type SceneStudyHandle = {
  setChairTurned(value: boolean): void;
  setCupVisible(value: boolean): void;
  setReducedMotion(value: boolean): void;
  reset(): void;
  dispose(): void;
  getDiagnostics(): SceneStudyDiagnostics;
  applyDirection(direction: SceneDirection, immediate?: boolean): void;
  getScene(): Scene;
};

export type SceneStudyOptions = {
  forceWebGL?: boolean;
  onStatus?: (message: string) => void;
  /** A canvas already bound to WebGPU must be replaced before WebGL fallback. */
  onCanvasReplaced?: (canvas: HTMLCanvasElement) => void;
  /** Allows a page removed during loading to retire its engine and late asset containers. */
  signal?: AbortSignal;
  /** Override the manifest without changing its production asset checksum. IBL only. */
  environment?: { url: string; intensity?: number };
  /** Complete story arrangements and authored editorial camera cues. */
  narrative?: boolean;
  /** Fades only the scene overlay; dialogue and choices remain interactive. */
  onTransitionOpacity?: (opacity: number) => void;
  antialiasing?: 'auto' | 'off';
};

export async function createSceneStudy(canvas: HTMLCanvasElement, options: SceneStudyOptions = {}): Promise<SceneStudyHandle> {
  const status = (message: string) => { try { options.onStatus?.(message); } catch { /* status UI does not own the renderer */ } };
  const warnings: string[] = [];
  let engine: AbstractEngine | undefined;
  let scene: Scene | undefined;
  let backend: 'WebGPU' | 'WebGL' = 'WebGL';
  let disposed = false;
  let objects: SceneStudyObjects | undefined;
  let director: LivingSceneDirector | undefined;
  let weather: LivingSceneWeather | undefined;
  let antialiasing: Awaited<ReturnType<typeof createStudySurfaces>>['antialiasing'] | undefined;
  let resizeObserver: ResizeObserver | undefined;
  let renderedFrames = 0;
  const render = () => {
    if (disposed || !scene || !engine) return;
    if (director) director.update(Math.min(0.1, engine.getDeltaTime() / 1000));
    else objects?.update(engine.getDeltaTime() / 1000);
    weather?.update(Math.min(0.1, engine.getDeltaTime() / 1000));
    const weatherState = weather?.getDiagnostics();
    antialiasing?.update({ settled: (director?.getDiagnostics().settled ?? objects?.getState().settled ?? true) && !weatherState?.weatherMoving,
      rainActive: Boolean(weatherState?.weatherMoving) });
    scene.render();
    renderedFrames++;
  };
  const resize = () => { if (!disposed) { antialiasing?.reset(); engine?.resize(); director?.resize(); } };
  const visibility = () => {
    if (disposed || !engine) return;
    if (document.hidden) engine.stopRenderLoop(render);
    else engine.runRenderLoop(render);
  };
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    options.signal?.removeEventListener('abort', dispose);
    window.removeEventListener('resize', resize);
    document.removeEventListener('visibilitychange', visibility);
    resizeObserver?.disconnect();
    engine?.stopRenderLoop(render);
    director?.dispose();
    weather?.dispose();
    antialiasing?.dispose();
    objects?.dispose();
    scene?.dispose();
    engine?.dispose();
  };
  options.signal?.addEventListener('abort', dispose, { once: true });
  const ensureActive = () => {
    if (disposed || options.signal?.aborted) throw new DOMException('Scene study initialization was cancelled.', 'AbortError');
  };
  try {
    ensureActive();
    status('Preparing the fixed-view renderer…');
    if (!options.forceWebGL && 'gpu' in navigator) {
      let candidate: WebGPUEngine | undefined;
      let initialized = false;
      try {
        const { WebGPUEngine } = await import('@babylonjs/core/Engines/webgpuEngine');
        ensureActive();
        if (await WebGPUEngine.IsSupportedAsync) {
          ensureActive();
          // Keep pending initialization out of dispose(): Babylon 7's WebGPU
          // disposer assumes resources that initAsync has not created yet.
          candidate = new WebGPUEngine(canvas, { antialias: true, adaptToDeviceRatio: false });
          await candidate.initAsync();
          initialized = true;
          ensureActive();
          engine = candidate;
          backend = 'WebGPU';
        }
      } catch (error) {
        // Inspect Babylon 7's context without calling getContext(), which would
        // itself bind a previously untouched canvas to that context type.
        const contextAcquired = Boolean((candidate as unknown as { _context?: unknown } | undefined)?._context);
        if (candidate) {
          if (initialized) candidate.dispose();
          else {
            // A rejected init has no scene/effects. Destroy the possibly acquired
            // device and retire canvas listeners/EngineStore through base cleanup.
            // Calling WebGPUEngine.dispose here dereferences missing managers.
            candidate._device?.destroy();
            _CommonDispose(candidate, canvas);
            AbstractEngine.prototype.dispose.call(candidate);
          }
        }
        ensureActive();
        if (contextAcquired) {
          const replacement = canvas.cloneNode(false) as HTMLCanvasElement;
          canvas.replaceWith(replacement);
          canvas = replacement;
          options.onCanvasReplaced?.(replacement);
        }
        warnings.push(`WebGPU initialization failed; using WebGL. ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    ensureActive();
    engine ??= new Engine(canvas, true, { stencil: true, preserveDrawingBuffer: true }, false);
    engine.setHardwareScalingLevel(1 / Math.min(window.devicePixelRatio || 1, 1.5));
    scene = new Scene(engine);
    scene.useRightHandedSystem = true;
    const assets = await loadStudyAssets(scene, status, options.signal);
    ensureActive();
    if (options.narrative && assets.mode !== 'production') throw new Error('The production living scene could not load. Retry to start the story.');
    const authoredCamera = selectStudyCamera(scene, assets.camera, assets.manifest.camera);
    const camera = options.narrative ? createLivingSceneCamera(scene, authoredCamera) : authoredCamera;
    const surfaces = await createStudySurfaces(scene, assets, { environment: options.environment, signal: options.signal, onStatus: status, antialiasing: options.antialiasing });
    ensureActive();
    antialiasing = surfaces.antialiasing;
    warnings.push(...assets.warnings, ...surfaces.warnings, 'Browser visual acceptance remains pending.');
    objects = new SceneStudyObjects(assets.chair, assets.cup, assets.meshes, surfaces.applyRenderLists);
    if (options.narrative) {
      director = new LivingSceneDirector({
        scene, camera: camera as ReturnType<typeof createLivingSceneCamera>, authoredCamera, assets, objects,
        viewport: () => {
          const width = canvas.clientWidth || window.innerWidth;
          const height = canvas.clientHeight || window.innerHeight;
          return { width, aspect: width / Math.max(1, height) };
        },
        setLampRest: surfaces.setLampRest,
        setWeather: (cue, immediate) => weather?.applyCue(cue, immediate),
        onTransitionOpacity: options.onTransitionOpacity,
      });
      weather = new LivingSceneWeather(scene, assets, () => objects?.refreshPresence());
    }
    window.addEventListener('resize', resize);
    document.addEventListener('visibilitychange', visibility);
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(resize);
      resizeObserver.observe(canvas);
    }
    engine.onContextLostObservable.add(() => status('Graphics context lost. Reload the study to restore rendering.'));
    resize();
    if (!document.hidden) engine.runRenderLoop(render);
    status(assets.message);
    return {
      setChairTurned: value => { antialiasing?.reset(); objects?.setChairTurned(value); },
      setCupVisible: value => { antialiasing?.reset(); objects?.setCupVisible(value); },
      setReducedMotion: value => { antialiasing?.reset(); weather?.setReducedMotion(value); if (director) director.setReducedMotion(value); else objects?.setReducedMotion(value); },
      reset: () => { antialiasing?.reset(); if (director) director.reset(); else objects?.reset(); },
      applyDirection: (direction, immediate) => { antialiasing?.reset(); director?.applyDirection(direction, immediate); },
      getScene: () => scene!,
      dispose,
      getDiagnostics: () => ({
        backend, assetMode: assets.mode, assetMessage: assets.message, warnings: [...warnings],
        ...objects!.getState(), disposed, meshCount: scene!.meshes.length, textureCount: scene!.textures.length,
        reflectionMeshCount: surfaces.mirror.renderList?.length ?? 0,
        shadowMeshCount: surfaces.shadows.getShadowMap()?.renderList?.length ?? 0,
        fps: disposed ? 0 : engine!.getFps(), renderedFrames, cameraName: camera.name,
        environmentMode: surfaces.environmentMode, environmentUrl: surfaces.environmentUrl,
        ...director?.getDiagnostics(),
        ...weather?.getDiagnostics(),
        antialiasing: antialiasing?.getMode() ?? 'off',
      }),
    };
  } catch (error) {
    dispose();
    throw error;
  }
}
