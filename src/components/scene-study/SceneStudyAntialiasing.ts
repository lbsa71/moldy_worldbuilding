import type { Camera } from '@babylonjs/core/Cameras/camera';
import { Constants } from '@babylonjs/core/Engines/constants';
import { Texture } from '@babylonjs/core/Materials/Textures/texture';
import type { PostProcess } from '@babylonjs/core/PostProcesses/postProcess';
import { FxaaPostProcess } from '@babylonjs/core/PostProcesses/fxaaPostProcess';
import { TAARenderingPipeline } from '@babylonjs/core/PostProcesses/RenderPipeline/Pipelines/taaRenderingPipeline';
import type { Scene } from '@babylonjs/core/scene';

export type SceneAntialiasingMode = 'taa' | 'fxaa' | 'off';
export interface SceneAntialiasing {
  update(state: { settled: boolean; rainActive: boolean }): void;
  /** Discard history before an authored cut, arrangement change, resize or restart. */
  reset(): void;
  dispose(): void;
  getMode(): SceneAntialiasingMode;
}

let nextPipeline = 0;

/** Pre-register shaders: Babylon 7.34 EffectWrapper does not invoke its extra async initializer. */
async function prepareShaders(scene: Scene): Promise<void> {
  // PassPostProcess's base constructor compiles once as GLSL before its WGSL
  // specialization runs. WebGPU caches that first effect by shader name, so both
  // stores must be ready before construction (otherwise it requests a missing .fx URL).
  await Promise.all([
    import('@babylonjs/core/Shaders/postprocess.vertex'),
    import('@babylonjs/core/Shaders/pass.fragment'),
    import('@babylonjs/core/Shaders/taa.fragment'),
    import('@babylonjs/core/Shaders/fxaa.vertex'),
    import('@babylonjs/core/Shaders/fxaa.fragment'),
  ]);
  if (scene.getEngine().isWebGPU) {
    await Promise.all([
      import('@babylonjs/core/ShadersWGSL/postprocess.vertex'),
      import('@babylonjs/core/ShadersWGSL/pass.fragment'),
      import('@babylonjs/core/ShadersWGSL/taa.fragment'),
      import('@babylonjs/core/ShadersWGSL/fxaa.vertex'),
      import('@babylonjs/core/ShadersWGSL/fxaa.fragment'),
    ]);
  }
}

/** Accumulate linear HDR only in dry, fully settled shots; the display transform is caller-owned. */
export async function createSceneAntialiasing(
  scene: Scene,
  camera: Camera,
  display: PostProcess,
  options: { off?: boolean } = {},
): Promise<SceneAntialiasing> {
  const off = options.off ?? (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('aa') === 'off');
  if (off) return { update() {}, reset() {}, dispose() {}, getMode: () => 'off' };
  await prepareShaders(scene);
  if (scene.isDisposed) throw new DOMException('Antialiasing initialization was cancelled.', 'AbortError');

  const engine = scene.getEngine();
  const caps = engine.getCaps();
  // Babylon allocates half-float history even when another constructor texture type is supplied.
  const supportsTaa = caps.texelFetch && caps.textureHalfFloatRender;
  let pipeline: TAARenderingPipeline | undefined;
  let taa: PostProcess | undefined;
  if (supportsTaa) {
    camera.detachPostProcess(display);
    const existing = new Set(camera._postProcesses);
    pipeline = new TAARenderingPipeline(`living scene TAA ${nextPipeline++}`, scene, [camera], Constants.TEXTURETYPE_HALF_FLOAT);
    // Read the newly attached postprocess once to observe actual applications, rather than frame notifications.
    taa = camera._postProcesses.find(post => post && !existing.has(post) && post.name === 'TAA') ?? undefined;
    pipeline.samples = 8;
    pipeline.disableOnCameraMove = true;
    camera.attachPostProcess(display);
  }
  const fxaa = new FxaaPostProcess('living scene FXAA', 1, null, Texture.BILINEAR_SAMPLINGMODE, engine, false);
  const fxaaIndex = camera.attachPostProcess(fxaa);
  let mode: SceneAntialiasingMode = 'fxaa';
  let disposed = false;
  let flushApplied = false;
  const accumulationFactor = 0.1;
  const manager = scene.postProcessRenderPipelineManager;
  const setTaaEnabled = (enabled: boolean) => {
    if (!pipeline) return;
    for (const effect of [pipeline.TAARenderEffect, pipeline.TAAPassEffect]) {
      // Unlike pipeline.isEnabled, these methods retain slots ahead of the display transform.
      if (enabled) manager.enableEffectInPipeline(pipeline.name, effect, [camera]);
      else manager.disableEffectInPipeline(pipeline.name, effect, [camera]);
    }
  };
  const flushHistory = () => {
    flushApplied = false;
    if (pipeline) pipeline.factor = 1;
  };
  const useFxaa = () => {
    setTaaEnabled(false);
    if (mode !== 'fxaa') camera.attachPostProcess(fxaa, fxaaIndex);
    mode = 'fxaa';
    // TAA jitters the cached matrix. Remove that jitter before the next moving frame.
    camera.getProjectionMatrix(true);
    flushHistory();
  };
  setTaaEnabled(false);
  flushHistory();

  const applyObserver = taa?.onApplyObservable.add(() => { flushApplied = true; });
  const renderObserver = scene.onAfterRenderObservable.add(() => {
    if (mode === 'taa' && flushApplied && pipeline) {
      // factor=1 has now reached a rendered TAA pass, even if shader compilation took extra frames.
      pipeline.factor = accumulationFactor;
      flushApplied = false;
    }
  });
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    scene.onAfterRenderObservable.remove(renderObserver);
    scene.onDisposeObservable.remove(disposeObserver);
    if (applyObserver) taa?.onApplyObservable.remove(applyObserver);
    fxaa.dispose(camera);
    if (pipeline) {
      pipeline.dispose();
      manager.removePipeline(pipeline.name);
    }
    mode = 'off';
  };
  const disposeObserver = scene.onDisposeObservable.addOnce(dispose);
  return {
    update({ settled, rainActive }) {
      if (disposed) return;
      const nextMode = pipeline && settled && !rainActive ? 'taa' : 'fxaa';
      if (nextMode === mode) return;
      if (nextMode === 'fxaa') useFxaa();
      else {
        camera.detachPostProcess(fxaa);
        flushHistory();
        setTaaEnabled(true);
        mode = 'taa';
      }
    },
    reset() { if (!disposed) useFxaa(); },
    dispose,
    getMode: () => mode,
  };
}
