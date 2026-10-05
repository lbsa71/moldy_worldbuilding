import { afterEach, describe, expect, it, vi } from 'vitest';
import { NullEngine } from '@babylonjs/core/Engines/nullEngine';
import { Scene } from '@babylonjs/core/scene';
import { AssetContainer } from '@babylonjs/core/assetContainer';
import { SceneLoader } from '@babylonjs/core/Loading/sceneLoader';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { FreeCamera } from '@babylonjs/core/Cameras/freeCamera';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { loadStudyAssets } from './SceneStudyAssets';

const cleanups: (() => void)[] = [];
afterEach(() => {
  cleanups.splice(0).forEach(cleanup => cleanup());
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function fixture() {
  const engine = new NullEngine();
  const scene = new Scene(engine);
  cleanups.push(() => { scene.dispose(); engine.dispose(); });
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) }));
  return scene;
}

describe('scene study asynchronous asset ownership', () => {
  it('selects Blender camera data through its named transform without losing the authored hierarchy', async () => {
    const scene = fixture();
    const container = new AssetContainer(scene);
    container.transformNodes = ['Lamp', 'Chair', 'Cup', 'Shore', 'LampLight', 'Camera']
      .map(name => new TransformNode(`Fading_Study${name}`, scene));
    const cameraRoot = container.transformNodes.find(node => node.name === 'Fading_StudyCamera')!;
    cameraRoot.position.set(0, 2.3, 8.2);
    const camera = new FreeCamera('Camera', Vector3.Zero(), scene);
    camera.parent = cameraRoot;
    camera.fov = 0.42963;
    container.cameras = [camera];
    container.removeAllFromScene();
    vi.spyOn(SceneLoader, 'LoadAssetContainerAsync').mockResolvedValue(container);
    const loaded = await loadStudyAssets(scene, () => {});
    expect(loaded.camera).toBe(camera);
    expect(loaded.camera?.parent).toBe(cameraRoot);
    expect(loaded.camera?.fov).toBe(0.42963);
    expect(loaded.warnings.some(warning => warning.includes('provisional framing'))).toBe(false);
  });

  it('disposes a production container that arrives after cancellation without exposing it or starting a fallback', async () => {
    const scene = fixture();
    const late = new AssetContainer(scene);
    const dispose = vi.spyOn(late, 'dispose');
    let deliver!: (container: AssetContainer) => void;
    const loader = vi.spyOn(SceneLoader, 'LoadAssetContainerAsync').mockImplementation(() => new Promise(resolve => { deliver = resolve; }));
    const controller = new AbortController();
    const loading = loadStudyAssets(scene, () => {}, controller.signal);
    const rejected = expect(loading).rejects.toMatchObject({ name: 'AbortError' });
    await vi.waitFor(() => expect(loader).toHaveBeenCalledOnce());
    controller.abort();
    deliver(late);
    await rejected;
    expect(dispose).toHaveBeenCalledOnce();
    expect(loader).toHaveBeenCalledOnce();
  });

  it('retires an incomplete production hierarchy before beginning the explicitly provisional fallback', async () => {
    const scene = fixture();
    const incomplete = new AssetContainer(scene);
    const chair = new TransformNode('Fading_StudyChair', scene);
    incomplete.transformNodes = [chair];
    incomplete.removeAllFromScene();
    const dispose = vi.spyOn(incomplete, 'dispose');
    const status = vi.fn();
    const loader = vi.spyOn(SceneLoader, 'LoadAssetContainerAsync')
      .mockResolvedValueOnce(incomplete)
      .mockRejectedValueOnce(new Error('No provisional asset either'));
    await expect(loadStudyAssets(scene, status)).rejects.toThrow('No provisional asset either');
    expect(dispose).toHaveBeenCalledOnce();
    expect(chair.isDisposed()).toBe(true);
    expect(scene.getTransformNodeByName('Fading_StudyChair')).toBeNull();
    expect(status).toHaveBeenCalledWith('Production scene unavailable. Loading provisional bedside studies…');
    expect(loader).toHaveBeenNthCalledWith(2, '/models/fading/', 'lamp_lod0.glb', scene, undefined, '.glb');
  });
});
