import { afterEach, describe, expect, it, vi } from "vitest";
import { NullEngine } from "@babylonjs/core/Engines/nullEngine";
import { Scene } from "@babylonjs/core/scene";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { CreateBox } from "@babylonjs/core/Meshes/Builders/boxBuilder";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import type { Node } from "@babylonjs/core/node";
import type { HeroAssetInstance } from "./HeroAssetLibrary";
import { FadingSymbol } from "./VisualStyle";
import { ImportedMemorySymbol } from "./ImportedMemorySymbol";

const engines: NullEngine[] = [];
function world() { const engine = new NullEngine(); engines.push(engine); return new Scene(engine); }
afterEach(() => { engines.splice(0).forEach(engine => engine.dispose()); });
function pending() {
  let resolve!: (value: HeroAssetInstance | null) => void;
  const promise = new Promise<HeroAssetInstance | null>(done => { resolve = done; });
  return { promise, resolve };
}
function asset(scene: Scene, names: string[]): HeroAssetInstance {
  const root = new TransformNode("assetRoot", scene); root.setEnabled(false);
  const surface = new StandardMaterial("assetMaterial", scene);
  const meshes = names.map(name => {
    const mesh = CreateBox(name, {}, scene); mesh.parent = root; mesh.material = surface; return mesh;
  });
  const nodes = new Map<string, Node>(meshes.map(mesh => [mesh.name, mesh]));
  const dispose = vi.fn(() => { root.dispose(); surface.dispose(); });
  return { root, meshes, materials: [surface], nodes, findNode: name => nodes.get(name), dispose };
}

describe("imported memory continuity", () => {
  it("preserves the latest position, fade, turn and reduced motion at delayed resolution", async () => {
    const scene = world(), wait = pending();
    const fallback = new FadingSymbol(scene, "fallback", Vector3.Zero());
    const fallbackDispose = vi.spyOn(fallback, "dispose");
    const symbol = new ImportedMemorySymbol(scene, "chair", Vector3.Zero(), Vector3.Zero(), { instantiate: () => wait.promise }, fallback);
    symbol.updatePosition(new Vector3(3, 0.2, 4)); symbol.setRotationY(1.2);
    symbol.setVisibility(0.6); symbol.setReducedMotion(true);
    const loaded = asset(scene, ["chairSeat"]); wait.resolve(loaded); await symbol.ready;
    loaded.meshes[0].computeWorldMatrix(true);
    expect(loaded.root.isEnabled()).toBe(true);
    const point = loaded.meshes[0].getAbsolutePosition();
    expect(point.x).toBeCloseTo(3); expect(point.y).toBeCloseTo(0.2); expect(point.z).toBeCloseTo(4);
    expect((loaded.root.parent as TransformNode).rotation.y).toBe(0);
    expect((loaded.root.parent!.parent as TransformNode).rotation.y).toBeCloseTo(1.2);
    expect(loaded.meshes[0].visibility).toBeCloseTo(0.6);
    expect(loaded.meshes[0].isPickable).toBe(false);
    expect(fallbackDispose).toHaveBeenCalledTimes(1);
    symbol.dispose(); symbol.dispose(); expect(loaded.dispose).toHaveBeenCalledTimes(1);
  });

  it("retains the scaled fallback when loading fails", async () => {
    const scene = world(); const fallback = new FadingSymbol(scene, "fallback", Vector3.Zero());
    const symbol = new ImportedMemorySymbol(scene, "chair", Vector3.Zero(), Vector3.Zero(), { instantiate: async () => null }, fallback);
    symbol.setReducedMotion(true); symbol.setVisibility(0.7); await symbol.ready;
    expect(scene.getTransformNodeByName("fallback")!.scaling.x).toBe(0.55);
    expect(scene.getTransformNodeByName("fallback")).not.toBeNull(); symbol.dispose();
    expect(scene.getTransformNodeByName("fallback")).toBeNull();
  });

  it("disposes late arrivals after the symbol retires without adding them", async () => {
    const scene = world(), wait = pending();
    const symbol = new ImportedMemorySymbol(scene, "chair", Vector3.Zero(), Vector3.Zero(), { instantiate: () => wait.promise }, new FadingSymbol(scene, "fallback", Vector3.Zero()));
    symbol.dispose(); const loaded = asset(scene, ["chairSeat"]); wait.resolve(loaded); await symbol.ready;
    expect(loaded.dispose).toHaveBeenCalledTimes(1);
    expect(scene.getMeshByName("chairSeat")).toBeNull();
  });

  it("shows rail and room fragments as independently fading subsets", async () => {
    const scene = world();
    for (const kind of ["rail", "hospital"] as const) {
      const loaded = asset(scene, ["bedRail", "bedRailLower", "railUpright.001", "curtainFrame", "partialCurtain"]);
      const symbol = new ImportedMemorySymbol(scene, kind, Vector3.Zero(), Vector3.Zero(), { instantiate: async () => loaded }, new FadingSymbol(scene, `${kind}Fallback`, Vector3.Zero()));
      symbol.setReducedMotion(true); symbol.setVisibility(0.8); await symbol.ready;
      expect(loaded.meshes[0].isEnabled()).toBe(kind === "rail");
      expect(loaded.meshes[4].isEnabled()).toBe(kind === "hospital");
      symbol.setVisibility(0);
      expect(loaded.meshes.every(mesh => !mesh.isEnabled())).toBe(true);
      symbol.dispose();
    }
  });

  it("places a native-scale cup on the retained table and frees every owned resource", async () => {
    const scene = world(), loaded = asset(scene, ["cupBody_LOD0", "cupHandle"]);
    const before = scene.onBeforeRenderObservable.observers.length;
    const symbol = new ImportedMemorySymbol(scene, "cup", Vector3.Zero(), Vector3.Zero(), { instantiate: async () => loaded }, new FadingSymbol(scene, "fallback", Vector3.Zero()));
    symbol.setReducedMotion(true); symbol.setVisibility(1); await symbol.ready;
    expect(loaded.root.position.y).toBeCloseTo(0.48);
    expect(loaded.root.scaling.asArray()).toEqual([1, 1, 1]);
    const top = scene.getMeshByName("cupTableTop")!;
    expect(top.position.y + top.getBoundingInfo().boundingBox.maximum.y).toBeCloseTo(0.48);
    symbol.dispose(); await new Promise(resolve => setTimeout(resolve, 0));
    expect(scene.meshes).toHaveLength(0);
    expect(scene.onBeforeRenderObservable.observers.length).toBe(before);
    expect(scene.materials.filter(surface => surface.name !== "default material")).toHaveLength(0);
  });

  it("corrects chair facing from its socket while preserving authored outer rotation", async () => {
    const scene = world(), loaded = asset(scene, ["chairSeat"]);
    const facing = new TransformNode("chairFacingSocket", scene); facing.parent = loaded.root; facing.position.z = -0.35;
    (loaded.nodes as Map<string, Node>).set("chairFacingSocket", facing);
    const symbol = new ImportedMemorySymbol(scene, "chair", Vector3.Zero(), Vector3.Zero(), { instantiate: async () => loaded }, new FadingSymbol(scene, "fallback", Vector3.Zero()));
    symbol.setReducedMotion(true); symbol.setRotationY(1.2); symbol.setVisibility(1); await symbol.ready;
    facing.computeWorldMatrix(true);
    expect(facing.getAbsolutePosition().x).toBeCloseTo(Math.sin(1.2) * 0.35);
    expect(facing.getAbsolutePosition().z).toBeCloseTo(Math.cos(1.2) * 0.35);
    symbol.dispose();
  });

  it("cleans an unexpected activation failure and keeps the fallback", async () => {
    const scene = world(), loaded = asset(scene, ["bedRail"]);
    Object.defineProperty(loaded, "nodes", { get: () => { throw new Error("bad hierarchy"); } });
    const symbol = new ImportedMemorySymbol(scene, "rail", Vector3.Zero(), Vector3.Zero(), { instantiate: async () => loaded }, new FadingSymbol(scene, "fallback", Vector3.Zero()));
    await symbol.ready;
    expect(loaded.dispose).toHaveBeenCalledTimes(1);
    expect(scene.getTransformNodeByName("fallback")).not.toBeNull();
    expect(scene.getMeshByName("bedRail")).toBeNull();
    symbol.dispose();
  });
});
