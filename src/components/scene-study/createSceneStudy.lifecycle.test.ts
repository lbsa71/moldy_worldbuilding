import { afterEach, describe, expect, it, vi } from 'vitest';

const fixture = vi.hoisted(() => ({
  gpu: [] as Array<{ ready: boolean; _context?: unknown; dispose: ReturnType<typeof vi.fn>; _device?: { destroy: ReturnType<typeof vi.fn> } }>,
  gl: [] as Array<{ canvas: HTMLCanvasElement; dispose: ReturnType<typeof vi.fn> }>,
  init: () => Promise.resolve(),
  baseDispose: vi.fn(), commonDispose: vi.fn(), load: vi.fn(),
}));
vi.mock('@babylonjs/core/Engines/abstractEngine', () => ({ AbstractEngine: class {
  dispose() { fixture.baseDispose(this); }
} }));
vi.mock('@babylonjs/core/Engines/engine.common', () => ({ _CommonDispose: fixture.commonDispose }));
vi.mock('@babylonjs/core/Engines/engine', () => ({ Engine: class {
  dispose = vi.fn();
  onContextLostObservable = { add: vi.fn() };
  constructor(public canvas: HTMLCanvasElement) { fixture.gl.push(this); }
  stopRenderLoop() {}
  runRenderLoop() {}
  setHardwareScalingLevel() {}
  resize() {}
} }));
vi.mock('@babylonjs/core/Engines/webgpuEngine', () => ({ WebGPUEngine: class {
  static IsSupportedAsync = Promise.resolve(true);
  ready = false;
  _device = { destroy: vi.fn() };
  dispose = vi.fn(() => {
    if (!this.ready) throw new Error('Babylon managers not initialized');
  });
  constructor() { fixture.gpu.push(this); }
  async initAsync() { await fixture.init(); this.ready = true; }
} }));
vi.mock('@babylonjs/core/scene', () => ({ Scene: class {
  dispose = vi.fn(); meshes = []; textures = [];
} }));
vi.mock('./SceneStudyAssets', () => ({ loadStudyAssets: fixture.load }));
vi.mock('./SceneStudyCamera', () => ({ selectStudyCamera: () => ({ name: 'camera' }) }));
vi.mock('./SceneStudySurfaces', () => ({ createStudySurfaces: async () => ({
  warnings: [], applyRenderLists: vi.fn(), mirror: {}, shadows: { getShadowMap: () => ({}) },
}) }));
vi.mock('./SceneStudyObjects', () => ({ SceneStudyObjects: class { dispose() {} } }));
import { createSceneStudy } from './createSceneStudy';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
  fixture.gpu.length = fixture.gl.length = 0;
  fixture.init = () => Promise.resolve();
});
function environment() {
  vi.stubGlobal('navigator', { gpu: {} });
  vi.stubGlobal('window', { devicePixelRatio: 1, addEventListener: vi.fn(), removeEventListener: vi.fn() });
  vi.stubGlobal('document', { hidden: true, addEventListener: vi.fn(), removeEventListener: vi.fn() });
  vi.stubGlobal('ResizeObserver', undefined);
  fixture.load.mockResolvedValue({ chair: {}, cup: {}, meshes: [], manifest: {}, warnings: [], mode: 'provisional', message: 'fallback' });
  return {} as HTMLCanvasElement;
}

describe('scene study WebGPU startup ownership', () => {
  it('replaces a canvas bound to WebGPU before late-failure WebGL fallback and observes the replacement', async () => {
    environment();
    const replacement = { id: 'study-canvas', width: 900, height: 600 } as HTMLCanvasElement;
    const canvas = {
      cloneNode: vi.fn(() => replacement), replaceWith: vi.fn(),
    } as unknown as HTMLCanvasElement;
    const observer = { observe: vi.fn(), disconnect: vi.fn() };
    vi.stubGlobal('ResizeObserver', class {
      observe = observer.observe; disconnect = observer.disconnect;
    });
    fixture.init = () => {
      fixture.gpu[0]._context = {};
      return Promise.reject(new Error('swapchain configuration failed'));
    };
    const onCanvasReplaced = vi.fn();
    const controller = await createSceneStudy(canvas, { onCanvasReplaced });
    expect(canvas.cloneNode).toHaveBeenCalledWith(false);
    expect(canvas.replaceWith).toHaveBeenCalledWith(replacement);
    expect(onCanvasReplaced).toHaveBeenCalledWith(replacement);
    expect(fixture.gl[0].canvas).toBe(replacement);
    expect(observer.observe).toHaveBeenCalledWith(replacement);
    controller.dispose();
    expect(observer.disconnect).toHaveBeenCalledOnce();
    expect(fixture.gl[0].dispose).toHaveBeenCalledOnce();
  });

  it('falls back to WebGL after an early initialization failure without calling the unsafe GPU disposer', async () => {
    const canvas = environment();
    fixture.init = () => Promise.reject(new Error('requestDevice failed'));
    const controller = await createSceneStudy(canvas);
    expect(fixture.gpu[0].dispose).not.toHaveBeenCalled();
    expect(fixture.gpu[0]._device?.destroy).toHaveBeenCalledOnce();
    expect(fixture.commonDispose).toHaveBeenCalledWith(fixture.gpu[0], canvas);
    expect(fixture.baseDispose).toHaveBeenCalledWith(fixture.gpu[0]);
    expect(fixture.gl).toHaveLength(1);
    expect(fixture.load).toHaveBeenCalledOnce();
    controller.dispose();
    expect(fixture.gl[0].dispose).toHaveBeenCalledOnce();
  });

  it('waits for pending initialization after abort, then disposes the completed GPU engine without fallback or asset loads', async () => {
    const canvas = environment();
    let finish!: () => void;
    fixture.init = () => new Promise(resolve => { finish = resolve; });
    const abort = new AbortController();
    const loading = createSceneStudy(canvas, { signal: abort.signal });
    const rejection = expect(loading).rejects.toMatchObject({ name: 'AbortError' });
    await vi.waitFor(() => expect(fixture.gpu).toHaveLength(1));
    expect(() => abort.abort()).not.toThrow();
    expect(fixture.gpu[0].dispose).not.toHaveBeenCalled();
    finish();
    await rejection;
    expect(fixture.gpu[0].dispose).toHaveBeenCalledOnce();
    expect(fixture.gl).toHaveLength(0);
    expect(fixture.load).not.toHaveBeenCalled();
  });

  it('cleans up a failed late initialization after abort and does not start a fallback', async () => {
    const canvas = environment();
    let fail!: (error: Error) => void;
    fixture.init = () => new Promise((_, reject) => { fail = reject; });
    const abort = new AbortController();
    const loading = createSceneStudy(canvas, { signal: abort.signal });
    const rejection = expect(loading).rejects.toMatchObject({ name: 'AbortError' });
    await vi.waitFor(() => expect(fixture.gpu).toHaveLength(1));
    abort.abort();
    fail(new Error('device request failed late'));
    await rejection;
    expect(fixture.baseDispose).toHaveBeenCalledWith(fixture.gpu[0]);
    expect(fixture.gpu[0]._device?.destroy).toHaveBeenCalledOnce();
    expect(fixture.gpu[0].dispose).not.toHaveBeenCalled();
    expect(fixture.gl).toHaveLength(0);
    expect(fixture.load).not.toHaveBeenCalled();
  });
});
