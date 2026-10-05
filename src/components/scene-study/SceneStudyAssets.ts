import { SceneLoader } from '@babylonjs/core/Loading/sceneLoader';
import type { AssetContainer } from '@babylonjs/core/assetContainer';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import type { AbstractMesh } from '@babylonjs/core/Meshes/abstractMesh';
import type { Camera } from '@babylonjs/core/Cameras/camera';
import { PBRMaterial } from '@babylonjs/core/Materials/PBR/pbrMaterial';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import type { Scene } from '@babylonjs/core/scene';
import type { StudyCameraHint } from './SceneStudyCamera';

export type StudyManifest = {
  camera?: StudyCameraHint;
  lampLight?: { position?: number[]; intensity?: number; color?: number[]; range?: number };
  environment?: { url?: string; intensity?: number; fog_color?: number[]; fog_density_suggestion?: number };
  water?: { roughness_suggestion?: number; IOR?: number };
};
export type StudyAssets = {
  mode: 'production' | 'provisional';
  message: string;
  warnings: string[];
  chair: TransformNode;
  cup: TransformNode;
  lamp: TransformNode;
  lampLight?: TransformNode;
  camera?: Camera;
  meshes: AbstractMesh[];
  manifest: StudyManifest;
};

let registerLoader: Promise<unknown> | undefined;
function requireRoot(container: AssetContainer, name: string): TransformNode {
  const node = [...container.transformNodes, ...container.meshes].find(node => node.name === name);
  if (!node) throw new Error(`The GLB is missing '${name}'.`);
  return node;
}

function ensureActive(scene: Scene, signal?: AbortSignal): void {
  if (signal?.aborted || scene.isDisposed) throw new DOMException('Scene study initialization was cancelled.', 'AbortError');
}

async function importContainer(scene: Scene, root: string, file: string, signal?: AbortSignal): Promise<AssetContainer> {
  ensureActive(scene, signal);
  const container = await SceneLoader.LoadAssetContainerAsync(root, file, scene, undefined, '.glb');
  if (signal?.aborted || scene.isDisposed) { container.dispose(); ensureActive(scene, signal); }
  return container;
}

export async function loadStudyAssets(scene: Scene, onStatus: (message: string) => void, signal?: AbortSignal): Promise<StudyAssets> {
  await (registerLoader ??= import('@babylonjs/loaders/glTF/2.0/glTFLoader'));
  ensureActive(scene, signal);
  let manifest: StudyManifest = {};
  const warnings: string[] = [];
  try {
    const response = await fetch('/scene-study/manifest.json', { signal });
    if (response.ok) manifest = await response.json() as StudyManifest;
    else warnings.push('Production manifest is unavailable; the exported camera will be used when present.');
  } catch (error) {
    ensureActive(scene, signal);
    warnings.push(`Production manifest could not load: ${error instanceof Error ? error.message : String(error)}`);
  }
  let production: AssetContainer | undefined;
  try {
    onStatus('Loading the production living scene…');
    production = await importContainer(scene, '/scene-study/', 'living-scene.glb', signal);
    const chair = requireRoot(production, 'Fading_StudyChair');
    const cup = requireRoot(production, 'Fading_StudyCup');
    const lamp = requireRoot(production, 'Fading_StudyLamp');
    const lampLight = requireRoot(production, 'Fading_StudyLampLight');
    requireRoot(production, 'Fading_StudyShore');
    for (const name of ['Fading_StudyBackdrop', 'Fading_StudyCurtain']) {
      if (![...production.transformNodes, ...production.meshes].some(node => node.name === name)) {
        warnings.push(`Optional '${name}' is absent from this delivery.`);
      }
    }
    // glTF separates a camera's data name from its transform-node name. Blender
    // can export data called "Camera" beneath the authored Fading_StudyCamera node.
    const cameraRoot = production.transformNodes.find(node => node.name === 'Fading_StudyCamera');
    const camera = production.cameras.find(camera => camera.name === 'Fading_StudyCamera'
      || (cameraRoot && camera.isDescendantOf(cameraRoot)));
    if (!camera) warnings.push('Production scene has no Fading_StudyCamera; provisional framing is in use.');
    production.addAllToScene();
    production.animationGroups.forEach(group => group.stop());
    return { mode: 'production', message: 'Production living-scene assets loaded. Visual acceptance remains pending.', chair, cup, lamp, lampLight, camera, meshes: production.meshes, manifest, warnings };
  } catch (error) {
    production?.dispose();
    ensureActive(scene, signal);
    warnings.push(`Production scene unavailable: ${error instanceof Error ? error.message : String(error)}`);
  }

  onStatus('Production scene unavailable. Loading provisional bedside studies…');
  const roots = new Map<string, TransformNode>();
  const meshes: AbstractMesh[] = [];
  // Existing studies exercise the live interactions. They are never presented as fidelity proof.
  for (const [asset, rootName, position] of [
    ['lamp', 'Fading_Lamp', [1.35, 0.12, 0]],
    ['chair', 'Fading_Chair', [1.95, 0.12, 0]],
    ['cup', 'Fading_Cup', [1.8, 0.59, 0.13]],
    ['bedside', 'Fading_Bedside', [2.7, 0.12, -0.7]],
  ] as const) {
    const container = await importContainer(scene, '/models/fading/', `${asset}_lod0.glb`, signal);
    try {
      const root = requireRoot(container, rootName);
      root.position.set(position[0], position[1], position[2]);
      container.addAllToScene();
      roots.set(asset, root);
      meshes.push(...container.meshes);
    } catch (error) { container.dispose(); throw error; }
  }
  const stone = new PBRMaterial('provisional wet stone', scene);
  stone.albedoColor = new Color3(0.055, 0.068, 0.075);
  stone.metallic = 0;
  stone.roughness = 0.42;
  const shore = MeshBuilder.CreateCylinder('provisional shoreline — production asset missing', { diameter: 4.8, height: 0.16, tessellation: 48 }, scene);
  shore.position.set(2.2, 0.01, -0.5);
  shore.scaling.z = 0.58;
  shore.material = stone;
  meshes.push(shore);
  return {
    mode: 'provisional', message: 'PROVISIONAL: existing low-detail bedside studies. Production living-scene.glb is unavailable; this view demonstrates rendering and interaction only.',
    chair: roots.get('chair')!, cup: roots.get('cup')!, lamp: roots.get('lamp')!, meshes, manifest: { environment: manifest.environment }, warnings,
  };
}
