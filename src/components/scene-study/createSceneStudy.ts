import { Engine } from '@babylonjs/core/Engines/engine';
import type { AbstractEngine } from '@babylonjs/core/Engines/abstractEngine';
import { Scene } from '@babylonjs/core/scene';
import { loadStudyAssets } from './SceneStudyAssets';
import { selectStudyCamera } from './SceneStudyCamera';
import { createStudySurfaces } from './SceneStudySurfaces';
import { SceneStudyObjects } from './SceneStudyObjects';

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
};

export type SceneStudyHandle = {
  setChairTurned(value: boolean): void;
  setCupVisible(value: boolean): void;
  setReducedMotion(value: boolean): void;
  reset(): void;
  dispose(): void;
  getDiagnostics(): SceneStudyDiagnostics;
};

export type SceneStudyOptions = {
  forceWebGL?: boolean;
  onStatus?: (message: string) => void;
  /** Allows a page removed during loading to retire its engine and late asset containers. */
  signal?: AbortSignal;
  /** Override the manifest without changing its production asset checksum. IBL only. */
  environment?: { url: string; intensity?: number };
};

export async function createSceneStudy(canvas: HTMLCanvasElement, options: SceneStudyOptions = {}): Promise<SceneStudyHandle> {
  const status = (message: string) => { try { options.onStatus?.(message); } catch { /* status UI does not own the renderer */ } };
  const warnings: string[] = [];
  let engine: AbstractEngine | undefined;
  let scene: Scene | undefined;
  let backend: 'WebGPU' | 'WebGL' = 'WebGL';
  let disposed = false;
  let objects: SceneStudyObjects | undefined;
  let resizeObserver: ResizeObserver | undefined;
  let renderedFrames = 0;
  const render = () => {
    if (disposed || !scene || !engine) return;
    objects?.update(engine.getDeltaTime() / 1000);
    scene.render();
    renderedFrames++;
  };
  const resize = () => { if (!disposed) engine?.resize(); };
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
      try {
        const { WebGPUEngine } = await import('@babylonjs/core/Engines/webgpuEngine');
        ensureActive();
        if (await WebGPUEngine.IsSupportedAsync) {
          ensureActive();
          engine = new WebGPUEngine(canvas, { antialias: true, adaptToDeviceRatio: false });
          await (engine as InstanceType<typeof WebGPUEngine>).initAsync();
          backend = 'WebGPU';
        }
      } catch (error) {
        engine?.dispose();
        engine = undefined;
        ensureActive();
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
    const camera = selectStudyCamera(scene, assets.camera, assets.manifest.camera);
    const surfaces = await createStudySurfaces(scene, assets, { environment: options.environment, signal: options.signal, onStatus: status });
    ensureActive();
    warnings.push(...assets.warnings, ...surfaces.warnings, 'Browser visual acceptance remains pending.');
    objects = new SceneStudyObjects(assets.chair, assets.cup, assets.meshes, surfaces.applyRenderLists);
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
      setChairTurned: value => objects?.setChairTurned(value),
      setCupVisible: value => objects?.setCupVisible(value),
      setReducedMotion: value => objects?.setReducedMotion(value),
      reset: () => objects?.reset(),
      dispose,
      getDiagnostics: () => ({
        backend, assetMode: assets.mode, assetMessage: assets.message, warnings: [...warnings],
        ...objects!.getState(), disposed, meshCount: scene!.meshes.length, textureCount: scene!.textures.length,
        reflectionMeshCount: surfaces.mirror.renderList?.length ?? 0,
        shadowMeshCount: surfaces.shadows.getShadowMap()?.renderList?.length ?? 0,
        fps: disposed ? 0 : engine!.getFps(), renderedFrames, cameraName: camera.name,
        environmentMode: surfaces.environmentMode, environmentUrl: surfaces.environmentUrl,
      }),
    };
  } catch (error) {
    dispose();
    throw error;
  }
}
