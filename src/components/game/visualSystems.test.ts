import { afterEach, describe, expect, it } from "vitest";
import { NullEngine, Scene, Vector3 } from "@babylonjs/core";
import { AtmosphereSystem } from "./AtmosphereSystem";
import { EnvironmentSystem } from "./EnvironmentSystem";
import { TerrainSystem } from "./TerrainSystem";
import { Lamp } from "./Lamp";

const engines: NullEngine[] = [];
function world() {
  const engine = new NullEngine(); engines.push(engine);
  return new Scene(engine);
}
afterEach(() => { engines.splice(0).forEach(engine => engine.dispose()); });

describe("directed visual systems", () => {
  it("interpolates authored fog and bounds malformed values", () => {
    const scene = world(); const atmosphere = new AtmosphereSystem(scene);
    const openingDensity = scene.fogDensity;
    expect(scene.clearColor.asArray()).toEqual([...scene.fogColor.asArray(), 1]);
    atmosphere.updateFog(0.1);
    scene.onBeforeRenderObservable.notifyObservers(scene);
    expect(scene.fogDensity).toBeLessThan(openingDensity);
    expect(scene.fogDensity).toBeGreaterThan(0.006);
    atmosphere.setReducedMotion(true);
    expect(scene.fogDensity).toBeCloseTo(0.006);
    atmosphere.updateFog(-3); expect(scene.fogDensity).toBeCloseTo(0.004);
    atmosphere.updateFog(Number.NaN); expect(scene.fogDensity).toBeCloseTo(openingDensity);
    atmosphere.dispose();
  });

  it("keeps one grounded lamp while memories change and gates clinical fragments", () => {
    const scene = world(); const terrain = new TerrainSystem(scene);
    const environment = new EnvironmentSystem(scene); environment.setReducedMotion(true);
    environment.populate(terrain.terrain, []);
    const lamp = scene.getTransformNodeByName("persistentLamp")!;
    expect(lamp.position.y).toBeCloseTo(terrain.getHeightAtPoint(0, 0), 2);
    environment.createObjectsFromTag(["lamp", "hand", "hospital", "chair", "cup", "rail"], terrain.terrain, { x: 12, z: 8 });
    environment.updateObjectVisibilities(4, false);
    expect(scene.getMeshByName("bedRail")!.isEnabled()).toBe(false);
    environment.updateObjectVisibilities(4, true);
    expect(scene.getMeshByName("bedRail")!.isEnabled()).toBe(true);
    expect(scene.lights).toHaveLength(1);
    expect(scene.getMeshByName("handOutline")!.material!.getActiveTextures()).toHaveLength(0);
    expect(scene.getMeshByName("rememberedCup")!.material!.name).toBe("cupBlueGlaze");
    expect(scene.getMeshByName("cupRimChip")).not.toBeNull();
    const chair = scene.getTransformNodeByName("chairMemory")!;
    const chairPosition = chair.position.clone();
    environment.createObjectsFromTag(["lamp", "chair"], terrain.terrain, { x: 25, z: 1 });
    expect(scene.getTransformNodeByName("chairMemory")).toBe(chair);
    expect(chair.position.x - chairPosition.x).toBeCloseTo(13);
    expect(chair.position.z - chairPosition.z).toBeCloseTo(-7);
    environment.createObjectsFromTag([], terrain.terrain, { x: -20, z: 0 });
    expect(scene.getTransformNodeByName("persistentLamp")).toBe(lamp);
    expect(scene.getMeshByName("chairSeat")).toBeNull();
    environment.dispose();
    expect(scene.getTransformNodeByName("persistentLamp")).toBeNull();
    expect(scene.lights).toHaveLength(0);
    expect(scene.effectLayers).toHaveLength(0);
    terrain.dispose();
  });

  it("places memories along the voyage and leaves a subdued trace without moving earlier places", () => {
    const scene = world(), terrain = new TerrainSystem(scene), environment = new EnvironmentSystem(scene);
    environment.setReducedMotion(true); environment.populate(terrain.terrain, []);
    const lamp = scene.getTransformNodeByName("persistentLamp")!;
    environment.setNarrativeScene("chair");
    environment.createObjectsFromTag(["lamp", "chair"], terrain.terrain, { x: 4, z: -2 });
    const first = scene.getTransformNodeByName("chairMemory")!;
    const footprint = first.position.clone();
    expect(first.position.x).toBeGreaterThan(4);
    const chairSeat = scene.getMeshByName("chairSeat")!;
    environment.setNarrativeScene("cup");
    environment.createObjectsFromTag(["lamp", "chair", "cup"], terrain.terrain, { x: 9, z: 3 });
    expect(first.position.asArray()).toEqual(footprint.asArray());
    expect(chairSeat.visibility).toBeCloseTo(0.2);
    expect(scene.getTransformNodeByName("cupMemory")!.position.x).toBeGreaterThan(9);
    expect(scene.transformNodes.filter(node => node.name === "chairMemory")).toHaveLength(2);
    expect(lamp.position.x).toBe(0);
    expect(lamp.position.z).toBe(0);
    environment.resetJourney();
    expect(scene.getTransformNodeByName("chairMemory")).toBeNull();
    expect(scene.getTransformNodeByName("cupMemory")).toBeNull();
    expect(scene.getTransformNodeByName("persistentLamp")).toBe(lamp);
    environment.dispose(); terrain.dispose();
  });

  it("parents the warm light to the bulb at nonzero world coordinates", () => {
    const scene = world(); const lamp = new Lamp(scene, new Vector3(18, 2, -12));
    const light = scene.getLightByName("lampWarmth")!;
    const bulb = scene.getMeshByName("lampFilament")!;
    expect(light.parent).toBe(bulb);
    bulb.computeWorldMatrix(true);
    expect(bulb.getAbsolutePosition().x).toBeCloseTo(18);
    expect(bulb.getAbsolutePosition().z).toBeCloseTo(-12);
    expect(bulb.getAbsolutePosition().y).toBeCloseTo(4.48);
    lamp.dispose();
  });

  it("provides deterministic terrain and staged scenery including legacy coordinates", () => {
    const a = world(), b = world();
    const ta = new TerrainSystem(a), tb = new TerrainSystem(b);
    const ea = new EnvironmentSystem(a), eb = new EnvironmentSystem(b);
    ea.populate(ta.terrain, []); eb.populate(tb.terrain, []);
    expect(ta.terrain.getBoundingInfo().boundingBox.maximum.x).toBeGreaterThan(95);
    expect(ta.getHeightAtPoint(95, 20)).toBeGreaterThan(0);
    expect(a.getMeshByName("landscape_refuge_0")!.position.asArray()).toEqual(b.getMeshByName("landscape_refuge_0")!.position.asArray());
    expect(ta.getHeightAtPoint(22, -31)).toEqual(tb.getHeightAtPoint(22, -31));
    ea.dispose(); eb.dispose(); ta.dispose(); tb.dispose();
  });

  it("removes scene observers and resources on disposal", async () => {
    const scene = world(); const before = scene.onBeforeRenderObservable.observers.length;
    const terrain = new TerrainSystem(scene), atmosphere = new AtmosphereSystem(scene), environment = new EnvironmentSystem(scene);
    environment.populate(terrain.terrain, []);
    environment.createObjectsFromTag(["hand", "geometric"], terrain.terrain);
    environment.createObjectsFromTag(["chair"], terrain.terrain);
    environment.dispose(); atmosphere.dispose(); terrain.dispose();
    // Babylon defers observer unregistration to the next event-loop turn.
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(scene.onBeforeRenderObservable.observers.length).toBe(before);
    expect(scene.meshes).toHaveLength(0);
    expect(scene.materials.filter(surface => surface.name !== "default material")).toHaveLength(0);
    expect(scene.textures).toHaveLength(0);
  });

  it("stages the chair turn and distinct ending light independently of connection", () => {
    const scene = world(), terrain = new TerrainSystem(scene), environment = new EnvironmentSystem(scene);
    environment.setReducedMotion(true); environment.populate(terrain.terrain, []);
    environment.createObjectsFromTag(["lamp", "chair"], terrain.terrain);
    const chair = scene.getTransformNodeByName("chairMemory")!;
    const initial = chair.rotation.y;
    environment.setNarrativeScene("contradiction");
    expect(chair.rotation.y).not.toBe(initial);
    expect(chair.rotation.y).toBeCloseTo(Math.atan2(-4.2, 2.3));
    environment.setNarrativeScene("rest"); environment.updateObjectVisibilities(5, true);
    expect(scene.getLightByName("lampWarmth")!.intensity).toBeCloseTo(0.35);
    environment.setNarrativeScene("keep");
    expect(scene.getLightByName("lampWarmth")!.intensity).toBeCloseTo(1.75);
    environment.dispose(); terrain.dispose();
  });
});
