import { afterEach, describe, expect, it, vi } from 'vitest';
import { NullEngine } from '@babylonjs/core/Engines/nullEngine';
import { Constants } from '@babylonjs/core/Engines/constants';
import { Scene } from '@babylonjs/core/scene';
import { FreeCamera } from '@babylonjs/core/Cameras/freeCamera';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { ImageProcessingPostProcess } from '@babylonjs/core/PostProcesses/imageProcessingPostProcess';
import { ImageProcessingConfiguration } from '@babylonjs/core/Materials/imageProcessingConfiguration';
import { TAARenderingPipeline } from '@babylonjs/core/PostProcesses/RenderPipeline/Pipelines/taaRenderingPipeline';
import { MirrorTexture } from '@babylonjs/core/Materials/Textures/mirrorTexture';
import { createSceneAntialiasing } from './SceneStudyAntialiasing';

const cleanup: (() => void)[] = [];
afterEach(() => { cleanup.splice(0).reverse().forEach(dispose => dispose()); });

async function fixture(caps: { texelFetch?: boolean; textureHalfFloatRender?: boolean } = {}, off = false) {
  const engine = new NullEngine();
  Object.assign(engine.getCaps(), { texelFetch: true, textureHalfFloatRender: true, ...caps });
  const scene = new Scene(engine);
  const camera = new FreeCamera('study camera', new Vector3(0, 1, -3), scene);
  scene.activeCamera = camera;
  const config = scene.imageProcessingConfiguration;
  config.toneMappingEnabled = true;
  config.toneMappingType = ImageProcessingConfiguration.TONEMAPPING_ACES;
  const display = new ImageProcessingPostProcess('single display transform', 1, camera, undefined, engine, false, Constants.TEXTURETYPE_HALF_FLOAT, config);
  cleanup.push(() => { scene.dispose(); engine.dispose(); });
  const aa = await createSceneAntialiasing(scene, camera, display, { off });
  const pipeline = scene.postProcessRenderPipelineManager.supportedPipelines.find(candidate => candidate instanceof TAARenderingPipeline) as TAARenderingPipeline | undefined;
  const posts = () => camera._postProcesses.filter(post => post !== null);
  return { engine, scene, camera, display, aa, pipeline, posts };
}

describe('living-scene antialiasing', () => {
  it('accumulates linear HDR ahead of exactly one ACES pass, with FXAA after that pass during movement', async () => {
    const { aa, posts, display, pipeline, camera, engine } = await fixture();
    expect(aa.getMode()).toBe('fxaa');
    expect(posts().map(post => post.name)).toEqual(['single display transform', 'living scene FXAA']);
    aa.update({ settled: true, rainActive: false });
    expect(aa.getMode()).toBe('taa');
    expect(posts().map(post => post.name)).toEqual(['TAA', 'TAAPass', 'single display transform']);
    const allocations = vi.spyOn(engine, 'createRenderTargetTexture');
    posts()[0].activate(camera);
    expect(allocations).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ type: Constants.TEXTURETYPE_HALF_FLOAT }));
    expect(display.imageProcessingConfiguration.toneMappingType).toBe(ImageProcessingConfiguration.TONEMAPPING_ACES);
    expect(pipeline?.disableOnCameraMove).toBe(true);
    aa.update({ settled: false, rainActive: false });
    expect(posts().map(post => post.name)).toEqual(['single display transform', 'living scene FXAA']);
  });

  it('keeps FXAA for active or fading weather, including a settled reduced-motion shot', async () => {
    const { aa } = await fixture();
    aa.update({ settled: true, rainActive: true });
    expect(aa.getMode()).toBe('fxaa');
    aa.update({ settled: false, rainActive: true });
    expect(aa.getMode()).toBe('fxaa');
    aa.update({ settled: true, rainActive: false });
    expect(aa.getMode()).toBe('taa');
    aa.update({ settled: true, rainActive: true });
    expect(aa.getMode()).toBe('fxaa');
  });

  it.each([
    { texelFetch: false, textureHalfFloatRender: true },
    { texelFetch: true, textureHalfFloatRender: false },
  ])('uses FXAA without allocating an unsupported TAA pipeline: %j', async caps => {
    const { aa, pipeline, posts } = await fixture(caps);
    aa.update({ settled: true, rainActive: false });
    expect(aa.getMode()).toBe('fxaa');
    expect(pipeline).toBeUndefined();
    expect(posts().map(post => post.name)).toEqual(['single display transform', 'living scene FXAA']);
    aa.dispose();
    aa.dispose();
  });

  it('retains postprocess order and slot count across repeated cuts, rain, resize and restart resets', async () => {
    const { aa, camera, posts } = await fixture();
    const slots = camera._postProcesses.length;
    for (let index = 0; index < 30; index++) {
      aa.update({ settled: true, rainActive: false });
      aa.reset();
      expect(aa.getMode()).toBe('fxaa');
      aa.update({ settled: true, rainActive: true });
      aa.update({ settled: false, rainActive: false });
      aa.update({ settled: true, rainActive: false });
      expect(posts().map(post => post.name)).toEqual(['TAA', 'TAAPass', 'single display transform']);
      expect(camera._postProcesses.length).toBe(slots);
    }
  });

  it('flushes history until a TAA pass actually applies, then begins accumulation after the frame', async () => {
    const { aa, scene, pipeline, posts } = await fixture();
    aa.update({ settled: true, rainActive: false });
    expect(pipeline?.factor).toBe(1);
    // A frame can finish before an asynchronously compiled postprocess is ready.
    scene.onAfterRenderObservable.notifyObservers(scene);
    expect(pipeline?.factor).toBe(1);
    const taa = posts().find(post => post.name === 'TAA')!;
    taa.onApplyObservable.notifyObservers({ _bindTexture: vi.fn() } as never);
    expect(pipeline?.factor).toBe(1);
    scene.onAfterRenderObservable.notifyObservers(scene);
    expect(pipeline?.factor).toBe(0.1);
    aa.reset();
    aa.update({ settled: true, rainActive: false });
    expect(pipeline?.factor).toBe(1);
  });

  it('clears cached projection jitter before movement without depending on camera.hasMoved', async () => {
    const { aa, camera } = await fixture();
    const baseline = camera.getProjectionMatrix(true).clone();
    aa.update({ settled: true, rainActive: false });
    camera.getProjectionMatrix().setRowFromFloats(2, 0.04, 0.08, baseline.m[10], baseline.m[11]);
    aa.update({ settled: false, rainActive: false });
    expect(camera.getProjectionMatrix().equals(baseline)).toBe(true);
  });

  it('flushes a newly settled shot through the actual Scene.render postprocess lifecycle', async () => {
    const { aa, scene, pipeline, posts } = await fixture();
    aa.update({ settled: true, rainActive: false });
    const appliedFactors: number[] = [];
    posts().find(post => post.name === 'TAA')!.onApplyObservable.add(() => { appliedFactors.push(pipeline!.factor); });
    // Shader imports/compilation can complete between frames, just as in the browser.
    for (let frame = 0; frame < 8 && appliedFactors.length < 2; frame++) {
      await new Promise(resolve => setTimeout(resolve, 0));
      scene.render();
    }
    expect(appliedFactors.slice(0, 2)).toEqual([1, 0.1]);
    aa.reset();
    aa.update({ settled: true, rainActive: false });
    scene.render();
    expect(appliedFactors.at(-1)).toBe(1);
    expect(pipeline?.factor).toBe(0.1);
  });

  it('does not apply main-camera TAA or consume its history flush during reflection rendering', async () => {
    const { aa, scene, pipeline, posts } = await fixture();
    const mirror = new MirrorTexture('water reflection fixture', 64, scene);
    mirror.useCameraPostProcesses = false;
    mirror.blurKernel = 6;
    mirror.renderList = [];
    scene.customRenderTargets.push(mirror);
    aa.update({ settled: true, rainActive: false });
    let applications = 0;
    let mirrorFrames = 0;
    posts().find(post => post.name === 'TAA')!.onApplyObservable.add(() => { applications++; });
    mirror.onAfterUnbindObservable.add(() => {
      mirrorFrames++;
      expect(applications).toBe(0);
      expect(pipeline?.factor).toBe(1);
    });
    await new Promise(resolve => setTimeout(resolve, 0));
    scene.render();
    expect(mirrorFrames).toBe(1);
    expect(applications).toBe(1);
    expect(pipeline?.factor).toBe(0.1);
  });

  it('removes owned effects and the pipeline once, preserving the caller display transform', async () => {
    const { aa, scene, posts, display, pipeline } = await fixture();
    const disposePipeline = vi.spyOn(pipeline!, 'dispose');
    aa.update({ settled: true, rainActive: false });
    aa.dispose();
    aa.dispose();
    aa.update({ settled: true, rainActive: false });
    aa.reset();
    expect(aa.getMode()).toBe('off');
    expect(posts()).toEqual([display]);
    expect(scene.postProcessRenderPipelineManager.supportedPipelines).toHaveLength(0);
    scene.dispose();
    expect(disposePipeline).toHaveBeenCalledTimes(1);
  });

  it('supports an AA-off comparison while preserving the same display transform', async () => {
    const { aa, posts, display, pipeline } = await fixture({}, true);
    aa.update({ settled: true, rainActive: false });
    aa.reset();
    aa.dispose();
    expect(aa.getMode()).toBe('off');
    expect(posts()).toEqual([display]);
    expect(pipeline).toBeUndefined();
  });

  it('retires the controller when the scene itself is disposed', async () => {
    const { aa, scene, pipeline } = await fixture();
    const disposePipeline = vi.spyOn(pipeline!, 'dispose');
    scene.dispose();
    aa.dispose();
    expect(aa.getMode()).toBe('off');
    expect(disposePipeline).toHaveBeenCalledTimes(1);
  });

  it('rejects shader initialization after scene disposal before allocating AA resources', async () => {
    const engine = new NullEngine();
    const scene = new Scene(engine);
    const camera = new FreeCamera('cancelled camera', Vector3.Zero(), scene);
    const display = new ImageProcessingPostProcess('single display transform', 1, camera);
    cleanup.push(() => { scene.dispose(); engine.dispose(); });
    const pending = createSceneAntialiasing(scene, camera, display);
    scene.dispose();
    await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
    expect(scene.postProcessRenderPipelineManager.supportedPipelines).toHaveLength(0);
  });
});
