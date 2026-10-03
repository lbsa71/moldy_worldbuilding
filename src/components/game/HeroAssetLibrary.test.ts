import { afterEach, describe, expect, it, vi } from "vitest";
import { NullEngine } from "@babylonjs/core/Engines/nullEngine";
import { Scene } from "@babylonjs/core/scene";
import { AssetContainer } from "@babylonjs/core/assetContainer";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { CreateBox } from "@babylonjs/core/Meshes/Builders/boxBuilder";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { MultiMaterial } from "@babylonjs/core/Materials/multiMaterial";
import { Quaternion } from "@babylonjs/core/Maths/math.vector";
import { HeroAssetLibrary } from "./HeroAssetLibrary";
import type { HeroAssetName } from "./HeroAssetLibrary";

const cleanups: Array<() => void> = [];
afterEach(() => { cleanups.splice(0).forEach(dispose => dispose()); vi.restoreAllMocks(); });

function world() {
  const engine = new NullEngine();
  const scene = new Scene(engine);
  cleanups.push(() => { scene.dispose(); engine.dispose(); });
  return scene;
}
function template(scene: Scene, asset: HeroAssetName = "lamp", useMulti = false) {
  const container = new AssetContainer(scene);
  const conversion = new Mesh("__root__", scene);
  conversion.rotationQuaternion = new Quaternion(0, 1, 0, 0);
  conversion.scaling.z = -1;
  const semantic = new TransformNode(`Fading_${asset[0].toUpperCase()}${asset.slice(1)}`, scene);
  semantic.parent = conversion;
  const mesh = CreateBox("lampShade", { size: 1 }, scene);
  mesh.parent = semantic;
  const surface = new StandardMaterial("brass", scene);
  if (useMulti) {
    const multi = new MultiMaterial("composite", scene);
    multi.subMaterials = [surface, null];
    mesh.material = multi;
    container.multiMaterials = [multi];
  } else mesh.material = surface;
  container.meshes = [conversion, mesh];
  container.transformNodes = [semantic];
  container.materials = [surface];
  container.geometries = [mesh.geometry!];
  container.removeAllFromScene();
  return { container, conversion, semantic, surface, mesh };
}

describe("scene-owned hero assets", () => {
  it("shares one load while returning independent disabled clones and semantic lookup", async () => {
    const scene = world();
    const original = template(scene);
    const loadContainer = vi.fn().mockResolvedValue(original.container);
    const registerLoader = vi.fn().mockResolvedValue(undefined);
    const library = new HeroAssetLibrary(scene, { loadContainer, registerLoader });
    const [first, second] = await Promise.all([library.instantiate("lamp"), library.instantiate("lamp")]);
    expect(loadContainer).toHaveBeenCalledOnce();
    expect(loadContainer).toHaveBeenCalledWith("lamp", scene);
    expect(registerLoader).toHaveBeenCalledOnce();
    expect(first).not.toBeNull(); expect(second).not.toBeNull();
    expect(first!.root.isEnabled()).toBe(false);
    expect(first!.findNode("Fading_Lamp")).toBeTruthy();
    expect(first!.findNode("lampShade")).not.toBe(original.mesh);
    const convertedRoot = first!.findNode("__root__") as Mesh;
    expect(convertedRoot.parent).toBe(first!.root);
    expect(convertedRoot.scaling.z).toBe(-1);
    expect(convertedRoot.rotationQuaternion?.asArray()).toEqual([0, 1, 0, 0]);
    const firstMaterial = first!.materials[0] as StandardMaterial;
    const secondMaterial = second!.materials[0] as StandardMaterial;
    firstMaterial.emissiveColor.r = 0.9;
    expect(secondMaterial.emissiveColor.r).toBe(0);
    expect(original.surface.emissiveColor.r).toBe(0);
    first!.dispose(); first!.dispose();
    expect(first!.root.isDisposed()).toBe(true);
    expect(second!.root.isDisposed()).toBe(false);
    expect(original.mesh.isDisposed()).toBe(false);
    library.dispose();
    expect(second!.root.isDisposed()).toBe(true);
    expect(original.mesh.isDisposed()).toBe(true);
  });

  it("isolates MultiMaterial children without changing the cached source", async () => {
    const scene = world();
    const original = template(scene, "lamp", true);
    const library = new HeroAssetLibrary(scene, { registerLoader: async () => {}, loadContainer: async () => original.container });
    const first = await library.instantiate("lamp");
    const second = await library.instantiate("lamp");
    const sourceMulti = original.mesh.material as MultiMaterial;
    const firstMulti = first!.meshes.find(mesh => mesh.name.endsWith("lampShade"))!.material as MultiMaterial;
    const secondMulti = second!.meshes.find(mesh => mesh.name.endsWith("lampShade"))!.material as MultiMaterial;
    expect(sourceMulti.subMaterials[0]).toBe(original.surface);
    (firstMulti.subMaterials[0] as StandardMaterial).emissiveColor.g = 0.8;
    expect((secondMulti.subMaterials[0] as StandardMaterial).emissiveColor.g).toBe(0);
    expect(original.surface.emissiveColor.g).toBe(0);
    library.dispose();
  });

  it("returns null and reports only once for a failed cached load", async () => {
    const scene = world();
    const onError = vi.fn();
    const loadContainer = vi.fn().mockRejectedValue(new Error("missing asset"));
    const library = new HeroAssetLibrary(scene, { registerLoader: async () => {}, loadContainer, onError });
    await expect(library.instantiate("cup")).resolves.toBeNull();
    await expect(library.instantiate("cup")).resolves.toBeNull();
    expect(loadContainer).toHaveBeenCalledOnce();
    expect(onError).toHaveBeenCalledOnce();
    library.dispose();
  });

  it("rejects an asset with missing semantic root while preserving fallback ownership", async () => {
    const scene = world();
    const wrong = template(scene, "chair");
    const onError = vi.fn();
    const library = new HeroAssetLibrary(scene, { registerLoader: async () => {}, loadContainer: async () => wrong.container, onError });
    await expect(library.instantiate("lamp")).resolves.toBeNull();
    expect(onError).toHaveBeenCalledWith("lamp", expect.objectContaining({ message: "Missing semantic root 'Fading_Lamp'." }));
    expect(wrong.mesh.isDisposed()).toBe(true);
    expect(scene.transformNodes).toHaveLength(0);
    library.dispose();
  });

  it("disposes a load that completes after the library has closed", async () => {
    const scene = world();
    const delayed = template(scene, "bedside");
    let complete!: (container: AssetContainer) => void;
    const loadContainer = vi.fn(() => new Promise<AssetContainer>(resolve => { complete = resolve; }));
    const onError = vi.fn();
    const library = new HeroAssetLibrary(scene, { registerLoader: async () => {}, loadContainer, onError });
    const pending = library.instantiate("bedside");
    await vi.waitFor(() => expect(loadContainer).toHaveBeenCalledOnce());
    library.dispose();
    complete(delayed.container);
    await expect(pending).resolves.toBeNull();
    expect(delayed.mesh.isDisposed()).toBe(true);
    expect(onError).not.toHaveBeenCalled();
    await expect(library.instantiate("bedside")).resolves.toBeNull();
  });

  it("contains registration failures and follows scene disposal automatically", async () => {
    const scene = world();
    const onError = vi.fn();
    const failed = new HeroAssetLibrary(scene, { registerLoader: async () => { throw new Error("plugin blocked"); }, onError });
    await expect(failed.instantiate("chair")).resolves.toBeNull();
    expect(onError).toHaveBeenCalledOnce();
    const source = template(scene, "chair");
    const library = new HeroAssetLibrary(scene, { registerLoader: async () => {}, loadContainer: async () => source.container });
    const instance = await library.instantiate("chair");
    scene.dispose();
    expect(instance!.root.isDisposed()).toBe(true);
    await expect(library.instantiate("chair")).resolves.toBeNull();
  });

  it("cleans partial hierarchies when Babylon cloning throws midway", async () => {
    const scene = world();
    const source = template(scene);
    vi.spyOn(source.semantic, "clone").mockImplementation(() => { throw new Error("clone interrupted"); });
    const onError = vi.fn();
    const library = new HeroAssetLibrary(scene, { registerLoader: async () => {}, loadContainer: async () => source.container, onError });
    await expect(library.instantiate("lamp")).resolves.toBeNull();
    expect([...scene.meshes, ...scene.transformNodes].filter(node => node.name.startsWith("hero:"))).toHaveLength(0);
    expect(source.mesh.isDisposed()).toBe(false);
    expect(onError).toHaveBeenCalledOnce();
    library.dispose();
  });

  it("registers the actual minimal glTF2 loader without importing its barrel", async () => {
    const scene = world();
    const source = template(scene, "cup");
    const library = new HeroAssetLibrary(scene, { loadContainer: async () => source.container });
    const instance = await library.instantiate("cup");
    expect(instance?.findNode("Fading_Cup")).toBeTruthy();
    library.dispose();
  });
});
