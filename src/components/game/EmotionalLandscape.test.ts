import { afterEach, describe, expect, it } from "vitest";
import { NullEngine } from "@babylonjs/core/Engines/nullEngine";
import { Scene } from "@babylonjs/core/scene";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { VertexBuffer } from "@babylonjs/core/Buffers/buffer";
import type { PointLight } from "@babylonjs/core/Lights/pointLight";
import { AtmosphereSystem } from "./AtmosphereSystem";
import { TerrainSystem } from "./TerrainSystem";
import { JOURNEY_STATIONS, emotionalGroundHeight, landscapeLayout } from "./EmotionalLandscape";

const engines: NullEngine[] = [];
function world() { const engine = new NullEngine(); engines.push(engine); return new Scene(engine); }
afterEach(() => engines.splice(0).forEach(engine => engine.dispose()));

describe("authored emotional landscape", () => {
  it("keeps station prop footprints and local branch arrivals on a common level", () => {
    const scene = world(), terrain = new TerrainSystem(scene);
    for (const station of JOURNEY_STATIONS) {
      for (const dx of [-2.5, 0, 2.5]) for (const dz of [-1.8, 0, 1.8]) {
        expect(terrain.getHeightAtPoint(station.x + dx, station.z + dz)).toBeLessThan(0.025);
      }
      expect(terrain.getNormalAtPoint(station.x, station.z).y).toBeCloseTo(1);
    }
    expect(terrain.getHeightAtPoint(95, 20)).toBeGreaterThan(0);
    terrain.dispose();
  });

  it("provides continuous level travel including the outward ending", () => {
    const route = [...JOURNEY_STATIONS.slice(0, 11), JOURNEY_STATIONS[0], JOURNEY_STATIONS[10], JOURNEY_STATIONS[11]];
    for (let i = 1; i < route.length; i++) {
      const a = route[i - 1], b = route[i];
      for (let step = 0; step <= 40; step++) {
        const t = step / 40;
        expect(emotionalGroundHeight(a.x + (b.x - a.x) * t, a.z + (b.z - a.z) * t)).toBe(0);
      }
    }
  });

  it("uses deterministic bounded scenery, keeps the quiet foreground low, and disposes it", () => {
    const a = world(), b = world();
    const first = new TerrainSystem(a), second = new TerrainSystem(b);
    const layout = landscapeLayout();
    expect(layout).toEqual(landscapeLayout());
    expect(layout.length).toBeLessThan(100);
    expect(layout.filter(slab => slab.zone === "fissure").every(slab => slab.height >= 1.8)).toBe(true);
    expect(layout.filter(slab => slab.zone === "basin" && slab.z < -9).every(slab => slab.height < 1)).toBe(true);
    const meshes = a.meshes.filter(mesh => mesh.name.startsWith("landscape_"));
    expect(meshes.length).toBe(layout.length);
    meshes.forEach(mesh => {
      expect(mesh.isPickable).toBe(false);
      expect(mesh.position.asArray()).toEqual(b.getMeshByName(mesh.name)!.position.asArray());
      const positions = mesh.getVerticesData(VertexBuffer.PositionKind)!;
      const normals = mesh.getVerticesData(VertexBuffer.NormalKind)!;
      // Lit upper fracture surfaces must face upward, not into the stone volume.
      let topFaces = 0;
      for (let i = 0; i < positions.length; i += 3) if (positions[i+1] > 0 && normals[i+1] > 0.5) topFaces++;
      expect(topFaces).toBeGreaterThan(0);
    });
    first.dispose(); second.dispose();
    expect(a.meshes).toHaveLength(0);
    expect(a.materials.filter(surface => surface.name !== "default material")).toHaveLength(0);
    expect(a.textures).toHaveLength(0);
  });

  it("interpolates constriction into breath without breaking fog density or viewport sky", () => {
    const scene = world(), atmosphere = new AtmosphereSystem(scene);
    const warm = scene.fogColor.clone();
    atmosphere.setNarrativeScene("boundary");
    expect(scene.fogColor.asArray()).toEqual(warm.asArray());
    scene.onBeforeRenderObservable.notifyObservers(scene);
    expect(scene.fogColor.r).toBeLessThan(warm.r);
    atmosphere.setReducedMotion(true);
    const constricted = scene.fogColor.clone(), ambient = scene.getLightByName("slateAmbient")!;
    const lowIntensity = ambient.intensity;
    atmosphere.setNarrativeScene("quiet");
    expect(scene.fogColor.r).toBeGreaterThan(constricted.r);
    expect(ambient.intensity).toBeGreaterThan(lowIntensity);
    atmosphere.updateFog(0.51);
    expect(scene.fogDensity).toBeCloseTo(0.004 + 0.51 * 0.02);
    expect(scene.clearColor.asArray()).toEqual([...scene.fogColor.asArray(), 1]);
    atmosphere.dispose();
  });

  it("carries subtle motes with the listener and safely ignores invalid positions", async () => {
    const scene = world(), atmosphere = new AtmosphereSystem(scene);
    atmosphere.setReducedMotion(true);
    const mote = scene.getMeshByName("lampDust0")!, origin = mote.position.clone();
    atmosphere.updateListenerPosition(new Vector3(30, 0.4, -12));
    const movement = mote.position.subtract(origin);
    expect(movement.x).toBeCloseTo(30); expect(movement.y).toBeCloseTo(0.4); expect(movement.z).toBeCloseTo(-12);
    const latest = mote.position.clone();
    atmosphere.updateListenerPosition(new Vector3(Number.NaN, 0, 0));
    expect(mote.position.asArray()).toEqual(latest.asArray());
    atmosphere.dispose(); atmosphere.dispose();
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(scene.onBeforeRenderObservable.observers).toHaveLength(0);
    expect(scene.meshes).toHaveLength(0);
    expect(scene.lights).toHaveLength(0);
  });

  it("fades a local memory key outside the refuge and dims authored constriction/rest", () => {
    const scene = world(), atmosphere = new AtmosphereSystem(scene);
    const light = scene.getLightByName("memoryPointLight")! as PointLight;
    expect(light.isEnabled()).toBe(false);
    atmosphere.updateListenerPosition(new Vector3(2, 0, 0));
    expect(light.intensity).toBe(0);
    atmosphere.updateListenerPosition(new Vector3(3.5, 0.4, 0));
    expect(light.intensity).toBeCloseTo(0.55);
    expect(light.position.x).toBeCloseTo(2.5); expect(light.position.y).toBeCloseTo(2.5); expect(light.position.z).toBeCloseTo(-1);
    atmosphere.updateListenerPosition(new Vector3(5, 0, 0));
    expect(light.intensity).toBeCloseTo(1.1); expect(light.range).toBe(9);
    expect(light.isEnabled()).toBe(true);
    atmosphere.setNarrativeScene("boundary");
    expect(light.intensity).toBeCloseTo(1.1);
    scene.onBeforeRenderObservable.notifyObservers(scene);
    expect(light.intensity).toBeLessThan(1.1); expect(light.intensity).toBeGreaterThan(0.8);
    atmosphere.setReducedMotion(true);
    expect(light.intensity).toBeCloseTo(0.8);
    atmosphere.setNarrativeScene("rest");
    expect(light.intensity).toBe(0); expect(light.isEnabled()).toBe(false);
    atmosphere.dispose(); expect(scene.getLightByName("memoryPointLight")).toBeNull();
  });
});
