import type { Scene } from "@babylonjs/core/scene";
import type { AssetContainer, InstantiatedEntries } from "@babylonjs/core/assetContainer";
import { SceneLoader } from "@babylonjs/core/Loading/sceneLoader";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import type { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";
import type { Material } from "@babylonjs/core/Materials/material";
import type { MultiMaterial } from "@babylonjs/core/Materials/multiMaterial";
import type { BaseTexture } from "@babylonjs/core/Materials/Textures/baseTexture";
import type { Node } from "@babylonjs/core/node";
import type { Observer } from "@babylonjs/core/Misc/observable";

export type HeroAssetName = "lamp" | "chair" | "cup" | "bedside";
export type HeroAssetInstance = {
  /** Disabled on return. Stage and apply current state, then call root.setEnabled(true). */
  root: TransformNode;
  meshes: AbstractMesh[];
  /** Private material clones: safe to change emission, alpha and color. */
  materials: Material[];
  nodes: ReadonlyMap<string, Node>;
  findNode: (originalName: string) => Node | undefined;
  dispose: () => void;
};

type LibraryOptions = {
  registerLoader?: () => Promise<unknown>;
  loadContainer?: (asset: HeroAssetName, scene: Scene) => Promise<AssetContainer>;
  onError?: (asset: HeroAssetName, error: unknown) => void;
};

const semanticRoots: Record<HeroAssetName, string> = {
  lamp: "Fading_Lamp", chair: "Fading_Chair", cup: "Fading_Cup", bedside: "Fading_Bedside",
};
let loaderRegistration: Promise<unknown> | undefined;
function registerGLTF2(): Promise<unknown> {
  // This registers both the file plugin and glTF2 implementation, without the loader barrel/glTF1.
  return loaderRegistration ??= import("@babylonjs/loaders/glTF/2.0/glTFLoader");
}

/** One scene owns its cached, off-scene templates and every independent hero hierarchy. */
export class HeroAssetLibrary {
  private readonly pending = new Map<HeroAssetName, Promise<AssetContainer | null>>();
  private readonly containers = new Set<AssetContainer>();
  private readonly instances = new Set<HeroAssetInstance>();
  private readonly reported = new Set<HeroAssetName>();
  private readonly sceneObserver: Observer<Scene> | null;
  private closed = false;
  private serial = 0;

  constructor(private scene: Scene, private options: LibraryOptions = {}) {
    this.sceneObserver = scene.onDisposeObservable.addOnce(() => this.dispose());
  }

  private report(asset: HeroAssetName, error: unknown): void {
    if (this.reported.has(asset) || this.closed || this.scene.isDisposed) return;
    this.reported.add(asset);
    try {
      if (this.options.onError) this.options.onError(asset, error);
      else console.warn(`Hero asset '${asset}' is unavailable; keeping the procedural version.`, error);
    } catch { /* An error reporter cannot reject an optional visual upgrade. */ }
  }

  private template(asset: HeroAssetName): Promise<AssetContainer | null> {
    const cached = this.pending.get(asset);
    if (cached) return cached;
    const loading = (async () => {
      let container: AssetContainer | undefined;
      try {
        await (this.options.registerLoader || registerGLTF2)();
        if (this.closed || this.scene.isDisposed) return null;
        container = await (this.options.loadContainer
          ? this.options.loadContainer(asset, this.scene)
          : SceneLoader.LoadAssetContainerAsync("/models/fading/", `${asset}_lod0.glb`, this.scene, undefined, ".glb"));
        if (this.closed || this.scene.isDisposed) { container.dispose(); return null; }
        // Search the full imported hierarchy, not just the glTF conversion root.
        if (![...container.transformNodes, ...container.meshes].some(node => node.name === semanticRoots[asset])) {
          throw new Error(`Missing semantic root '${semanticRoots[asset]}'.`);
        }
        this.containers.add(container);
        return container;
      } catch (error) {
        container?.dispose();
        this.report(asset, error);
        return null;
      }
    })();
    this.pending.set(asset, loading);
    return loading;
  }

  /** Never rejects: procedural fallbacks can remain while this optional upgrade loads. */
  public async instantiate(asset: HeroAssetName, instanceName?: string): Promise<HeroAssetInstance | null> {
    if (this.closed || this.scene.isDisposed) return null;
    let entries: InstantiatedEntries | undefined;
    let root: TransformNode | undefined;
    let prefix = "";
    const clonedMaterials = new Map<Material, Material>();
    const ownedTextures = new Set<BaseTexture>();
    try {
      const container = await this.template(asset);
      if (!container || this.closed || this.scene.isDisposed) return null;
      prefix = `hero:${asset}:${++this.serial}:`;
      root = new TransformNode(instanceName || `${prefix}placement`, this.scene);
      root.setEnabled(false);
      // Clone nodes; isolate materials explicitly, including MultiMaterial children.
      // Babylon 7's built-in MultiMaterial cloning mutates the source's children.
      entries = container.instantiateModelsToScene(name => `${prefix}${name}`, false, { doNotInstantiate: true });
      const sourceTextures = new Set<BaseTexture>(container.textures);
      for (const surface of [...container.materials, ...container.multiMaterials]) {
        surface.getActiveTextures().forEach(texture => sourceTextures.add(texture));
      }
      const cloneSurface = (source: Material): Material => {
        const existing = clonedMaterials.get(source);
        if (existing) return existing;
        const clone = source.clone(`${prefix}${source.name}`);
        if (!clone) throw new Error(`Could not isolate material '${source.name}'.`);
        clonedMaterials.set(source, clone);
        if (source.getClassName() === "MultiMaterial") {
          (clone as MultiMaterial).subMaterials = (source as MultiMaterial).subMaterials.map(child => child ? cloneSurface(child) : null);
        }
        clone.getActiveTextures().forEach(texture => {
          if (!sourceTextures.has(texture) && texture !== this.scene.environmentTexture) ownedTextures.add(texture);
        });
        return clone;
      };
      for (const importedRoot of entries.rootNodes) importedRoot.parent = root;
      const meshes = root.getChildMeshes(false);
      meshes.forEach(mesh => {
        mesh.isPickable = false;
        if (mesh.material) mesh.material = cloneSurface(mesh.material);
      });
      const nodes = new Map<string, Node>();
      root.getDescendants(false).forEach(node => {
        const originalName = node.name.startsWith(prefix) ? node.name.slice(prefix.length) : node.name;
        if (!nodes.has(originalName)) nodes.set(originalName, node);
      });
      const instanceRoot = root;
      const instanceEntries = entries;
      const materials = [...clonedMaterials.values()];
      let disposed = false;
      const instance: HeroAssetInstance = {
        root: instanceRoot, meshes, materials, nodes,
        findNode: name => nodes.get(name),
        dispose: () => {
          if (disposed) return;
          disposed = true;
          this.instances.delete(instance);
          instanceEntries.dispose();
          instanceRoot.dispose();
          materials.forEach(surface => surface.dispose(false, false));
          ownedTextures.forEach(texture => texture.dispose());
        },
      };
      this.instances.add(instance);
      return instance;
    } catch (error) {
      entries?.dispose();
      root?.dispose();
      // A clone implementation can throw midway before Babylon returns its entries.
      // Recover just this attempt's nodes; templates and other instances keep their ownership.
      if (prefix) {
        [...this.scene.transformNodes, ...this.scene.meshes]
          .filter(node => node.name.startsWith(prefix) && !node.isDisposed())
          .forEach(node => node.dispose());
      }
      clonedMaterials.forEach(surface => surface.dispose(false, false));
      ownedTextures.forEach(texture => texture.dispose());
      this.report(asset, error);
      return null;
    }
  }

  public dispose(): void {
    if (this.closed) return;
    this.closed = true;
    this.scene.onDisposeObservable.remove(this.sceneObserver);
    // Instances may reference template geometry; retire them before the containers.
    [...this.instances].forEach(instance => instance.dispose());
    this.containers.forEach(container => container.dispose());
    this.containers.clear();
    // Pending promises retain the closed guard and dispose any late result themselves.
    this.pending.clear();
  }
}
