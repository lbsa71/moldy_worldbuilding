import { afterEach, describe, expect, it, vi } from "vitest";
import { NullEngine } from "@babylonjs/core/Engines/nullEngine";
import { Scene } from "@babylonjs/core/scene";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { CreateSphere } from "@babylonjs/core/Meshes/Builders/sphereBuilder";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import type { GlowLayer } from "@babylonjs/core/Layers/glowLayer";
import type { PointLight } from "@babylonjs/core/Lights/pointLight";
import type { Node } from "@babylonjs/core/node";
import type { HeroAssetInstance, HeroAssetLibrary } from "./HeroAssetLibrary";
import { Lamp } from "./Lamp";
import { palette } from "./VisualStyle";

const cleanups: Array<() => void> = [];
afterEach(() => { cleanups.splice(0).forEach(dispose => dispose()); vi.restoreAllMocks(); });
function world() {
  const engine = new NullEngine();
  const scene = new Scene(engine);
  cleanups.push(() => { scene.dispose(); engine.dispose(); });
  return scene;
}
function importedLamp(scene: Scene, includeSocket = true) {
  const root = new TransformNode("bedsideLamp", scene);
  root.setEnabled(false);
  const semantic = new TransformNode("Fading_Lamp", scene);
  semantic.parent = root;
  const socket = new TransformNode("lampWarmthSocket", scene);
  socket.position.y = 1.15; socket.parent = semantic;
  const filament = CreateSphere("lampFilament", { diameter: 0.1 }, scene);
  const shade = CreateSphere("lampShade", { diameter: 0.3 }, scene);
  filament.parent = semantic; shade.parent = semantic;
  filament.material = new StandardMaterial("filament", scene);
  shade.material = new StandardMaterial("shade", scene);
  const nodes = new Map<string, Node>([
    [semantic.name, semantic], [filament.name, filament], [shade.name, shade],
  ]);
  if (includeSocket) nodes.set(socket.name, socket);
  const instance: HeroAssetInstance = {
    root, meshes: [filament, shade], materials: [filament.material, shade.material], nodes,
    findNode: name => nodes.get(name),
    dispose: vi.fn(() => root.dispose(false, true)),
  };
  return { instance, socket, filament, shade };
}
function pendingLibrary() {
  let finish!: (instance: HeroAssetInstance | null) => void;
  const instantiate = vi.fn(() => new Promise<HeroAssetInstance | null>(resolve => { finish = resolve; }));
  return { library: { instantiate } as unknown as HeroAssetLibrary, finish: (instance: HeroAssetInstance | null) => finish(instance), instantiate };
}

describe("optional lamp hero upgrade", () => {
  it("keeps its persistent placement and applies the latest ending state after delayed loading", async () => {
    const scene = world();
    const pending = pendingLibrary();
    const glow = { addIncludedOnlyMesh: vi.fn(), removeIncludedOnlyMesh: vi.fn() };
    const lamp = new Lamp(scene, new Vector3(2, 0, 1), Vector3.Zero(), glow as unknown as GlowLayer, pending.library);
    const persistent = scene.getTransformNodeByName("persistentLamp")!;
    const light = scene.getLightByName("lampWarmth") as PointLight;
    const imported = importedLamp(scene);
    lamp.setReducedMotion(true);
    lamp.setVisibility(0.4);
    lamp.setIntensity(0.3);
    lamp.updatePosition(new Vector3(4, 0, -2));
    pending.finish(imported.instance);
    await vi.waitFor(() => expect(imported.instance.root.isEnabled()).toBe(true));
    expect(pending.instantiate).toHaveBeenCalledWith("lamp", "bedsideLamp");
    expect(scene.getTransformNodeByName("persistentLamp")).toBe(persistent);
    expect(persistent.position.asArray()).toEqual([4, 0, -2]);
    expect(imported.instance.root.parent).toBe(persistent);
    expect(light.parent).toBe(imported.socket);
    expect(light.position.asArray()).toEqual([0, 0, 0]);
    expect(light.intensity).toBe(0.3);
    expect(imported.instance.meshes.every(mesh => mesh.visibility === 0.4)).toBe(true);
    expect((imported.shade.material as StandardMaterial).emissiveColor.r).toBeCloseTo(palette.brass.r * 0.3 * 0.325);
    expect(scene.getTransformNodeByName("proceduralLamp")).toBeNull();
    expect(glow.addIncludedOnlyMesh).toHaveBeenCalledWith(imported.shade);
    lamp.dispose(); lamp.dispose();
    expect(imported.instance.dispose).toHaveBeenCalledOnce();
    expect(light.isDisposed()).toBe(true);
  });

  it("disposes a late imported result after the lamp has already been retired", async () => {
    const scene = world();
    const pending = pendingLibrary();
    const lamp = new Lamp(scene, Vector3.Zero(), Vector3.Zero(), undefined, pending.library);
    const imported = importedLamp(scene);
    lamp.dispose();
    pending.finish(imported.instance);
    await vi.waitFor(() => expect(imported.instance.dispose).toHaveBeenCalledOnce());
    expect(imported.instance.root.isDisposed()).toBe(true);
    expect(scene.getTransformNodeByName("persistentLamp")).toBeNull();
    expect(scene.lights).toHaveLength(0);
  });

  it("retains the procedural light if the imported semantic socket is missing", async () => {
    const scene = world();
    const pending = pendingLibrary();
    const lamp = new Lamp(scene, Vector3.Zero(), Vector3.Zero(), undefined, pending.library);
    const originalParent = scene.getLightByName("lampWarmth")!.parent;
    const imported = importedLamp(scene, false);
    pending.finish(imported.instance);
    await vi.waitFor(() => expect(imported.instance.dispose).toHaveBeenCalledOnce());
    expect(scene.getTransformNodeByName("proceduralLamp")).not.toBeNull();
    expect(scene.getLightByName("lampWarmth")!.parent).toBe(originalParent);
    lamp.dispose();
  });
});
